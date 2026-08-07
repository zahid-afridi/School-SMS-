# WhatsApp (OpenWA) — School (SmS)

OpenWA lives **inside this project**:

```
School (SmS)\
  backend\
  frontend\
  OpenWA\          ← WhatsApp gateway
  docs\WHATSAPP.md
```

## New school — how they connect

1. Admin starts OpenWA + School backend (installer can do this for Electron).
2. School opens **Messages → Connect WhatsApp**
3. Clicks **Connect** → scans QR on their phone
4. Done — each school gets its own session automatically

Gateway defaults come from `backend/.env` (`OPENWA_URL`, `OPENWA_API_KEY`).

## Run locally

**Terminal 1 — OpenWA**
```powershell
cd "E:\MY CODE\School (SmS)\OpenWA"
npm run start:dev
```
API: http://localhost:2785

**Terminal 2 — School backend**
```powershell
cd "E:\MY CODE\School (SmS)\backend"
npm run dev
```

**Terminal 3 — School frontend**
```powershell
cd "E:\MY CODE\School (SmS)\frontend"
npm run dev
```

Then: **Messages → Connect WhatsApp** → Connect → scan QR.

### API key
After first OpenWA start, copy the key from the terminal banner or `OpenWA/data/.api-key` into:

```env
OPENWA_URL=http://localhost:2785
OPENWA_API_KEY=owa_k1_...
```

### Windows note
`OpenWA/.env` uses `DATABASE_SYNCHRONIZE=true` so SQLite tables create correctly (TypeORM migration globs break on Windows).

## Electron (future)
Prefer the Tauri desktop shell in [`docs/DESKTOP.md`](DESKTOP.md). OpenWA can be added later as an optional sidecar when internet is available.
