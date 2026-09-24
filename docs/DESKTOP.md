# SchoolSMS — Desktop app

See **[`desktop/README.md`](../desktop/README.md)**.

## Build

```bat
cd /d "E:\MY CODE\School (SmS)\desktop"
npm run build:all
```

Installer:

`desktop\release\SchoolSMS_1.1.1_x64-setup.exe`

After install, `schoolsms.config.json` is written automatically (`appRoot: "."`).
Windows builds also ship portable Node + the app payload (no Node install on the school PC).

**CI:** `.github/workflows/desktop-windows.yml` (**SchoolSMS Electron Windows**) — run manually from Actions, or push tag `v*`.

**After install:** first launch creates `{installDir}\data\school.db` (SQLite), then starts backend `:5000` and frontend `:3000`.
