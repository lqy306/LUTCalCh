# 文档索引

本目录是 LUTCalc 中文工作台的官方文档。开发期过程记录见 [archive/](archive/)。

## 面向用户

- [用户操作与自定义曲线手册](LUTCalc_中文工作台_用户操作与自定义曲线手册.md)：工作台操作、外部 LUT 分析、调整项、流程与曲线配置使用说明。
- [自定义 Log/Gamma 配置示例](../examples/log-gamma-profiles/README.md)：仓库随附的曲线配置数据，演示外接 LUT（自定义曲线）能力的导入与复用。

## 面向维护者

- [技术文档](LUTCalc_中文工作台_技术文档.md)：三层架构、桥接机制、主题注册与发布方式。
- [Log/Gamma 配置文件格式](lutcalc-log-gamma-profile.md) 与 [JSON Schema](lutcalc-log-gamma-profile.schema.json)：自定义曲线配置的字段与校验规则。
- [主题系统](lutcalc-workbench-theme.md)：内置主题结构、明暗模式与持久化。

## 示例资源

- [自定义 Log/Gamma 配置](../examples/log-gamma-profiles/)：两个公式型 Log 曲线配置，可通过“曲线”工具导入试用。

## 开发期归档

- [archive/](archive/)：任务简报、蓝图、DOM 映射、调研记录等过程文档，仅供追溯，不构成现行实现依据。
