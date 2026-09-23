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
  try {
    setStatus("Preparing data folder…");
    try {
      const dataDir = await invoke("get_data_dir");
      if (dataDir) setStatus(`Data → ${dataDir}`);
    } catch {
      // optional
    }
    setStatus("Starting backend & frontend…");
    await invoke("start_services");
    setStatus("Opening app…");
    await invoke("open_app");
  } catch (err) {
    console.error(err);
    setError(String(err?.message || err));
    setStatus("Could not start SchoolSMS");
  }
}

boot();
