; School SmS — NSIS installer hooks
; Creates data/uploads/logs INSIDE the install folder for easy backup.

!macro NSIS_HOOK_POSTINSTALL
  ; Layout:
  ;   $INSTDIR\data\school.db   (created on first app launch)
  ;   $INSTDIR\data\uploads\
  ;   $INSTDIR\data\logs\
  CreateDirectory "$INSTDIR\data"
  CreateDirectory "$INSTDIR\data\uploads"
  CreateDirectory "$INSTDIR\data\logs"

  ; Relative dataDir resolves next to the .exe (safe JSON, portable backup)
  FileOpen $0 "$INSTDIR\schoolsms.config.json" w
  FileWrite $0 "{$\r$\n"
  FileWrite $0 '  "dataDir": "data",$\r$\n'
  FileWrite $0 '  "appRoot": "E:\\MY CODE\\School (SmS)"$\r$\n'
  FileWrite $0 "}$\r$\n"
  FileClose $0

  FileOpen $0 "$INSTDIR\data\README-BACKUP.txt" w
  FileWrite $0 "School SmS data folder$\r$\n"
  FileWrite $0 "-----------------------$\r$\n"
  FileWrite $0 "school.db  = database$\r$\n"
  FileWrite $0 "uploads\   = photos and files$\r$\n"
  FileWrite $0 "logs\      = app logs$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "Backup tip: copy the whole School SmS install folder.$\r$\n"
  FileClose $0
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Keep $INSTDIR\data so school records are not deleted on uninstall.
!macroend
