# 自定义 Log / Gamma 配置示例

本目录是随仓库附带的 **Log/Gamma 自定义配置示例**，用于展示 LUTCalc 工作台的
“外接 LUT 能力”：主程序不再内置或自动识别这些厂商曲线，而是以标准化的
`lutcalc-log-gamma-profile` JSON 数据提供，用户通过 **工具中心 → 曲线 → 导入配置**
自行导入、校验、保存与复用。

## 使用方式

1. 打开工作台左侧 **工具中心**，切换到 **曲线** 标签页。
2. 点击 **导入配置**，选择本目录下的 JSON 文件。
3. 导入成功后，配置以“日志曲线 / 伽马曲线”条目保存在本地，可导出、重命名、删除与排序。

导入器会校验 `schema`、`version`、`id`、`name`、`brand`、`displayName`、`kind`、
`curve.type` 与采样数据；配置不会被当作脚本执行。字段说明见
[`docs/lutcalc-log-gamma-profile.md`](../../docs/lutcalc-log-gamma-profile.md)。

## 注册到引擎下拉

示例文件在 `curve.engineParams` 中提供引擎 `LUTGammaLog` 参数，导入后会自动注册到
原版引擎：主计算器的“输入 / 输出 Gamma”、LUT 分析的“输入 Gamma”下拉都会出现
对应条目（显示名称为 `displayName`，可按 `brand` 分组筛选），可直接用于 LUT 生成
与 LUT 分析。`name` 保留为完整唯一名称，用于识别与“标题 *”映射。

## 示例文件

- `leica-l-log-v1.4-bt2020.json`：Leica L-Log v1.4（BT.2020）曲线配置，公式型，完整数据范围。
- `leica-l-log-v1.4-bt709.json`：Leica L-Log v1.4（BT.709，SL Typ 601）曲线配置，公式型。

这些文件仅作为自定义 Log 曲线的数据示例随仓库分发，不构成对曲线准确性的承诺。
示例通过通用对数参数描述曲线（`engineParams`），不包含任何厂商私有代码；
使用时请按 `metadata.source` 核对官方资料。
