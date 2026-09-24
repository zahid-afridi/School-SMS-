use std::fs::File;
use std::io;
use std::net::{TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Manager, RunEvent, State, WebviewWindow, WindowEvent};
use url::Url;
use zip::ZipArchive;

const FRONTEND_URL: &str = "http://127.0.0.1:3000";
const BACKEND_HEALTH: &str = "http://127.0.0.1:5000/health";

struct ServiceState {
  launcher: Arc<Mutex<Option<Child>>>,
}

fn exe_dir() -> Option<PathBuf> {
  std::env::current_exe()
    .ok()
    .and_then(|p| p.parent().map(|d| d.to_path_buf()))
}

fn read_install_config() -> Option<serde_json::Value> {
  let cfg = exe_dir()?.join("schoolsms.config.json");
  let text = std::fs::read_to_string(cfg).ok()?;
  serde_json::from_str(&text).ok()
}

fn looks_like_app_root(p: &Path) -> bool {
  // Production installer layout: app/{backend,frontend}
  let packaged = p.join("app").join("backend").exists() && p.join("app").join("frontend").exists();
  // Legacy / dev layout: backend + frontend at install root
  let legacy = p.join("backend").exists() && p.join("frontend").exists();
  packaged || legacy
}

fn launch_script(root: &Path) -> PathBuf {
  let packaged = root.join("app").join("launch-services.mjs");
  if packaged.exists() {
    return packaged;
  }
  root.join("desktop").join("scripts").join("launch-services.mjs")
}

fn stop_script(root: &Path) -> PathBuf {
  let packaged = root.join("app").join("stop-services.mjs");
  if packaged.exists() {
    return packaged;
  }
  root.join("desktop").join("scripts").join("stop-services.mjs")
}

fn resolve_against_exe(raw: &str) -> PathBuf {
  let p = PathBuf::from(raw);
  if p.is_absolute() {
    return p;
  }
  if let Some(dir) = exe_dir() {
    return dir.join(p);
  }
  p
}

