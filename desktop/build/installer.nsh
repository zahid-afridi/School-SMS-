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

  ; Check if Visual C++ 2015-2022 x64 runtime is already present
  IfFileExists "$WINDIR\System32\vcruntime140.dll" 0 check_vcredist_needed
  IfFileExists "$WINDIR\System32\msvcp140.dll" skip_vcredist check_vcredist_needed

  check_vcredist_needed:
    ; electron-builder extraResources land in $INSTDIR/resources
    StrCpy $2 "$INSTDIR\resources\vc_redist.x64.exe"
    IfFileExists "$2" do_vcredist 0
    StrCpy $2 "$INSTDIR\vc_redist.x64.exe"
    IfFileExists "$2" do_vcredist skip_vcredist
    do_vcredist:
      DetailPrint "Installing Visual C++ Redistributable..."
      nsExec::Exec '"$2" /install /quiet /norestart'
      Pop $1
      DetailPrint "VC++ Redistributable exit code: $1"
  skip_vcredist:

  ; Extract Node runtime at install time (prefer tar, fallback to PowerShell - silent execution)
  IfFileExists "$INSTDIR\resources\node-runtime.zip" 0 skip_node_runtime
    DetailPrint "Extracting Node runtime..."
    IfFileExists "$WINDIR\System32\tar.exe" 0 node_try_powershell
      nsExec::Exec '"$WINDIR\System32\tar.exe" -xf "$INSTDIR\resources\node-runtime.zip" -C "$INSTDIR\runtime"'
      Pop $1
    node_try_powershell:
    IfFileExists "$INSTDIR\runtime\node.exe" skip_node_runtime 0
      DetailPrint "Extracting Node runtime via PowerShell..."
      nsExec::Exec 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "[System.IO.Compression.ZipFile]::ExtractToDirectory(\`"$INSTDIR\resources\node-runtime.zip\`", \`"$INSTDIR\runtime\`")"'
      Pop $1
      IfFileExists "$INSTDIR\runtime\node.exe" skip_node_runtime 0
        nsExec::Exec 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath \`"$INSTDIR\resources\node-runtime.zip\`" -DestinationPath \`"$INSTDIR\runtime\`" -Force"'
        Pop $1
  skip_node_runtime:

  ; Extract SchoolSMS app payload at install time (silent execution, no black console window)
  IfFileExists "$INSTDIR\resources\app-payload.zip" 0 skip_app_extract
    DetailPrint "Extracting SchoolSMS application..."
    IfFileExists "$WINDIR\System32\tar.exe" 0 app_try_powershell
      nsExec::Exec '"$WINDIR\System32\tar.exe" -xf "$INSTDIR\resources\app-payload.zip" -C "$INSTDIR"'
      Pop $1
    app_try_powershell:
    ; Check if payload files landed on disk (don't fail on harmless tar timestamp warnings)
    IfFileExists "$INSTDIR\app\launch-services.mjs" 0 app_do_ps
    IfFileExists "$INSTDIR\app\backend\node_modules\better-sqlite3\package.json" 0 app_do_ps
    IfFileExists "$INSTDIR\app\backend\node_modules\bcrypt\package.json" app_verify_done 0

    app_do_ps:
      DetailPrint "Extracting SchoolSMS payload via PowerShell..."
      nsExec::Exec 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "[System.IO.Compression.ZipFile]::ExtractToDirectory(\`"$INSTDIR\resources\app-payload.zip\`", \`"$INSTDIR\`")"'
      Pop $1
      IfFileExists "$INSTDIR\app\backend\node_modules\better-sqlite3\package.json" app_verify_done 0
        nsExec::Exec 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath \`"$INSTDIR\resources\app-payload.zip\`" -DestinationPath \`"$INSTDIR\`" -Force"'
        Pop $1

    app_verify_done:
    IfFileExists "$INSTDIR\app\launch-services.mjs" 0 app_extract_bad
    IfFileExists "$INSTDIR\app\backend\node_modules\better-sqlite3\package.json" 0 app_extract_bad
    IfFileExists "$INSTDIR\app\backend\node_modules\bcrypt\package.json" 0 app_extract_bad
    IfFileExists "$INSTDIR\resources\bundle-manifest.json" 0 skip_app_extract
      CopyFiles /SILENT "$INSTDIR\resources\bundle-manifest.json" "$INSTDIR\.schoolsms-installed.json"
      DetailPrint "Installation verified successfully."
      Goto skip_app_extract

    app_extract_bad:
      DetailPrint "App extract deferred: first launch will finish unpacking."
      Delete "$INSTDIR\.schoolsms-installed.json"
  skip_app_extract:

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
