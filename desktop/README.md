# SchoolSMS Desktop

One codebase → **Windows** and **Ubuntu** builds.

| OS | Build script | Output |
|----|--------------|--------|
| Windows | `build.bat` | NSIS installer `.exe` |
| Ubuntu / Linux | `build.sh` | `.deb` + `.AppImage` |

Build on the same OS you target (Windows installer on Windows, Linux packages on Ubuntu).

---

## Install folder layout

```
SchoolSMS/                      ← no spaces in folder name
  school-sms-desktop.exe        ← Windows
  school-sms-desktop            ← Ubuntu
  uninstall.exe                 ← Windows only
  schoolsms.config.json
  data/
    school.db
    uploads/
    logs/
```

**Backup** = copy the whole `SchoolSMS` folder.

## Lifecycle

| Action | What happens |
|--------|----------------|
| Open app | Starts backend `:5000` + frontend `:3000`, creates `data/`, pushes DB schema |
| Close app | Stops launcher + frees ports 5000 / 3000 |

## Config (`schoolsms.config.json` next to the binary)

**Windows**

```json
{
  "dataDir": "data",
  "appRoot": "E:\\MY CODE\\School (SmS)"
}
```

**Ubuntu**

```json
{
  "dataDir": "data",
  "appRoot": "/run/media/zahid/New Volume/MY CODE/School (SmS)"
}
```

- `dataDir`: relative to binary → `{installDir}/data`
- `appRoot`: full path to the project (`backend/` + `frontend/`)

---

## Prerequisites

### Windows

1. [Node.js 20+](https://nodejs.org)
2. [Rust](https://rustup.rs)
3. [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++**

### Ubuntu

```bash
sudo apt update
sudo apt install -y build-essential curl wget file \
  libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev \
  patchelf pkg-config

# Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### Both (once per machine)

```bash
cd "/path/to/School (SmS)"
npm --prefix backend install
npm --prefix frontend install
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

**Output**

- `src-tauri\target\release\bundle\nsis\SchoolSMS_*_x64-setup.exe`
- `src-tauri\target\release\school-sms-desktop.exe`

### Ubuntu

```bash
cd "/path/to/School (SmS)/desktop"
chmod +x build.sh
./build.sh
```

Or: `npm run build:all` / from repo root `npm run desktop:build`

**Output**

- `src-tauri/target/release/bundle/deb/*.deb`
- `src-tauri/target/release/bundle/appimage/*.AppImage`
- `src-tauri/target/release/school-sms-desktop`

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
- Node.js must be on PATH; `appRoot` must point at the School project.
- Windows frees ports via `taskkill`; Ubuntu via `lsof`.