/// Prefer install folder (next to .exe), then config, then env, then dev tree.
fn repo_root() -> PathBuf {
  if let Some(dir) = exe_dir() {
    if looks_like_app_root(&dir) {
      return dir;
    }
  }

  if let Ok(home) = std::env::var("SCHOOL_SMS_HOME") {
    let p = PathBuf::from(home.trim());
    if looks_like_app_root(&p) {
      return p;
    }
  }

  if let Some(val) = read_install_config() {
    if let Some(root) = val.get("appRoot").and_then(|v| v.as_str()) {
      let trimmed = root.trim();
      if !trimmed.is_empty() {
        let p = resolve_against_exe(trimmed);
        if looks_like_app_root(&p) {
          return p;
        }
      }
    }
  }

  if let Some(dir) = exe_dir() {
    let candidates = [
      dir.join("../../../../.."),
      dir.join("../../../.."),
      dir.join("../../.."),
      dir.join("../.."),
      dir.join(".."),
    ];
    for c in candidates {
      if let Ok(canon) = c.canonicalize() {
        if looks_like_app_root(&canon) {
          return canon;
        }
      }
    }
  }

  PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    .join("../..")
    .canonicalize()
    .unwrap_or_else(|_| PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../.."))
}

/// Prefer install folder: `{installDir}/data` so backup = copy this folder.
fn data_dir() -> PathBuf {
  if let Ok(custom) = std::env::var("SCHOOL_SMS_DATA_DIR") {
    if !custom.trim().is_empty() {
      return resolve_data_path(custom.trim());
    }
  }

  if let Some(val) = read_install_config() {
    if let Some(d) = val.get("dataDir").and_then(|v| v.as_str()) {
      if !d.trim().is_empty() {
        return resolve_data_path(d.trim());
      }
    }
  }

  if let Some(dir) = exe_dir() {
    let looks_installed = dir.join("uninstall.exe").exists()
      || dir.join("schoolsms.config.json").exists()
      || dir.join("resources").join("app-payload.zip").exists()
      || !cfg!(debug_assertions);
    if looks_installed {
      return dir.join("data");
    }
  }

  repo_root().join("desktop-data")
}

fn resolve_data_path(raw: &str) -> PathBuf {
  resolve_against_exe(raw)
}

fn find_resource_file(name: &str) -> Option<PathBuf> {
  let dir = exe_dir()?;
  let candidates = [
    dir.join("resources").join(name),
    dir.join(name),
    dir.join("resources").join("resources").join(name),
  ];
  candidates.into_iter().find(|p| p.is_file())
}

fn read_json_file(path: &Path) -> Option<serde_json::Value> {
  let text = std::fs::read_to_string(path).ok()?;
  serde_json::from_str(&text).ok()
}

fn bundle_manifest() -> Option<serde_json::Value> {
  read_json_file(&find_resource_file("bundle-manifest.json")?)
}

fn installed_marker_path(dir: &Path) -> PathBuf {
  dir.join(".schoolsms-installed.json")
}

fn read_installed_marker(dir: &Path) -> Option<serde_json::Value> {
  read_json_file(&installed_marker_path(dir))
}

fn write_installed_marker(dir: &Path, manifest: &serde_json::Value) -> Result<(), String> {
  let payload = serde_json::json!({
    "version": manifest.get("version").cloned().unwrap_or(serde_json::Value::Null),
    "nodeVersion": manifest.get("nodeVersion").cloned().unwrap_or(serde_json::Value::Null),
    "appSha256": manifest.get("appSha256").cloned().unwrap_or(serde_json::Value::Null),
    "nodeSha256": manifest.get("nodeSha256").cloned().unwrap_or(serde_json::Value::Null),
    "installedAt": chrono_like_now(),
    "layout": {
      "data": "data",
      "runtime": "runtime",
      "config": "schoolsms.config.json",
      "backupHint": "Copy the whole SchoolSMS folder. Critical files live in data/."
    }
  });
  std::fs::write(
    installed_marker_path(dir),
    serde_json::to_string_pretty(&payload).unwrap_or_else(|_| "{}".into()),
  )
  .map_err(|e| e.to_string())
}

fn chrono_like_now() -> String {
  // Stable ISO-ish stamp without extra chrono crate dependency
  use std::time::{SystemTime, UNIX_EPOCH};
  let secs = SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|d| d.as_secs())
    .unwrap_or(0);
  format!("{secs}")
}

fn sha_changed(manifest: &serde_json::Value, installed: &Option<serde_json::Value>, key: &str) -> bool {
  let Some(new_sha) = manifest.get(key).and_then(|v| v.as_str()) else {
    return true;
  };
  let Some(old) = installed else {
    return true;
  };
  match old.get(key).and_then(|v| v.as_str()) {
    Some(old_sha) => old_sha != new_sha,
    None => true,
  }
}

fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), String> {
  std::fs::create_dir_all(dest).map_err(|e| e.to_string())?;
  let file = File::open(zip_path).map_err(|e| format!("open {}: {e}", zip_path.display()))?;
  let mut archive =
    ZipArchive::new(file).map_err(|e| format!("zip {}: {e}", zip_path.display()))?;

  for i in 0..archive.len() {
    let mut entry = archive
      .by_index(i)
      .map_err(|e| format!("zip entry {i}: {e}"))?;
    let Some(rel) = entry.enclosed_name() else {
      continue;
    };

    // Never overwrite local school data or install markers while unpacking
    let rel_str = rel.to_string_lossy().replace('\\', "/");
    if rel_str == "data"
      || rel_str.starts_with("data/")
      || rel_str == "schoolsms.config.json"
      || rel_str == ".schoolsms-installed.json"
      || rel_str == "BACKUP.txt"
    {
      continue;
    }
    // Preserve WhatsApp sessions across upgrades (legacy + packaged paths)
    if (rel_str.starts_with("OpenWA/data/") && rel_str != "OpenWA/data/sessions/.gitkeep")
      || (rel_str.starts_with("app/openwa/data/")
        && rel_str != "app/openwa/data/sessions/.gitkeep")
    {
      let existing = dest.join(&rel);
      if existing.exists() {
        continue;
      }
    }

    let outpath = dest.join(rel);
    if entry.is_dir() {
      std::fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
      continue;
    }
    if let Some(parent) = outpath.parent() {
      std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
    io::copy(&mut entry, &mut outfile).map_err(|e| e.to_string())?;
  }
  Ok(())
}

fn write_backup_guide(dir: &Path) {
  let text = "\
SchoolSMS — Backup Guide
========================

Easy backup: copy this WHOLE SchoolSMS folder to a USB drive or another PC.

Critical school data (must keep):
  data\\school.db     database
  data\\uploads\\      photos and files
  data\\logs\\         app logs
  data\\.jwt-secret   local login signing key (keep with the DB)

App files (reinstallable):
  app\\          compiled backend / frontend / WhatsApp builds
  runtime\\      portable Node
  resources\\    installer payload

Uninstall keeps the data\\ folder so records are not deleted.
";
  let _ = std::fs::write(dir.join("BACKUP.txt"), text);
}

fn ensure_install_folders(dir: &Path) -> Result<(), String> {
  std::fs::create_dir_all(dir.join("data").join("uploads")).map_err(|e| e.to_string())?;
  std::fs::create_dir_all(dir.join("data").join("logs")).map_err(|e| e.to_string())?;
  std::fs::create_dir_all(dir.join("app").join("openwa").join("data").join("sessions"))
    .map_err(|e| e.to_string())?;
  write_backup_guide(dir);
  Ok(())
}

fn write_startup_status(step: &str, message: &str) {
  let dir = data_dir().join("logs");
  let _ = std::fs::create_dir_all(&dir);
  let payload = serde_json::json!({
    "step": step,
    "message": message,
    "at": chrono_like_now(),
  });
  let _ = std::fs::write(
    dir.join("startup-status.json"),
    serde_json::to_string_pretty(&payload).unwrap_or_else(|_| "{}".into()),
  );
}

/// Unpack bundled Node + app next to the .exe when present (installed builds).
/// Re-extracts when installer payload hash changes (smooth upgrades) without touching data/.
fn ensure_bundled_runtime() -> Result<(), String> {
  let Some(dir) = exe_dir() else {
    return Ok(());
  };

  let node_zip = find_resource_file("node-runtime.zip");
  let app_zip = find_resource_file("app-payload.zip");
  if node_zip.is_none() && app_zip.is_none() {
    return Ok(());
  }

  ensure_install_folders(&dir)?;

  let manifest = bundle_manifest().unwrap_or_else(|| serde_json::json!({}));
  if manifest.get("placeholder").and_then(|v| v.as_bool()) == Some(true) {
    return Err(
      "Installer is incomplete (placeholder bundle manifest).\nRebuild with build.bat / CI so app-payload.zip is included."
        .into(),
    );
  }
  let installed = read_installed_marker(&dir);

  let runtime_marker = dir.join("runtime").join("node.exe");
  let need_node = !runtime_marker.exists() || sha_changed(&manifest, &installed, "nodeSha256");
  if let Some(ref zip) = node_zip {
    if need_node {
      write_startup_status("unpack", "Installing portable Node runtime…");
      let _ = std::fs::remove_dir_all(dir.join("runtime"));
      extract_zip(zip, &dir.join("runtime"))?;
    }
  }

  let app_marker = dir.join("app").join("launch-services.mjs");
  let need_app = !app_marker.exists() || sha_changed(&manifest, &installed, "appSha256");
  if let Some(ref zip) = app_zip {
    if need_app {
      write_startup_status("unpack", "Unpacking local app (first launch)…");
      extract_zip(zip, &dir)?;
    }
  }

  if app_zip.is_some() && !looks_like_app_root(&dir) {
    return Err(
      "Bundled School app files are missing. Reinstall SchoolSMS or rebuild with prepare-bundle."
        .into(),
    );
  }

  let _ = write_installed_marker(&dir, &manifest);
  Ok(())
}

/// Prefer portable Node shipped with the installer; fall back to PATH `node`.
fn node_bin() -> PathBuf {
  if let Some(dir) = exe_dir() {
    let bundled = if cfg!(target_os = "windows") {
      dir.join("runtime").join("node.exe")
    } else {
      dir.join("runtime").join("node")
    };
    if bundled.exists() {
      return bundled;
    }
  }
  PathBuf::from("node")
}

fn path_with_bundled_node() -> Option<String> {
  let dir = exe_dir()?;
  let runtime = dir.join("runtime");
  if !runtime.exists() {
    return None;
  }
  let old = std::env::var("PATH").unwrap_or_default();
  let sep = if cfg!(target_os = "windows") {
    ";"
  } else {
    ":"
  };
  Some(format!("{}{}{}", runtime.display(), sep, old))
}

fn ensure_data_layout() -> Result<PathBuf, String> {
  // Unpack / upgrade app payload first so repo_root() resolves to the install folder.
  ensure_bundled_runtime()?;

  let data = data_dir();
  std::fs::create_dir_all(&data).map_err(|e| e.to_string())?;
  std::fs::create_dir_all(data.join("uploads")).map_err(|e| e.to_string())?;
  std::fs::create_dir_all(data.join("logs")).map_err(|e| e.to_string())?;

  if let Some(dir) = exe_dir() {
    ensure_install_folders(&dir)?;

    let cfg_path = dir.join("schoolsms.config.json");
    // Preserve an existing config on upgrade; only fill missing keys.
    let mut cfg = read_install_config().unwrap_or_else(|| serde_json::json!({}));
    if !cfg.is_object() {
      cfg = serde_json::json!({});
    }
    if let Some(obj) = cfg.as_object_mut() {
      if !obj.contains_key("dataDir") {
        obj.insert(
          "dataDir".into(),
          serde_json::Value::String("data".to_string()),
        );
      }
      // Installed layout: app lives next to the .exe — keep relative "." so moves/backups work.
      if looks_like_app_root(&dir) {
        obj.insert("appRoot".into(), serde_json::Value::String(".".to_string()));
      } else if !obj.contains_key("appRoot") {
        let root = repo_root();
        if looks_like_app_root(&root) {
          obj.insert(
            "appRoot".into(),
            serde_json::Value::String(root.to_string_lossy().to_string()),
          );
        }
      }
    }
    let _ = std::fs::write(
      &cfg_path,
      serde_json::to_string_pretty(&cfg).unwrap_or_else(|_| "{}".into()),
    );
  }

  let info = serde_json::json!({
    "dataDir": data.to_string_lossy(),
    "dbFile": data.join("school.db").to_string_lossy(),
    "uploadDir": data.join("uploads").to_string_lossy(),
    "backendUrl": "http://127.0.0.1:5000",
    "frontendUrl": "http://127.0.0.1:3000",
    "nodeBin": node_bin().to_string_lossy(),
  });
  let _ = std::fs::write(
    data.join("desktop.env.json"),
    serde_json::to_string_pretty(&info).unwrap_or_else(|_| "{}".into()),
  );

  Ok(data)
}

fn read_log_tail(path: &Path, max_chars: usize) -> String {
  let Ok(text) = std::fs::read_to_string(path) else {
    return String::new();
  };
  let trimmed = text.trim();
  if trimmed.is_empty() {
    return String::new();
  }
  if trimmed.len() <= max_chars {
    return trimmed.to_string();
  }
  trimmed[trimmed.len().saturating_sub(max_chars)..].to_string()
}

fn startup_status_path() -> PathBuf {
  data_dir().join("logs").join("startup-status.json")
}

fn read_startup_status_message() -> Option<String> {
  let path = startup_status_path();
  let val = read_json_file(&path)?;
  let step = val.get("step").and_then(|v| v.as_str()).unwrap_or("");
  let message = val.get("message").and_then(|v| v.as_str()).unwrap_or("");
  if message.is_empty() {
    return None;
  }
  if step.is_empty() {
    Some(message.to_string())
  } else {
    Some(format!("[{step}] {message}"))
  }
}

fn launcher_failed_message(log_path: &Path) -> String {
  let status = read_startup_status_message().unwrap_or_default();
  let launcher = read_log_tail(log_path, 1200);
  let backend = read_log_tail(&data_dir().join("logs").join("backend.log"), 800);
  let prisma = read_log_tail(&data_dir().join("logs").join("prisma.log"), 800);

  let mut parts = vec!["Local services failed to start.".to_string()];
  if !status.is_empty() {
    parts.push(status);
  }
  if !prisma.is_empty() {
    parts.push(format!("--- prisma.log ---\n{prisma}"));
  }
  if !backend.is_empty() {
    parts.push(format!("--- backend.log ---\n{backend}"));
  }
  if !launcher.is_empty() {
    parts.push(format!("--- launcher.log ---\n{launcher}"));
  }
  parts.push(format!("Full logs: {}", data_dir().join("logs").display()));
  parts.join("\n\n")
}

fn child_exited(launcher: &Mutex<Option<Child>>) -> Option<String> {
  let Ok(mut guard) = launcher.lock() else {
    return None;
  };
  let Some(child) = guard.as_mut() else {
    return None;
  };
  match child.try_wait() {
    Ok(Some(status)) => Some(format!("exit {status}")),
    _ => None,
  }
}

fn wait_http_ok(
  url: &str,
  attempts: u32,
  launcher: &Mutex<Option<Child>>,
  log_path: &Path,
) -> Result<(), String> {
  for i in 0..attempts {
    if let Some(exit) = child_exited(launcher) {
      return Err(format!(
        "Launcher stopped unexpectedly ({exit}).\n\n{}",
        launcher_failed_message(log_path)
      ));
    }
    if http_reachable(url) {
      return Ok(());
    }
    if i + 1 == attempts {
      break;
    }
    thread::sleep(Duration::from_millis(500));
  }
  Err(format!(
    "Timed out waiting for {url}.\n\n{}",
    launcher_failed_message(log_path)
  ))
}

fn http_reachable(url: &str) -> bool {
  // TCP connect is enough — school PCs often lack curl, and port bind means the service is up.
  if let Ok(parsed) = Url::parse(url) {
    let host = parsed.host_str().unwrap_or("127.0.0.1");
    let port = parsed.port_or_known_default().unwrap_or(80);
    let addr = format!("{host}:{port}");
    if let Ok(mut addrs) = addr.to_socket_addrs() {
      if let Some(socket) = addrs.next() {
        return TcpStream::connect_timeout(&socket, Duration::from_millis(800)).is_ok();
      }
    }
  }
  false
}

fn kill_child_tree(child: &mut Child) {
  let pid = child.id();
  if cfg!(target_os = "windows") {
    let _ = Command::new("taskkill")
      .args(["/PID", &pid.to_string(), "/T", "/F"])
      .stdin(Stdio::null())
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .status();
  } else {
    let _ = child.kill();
  }
}

fn stop_via_script(root: &Path) {
  let script = stop_script(root);
  if !script.exists() {
    return;
  }
  let mut cmd = Command::new(node_bin());
  if let Some(path) = path_with_bundled_node() {
    cmd.env("PATH", path);
  }
  let _ = cmd
    .arg(script)
    .env("SCHOOL_SMS_DATA_DIR", data_dir())
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::null())
    .status();
}

