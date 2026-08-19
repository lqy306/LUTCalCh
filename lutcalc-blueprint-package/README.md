# LUTCalc 从零设计蓝本与独家资源

本包用于交给另一个 AI，从零设计一个 LUTCalc 类中文 Web 工具。

## 包含内容

- `lutcalc-from-scratch-blueprint.md`：完整设计蓝本、布局基准、功能范围、主题规范、技术边界和验收标准。
- `exclusive-resources/fonts/lg1056_regular.otf`：用户提供的 Leica LG1056 独家字体。
- `exclusive-resources/references/`：用户提供的原版调整项和白平衡布局截图。
- `exclusive-resources/configs/`：独立 Leica L-Log 配置文件，作为设计和配置参考。
- `exclusive-resources/SHA256SUMS.txt`：字体 SHA-256 校验值。

## 明确不包含

本包不包含现有项目源码、node_modules、构建产物、可在线获取的 LUTCalc 源码、在线参考手册或通用字体。另一个 AI 应根据蓝本从零实现，不应直接复制当前项目。

## 字体使用要求

LG1056 字体来自用户提供的独家资源。使用前应确认授权范围；不要将其替换为网上搜索到的相似字体，也不要未经授权公开再分发。

## 参考截图

截图仅作为布局和控件层级的视觉基准，不应被误认为是可以直接复制的完整产品界面。

## L-Log 配置

配置文件是独立参考资源，不代表必须内置到新程序。是否内置 L-Log，应由产品所有者另行决定。
