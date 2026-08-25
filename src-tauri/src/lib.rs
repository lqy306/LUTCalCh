#[tauri::command]
fn read_local_file(path: String) -> Result<Vec<u8>, String>
{
    std::fs::read(&path).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run()
{
    #[cfg(target_os = "linux")]
    {
        /* WebKitGTK 在部分 Linux 图形环境（尤其 NVIDIA 驱动与 Wayland/X11 合成器）下，
           默认的 DMA-BUF/硬件合成渲染路径可能失败，症状是窗口打开后整窗白屏。
           在 WebKit 进程启动前设置兼容性环境变量，用户无需手动 export；
           用户若已显式设置过同名变量，则尊重其选择、不覆盖。 */
        for (key, value) in [
            ("WEBKIT_DISABLE_DMABUF_RENDERER", "1"),
            ("WEBKIT_DISABLE_COMPOSITING_MODE", "1"),
        ]
        {
            if std::env::var_os(key).is_none()
            {
                std::env::set_var(key, value);
            }
        }
    }

    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_local_file])
        .run(tauri::generate_context!())
        .expect("failed to run LUTCalc offline application");
}
