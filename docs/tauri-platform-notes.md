# Tauri 跨平台便携版交付说明

本项目的离线桌面端采用 **Tauri v2**。发行策略以用户能够直接启动为目标，但不同操作系统对“单文件”的技术定义不同。

| 平台                       | 正式交付格式                        | 用户操作                                       | 支持状态与边界                                                                                                                                                                                                                  |
| -------------------------- | ----------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Windows x64                | `LUTCalc.exe`（裸二进制、无安装器） | 双击运行                                       | 便携版；应用通过系统 WebView2 渲染，Windows 10 1803+ 通常自带该运行时。若目标设备缺少 WebView2，则需单独安装运行时，无法保持严格单文件。                                                                                        |
| Linux x64                  | `LUTCalc.AppImage`                  | 添加可执行权限后双击，或在文件管理器中选择运行 | 便携优先；AppImage 会打包应用依赖和文件，但不是对所有旧发行版绝对兼容。应在尽可能旧且仍具备 WebKitGTK 4.1 的基线系统构建。                                                                                                      |
| macOS                      | —                                   | —                                              | 当前明确不纳入构建、发布或兼容性承诺；如未来恢复该目标，应以代码签名和公证的 `.app` 应用包重新评估。                                                                                                                            |
| FreeBSD / OpenBSD / NetBSD | 无正式产物                          | 不适用                                         | 不纳入初始 CI、构建或兼容性承诺；Tauri 官方桌面支持和分发文档以 Windows、Linux、macOS 为主要目标，Linux AppImage 不能作为 BSD 可执行格式。若后续有需求，应按具体 BSD 版本单独验证 WebView 后端、构建依赖和 Ports/pkg 发布路径。 |

> 当前交付中，Windows 的“直接双击”采用不经 NSIS/MSI 安装器的裸 `.exe`；Linux 的“直接双击”采用 `.AppImage`。二者不应被误认为同一种包格式。

## 构建要求

| 平台                   | 开发/构建要求                                                                                                                                       | 产物构建方式                                                                                            |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Linux（Debian/Ubuntu） | `libwebkit2gtk-4.1-dev`、`build-essential`、`libxdo-dev`、`libssl-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev` 等系统依赖，以及 Rust 工具链 | 在 Ubuntu 22.04 或 Debian 12 等较旧的兼容基线构建 x64 AppImage；不在新系统构建后声称支持旧 glibc 系统。 |
| Windows                | Microsoft C++ Build Tools（选择“Desktop development with C++”）；Microsoft Edge WebView2                                                            | 在 Windows 原生 CI 运行器构建裸 `.exe`；无需 NSIS/MSI。                                                 |
| macOS                  | —                                                                                                                                                   | 不在当前构建矩阵中。                                                                                    |

Tauri 配置采用 `src-tauri/tauri.conf.json`，通过 `build.beforeDevCommand`、`build.beforeBuildCommand`、`build.devUrl` 和 `build.frontendDist` 对接现有 Vite 前端。配置默认只生成 Linux 的 AppImage；Windows 由原生发布工作流通过 `--no-bundle` 生成裸可执行文件。macOS 不在当前分支的构建矩阵中。

## 参考资料

[1]: https://v2.tauri.app/start/prerequisites/ "Tauri v2：前置条件"
[2]: https://v2.tauri.app/develop/configuration-files/ "Tauri v2：配置文件"
[3]: https://v2.tauri.app/distribute/appimage/ "Tauri v2：AppImage 分发"
[4]: https://v2.tauri.app/distribute/macos-application-bundle/ "Tauri v2：macOS 应用包"
[5]: https://v2.tauri.app/distribute/sign/macos/ "Tauri v2：macOS 代码签名"
