# 外部测试报告与 F-Log2C 65 点 LUT 回归结论

## 外部报告关键问题

`pasted_content.txt` 指出旧版本存在三项阻断性问题：无法在 LUTAnalyst 中选择 Fujifilm F-Log2、分析结果没有成对作为 `LA - ...` Gamma/Gamut 注入主管线，以及源 LUT 被静默以 F-Log 降级分析。报告还指出 Tricubic 翻译不正确、标题与下载文件名脱节、范围/裁切需与原版核验。

## 用户 LUT 元数据

用户提供的 `pasted_file_zZOQb1_FLog2C_to_CLASSIC-Neg._65grid_V.1.00.cube` 文件头包含 `#Gamma:F-Log2C to CLASSIC Neg.`、`#Gamut:F-GamutC to ITU-R BT.709` 与 `LUT_3D_SIZE 65`。因此，本回归使用 Fujifilm F-Log2 和 Fujifilm F-Log Gamut，65³ 文件由原版 LUTAnalyst 解析。

## Chromium 实测结果

修复跨 iframe `instanceof` 判断后，文件导入会自动识别 F-Log2C/F-GamutC，并把原生及隐藏引擎的分析器设置为 **Fujifilm F-Log2** 与 **Fujifilm F-Log Gamut**。分析完成后，隐藏原版引擎注册同名 `LA - :FLog2C_to_CLASSIC-Neg.` 选项；该选项已在输出 Gamma 与输出 Gamut 中成对选择，曲线预览数据也发生更新。

## 未闭环项目

动态 LA 名称当前仍由原版分析器的文件名推导，未可靠采用原生面板的 LUT 标题输入；导出文件名、Cube `TITLE`、完整管线注释及逐网格与原版的数值一致性仍需作为下一轮强制验收项目。后续发布必须通过构建、用户 LUT 实际上传、F-Log2/F-Log Gamut 匹配、LA 成对输出及曲线刷新测试。
