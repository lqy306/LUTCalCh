# LUTCalc Log/Gamma 配置文件

LUTCalc 的 Log/Gamma 扩展采用版本化 JSON 配置。配置文件描述的是“曲线和色彩空间定义”，不是某个厂商专属的代码，因此个人开发者可以定义自己的 Log、Gamma 或实验性传递函数，并通过工作台导入、保存、导出和分享。

## 最小结构

```json
{
  "schema": "lutcalc-log-gamma-profile",
  "version": 1,
  "id": "my-camera-log-v1",
  "name": "我的相机 Log v1",
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

## 色彩空间

如果曲线还依赖特定色域，可以在 `colorSpace` 中填写原色、白点和 RGB 到 XYZ 的 3×3 矩阵。对于 BT.2020、BT.709 等标准色域，建议使用标准名称；对于自制色域，必须提供来源或测量依据。

## 安全与可信度

配置文件可以被分享，但导入器不会把配置中的字符串直接当作脚本执行。公式需要经过受限语法验证；不满足版本、曲线类型、采样范围或矩阵尺寸要求的文件会被拒绝。配置的 `author`、`source` 和版本信息用于追溯，不能替代对曲线准确性的验证。

当前工作台已经支持配置的本地导入、校验、保存、删除和 JSON 导出。下一步需要增加计算引擎适配层，把已验证的采样曲线或公式正式接入 LutCalc 的 Gamma 选项和 LUT 生成路径；在适配层完成前，配置管理不会伪装成已经改变原始 LutCalc 曲线。
