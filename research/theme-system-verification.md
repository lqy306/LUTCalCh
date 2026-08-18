# 内置主题系统验证

本轮主题系统使用 `client/src/themes/lutcalc-theme.schema.json` 约束 JSON 配置；Ubuntu、KDE、macOS 与 Omarchy 主题各自提供亮色和深色令牌。主题选择只保存稳定主题标识和模式标识，不支持浏览器上传配置文件。

| 主题与模式 | 已验证内容 |
| --- | --- |
| Ubuntu 亮色 | 默认主题、顶栏下拉框、亮色按钮、引擎连接和移动端参数卡正常。 |
| KDE 亮色 / 深色 | 切换后工作台令牌与同源调整项 iframe 同步；深色表面、文字与边界保持可辨识。 |
| macOS 亮色 / 深色 | macOS 字体与系统蓝令牌生效；选择及深色切换写入本地存储。 |
| Omarchy 深色 | 等宽字体、深色画布和冷蓝强调生效；调整项模块随 iframe 主题桥接同步。 |

浏览器重新载入后，`lutcalc-workbench-theme` 与 `lutcalc-workbench-mode` 会恢复选择；最终验证环境已恢复为 Ubuntu 亮色。
