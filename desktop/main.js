const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const barEl = document.getElementById("bar");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setError(text) {
  if (!errorEl) return;
  errorEl.hidden = !text;
  errorEl.textContent = text || "";
  if (barEl) barEl.style.display = text ? "none" : "";
}

async function invoke(cmd, args) {
  // Offline installers must not depend on a CDN.
  if (window.__TAURI__?.core?.invoke) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  throw new Error(
    "Tauri API unavailable. Reinstall SchoolSMS or rebuild the desktop app."
  );
}

async function boot() {
  let statusTimer = null;
  try {
    setStatus("Preparing local data…");
    try {
      const dataDir = await invoke("get_data_dir");
      if (dataDir) setStatus(`Data folder ready`);
    } catch {
      // optional
    }

    statusTimer = setInterval(async () => {
      try {
        const msg = await invoke("get_startup_status");
        if (msg) setStatus(msg);
      } catch {
        /* ignore while starting */
      }
    }, 700);

    setStatus("Starting local backend & frontend…");
    await invoke("start_services");
    if (statusTimer) clearInterval(statusTimer);
    setStatus("Opening SchoolSMS…");
    await invoke("open_app");
  } catch (err) {
    if (statusTimer) clearInterval(statusTimer);
    console.error(err);
    setError(String(err?.message || err));
    setStatus("Could not start SchoolSMS");
  }
}

boot();
