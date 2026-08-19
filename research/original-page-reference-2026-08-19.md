# 原版 LUTCalc 页面参考记录

来源：<https://cameramanben.github.io/LUTCalc/LUTCalc/index.html>

## 页面结构

原版不是把调整项拆成多个现代卡片，而是采用一个左右两栏工作台：左侧依次放置 Camera、Rec Gamma、Rec Gamut、Out Gamma、Out Gamut，以及一个连续的 Customisation 区；右侧放置 LUT 标题/尺寸/范围、LUT 类型与硬裁切、操作按钮、曲线图表和输出表格。

## 调整项层级

“Customisation” 是一个连续的总模块。白平衡、PSST-CDL、ASC-CDL、多色调、Highlight Gamut、Knee、Black Level / Highlight Level、Black Gamma、Display Colourspace Converter、Gamut Limiter、False Colour 和 LUTAnalyst 都是其内部的同级横向条目。每一行右侧或行内带一个 checkbox；LUTAnalyst 位于列表最后，下面直接接 Import New LUT / Load Existing Analysed LA LUT 选项和文件选择控件。

## 交互关系

原版条目默认是紧凑的横向条带，点击或勾选后才显示对应的参数区域；LUTAnalyst 不是独立卡片，也不是普通“展开”按钮，而是 Customisation 下的最后一个功能条目，并且其导入方式紧随条目下方。顶部还有总 Customisation checkbox，用于一次性启用/禁用调整项区域。

## 视觉特征

原版视觉虽然老旧，但层级非常明确：条目高度紧凑、灰色条带连续排列、checkbox 与标题在同一行、右侧主区域负责曲线和结果。新的 React 版本应保留这种“连续模块栈 + 条目内展开”的信息架构，只把表面、字体、边框和控件替换成主工作台同一套主题组件，不能将每个条目做成独立浮动卡片。

## 本轮校准结论

1. 04 调整项应保留一个总开关。
2. 各调整项应为紧凑同级条目，checkbox 与标题同一行。
3. LUT 解析必须作为最后一个条目，导入方式和文件控件紧接其下。
4. 展开内容应在条目内部出现，不应造成新的独立卡片或跳出列表。
5. 03 LUT 输出可以在新工作台中全宽，但其内部信息密度应参考原版右侧 LUT 输出区，而不是大面积留白。