fn cleanup(app: &AppHandle) {
  if let Some(state) = app.try_state::<ServiceState>() {
    if let Ok(mut guard) = state.launcher.lock() {
      if let Some(mut child) = guard.take() {
        kill_child_tree(&mut child);
      }
    }
  }
  stop_via_script(&repo_root());
}

#[tauri::command]
async fn start_services(state: State<'_, ServiceState>) -> Result<(), String> {
  // Run on a worker thread so splash can keep polling get_startup_status.
  let launcher = Arc::clone(&state.launcher);
  tauri::async_runtime::spawn_blocking(move || start_services_inner(&launcher))
    .await
    .map_err(|e| format!("Startup task failed: {e}"))?
}

fn start_services_inner(launcher: &Mutex<Option<Child>>) -> Result<(), String> {
  {
    let mut guard = launcher.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
      if child.try_wait().ok().flatten().is_some() {
        *guard = None;
      }
    }
  }

  write_startup_status("prepare", "Preparing local data…");
  let data = ensure_data_layout()?;
  ensure_bundled_runtime()?;

  {
    let mut guard = launcher.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
      kill_child_tree(&mut child);
    }
  }
  stop_via_script(&repo_root());

  let root = repo_root();
  let script = launch_script(&root);
  if !script.exists() {
    return Err(format!(
      "School app files not found.\n\nLooked for: {}\n\nIf this is a fresh install, wait for first-run unpack or reinstall.\nDev builds: set appRoot in schoolsms.config.json next to the .exe.",
      script.display()
    ));
  }

  let log_dir = data.join("logs");
  let log_path = log_dir.join("launcher.log");
  let log_file = std::fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(&log_path)
    .map_err(|e| e.to_string())?;
  let log_err = log_file.try_clone().map_err(|e| e.to_string())?;

  let mode = if cfg!(debug_assertions) {
    "dev"
  } else {
    "prod"
  };

  write_startup_status("launch", "Starting local backend & frontend…");

  let node = node_bin();
  let mut cmd = Command::new(&node);
  cmd
    .arg(&script)
    .arg(format!("--mode={mode}"))
    .current_dir(&root)
    .env("SCHOOL_SMS_DATA_DIR", &data)
    .env("SCHOOL_SMS_KEEP_ALIVE", "1")
    .stdin(Stdio::null())
    .stdout(Stdio::from(log_file))
    .stderr(Stdio::from(log_err));

  if let Some(path) = path_with_bundled_node() {
    cmd.env("PATH", path);
  }

  let child = cmd.spawn().map_err(|e| {
    format!(
      "Failed to start Node launcher ({e}).\nTried: {}\nBundled runtime missing? Rebuild with prepare-bundle.",
      node.display()
    )
  })?;

  {
    let mut guard = launcher.lock().map_err(|e| e.to_string())?;
    *guard = Some(child);
  }

  // Core local app only — OpenWA is optional and must not block the UI.
  wait_http_ok(BACKEND_HEALTH, 180, launcher, &log_path)?;
  wait_http_ok(FRONTEND_URL, 180, launcher, &log_path)?;

  write_startup_status("ready", "Opening SchoolSMS…");
  Ok(())
}

