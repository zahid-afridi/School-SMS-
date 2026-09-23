; SchoolSMS — NSIS installer hooks
; Creates data folders, auto-writes config, and installs VC++ runtime
; so api-ms-win-crt-*.dll errors are avoided on target PCs.

!macro NSIS_HOOK_POSTINSTALL
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\uploads"
  CreateDirectory "$INSTDIR\data\logs"

  ; Install Microsoft VC++ Redistributable (x64) quietly when present.
  ; Fixes: "api-ms-win-crt-math-l1-1-0.dll is missing"
  StrCpy $2 "$INSTDIR\resources\vc_redist.x64.exe"
  IfFileExists "$2" do_vcredist 0
  StrCpy $2 "$INSTDIR\vc_redist.x64.exe"
  IfFileExists "$2" do_vcredist skip_vcredist
  do_vcredist:
    DetailPrint "Installing Visual C++ Redistributable..."
    ExecWait '"$2" /install /quiet /norestart' $1
    DetailPrint "VC++ Redistributable exit code: $1"
  skip_vcredist:

  ; appRoot "." = folder that contains this .exe (resolved by the app).
  FileOpen $0 "$INSTDIR\schoolsms.config.json" w
  FileWrite $0 "{$\r$\n"
  FileWrite $0 '  "dataDir": "data",$\r$\n'
  FileWrite $0 '  "appRoot": "."$\r$\n'
  FileWrite $0 "}$\r$\n"
  FileClose $0

  FileOpen $0 "$INSTDIR\data\README-BACKUP.txt" w
  FileWrite $0 "SchoolSMS data folder$\r$\n"
  FileWrite $0 "-----------------------$\r$\n"
  FileWrite $0 "school.db  = database$\r$\n"
  FileWrite $0 "uploads\   = photos and files$\r$\n"
  FileWrite $0 "logs\      = app logs$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Backup tip: copy the whole SchoolSMS install folder.$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Node.js is bundled — you do not need to install Node separately.$\r$\n"
  FileWrite $0 "Requires Windows 10+ for best results.$\r$\n"
  FileWrite $0 "Chrome/Edge is still required for WhatsApp (OpenWA) features.$\r$\n"
  FileClose $0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Keep $INSTDIR\data so school records are not deleted on uninstall.
!macroend
