# SchoolSMS — Desktop app

See **[`desktop/README.md`](../desktop/README.md)**.

## Build

```bat
cd /d "E:\MY CODE\School (SmS)\desktop"
npm run build:all
```

Installer:

`desktop\src-tauri\target\release\bundle\nsis\SchoolSMS_1.0.0_x64-setup.exe`

After install, set `appRoot` in `schoolsms.config.json` next to the exe.
