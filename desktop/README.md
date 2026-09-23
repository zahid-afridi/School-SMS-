# SchoolSMS Desktop

One codebase → **Windows** installer (primary) and optional Linux notes.

| OS | Build script | Output |
|----|--------------|--------|
| Windows | `build.bat` | NSIS installer `.exe` |
| Ubuntu / Linux | (see notes) | not self-contained yet |

Build the Windows installer **on Windows** (or via GitHub Actions).

---

## Install on a new PC (Windows)

1. Run `SchoolSMS_*_x64-setup.exe`
2. Open **SchoolSMS**
3. Wait for first-launch unpack (one-time), then the app opens

That’s it. The installer:

- Creates a **backup-friendly folder layout**
- Writes `schoolsms.config.json` with `"appRoot": "."` (first install only)
- Ships **portable Node.js** + the School app payload
- Installs VC++ runtime when needed
- First launch unpacks app files next to the `.exe` and starts local services

**You do not need to install Node.js** on the school/office PC.  
**Chrome or Edge** is still needed for WhatsApp (OpenWA) features.

---

## Install folder layout (easy backup)

```
SchoolSMS/                         ← copy this whole folder to backup
  school-sms-desktop.exe
  uninstall.exe
  schoolsms.config.json            ← appRoot = "."
  BACKUP.txt                       ← short backup guide
  .schoolsms-installed.json        ← version marker (auto)

  data/                            ← ★ SCHOOL RECORDS (keep forever)
    school.db
    uploads/
    logs/
    .jwt-secret                    ← local login key (keep with DB)
    README-BACKUP.txt

  resources/                       ← payload zips (from installer)
    app-payload.zip
    node-runtime.zip
    bundle-manifest.json
    vc_redist.x64.exe

  runtime/                         ← portable Node (after first launch)
    node.exe

  backend/                         ← after first launch / upgrade unpack
  frontend/
  OpenWA/
  desktop/scripts/
```

**Backup** = copy the whole `SchoolSMS` folder (or at least `data/`).  
**Uninstall** keeps `data/` so records are not deleted.

## Lifecycle

| Action | What happens |
|--------|----------------|
| Install | Folders + config + VC++ redist; payload zips in `resources/` |
| First open / upgrade | Unpacks Node + app when payload version changes; **never overwrites `data/`** |
| Running | Starts backend `:5000` + frontend `:3000` (+ OpenWA `:2785`) |
| Close app | Stops launcher + frees ports 5000 / 3000 / 2785 |

## Config (`schoolsms.config.json` next to the binary)

**Installed build (automatic — do not edit unless you know why):**

```json
{
  "dataDir": "data",
  "appRoot": "."
}
```

**Dev / custom path (optional):**

```json
{
  "dataDir": "data",
  "appRoot": "E:\\MY CODE\\School (SmS)"
}
```

- `dataDir`: relative to binary → `{installDir}/data`
- `appRoot`: `.` = folder containing the `.exe`, or a full path to the project

---

## Prerequisites (build machine only)

### Windows (to create the installer)

1. [Node.js **20 LTS**](https://nodejs.org) (match portable runtime `20.18.1`)
2. [Rust](https://rustup.rs)
3. [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++**

### Both (once per build machine)

```bash
cd "/path/to/School (SmS)"
npm --prefix backend install
npm --prefix frontend install
npm --prefix OpenWA install
npm --prefix desktop install
```

---

## Build

### Windows

```bat
cd /d "E:\MY CODE\School (SmS)\desktop"
build.bat
```

Or: `npm run build:all` / from repo root `npm run desktop:build`

`build.bat` / `prepare:bundle` downloads portable Node and packs `backend` + `frontend` + `OpenWA` into the installer.  
Secrets (`.env`), local DBs, and WhatsApp sessions are **excluded**. The installer will still be **large** (includes `node_modules`).

**CI (GitHub Actions)** — workflow [Desktop Windows Installer](../.github/workflows/desktop-windows.yml):

**Option A — tag (recommended)** builds and posts the installer to a GitHub Release:

```bash
git tag v1.0.3
git push origin v1.0.3
```

**Option B — manual:** Actions → **Desktop Windows Installer** → **Run workflow**  
(keep **Create Release** checked, set tag e.g. `v1.0.3`)

Then download the Release asset (or the Actions artifact **SchoolSMS-Windows-x64**) and run the setup on the school PC.

**Output**

- `src-tauri\target\release\bundle\nsis\SchoolSMS_*_x64-setup.exe`
- `src-tauri\target\release\school-sms-desktop.exe`

### Linux

Linux packages do not yet ship the same self-contained Node bundle as Windows; use a system Node + `appRoot` for now, or run from the repo.

---

## Run without installer (dev)

From repo root (works on Windows and Ubuntu):

```bash
# Browser app window (needs Node only)
npm run desktop

# Tauri window (needs Rust + OS deps)
npm run desktop:tauri:dev
```

---

## Notes

- Product name is **SchoolSMS** (no spaces) so SQLite paths never truncate.
- Prisma CLI gets an encoded DB URL; the running backend uses the real filesystem path.
- Target PCs using the Windows installer do **not** need Node on PATH (portable Node is inside the app).
- Upgrades re-unpack app/runtime when the installer payload hash changes; `data/` is preserved.
- Windows frees ports via `taskkill`; Ubuntu via `lsof`.
- This is a **Windows `.exe` installer**, not an Android APK.

## Troubleshooting (Windows install PC)

### `api-ms-win-crt-math-l1-1-0.dll` is missing
The PC is missing the **Visual C++ / Universal C Runtime**.

**v1.0.2+ installer** downloads and silently installs `vc_redist.x64.exe` during setup.

**Manual fix:** https://aka.ms/vs/17/release/vc_redist.x64.exe  

Requires **Windows 10 or newer** for reliable installs.

### Why does the app still use Node after build?
The `.exe` is a shell. Backend (Express) + frontend (Next.js) still run on **Node**, but the **installer ships portable Node** inside the app folder (`runtime\node.exe`).  
You should **not** need to install Node separately on the school PC when using the full self-contained installer.

### First launch is slow
Normal — the app unpacks `app-payload.zip` and `node-runtime.zip` once (or again after an upgrade). Later launches are faster.
