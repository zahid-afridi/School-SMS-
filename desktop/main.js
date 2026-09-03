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
  // Prefer Tauri 2 global when available; fall back to dynamic import.
  if (window.__TAURI__?.core?.invoke) {
    return window.__TAURI__.core.invoke(cmd, args);
  }
  const { invoke } = await import("https://cdn.jsdelivr.net/npm/@tauri-apps/api@2.9.0/core.js/+esm");
  return invoke(cmd, args);
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
