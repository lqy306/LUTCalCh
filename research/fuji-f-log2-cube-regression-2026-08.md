# Fuji F-Log2 Cube 回归结果

修复分支：`feat/tauri-offline-app`

测试文件：`pasted_file_cthcuD_FLog2_to_CLASSIC-Neg._65grid_V.1.00.cube`

在本地修复版 `http://localhost:4173/` 中通过 LUTAnalyst 上传并点击“分析 LUT 并应用当前输出”后，页面显示：

> 已根据 LUT 文件头匹配：Fujifilm F-Log2 / Fujifilm F-Log Gamut。

读取到的文件信息：网格 `65³`；RGB 数据行 `274,625`；机型 `GFX ETERNA 55`；原始输入 `F-Log2 to CLASSIC Neg.`；原始色域 `F-Gamut to ITU-R BT.709`。

分析结果状态：`原版 LUTAnalyst 已完成分析，结果已成为当前输出管线`。页面生成了分析采样值，并将 LUT 以 `LA - FLog2_to_CLASSIC-Neg.` 注册到当前输出状态，证明流程已经越过原先的 Gamut 兼容性阻止并完成计算。

修复内容：将文件头中的 Fuji 厂商描述 `F-Log2`、`F-Log`、`F-Gamut` 规范化映射到原版引擎标准选项 `Fujifilm F-Log2`、`Fujifilm F-Log Gamut`；仍保留网格/数据行/格式诊断，未关闭安全校验。


进一步验证：在分析完成后，右侧 LUT 输出曲线发生变化，显示 `In: S-Log3`、`Out: LA - FLog2_to_CLASSIC-Neg.`，曲线同时出现原始转换曲线和外部 LUT 曲线；页面状态为 `原版 Canvas 已桥接`。这证明不仅是元数据通过，原版 LUTAnalyst 结果已同步到输出管线。
