//! The Fateforge app shell. The game itself is the offline web build (the GitHub Pages build of `public/`), shown
//! in the system WebView. Saves live in the WebView's storage as one SQLite file; the app also keeps a copy of that
//! file in its data folder (`save_read` / `save_write`) so they survive the WebView's storage being cleared.
use std::fs;
use std::path::PathBuf;
use tauri::ipc::{InvokeBody, Request, Response};
use tauri::{AppHandle, Manager};

const SAVE_FILE: &str = "fateforge-save.sqlite";

fn save_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(SAVE_FILE))
}

/// The saved SQLite file, or an empty body when there is none yet.
#[tauri::command]
fn save_read(app: AppHandle) -> Result<Response, String> {
    let path = save_path(&app)?;
    match fs::read(&path) {
        Ok(bytes) => Ok(Response::new(bytes)),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Response::new(Vec::new())),
        Err(e) => Err(e.to_string()),
    }
}

/// Replaces the saved file with the request body, through a temporary file so a crash never leaves half a save.
#[tauri::command]
fn save_write(app: AppHandle, request: Request<'_>) -> Result<(), String> {
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected the save file as raw bytes.".into());
    };
    if bytes.is_empty() {
        return Err("Refusing to replace the save with an empty file.".into());
    }
    let path = save_path(&app)?;
    let temp = path.with_extension("sqlite.tmp");
    fs::write(&temp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&temp, &path).map_err(|e| e.to_string())
}

/// Where the save file lives, for the Backups dialog.
#[tauri::command]
fn save_location(app: AppHandle) -> Result<String, String> {
    Ok(save_path(&app)?.display().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_read, save_write, save_location])
        .run(tauri::generate_context!())
        .expect("error while running Fateforge");
}
