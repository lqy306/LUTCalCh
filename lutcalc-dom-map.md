# LutCalc 原始 DOM 映射

页面入口为 `/lutcalc/index.html`，原始应用由 `js/lutcalccombined.js` 动态构建表单并绑定计算逻辑。浏览器 DOM 顺序确认如下：

| 顺序 | 控件 | 用途 |
| --- | --- | --- |
| 1 | text input | LUT 标题 / 文件名 |
| 2 | button | Auto Title |
| 3–4 | radio | 1D / 3D |
| 5–7 | radio | 17 / 33 / 65 LUT 尺寸 |
| 8–13 | radio | 输入、输出范围与 LUT 模式 |
| 14 | select | LUT 输出格式 |
| 15 | select | Hard Clip |
| 16 | checkbox | 0%–100% 范围 |
| 17–20 | buttons | Preview / Generate LUT / Generate Set / Settings |
| 21–24 | buttons | Instructions / Tables / Charts / Print Chart |
| 32–43 | select + number | Camera、机型、ISO、Stop Correction、Rec Gamma、Rec Gamut、Out Gamma、Out Gamut |
| 44–55 | checkbox | White Balance、PSST-CDL、ASC-CDL、Multitone、Highlight Gamut、Knee、Black Level、Black Gamma、Display Colourspace、Gamut Limiter、False Colour、LUTAnalyst |
| 56–57 | radio | Import New LUT / Load Existing Analysed LA LUT |
| 58 | file input | 导入 LUT 文件 |

原始入口中可继续保留 iframe 作为独立窗口回退，但 React 主界面应使用同源 iframe 的 `contentDocument` 访问这些控件，并通过 `value` / `checked` / `dispatchEvent(new Event('change', { bubbles: true }))` 同步，以复用原始计算与导出逻辑而不重写 LUT 数学实现。
