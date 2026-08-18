# Leica 与 Lumix 固件 UI 研究

## Leica

官方固件公告：<https://leica-camera.com/en-US/press/comprehensive-firmware-updates-leica-sl-system-and-leica-q3-family>

Leica Camera AG 在 2025 年 12 月 18 日的官方公告中描述，Leica Q3 系列固件 4.0.0 采用受 SL3 界面启发的全新用户界面，重点包括重新设计的图标、优化的结构、更快的导航和增强的触控功能。设计主题因此采用黑白高对比、紧凑层级、少量 Leica 红色作为当前状态与关键动作，不模拟未公开的具体图标素材。

## Lumix

官方固件支持说明：<https://www.panasonic.com/uk/consumer/cameras-camcorders/lumix-expert-advice-learn/lumix-expert-advice/how-to-update-the-firmware-of-your-lumix-camera.html>

Panasonic 官方说明指出，Lumix G 相机可在 Settings 菜单的第 3 或第 4 页查看 Version Disp，固件入口位于 Settings 的 Others 分组中。设计主题因此采用深石墨菜单层级、冷蓝状态色、紧凑标签与分组面板，并以少量琥珀色表示需要确认或执行的动作。

## 实现边界

Leica 与 Lumix 主题是基于官方文字资料提炼的视觉方向，不复制厂商私有图标、固件代码或未授权界面截图。Leica 主题接入用户提供的 `lg1056_regular.otf`，通过项目静态存储地址 `/manus-storage/lg1056_regular_73458c64.otf` 注册为可选字体；主题配置仍遵循 LUTCalc 标准 JSON Schema，并同时支持亮色与深色模式。


## 内嵌字体最终验证

用户提供的 `/home/ubuntu/upload/pasted_file_EUPxa2_lg1056_regular.otf` 与项目副本 SHA-256 均为 `3fd5d146aa3141350fe449856a45ba4b6b47c52339b072eecfb5dc44a8afb8ce`；字体元数据为 `LG1056 / LG1056 Regular / Regular`。该 OTF 已转换为 29 KB 的 WOFF2，并以 `data:font/woff2;base64,...` 形式写入 Leica 主题 JSON，不再依赖外部字体 URL。

开发预览运行时验证：父页面 `document.fonts.check('16px "Leica LG1056"')` 为 true；同源调整项 iframe 的 `FontFaceSet` 中 `Leica LG1056` 状态为 `loaded` 且检查为 true；父页面和 iframe 的计算字体均为 Leica LG1056，旧相机区为 `display:none`，调整项为 `display:block`。