#[tauri::command]
fn open_app(app: AppHandle) -> Result<(), String> {
  let url = Url::parse(FRONTEND_URL).map_err(|e| e.to_string())?;
  if let Some(window) = app.get_webview_window("main") {
    window.navigate(url).map_err(|e| e.to_string())?;
    let _ = window.set_title("School SmS");
    return Ok(());
  }

  let windows = app.webview_windows();
  if let Some((_, window)) = windows.iter().next() {
    navigate_window(window, FRONTEND_URL)?;
  }
  Ok(())
}

fn navigate_window(window: &WebviewWindow, target: &str) -> Result<(), String> {
  let url = Url::parse(target).map_err(|e| e.to_string())?;
  window.navigate(url).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_data_dir() -> String {
  data_dir().to_string_lossy().to_string()
}

#[tauri::command]
fn get_startup_status() -> String {
  read_startup_status_message().unwrap_or_else(|| "Starting local services…".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(ServiceState {
      launcher: Arc::new(Mutex::new(None)),
    })
    .invoke_handler(tauri::generate_handler![
      start_services,
      open_app,
      get_data_dir,
      get_startup_status
    ])
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { .. } = event {
        cleanup(window.app_handle());
      }
    })
    .build(tauri::generate_context!())
    .expect("error while building School SmS")
    .run(|app_handle, event| {
      if let RunEvent::Exit = event {
        cleanup(app_handle);
      }
    });
}
