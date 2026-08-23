# LUTCalc 构建与发布经验

本文记录离线桌面端（Tauri v2）在 Ubuntu 22.04 上从源码到发布 Release 的完整经验，包含踩过的坑与结论。适用于本次维护环境：Ubuntu 22.04.3（6 核）、Node 24、pnpm 10、Rust 1.98。

## 0. 版本号统一

每次发版前，四个文件中的版本号必须一致：

- `package.json` 的 `version`
- `src-tauri/tauri.conf.json` 的 `version`
- `src-tauri/Cargo.toml` 的 `version`
- `src-tauri/Cargo.lock` 中 `name = "lutcalc"` 的 `version`

本次发布为补丁版本 `1.0.2`。注意：`template.json` 里的 `1.0.0` 是脚手架模板内容，不属于本应用版本，不要改动。

## 1. 前端构建

```bash
pnpm build
```

产物：

- `dist/public/`：Vite 静态站点（离线桌面端会把该目录打包进二进制）
- `dist/index.js`：Express 静态服务入口（网页部署用）

离线应用的经验：

- 移除 `index.html` 中对 Google Fonts、umami 等外部资源的引用，避免离线时产生无效网络请求。
- `vite.config.ts` 中 `base` 使用 `BASE_PATH || "./"`，保证资源在自定义协议/子目录下都能解析。
- 顶栏主图（`client/public/lutcalc/CWLSB.png`、`CWMSB.png`）随 `public/` 一并打包。

## 1.1 工作流回放：重新选择 vs 固定文件（1.0.2 经验）

工作流中的文件步骤（LUT 文件选择）默认是「重新选择」模式：回放时 `input.click()`
打开系统文件选择框，等待用户手动选取，避免把录制时的 `C:\fakepath\...` 假路径锁死。
如果需要在无人工干预时复用（调试、自动化），可在导出的流程 JSON 中给该步骤加
`filePath` 字段，回放时优先使用固定文件、不再弹框：

```json
{ "action": "change", "selector": "[data-lutcalc-workflow-id=\"lc-0765\"]",
  "value": "C:\\fakepath\\FLog2_to_CLASSIC-Neg._65grid_V.1.00.cube",
  "label": "导入新的 LUT加载已分析的 LA LUT", "filePath": "/FLog2_to_CLASSIC-Neg._65grid_V.1.00.cube" }
```

固定文件读取按环境回退：

- 桌面端（Tauri）：`src-tauri/src/lib.rs` 注册 `read_local_file` 命令，
  `filePath` 可以是宿主机绝对路径（如 `/home/user/test.cube`），前端
  `@tauri-apps/api/core` 的 `invoke` 读取字节后经 `DataTransfer` 注入引擎文件框。
- 网页端：把调试文件放到 `client/public/`（构建后位于 `dist/public/`），
  `filePath` 写成站点相对路径（如 `/FLog2_to_CLASSIC-Neg._65grid_V.1.00.cube`），
  回放时 `fetch` 该 URL 后注入；gh-pages 部署时相对路径自动带仓库前缀。

其他回放相关经验：

- 录制时对 `select`/文本框/文件框的 `click` 不记录（只是打开控件），同类事件按选择器
  去重、只保留最终值，避免把鼠标移动录成「录屏」。
- 引擎 DOM 在窄窗口下会进入移动布局，控件 `data-lutcalc-workflow-id` 按会话单调递增
  分配（不复用文档位置序号），避免同一会话内出现重复 id 导致选择器命中错误控件。
- 回放末尾不再依赖「固定延时后下载」：生成 LUT 后由引擎 `saveAs()` 直接触发下载；
  文件步骤后留 800ms 等待引擎异步解析，再继续后续步骤。

## 2. 构建环境

本机关键环境：

- Ubuntu 22.04.3，glibc 2.35。**AppImage 的 glibc 兼容基线取决于构建机**，在 22.04 构建即要求目标系统 glibc ≥ 2.35（Ubuntu ≥ 22.04）。
- Node 24.19.0 + pnpm 10.13.0。仓库根目录存在 `pnpm-workspace.yaml` 时，corepack 的 project spec 校验会报错，需加环境变量绕过：

```bash
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm ...
```

- Rust 1.98.0，Tauri 的 Linux 系统依赖（`libwebkit2gtk-4.1-dev`、`build-essential`、`libxdo-dev`、`libssl-dev`、`libayatana-appindicator3-dev`、`librsvg2-dev` 等）。

## 3. 构建 Linux AppImage

```bash
source ~/.cargo/env
APPIMAGE_EXTRACT_AND_RUN=1 COREPACK_ENABLE_PROJECT_SPEC=0 pnpm desktop:linux
```

产物：`src-tauri/target/release/bundle/appimage/LUTCalc_1.0.2_amd64.AppImage`

### 3.1 linuxdeploy 缓存损坏（本机踩坑）

`pnpm desktop:linux` 会调用 `~/.cache/tauri/linuxdeploy-x86_64.AppImage`。若该文件 shebang 损坏（如变成 `#!/bin/b`，而 `/bin/b` 不存在），打包会立即失败：

