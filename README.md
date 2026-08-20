# LUTCalc 中文工作台

在保留原版 [LUTCalc](https://github.com/BenTurley/LUTCalc) 计算、分析、预览与导出能力的前提下，提供完整简体中文、本地主题化、参数结构更统一的工作台。项目采用「React 外壳 — 同源桥接 — 原版引擎」三层架构：计算真源始终来自嵌入的同源 iframe 原版引擎，React 只负责中文界面、状态同步与本地工具。

## 功能特性

- **主计算器**：相机输入（品牌/型号/ISO/挡位）、色彩管线（记录与输出 Gamma/Gamut）、LUT 输出（1D/3D、尺寸、范围、用途、格式、硬裁切），参数实时同步原版引擎。
- **外部 LUT 分析**：上传 `.cube` 等文件后核对文件头 Gamma/Gamut、网格维度、数据行数与 SHA-256；支持 F-Log2C / Classic Neg 与官方 Leica Cine LUT 自动匹配输入基底；分析成功后把 `LA - …` 输出注册到引擎，曲线与导出随动。
- **异常诊断与安全阻断**：缺 `LUT_3D_SIZE`、数据截断、非数值行、未知 Gamma/Gamut 均给出结构化中文诊断并阻止错误分析；仅 L-Log 未声明 Rec.2020 的文件会要求人工确认。
- **原版预览与示波器**：原版 Canvas 预览、输出曲线（白底）、WFM / Vector / RGB Parade 快照。
- **调整项与流程**：白平衡、ASC-CDL、膝点、黑伽马等模块；参数操作可录制为流程并保存、导出、导入、回放。
- **自定义曲线配置资料库**：导入/校验/导出日志或伽马配置文件（见 `docs/lutcalc-log-gamma-profile.md`），配置独立保存、跨流程复用；不自动注册为主引擎 profile（有意的边界）。
- **主题系统**：内置 Ubuntu、KDE、macOS、Omarchy 四套主题，均支持亮/暗模式，偏好持久化；旧主题偏好可安全回退。

## 快速开始

```bash
# 安装依赖（pnpm）
pnpm install

# 本地开发
pnpm dev          # http://localhost:3000/

# 类型检查
pnpm check

# 生产构建（Vite 静态产物 + Express 静态服务）
pnpm build

# 生产运行
pnpm start
```

## 项目结构

```text
client/
  public/lutcalc/          # 原版 LUTCalc 引擎（同源 iframe 计算核心）
  src/pages/Home.tsx       # 工作台主界面与引擎桥接
  src/components/NativeAdjustments.tsx  # 调整项 + LUT 解析面板
  src/themes/              # 主题注册与内置主题 JSON
docs/                      # 技术文档、用户手册、配置格式与主题文档
server/index.ts            # 极简 Express 静态服务
shared/                    # 前后端共享的类型与校验
research/                  # 开发期研究资料与脚本
```

## 工作原理

| 层级 | 职责 |
| --- | --- |
| React 工作台 | 中文 UI、参数卡、工具中心、主题、元数据审计、流程与配置的本地保存 |
| 同源桥接 | DOM 选择器映射、跨文档事件、Canvas 快照、状态轮询、分析完成信号 |
| 原版 LUTCalc | Gamma/Gamut 管线、LUTAnalyst、Worker 运算、曲线与下载 |

关键约定：React 不自行计算 LUT，也不把按钮点击或固定延时当作分析完成信号；只有读取到引擎注册的成对 `LA - …` 输出才报告分析成功。

## 文档

- [文档索引](docs/README.md)
- [技术文档](docs/LUTCalc_中文工作台_技术文档.md)：面向维护者与发布负责人
- [用户操作与自定义曲线手册](docs/LUTCalc_中文工作台_用户操作与自定义曲线手册.md)
- [L-Log 配置指南](docs/leica-l-log-configuration-guide.md)
- [Log/Gamma 配置格式](docs/lutcalc-log-gamma-profile.md)
- [主题系统](docs/lutcalc-workbench-theme.md)
- [开发期过程文档归档](docs/archive/)

## 验收测试

验收清单与缺陷记录见 [docs/验收报告.md](docs/验收报告.md)；证据截图与导出文件维护在仓库之外的 `LUTCalCh-acceptance/evidence/`。发布前请按清单 P0 → P1 → P2 复测。

## 许可证

本工作台（React 外壳与桥接层）采用 MIT 许可；嵌入的原版 LUTCalc 计算核心遵循其原有 GPL-2.0 许可，许可证文本随 `client/public/lutcalc/` 保留。使用或再分发前请分别确认两部分许可范围。
