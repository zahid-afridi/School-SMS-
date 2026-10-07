const statusEl = document.getElementById("status");
const errorEl = document.getElementById("error");
const barEl = document.getElementById("bar");
const actionsEl = document.getElementById("actions");
const btnRetry = document.getElementById("btn-retry");
const btnLogs = document.getElementById("btn-logs");

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function setError(text) {
  if (!errorEl) return;
  errorEl.hidden = !text;
  errorEl.textContent = text || "";
  if (actionsEl) actionsEl.hidden = !text;
  if (barEl) barEl.style.display = text ? "none" : "";
}

async function invoke(cmd, args) {
  if (window.schoolsms?.invoke) {
    return window.schoolsms.invoke(cmd, args);
  }
  throw new Error(
    "Desktop bridge unavailable. Reinstall SchoolSMS or rebuild the Electron app."
  );
}

let statusTimer = null;

async function boot(retryAttempt = 0) {
  if (statusTimer) clearInterval(statusTimer);
  setError(null);
  setStatus(
    retryAttempt > 0
      ? "Initializing database & services (retrying)…"
      : "Starting SchoolSMS…"
  );

  try {
    try {
      const dataDir = await invoke("get_data_dir");
      if (dataDir) setStatus("Data folder ready");
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
    }, 350);

    setStatus("Starting local services…");
    await invoke("start_services");
    if (statusTimer) clearInterval(statusTimer);
    setStatus("Opening SchoolSMS…");
    await invoke("open_app");
  } catch (err) {
    if (statusTimer) clearInterval(statusTimer);
    console.error(err);

    // On low-spec school systems, if the very first launch hits a transient lag during initial DB push,
    // automatically retry once before displaying error buttons.
    if (retryAttempt === 0) {
      console.log("[SchoolSMS] First boot needs a second attempt, auto-retrying...");
      setStatus("Finalizing database setup, retrying…");
      await new Promise((r) => setTimeout(r, 2000));
      return boot(1);
    }

    setError(String(err?.message || err));
    setStatus("Could not start SchoolSMS");
  }
}

btnRetry?.addEventListener("click", () => {
  boot();
});

btnLogs?.addEventListener("click", async () => {
  try {
    await invoke("open_logs_dir");
  } catch (err) {
    console.error(err);
  }
});

boot();
