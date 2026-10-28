// Prevents a console window appearing alongside the app on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// Desktop wrapper.
///
/// Intentionally minimal. The entire application — intake, the deterministic
/// rules engine, and .docx generation — runs in the web layer, so this process
/// only hosts a window. There are no Tauri commands, because exposing one would
/// create a bridge into the host that the product has no use for and that a
/// customer handling pre-submission filing data should not have to trust.
fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running the No Undue Burden Generator");
}
