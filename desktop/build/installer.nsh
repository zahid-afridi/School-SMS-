; SchoolSMS — electron-builder NSIS hooks
; Creates a backup-friendly folder layout, writes config once,
; installs VC++ runtime, and keeps the data folder on uninstall.
; IMPORTANT: never end a comment with a backslash (NSIS warning 6850).

!macro customInstall
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\uploads"
  CreateDirectory "$INSTDIR\data\logs"
  CreateDirectory "$INSTDIR\runtime"
  CreateDirectory "$INSTDIR\app"
  CreateDirectory "$INSTDIR\app\openwa"
  CreateDirectory "$INSTDIR\app\openwa\data"
  CreateDirectory "$INSTDIR\app\openwa\data\sessions"

  ; electron-builder extraResources land in $INSTDIR/resources
  StrCpy $2 "$INSTDIR\resources\vc_redist.x64.exe"
  IfFileExists "$2" do_vcredist 0
  StrCpy $2 "$INSTDIR\vc_redist.x64.exe"
  IfFileExists "$2" do_vcredist skip_vcredist
  do_vcredist:
    DetailPrint "Installing Visual C++ Redistributable..."
    ExecWait '"$2" /install /quiet /norestart' $1
    DetailPrint "VC++ Redistributable exit code: $1"
  skip_vcredist:

  ; Extract Node runtime & App payload at install time using Windows built-in tar.exe.
  ; This eliminates the 1-2 minute freeze on first launch!
  IfFileExists "$WINDIR\System32\tar.exe" do_tar skip_tar
  do_tar:
    IfFileExists "$INSTDIR\resources\node-runtime.zip" 0 +3
    DetailPrint "Extracting Node runtime..."
    ExecWait '"$WINDIR\System32\tar.exe" -xf "$INSTDIR\resources\node-runtime.zip" -C "$INSTDIR\runtime"' $1

    IfFileExists "$INSTDIR\resources\app-payload.zip" 0 +3
    DetailPrint "Extracting SchoolSMS application..."
    ExecWait '"$WINDIR\System32\tar.exe" -xf "$INSTDIR\resources\app-payload.zip" -C "$INSTDIR"' $1

    IfFileExists "$INSTDIR\resources\bundle-manifest.json" 0 +2
    CopyFiles /SILENT "$INSTDIR\resources\bundle-manifest.json" "$INSTDIR\.schoolsms-installed.json"
  skip_tar:

  IfFileExists "$INSTDIR\schoolsms.config.json" skip_cfg 0
  FileOpen $0 "$INSTDIR\schoolsms.config.json" w
  FileWrite $0 "{$\r$\n"
  FileWrite $0 '  "dataDir": "data",$\r$\n'
  FileWrite $0 '  "appRoot": "."$\r$\n'
  FileWrite $0 "}$\r$\n"
  FileClose $0
  skip_cfg:

  FileOpen $0 "$INSTDIR\BACKUP.txt" w
  FileWrite $0 "SchoolSMS - Backup Guide$\r$\n"
  FileWrite $0 "========================$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Easy backup: copy this WHOLE SchoolSMS folder.$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Critical school data:$\r$\n"
  FileWrite $0 "  data/school.db$\r$\n"
  FileWrite $0 "  data/uploads/$\r$\n"
  FileWrite $0 "  data/logs/$\r$\n"
  FileWrite $0 "  data/.jwt-secret$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "After install: open SchoolSMS - services start immediately.$\r$\n"
  FileWrite $0 "Installed app code lives in app/ (compiled builds - not your Git source).$\r$\n"
  FileWrite $0 "Node.js is bundled - you do not need to install Node separately.$\r$\n"
  FileWrite $0 "Requires Windows 10+. Chrome or Edge needed for WhatsApp features.$\r$\n"
  FileClose $0

  FileOpen $0 "$INSTDIR\data\README-BACKUP.txt" w
  FileWrite $0 "This data folder holds school records (including school.db).$\r$\n"
  FileWrite $0 "Always include it when copying/backing up SchoolSMS.$\r$\n"
  FileClose $0
!macroend

; Replace default "delete entire INSTDIR" so school records survive uninstall.
!macro customRemoveFiles
  ; Electron / app runtime (keep the data folder)
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
  RMDir /r "$INSTDIR\app"
  RMDir /r "$INSTDIR\runtime"

  Delete "$INSTDIR\SchoolSMS.exe"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\*.json"
  Delete "$INSTDIR\chrome_100_percent.pak"
  Delete "$INSTDIR\chrome_200_percent.pak"
  Delete "$INSTDIR\icudtl.dat"
  Delete "$INSTDIR\snapshot_blob.bin"
  Delete "$INSTDIR\v8_context_snapshot.bin"
  Delete "$INSTDIR\vk_swiftshader_icd.json"
  Delete "$INSTDIR\LICENSE*"
  Delete "$INSTDIR\LICENSES*"
  Delete "$INSTDIR\version"
  Delete "$INSTDIR\BACKUP.txt"
  Delete "$INSTDIR\.schoolsms-installed.json"

  ; Keep $INSTDIR/data and $INSTDIR/schoolsms.config.json
  RMDir "$INSTDIR"
!macroend

!macro customUnInstall
  ; data folder is intentionally preserved by customRemoveFiles
!macroend
