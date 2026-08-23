# LUTCalc 离线桌面端

`feat/tauri-offline-app` 分支将现有 React/Vite 工作台封装为 **Tauri v2** 桌面应用。计算核心、内嵌原版引擎、前端资源和本地保存逻辑均随应用本身构建；日常使用不需要运行 Express 服务。

## 发行范围

| 系统                       | 架构 | 交付文件             | 启动方式                           | 当前状态                                   |
| -------------------------- | ---- | -------------------- | ---------------------------------- | ------------------------------------------ |
| Windows                    | x64  | `LUTCalc.exe`        | 双击运行                           | 正式目标；不生成 MSI 或 NSIS 安装器。      |
| Linux                      | x64  | `LUTCalc_*.AppImage` | 添加可执行权限后双击，或从终端启动 | 正式目标；不额外生成 deb/rpm。             |
| macOS                      | —    | —                    | —                                  | 暂不支持，不在本分支的构建矩阵中。         |
| FreeBSD / OpenBSD / NetBSD | —    | —                    | —                                  | 非正式后续评估，不作兼容性或可执行包承诺。 |

> Windows 便携版是**裸可执行文件**，而 Linux 便携版是 **AppImage**。二者都是免安装优先的交付物，但技术实现不同。

## 获取与启动

Windows 用户下载 `LUTCalc.exe` 后可直接双击运行。应用依赖 Microsoft Edge WebView2；Windows 10 1803 及以上系统通常已提供该运行时。若系统被精简且缺少 WebView2，应先从微软安装 WebView2 Runtime，再运行应用。

Linux 用户下载 `.AppImage` 后，先赋予执行权限：

```bash
chmod +x LUTCalc_*.AppImage
./LUTCalc_*.AppImage
```

多数图形文件管理器也可以在授予执行权限后直接双击启动。AppImage 会带上应用本身所需的打包文件，但不同发行版、桌面环境和 FUSE 配置仍可能影响启动；发行版包管理器安装路径不属于此便携版的支持目标。

## 开发与构建

安装 Node.js 22、pnpm 10 和 Rust 后，在仓库根目录执行：

```bash
pnpm install
pnpm desktop:dev
```

该命令会先启动 Vite，再启动 Tauri 桌面窗口。生产构建命令如下：

| 目标                             | 命令                         | 预期产物                                                      |
| -------------------------------- | ---------------------------- | ------------------------------------------------------------- |
| Linux AppImage                   | `pnpm desktop:linux`         | `src-tauri/target/release/bundle/appimage/*.AppImage`         |
| Windows 裸 EXE（Windows 原生）   | `pnpm desktop:windows`       | `src-tauri/target/release/LUTCalc.exe`                        |
| Windows 裸 EXE（Linux 交叉编译） | `pnpm desktop:windows:cross` | `src-tauri/target/x86_64-pc-windows-msvc/release/LUTCalc.exe` |

Linux AppImage 必须在 Linux 环境构建。Windows 裸 EXE 优先在 Windows 原生环境构建；若无 Windows 构建环境，可在 Linux 使用官方建议的 MSVC + `cargo-xwin` 路径运行 `pnpm desktop:windows:cross`。交叉编译仅证明 PE x64 文件可生成，不能替代 Windows 上的实际启动、WebView2 可用性、病毒扫描和代码签名验证。若后续配置持续集成，应使用 Windows 原生运行器构建 EXE，并使用 `ubuntu-22.04` 构建 AppImage，以保持较低的 glibc 兼容基线。

Linux 构建机须具备 Tauri 对 WebKitGTK 的开发依赖。对于 Debian/Ubuntu，可按 Tauri 官方前置条件安装 `libwebkit2gtk-4.1-dev`、`build-essential`、`libxdo-dev`、`libssl-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev` 等依赖。[1] 交叉编译 Windows EXE 还需安装 LLVM/LLD、执行 `rustup target add x86_64-pc-windows-msvc`，并通过 `cargo install --locked cargo-xwin` 安装交叉编译运行器。[3]

## 发行前检查

发布便携文件前，应在对应原生系统完成一次实际启动、导入 LUT、导出 LUT 和关闭重开后的本地设置持久化检查。对于公开下载，还应发布 SHA-256 校验和：

```bash
sha256sum LUTCalc_*.AppImage
# Windows PowerShell
Get-FileHash .\LUTCalc.exe -Algorithm SHA256
```

## 参考资料

[1]: https://v2.tauri.app/start/prerequisites/ "Tauri v2：前置条件"
[2]: https://v2.tauri.app/distribute/appimage/ "Tauri v2：AppImage 分发"
[3]: https://v2.tauri.app/distribute/windows-installer/ "Tauri v2：Windows 安装器与跨平台编译"
