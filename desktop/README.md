# SchoolSMS Desktop

One codebase → **Windows** and **Ubuntu** builds.

| OS | Build script | Output |
|----|--------------|--------|
| Windows | `build.bat` | NSIS installer `.exe` |
| Ubuntu / Linux | `build.sh` | `.deb` + `.AppImage` |

Build on the same OS you target (Windows installer on Windows, Linux packages on Ubuntu).

---

## Install on a new PC (Windows)

1. Run `SchoolSMS_*_x64-setup.exe`
2. Open **SchoolSMS**

That’s it. The installer:

- Writes `schoolsms.config.json` with `"appRoot": "."` (install folder)
- Ships a **portable Node.js** + the School app payload
- First launch unpacks them next to the `.exe` automatically

**You do not need to install Node.js** on the school/office PC.  
**Chrome or Edge** is still needed for WhatsApp (OpenWA) features.

---

## Install folder layout

```
SchoolSMS/                      ← no spaces in folder name
  school-sms-desktop.exe        ← Windows
  uninstall.exe                 ← Windows only
  schoolsms.config.json         ← auto-written (appRoot = ".")
  resources/
    app-payload.zip             ← unpacked on first launch
    node-runtime.zip
  runtime/                      ← portable Node (after first launch)
  backend/                      ← after first launch
  frontend/
  OpenWA/
  desktop/scripts/
  data/
    school.db
    uploads/
    logs/
```

**Backup** = copy the whole `SchoolSMS` folder.

## Lifecycle

| Action | What happens |
|--------|----------------|
| Open app | Unpacks bundle if needed, starts backend `:5000` + frontend `:3000`, creates `data/`, pushes DB schema |
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

1. [Node.js 20+](https://nodejs.org)
2. [Rust](https://rustup.rs)
3. [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++**

### Ubuntu (to create Linux packages)

```bash
sudo apt update
sudo apt install -y build-essential curl wget file \
  libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev \
  patchelf pkg-config zip

# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

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

`build.bat` / `prepare:bundle` downloads portable Node and packs `backend` + `frontend` + `OpenWA` into the installer. The installer will be **large** (includes `node_modules`).

**CI (GitHub Actions)** — workflow [Desktop Windows Installer](../.github/workflows/desktop-windows.yml):

1. Actions → **Desktop Windows Installer** → **Run workflow**, or
2. Push a tag `v1.0.1` (builds and attaches the setup `.exe` to a Release)

Download the artifact **SchoolSMS-Windows-x64** (or the Release asset) and run the setup on the school PC.

**Output**

- `src-tauri\target\release\bundle\nsis\SchoolSMS_*_x64-setup.exe`
- `src-tauri\target\release\school-sms-desktop.exe`

### Ubuntu

```bash
cd "/path/to/School (SmS)/desktop"
chmod +x build.sh
./build.sh
```

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
- Windows frees ports via `taskkill`; Ubuntu via `lsof`.
- This is a **Windows `.exe` installer**, not an Android APK.

## Troubleshooting (Windows install PC)

### `api-ms-win-crt-math-l1-1-0.dll` is missing
The PC is missing the **Visual C++ / Universal C Runtime**.

**Quick fix on that PC:** install  
https://aka.ms/vs/17/release/vc_redist.x64.exe  
then reopen SchoolSMS.

**Build fix (already in this repo):** installer bundles VC runtime + WebView2 bootstrapper. Rebuild **v1.0.1+** with `build.bat` or GitHub Actions and reinstall.

Requires **Windows 10 or newer** for reliable installs.

### Why does the app still use Node after build?
The `.exe` is a shell. Backend (Express) + frontend (Next.js) still run on **Node**, but the **installer ships portable Node** inside the app folder (`runtime\node.exe`).  
You should **not** need to install Node separately on the school PC when using the full self-contained installer.
