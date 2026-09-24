# SchoolSMS Desktop

Windows installer that ships **production builds only** (not your Git source tree). Built with **Electron**.

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
  SchoolSMS.exe
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
  resources/                    installer payload zips + Electron runtime
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
5. Creates the Electron NSIS installer under `desktop/release/`

### GitHub Release

```bash
git tag v1.1.0
git push origin v1.1.0
```

Or: Actions → **SchoolSMS Electron Windows** → Run workflow (Create Release = on).

---

## Dev (no installer)

```bash
npm run desktop                 # services in browser flow
npm run desktop:electron:dev    # Electron window + repo source
```

---

## Notes

- Product name **SchoolSMS** (no spaces) for safe SQLite paths
- Upgrades re-unpack `app/` when the payload hash changes; **`data/` is never overwritten**
- Uninstall keeps `data/`
- Build machine / CI should use **Node 22.19.0** (matches portable runtime + OpenWA)
- Startup order: **database → backend → frontend → open app**, then WhatsApp (OpenWA) in the background. Missing Chrome/Edge must not block the school UI.
- If splash fails: open `data\logs\` (`launcher.log`, `backend.log`, `prisma.log`, `startup-status.json`)
