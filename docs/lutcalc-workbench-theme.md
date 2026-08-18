# LUTCalc 工作台主题配置规范

工作台主题采用**内置、版本控制的 JSON 配置**，用于保证重载后仍可复现同一外观。主题不提供浏览器上传入口；用户在顶栏选择主题与明暗模式后，系统只在本地保存主题标识和模式偏好。

主题 JSON 文件位于 `client/src/themes/`，并由 `lutcalc-theme.schema.json` 约束。当前内置主题包括 **Ubuntu**、**KDE**、**macOS** 和 **Omarchy**，每个主题必须同时提供 `light` 与 `dark` 两组颜色令牌。

| 字段 | 含义 |
| --- | --- |
| `id` | 稳定的主题标识，仅使用小写字母、数字和连字符。 |
| `name` | 用户界面展示名称。 |
| `description` | 主题设计方向说明。 |
| `fontFamily` | 覆盖工作台与同源调整项的字体栈。 |
| `radius` | 控件与卡片圆角规范。 |
| `modes.light` / `modes.dark` | 对应亮色与深色模式的令牌集合。 |
| `colors` | 工作台、表单、状态、边界、链接和预览的视觉令牌。 |

```json
{
  "$schema": "./lutcalc-theme.schema.json",
  "id": "example",
  "name": "示例主题",
  "description": "供开发维护的静态主题配置。",
  "fontFamily": "system-ui, sans-serif",
  "radius": "6px",
  "modes": {
    "light": {
      "label": "亮色",
      "colors": {
        "canvas": "#f5f5f5",
        "surface": "#ffffff",
        "accent": "#3daee9"
      }
    },
    "dark": {
      "label": "深色",
      "colors": {
        "canvas": "#202124",
        "surface": "#2b3035",
        "accent": "#6bc5f2"
      }
    }
  }
}
```

> 示例只展示配置结构。实际主题需包含 Schema 规定的所有颜色令牌，以确保顶栏、参数卡、原版调整项 iframe、曲线预览和许可菜单具有一致的明暗对比度。

主题偏好使用 `lutcalc-workbench-theme` 和 `lutcalc-workbench-mode` 保存；配置文件本身不写入用户存储，也不支持用户上传。
