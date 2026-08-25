# LUTCalc Log/Gamma 配置文件

LUTCalc 的 Log/Gamma 扩展采用版本化 JSON 配置。配置文件描述的是“曲线和色彩空间定义”，不是某个厂商专属的代码，因此个人开发者可以定义自己的 Log、Gamma 或实验性传递函数，并通过工作台导入、保存、导出和分享。

## 最小结构

```json
{
  "schema": "lutcalc-log-gamma-profile",
  "version": 2,
  "id": "my-camera-log-v1",
  "name": "我的相机 Log v1",
  "brand": "我的相机",
  "displayName": "Log v1",
  "kind": "log",
  "author": "作者名",
  "description": "用于某相机固件版本的自定义 Log 曲线。",
  "input": {
    "gamut": "自定义色域名称",
    "range": "full",
    "bitDepth": 10
  },
  "curve": {
    "type": "samples",
    "samples": [
      { "input": 0.0, "output": 0.0 },
      { "input": 0.18, "output": 0.44 },
      { "input": 1.0, "output": 1.0 }
    ]
  },
  "metadata": {
    "middleGrayIRE": 44,
    "source": "https://example.com/whitepaper"
  }
}
```

`curve.type` 有两种模式。`samples` 适合白皮书只提供曲线采样点或测量数据的情况；导入器会检查采样点数量、范围和排序。`formula` 适合开发者拥有明确的编码/解码公式的情况；公式会先经过受限解析和安全校验，不能直接执行任意 JavaScript。

## 品牌与显示名称（v2）

- `brand`：品牌或厂商，用于引擎下拉框的分组（例如“Leica”）。未提供时导入会被拒绝。
- `displayName`：下拉框与“标题 * 映射”中展示的短名称；`name` 保留为完整唯一名称，用于识别与去重。

## 注册到引擎下拉（可选）

`curve.engineParams` 提供引擎 `LUTGammaLog` 的 9 个参数
`[b, c, d, e, f, g, h, i, j]`，对应通用对数公式：

```text
编码（线性 → 数据）：v >= j 时 d·log_f(e·v + g) + h；否则 (v − c) / b
解码（数据 → 线性）：v >= i 时 (f^((v − h)/d) − g) / e；否则 b·v + c
```

提供 `engineParams` 的配置会在导入后自动注册到原版引擎（含 Web Worker），
出现在“输入 / 输出 Gamma”与 LUT 分析的“输入 Gamma”下拉中，并可按 `brand`
分组筛选。未提供时仍可导入、使用与参与“标题 *”映射，但不进入引擎下拉。
公式型配置建议同时给出 `encode`/`decode` 便于人工核对，引擎计算以
`engineParams` 为准。

## 色彩空间

如果曲线还依赖特定色域，可以在 `colorSpace` 中填写原色、白点和 RGB 到 XYZ 的 3×3 矩阵。对于 BT.2020、BT.709 等标准色域，建议使用标准名称；对于自制色域，必须提供来源或测量依据。

## 安全与可信度

配置文件可以被分享，但导入器不会把配置中的字符串直接当作脚本执行。公式需要经过受限语法验证；不满足版本、曲线类型、采样范围或矩阵尺寸要求的文件会被拒绝。配置的 `author`、`source` 和版本信息用于追溯，不能替代对曲线准确性的验证。

当前工作台已经支持配置的本地导入、校验、保存、删除和 JSON 导出；带
`engineParams` 的公式型配置会注册到原版引擎的 Gamma 下拉并参与 LUT 生成与
分析路径。采样型配置（无 `engineParams`）仍作为数据示例管理，尚未接入引擎计算。

## 仓库示例

随仓库附带的示例配置位于 [examples/log-gamma-profiles/](../examples/log-gamma-profiles/)，包含两个公式型 Log 曲线 JSON，可直接通过工作台“曲线 → 导入配置”试用，作为外接 LUT（自定义曲线）能力的演示。
