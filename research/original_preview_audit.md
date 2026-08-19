# 原版 LUTCalc 预览区结构审计

原版 `lutpreview.js` 的预览不是单张静态图片或曲线占位，而是一个由计算引擎实时处理的 **960×540 Canvas 预览管线**。预览包含主画面 Canvas（`can-preview`）、取样 Canvas（`can-sampler`）、色度叠加 Canvas（`can-overlay`）以及独立的波形（`can-waveform`）、矢量示波器（`can-vector`）和 RGB Parade（`can-parade`）Canvas。

其控制结构包括：Preview/Hide Preview、Large Image/Small Image、五种内置预览素材（High Contrast、Low Contrast、Rec709 Gamut、xy/uv Chromaticity、Grayscale）、Load Preview，以及 100%/109% 范围和 WFM/Vector/RGB 开关。加载自定义图片后，原版会先弹出对话框选择图片 Gamma、图片色彩空间以及 Legal/Data Range，随后交由内部处理链转换并写入预览画布；它不是简单显示 `<img>`。

预览呈现还支持鼠标移动显示 10-bit RGB 数值、单击取样，并在预览启动后随着主 LUT 参数更新重新渲染。因此，中文版本当前“载入图片 + 黑色图片框 + 文字标记”的实现只能作为临时功能，不能被视为原版预览等价物。后续重构应以 Canvas、预览数据预处理、可见的示波器/矢量/RGB Parade 画布、默认测试图和加载图片元数据确认流程为目标。
