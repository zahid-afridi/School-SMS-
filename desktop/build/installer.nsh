; SchoolSMS — electron-builder NSIS hooks
; Creates a backup-friendly folder layout, writes config once,
; and installs VC++ runtime so api-ms-win-crt-*.dll errors are avoided.

!macro customInstall
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\uploads"
  CreateDirectory "$INSTDIR\data\logs"
  CreateDirectory "$INSTDIR\runtime"
  CreateDirectory "$INSTDIR\app"
  CreateDirectory "$INSTDIR\app\openwa"
  CreateDirectory "$INSTDIR\app\openwa\data"
  CreateDirectory "$INSTDIR\app\openwa\data\sessions"

  ; electron-builder extraResources land in $INSTDIR\resources\
  StrCpy $2 "$INSTDIR\resources\vc_redist.x64.exe"
  IfFileExists "$2" do_vcredist 0
  StrCpy $2 "$INSTDIR\vc_redist.x64.exe"
  IfFileExists "$2" do_vcredist skip_vcredist
  do_vcredist:
    DetailPrint "Installing Visual C++ Redistributable..."
    ExecWait '"$2" /install /quiet /norestart' $1
    DetailPrint "VC++ Redistributable exit code: $1"
  skip_vcredist:

  IfFileExists "$INSTDIR\schoolsms.config.json" skip_cfg 0
  FileOpen $0 "$INSTDIR\schoolsms.config.json" w
  FileWrite $0 "{$\r$\n"
  FileWrite $0 '  "dataDir": "data",$\r$\n'
  FileWrite $0 '  "appRoot": "."$\r$\n'
  FileWrite $0 "}$\r$\n"
  FileClose $0
  skip_cfg:

  FileOpen $0 "$INSTDIR\BACKUP.txt" w
  FileWrite $0 "SchoolSMS — Backup Guide$\r$\n"
  FileWrite $0 "========================$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Easy backup: copy this WHOLE SchoolSMS folder.$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Critical school data:$\r$\n"
  FileWrite $0 "  data\school.db$\r$\n"
  FileWrite $0 "  data\uploads\$\r$\n"
  FileWrite $0 "  data\logs\$\r$\n"
  FileWrite $0 "  data\.jwt-secret$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "After install: open SchoolSMS — first launch unpacks app builds + Node,$\r$\n"
  FileWrite $0 "then starts local services (backend :5000, frontend :3000).$\r$\n"
  FileWrite $0 "Installed app code lives in app\ (compiled builds — not your Git source).$\r$\n"
  FileWrite $0 "Node.js is bundled — you do not need to install Node separately.$\r$\n"
  FileWrite $0 "Requires Windows 10+. Chrome or Edge needed for WhatsApp features.$\r$\n"
  FileClose $0

  FileOpen $0 "$INSTDIR\data\README-BACKUP.txt" w
  FileWrite $0 "This data folder holds school records.$\r$\n"
  FileWrite $0 "Always include it when copying/backing up SchoolSMS.$\r$\n"
  FileClose $0
!macroend

!macro customUnInstall
  ; Keep $INSTDIR\data so school records are not deleted on uninstall.
!macroend
