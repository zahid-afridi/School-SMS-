use std::net::{TcpStream, ToSocketAddrs};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Manager, RunEvent, State, WebviewWindow, WindowEvent};
use url::Url;

const FRONTEND_URL: &str = "http://127.0.0.1:3000";
const BACKEND_HEALTH: &str = "http://127.0.0.1:5000/health";

struct ServiceState {
  launcher: Mutex<Option<Child>>,
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

fn repo_root() -> PathBuf {
  if let Ok(home) = std::env::var("SCHOOL_SMS_HOME") {
    let p = PathBuf::from(home.trim());
    if p.join("backend").exists() && p.join("frontend").exists() {
      return p;
    }
  }

  if let Some(val) = read_install_config() {
    if let Some(root) = val.get("appRoot").and_then(|v| v.as_str()) {
      let trimmed = root.trim();
      if !trimmed.is_empty() {
        let p = PathBuf::from(trimmed);
        if p.join("backend").exists() {
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
        if canon.join("backend").exists() && canon.join("frontend").exists() {
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
      || !cfg!(debug_assertions);
    if looks_installed {
      return dir.join("data");
    }
  }

  // Dev fallback next to repo (not AppData)
  repo_root().join("desktop-data")
}

fn resolve_data_path(raw: &str) -> PathBuf {
  let p = PathBuf::from(raw);
  if p.is_absolute() {
    return p;
  }
  if let Some(dir) = exe_dir() {
    return dir.join(p);
  }
  p
}

fn ensure_data_layout() -> Result<PathBuf, String> {
  let data = data_dir();
  std::fs::create_dir_all(&data).map_err(|e| e.to_string())?;
  std::fs::create_dir_all(data.join("uploads")).map_err(|e| e.to_string())?;
  std::fs::create_dir_all(data.join("logs")).map_err(|e| e.to_string())?;

  if let Some(dir) = exe_dir() {
    let cfg_path = dir.join("schoolsms.config.json");
    let mut cfg = read_install_config().unwrap_or_else(|| serde_json::json!({}));
    if !cfg.is_object() {
      cfg = serde_json::json!({});
    }
    if let Some(obj) = cfg.as_object_mut() {
      obj.insert(
        "dataDir".into(),
        serde_json::Value::String("data".to_string()),
      );
      let root = repo_root();
      if root.join("backend").exists() {
        obj.insert(
          "appRoot".into(),
          serde_json::Value::String(root.to_string_lossy().to_string()),
        );
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
  });
  let _ = std::fs::write(
    data.join("desktop.env.json"),
    serde_json::to_string_pretty(&info).unwrap_or_else(|_| "{}".into()),
  );

  Ok(data)
}

fn wait_http_ok(url: &str, attempts: u32) -> Result<(), String> {
  for i in 0..attempts {
    if http_reachable(url) {
      return Ok(());
    }
    if i + 1 == attempts {
      break;
    }
    thread::sleep(Duration::from_millis(800));
  }
  Err(format!("Timed out waiting for {url}"))
}

fn http_reachable(url: &str) -> bool {
  if let Ok(out) = Command::new("curl")
    .args([
      "-s",
      "-o",
      "NUL",
      "-w",
      "%{http_code}",
      "--max-time",
      "2",
      url,
    ])
    .stdout(Stdio::piped())
    .stderr(Stdio::null())
    .output()
  {
    let code = String::from_utf8_lossy(&out.stdout).trim().to_string();
    if code.starts_with('2')
      || code.starts_with('3')
      || code == "401"
      || code == "403"
      || code == "404"
    {
      return true;
    }
  }

  if let Ok(parsed) = Url::parse(url) {
    let host = parsed.host_str().unwrap_or("127.0.0.1");
    let port = parsed.port_or_known_default().unwrap_or(80);
    let addr = format!("{host}:{port}");
    if let Ok(mut addrs) = addr.to_socket_addrs() {
      if let Some(socket) = addrs.next() {
        return TcpStream::connect_timeout(&socket, Duration::from_secs(2)).is_ok();
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
  let script = root.join("desktop").join("scripts").join("stop-services.mjs");
  if !script.exists() {
    return;
  }
  let mut cmd = Command::new("node");
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
fn start_services(state: State<ServiceState>) -> Result<(), String> {
  {
    let mut guard = state.launcher.lock().map_err(|e| e.to_string())?;
    if let Some(child) = guard.as_mut() {
      if child.try_wait().ok().flatten().is_some() {
        *guard = None;
      }
    }
  }

  let data = ensure_data_layout()?;

  {
    let mut guard = state.launcher.lock().map_err(|e| e.to_string())?;
    if let Some(mut child) = guard.take() {
      kill_child_tree(&mut child);
    }
  }
  stop_via_script(&repo_root());

  let root = repo_root();
  let script = root.join("desktop").join("scripts").join("launch-services.mjs");
  if !script.exists() {
    return Err(format!(
      "School app files not found.\n\nLooked for: {}\n\nEdit schoolsms.config.json next to the .exe:\n{{\n  \"dataDir\": \"data\",\n  \"appRoot\": \"E:\\\\MY CODE\\\\School (SmS)\"\n}}",
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

  let mut cmd = Command::new("node");
  cmd
    .arg(&script)
    .arg(format!("--mode={mode}"))
    .current_dir(&root)
    .env("SCHOOL_SMS_DATA_DIR", &data)
    .env("SCHOOL_SMS_KEEP_ALIVE", "1")
    .stdin(Stdio::null())
    .stdout(Stdio::from(log_file))
    .stderr(Stdio::from(log_err));

  let child = cmd.spawn().map_err(|e| {
    format!("Failed to start Node launcher ({e}). Is Node.js installed and on PATH?")
  })?;

  {
    let mut guard = state.launcher.lock().map_err(|e| e.to_string())?;
    *guard = Some(child);
  }

  wait_http_ok(BACKEND_HEALTH, 120)
    .map_err(|e| format!("{e}. See log: {}", log_path.display()))?;
  wait_http_ok(FRONTEND_URL, 180)
    .map_err(|e| format!("{e}. See log: {}", log_path.display()))?;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .manage(ServiceState {
      launcher: Mutex::new(None),
    })
    .invoke_handler(tauri::generate_handler![
      start_services,
      open_app,
      get_data_dir
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
