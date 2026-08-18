# Leica L-Log 白皮书关键发现

来源：Leica Camera，《Leica L-Log Reference Manual v1.4》

- 官方 PDF：https://leica-camera.com/sites/default/files/pm-101410-l-log_reference_manual_v1.4.pdf
- 版本：v1.4。
- 适用机型章节提到 Leica SL2、SL2-S、Q3；Leica SL（Typ 601）另有选项说明。
- L-Log 可用于外部 HDMI 输出，也可在 SL2-S 上以 12 bit RAW 经外部记录器录制。
- 白皮书说明 L-Log LUT 面向 ITU-R BT.709 与 BT.2020 工作流；Leica SL（Typ 601）使用 BT.709 色彩空间，不适用于白皮书中提供的 L-Log LUT。
- L-Log 录制使用完整数据范围：10 bit 为 0–1023，不是视频电平 64–940；后期软件可能需要手动设为 full/data range。
- 为方便直接套用 L-Log LUT，中灰 18% 反射率设计在约 44% IRE；使用灰卡和波形监视器校准曝光。
- 若采用 ETTR 方式追求最高动态范围和更干净阴影，后期在套用为 L-Log 设计的 LUT 前必须进行曝光校正，否则可能出现色阶断层/平坦观感。
- 白皮书给出 BT.2020 到 XYZ 矩阵：
  [0.6370, 0.1446, 0.1689]
  [0.2627, 0.6780, 0.0593]
  [0.0000, 0.0281, 1.0610]
- XYZ 到 BT.2020 矩阵：
  [1.7167, -0.3557, -0.2534]
  [-0.6667, 1.6165, 0.0158]
  [0.0176, -0.0428, 0.9421]
- 白皮书没有在已提取章节中直接给出可复制的 L-Log 编码/解码数学公式或完整 1D 曲线采样表；仅提供曲线图、曝光参考和 LUT 工作流说明。因此接入时可以先加入 Leica L-Log 的工作流预设、BT.2020/BT.709 色域与 full range/44% IRE 元数据，但不应凭空生成未知曲线。

## 接入建议

第一阶段可安全加入：Leica L-Log 名称、适用机型提示、输入色域（BT.2020 或特定机型 BT.709）、Full/Data Range 0–1023、18% 灰卡 44% IRE 参考和曝光校正提醒。若要让 LutCalc 生成准确的 L-Log 逆变换或相机 LUT，还需要 Leica 官方 LUT 文件、曲线采样表或明确的编码/解码公式。