```text
No such file or directory (os error 2)
```

修复方式：Tauri 下载时会保留一个 `.real` 备份，覆盖回去即可：

```bash
cd ~/.cache/tauri
mv -f linuxdeploy-x86_64.AppImage.real linuxdeploy-x86_64.AppImage
chmod +x linuxdeploy-x86_64.AppImage
```

验证：

```bash
APPIMAGE_EXTRACT_AND_RUN=1 ~/.cache/tauri/linuxdeploy-x86_64.AppImage --version
```

正常应输出 `linuxdeploy version 1-alpha ...`。若连 `.real` 也没有，删除损坏文件后重新触发构建，让 Tauri 重新下载。

### 3.2 无 FUSE 环境

无 FUSE 的容器/服务器上，给所有 AppImage 相关命令加 `APPIMAGE_EXTRACT_AND_RUN=1`，强制解包运行，避免挂载失败。

### 3.3 手动打包兜底

如果 Tauri 的 AppImage 步骤仍失败，可手动用 linuxdeploy 打包已编译的二进制：

```bash
mkdir -p /tmp/LUTCalc.AppDir/usr/bin
cp src-tauri/target/release/LUTCalc /tmp/LUTCalc.AppDir/usr/bin/
cd ~/.cache/tauri
APPIMAGE_EXTRACT_AND_RUN=1 ./linuxdeploy-x86_64.AppImage \
  --appdir /tmp/LUTCalc.AppDir --output appimage --plugin gtk
```

## 4. 交叉编译 Windows x64 裸 EXE

前置条件（Linux 上）：

```bash
rustup target add x86_64-pc-windows-msvc
cargo install --locked cargo-xwin
```

`cargo-xwin` 依赖 LLVM/LLD（Ubuntu 上为 `clang`、`lld` 包）。无需安装 MSVC，xwin 会自动下载 Windows SDK/CRT。

```bash
source ~/.cargo/env
COREPACK_ENABLE_PROJECT_SPEC=0 pnpm desktop:windows:cross
```

产物：`src-tauri/target/x86_64-pc-windows-msvc/release/LUTCalc.exe`

裸 EXE 的文件名只有二进制名，不含版本与架构；发布前按版本+架构重命名，与 AppImage 的 `LUTCalc_1.0.2_amd64.AppImage` 命名风格保持一致（内容不变，SHA-256 不变）：

```bash
cp src-tauri/target/x86_64-pc-windows-msvc/release/LUTCalc.exe \
   src-tauri/target/x86_64-pc-windows-msvc/release/LUTCalc_1.0.2_amd64.exe
```

注意：

- `desktop:windows:cross` 使用 `--no-bundle`，只生成裸 EXE，不生成 MSI/NSIS 安装器，符合本项目“仅交付便携 exe”的策略。
- 交叉编译只能证明 PE x64 文件可生成，**不能替代 Windows 原生构建**：WebView2 可用性、杀软误报、签名、启动冒烟都应在 Windows 实机验证。
- 若本机有 Windows 原生环境，优先 `pnpm desktop:windows`。

## 5. 校验和与发布

```bash
sha256sum src-tauri/target/release/bundle/appimage/LUTCalc_1.0.2_amd64.AppImage \
          src-tauri/target/x86_64-pc-windows-msvc/release/LUTCalc_1.0.2_amd64.exe
```

推送与打标签（注意恢复 origin 直连，国内镜像如 ghfast.top 只适合 clone）：

```bash
git remote set-url origin https://github.com/lqy306/LUTCalCh.git
git push origin master
git tag v1.0.2
git push origin v1.0.2
```

创建 Release（产物只有 `.exe` 与 `.AppImage`，无安装器）：

```bash
gh release create v1.0.2 \
  src-tauri/target/x86_64-pc-windows-msvc/release/LUTCalc_1.0.2_amd64.exe \
  src-tauri/target/release/bundle/appimage/LUTCalc_1.0.2_amd64.AppImage \
  --notes "..."
```

Release Notes 必须写明的要点：

- 仅支持 x64（Windows x64 裸 exe / Linux x86_64 AppImage）。
- AppImage 需 Ubuntu ≥ 22.04（glibc 2.35）。
- 本次修复/新增内容清单。
- 两个产物的 SHA-256 校验和。

## 6. 常见失败速查

| 症状 | 原因 | 处理 |
| --- | --- | --- |
| AppImage 打包 `os error 2` | linuxdeploy 缓存 shebang 损坏 | 用 `.real` 覆盖，见 3.1 |
| AppImage 挂载失败 | 无 FUSE | `APPIMAGE_EXTRACT_AND_RUN=1` |
| pnpm 报 corepack project spec 错误 | 仓库有 `pnpm-workspace.yaml` | `COREPACK_ENABLE_PROJECT_SPEC=0` |
| 找不到 `x86_64-pc-windows-msvc` | 未添加 target | `rustup target add x86_64-pc-windows-msvc` |
| `cargo-xwin` 找不到 | 未安装 | `cargo install --locked cargo-xwin` |
| 交叉编译链接失败 | 缺 LLVM/LLD | 安装 `clang`、`lld` |
