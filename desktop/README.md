# SchoolSMS Desktop

Windows installer that ships **production builds only** (not your Git source tree).

| OS | Build script | Output |
|----|--------------|--------|
| Windows | `build.bat` | NSIS installer `.exe` |

---

## Install on a new PC (Windows)

1. Run `SchoolSMS_*_x64-setup.exe`
2. Open **SchoolSMS**
3. Wait for first-launch unpack, then the app opens

**You do not need to install Node.js.** Chrome or Edge is needed for WhatsApp features.

---

## Install folder (after first launch)

```
SchoolSMS/
  school-sms-desktop.exe
  schoolsms.config.json
  BACKUP.txt

  data/                         ← ★ school records (backup this)
    school.db
    uploads/
    logs/
    .jwt-secret

  app/                          ← compiled builds (NOT your source repo)
    backend/                    dist/ + production deps
    frontend/                   Next.js standalone server
    openwa/                     dist/ + production deps
    launch-services.mjs
    stop-services.mjs

  runtime/                      portable Node
  resources/                    installer payload zips
```

**Backup** = copy the whole `SchoolSMS` folder (especially `data/`).  
Users no longer get `src/`, TypeScript sources, or a full monorepo checkout.

---

## Build (Windows)

```bat
cd desktop
build.bat
```

This:

1. Compiles **backend** → `dist/`
2. Builds **OpenWA** → `dist/`
3. Builds **frontend** → Next `standalone`
4. Packs only those builds into `app-payload.zip`
5. Creates the NSIS installer

### GitHub Release

```bash
git tag v1.1.0
git push origin v1.1.0
```

Or: Actions → **Desktop Windows Installer** → Run workflow (Create Release = on).

---

## Dev (no installer)

```bash
npm run desktop              # services in browser flow
npm run desktop:tauri:dev    # Tauri window + repo source
```

---

## Notes

- Product name **SchoolSMS** (no spaces) for safe SQLite paths
- Upgrades re-unpack `app/` when the payload hash changes; **`data/` is never overwritten**
- Uninstall keeps `data/`
- Build machine / CI should use **Node 20.18.1** (matches portable runtime)
