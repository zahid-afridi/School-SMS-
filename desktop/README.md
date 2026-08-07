# School SmS Desktop

## Data location (for backup)

After install + first run, files are **inside the install folder**:

```
School SmS\
  school-sms-desktop.exe
  uninstall.exe
  schoolsms.config.json
  data\
    school.db
    uploads\
    logs\
```

Backup = copy the whole `School SmS` folder.

## Build yourself

```bat
cd /d "E:\MY CODE\School (SmS)\desktop"
build.bat
```

Installer:

`src-tauri\target\release\bundle\nsis\School SmS_1.0.0_x64-setup.exe`

After install, edit `schoolsms.config.json` next to the exe if needed:

```json
{
  "dataDir": "data",
  "appRoot": "E:\\MY CODE\\School (SmS)"
}
```

## Fix: Internal server error on Register

Cause: install folder name with a **space** (`School SmS`) truncated the SQLite URL. Tables were created in `E:\Test-school\School` instead of `data\school.db`.

1. Close the app.
2. In `E:\Test-school\`:
   - Delete empty `School SmS\data\school.db` (0 bytes) if present
   - Move/rename file `School` → `School SmS\data\school.db`  
     (or delete both for a clean DB)
3. Open the app again and register.

Code fix is already in `launch-services.mjs` + `backend/src/config/env.ts` (paths with spaces are encoded). No Tauri rebuild required for this — just restart the app so schema push runs on the correct DB.
