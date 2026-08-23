#[tauri::command]
fn read_local_file(path: String) -> Result<Vec<u8>, String>
{
    std::fs::read(&path).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run()
{
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_local_file])
        .run(tauri::generate_context!())
        .expect("failed to run LUTCalc offline application");
}
