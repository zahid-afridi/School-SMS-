; SchoolSMS — NSIS installer hooks
; Creates data folders and auto-writes schoolsms.config.json so the user
; never has to set appRoot manually. The .exe extracts bundled app + Node
; next to itself on first launch (appRoot = install folder).

!macro NSIS_HOOK_POSTINSTALL
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\uploads"
  CreateDirectory "$INSTDIR\data\logs"

  ; appRoot "." = folder that contains this .exe (resolved by the app).
  ; Bundled backend/frontend/OpenWA/runtime are extracted here automatically.
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
  FileWrite $0 "Requires Windows 10+ (or Windows with Universal C Runtime / VC++ Redistributable).$\r$\n"
  FileWrite $0 "Chrome/Edge is still required for WhatsApp (OpenWA) features.$\r$\n"
  FileClose $0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Keep $INSTDIR\data so school records are not deleted on uninstall.
!macroend
