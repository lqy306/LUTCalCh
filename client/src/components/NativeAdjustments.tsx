/*
 * 设计方向：统一 Ubuntu 工作台，但严格保留 LUTCalc 原版调整项的连续层级。
 * 每个模块都必须拥有真实可操作的展开内容；隐藏 iframe 只负责兼容计算引擎。
 * 本文件遵循 BSD Allman 大括号风格，所有用户可见文字使用简体中文。
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileUp, RotateCcw, Sparkles } from "lucide-react";

type NativeAdjustmentsProps = {
  engineReady: boolean;
  onToggle: (label: string, checked: boolean) => void;
  onImportLut: (file: File) => void;
  onAnalyzeLut: () => void;
  onResetLut: () => void;
  onControlChange?: (module: string, control: string, value: string | boolean) => void;
  onLutAnalystConfigChange?: (control: string, value: string) => void;
  lutAnalystChoices?: { gamma: { value: string; label: string }[]; gamut: { value: string; label: string }[] };
  analysisState?: { status: "idle" | "loading" | "analyzing" | "ready" | "error"; fileName: string; title: string; outputGamma: string; outputGamut: string; completedAt: string; message: string; samples: { label: string; ire: string; code10: string }[] };
};

type LutFileMetadata = {
  title: string;
  model: string;
  gamma: string;
  gamut: string;
  dimension: string;
  dataRows: number;
  inferredInput: string;
  inferredOutput: string;
  kind: string;
  sha256: string;
  diagnostics: string[];
};

type ControlSpec = {
  key: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  value: string;
  unit?: string;
};

type AdjustmentItem = {
  label: string;
  engineLabel: string;
  summary: string;
  controls: ControlSpec[];
  selects?: { key: string; label: string; value: string; options: string[] }[];
};

const ADJUSTMENTS: AdjustmentItem[] = [
  { label: "自定义色彩空间", engineLabel: "Custom Colour Space", summary: "自定义工作色彩空间与色彩适配", controls: [], selects: [{ key: "workingSpace", label: "工作色彩空间", value: "Rec709", options: ["Rec709", "Rec2020", "sRGB", "P3-D65", "ACEScg"] }, { key: "cat", label: "色彩适配模型", value: "CIECAT02", options: ["CIECAT02", "CIECAT97s", "Bradford", "Von Kries"] }] },
  { label: "白平衡", engineLabel: "白平衡", summary: "参考白、色温和绿色偏移", controls: [{ key: "referenceWhite", label: "参考白", value: "5500", unit: "K" }, { key: "newWhiteBalance", label: "新白平衡", value: "5500", unit: "K" }, { key: "cto", label: "CTO / CTB", min: -100, max: 100, step: 1, value: "0" }, { key: "green", label: "Minus Green / Plus Green", min: -100, max: 100, step: 1, value: "0" }] },
  { label: "PSST-CDL", engineLabel: "PSST-CDL", summary: "亮度、对比度、色相和饱和度调整", controls: [{ key: "exposure", label: "曝光", min: -3, max: 3, step: 0.01, value: "0", unit: "档" }, { key: "contrast", label: "对比度", min: -1, max: 1, step: 0.01, value: "0" }, { key: "pivot", label: "枢轴", min: 0, max: 1, step: 0.01, value: "0.5" }, { key: "saturation", label: "饱和度", min: 0, max: 2, step: 0.01, value: "1" }, { key: "hue", label: "色相", min: -180, max: 180, step: 1, value: "0", unit: "°" }] },
  { label: "ASC-CDL", engineLabel: "ASC-CDL", summary: "Slope、Offset、Power 与 Saturation", controls: [{ key: "slopeR", label: "Slope R", min: 0, max: 2, step: 0.01, value: "1" }, { key: "slopeG", label: "Slope G", min: 0, max: 2, step: 0.01, value: "1" }, { key: "slopeB", label: "Slope B", min: 0, max: 2, step: 0.01, value: "1" }, { key: "offsetR", label: "Offset R", min: -1, max: 1, step: 0.01, value: "0" }, { key: "offsetG", label: "Offset G", min: -1, max: 1, step: 0.01, value: "0" }, { key: "offsetB", label: "Offset B", min: -1, max: 1, step: 0.01, value: "0" }, { key: "powerR", label: "Power R", min: 0.1, max: 4, step: 0.01, value: "1" }, { key: "powerG", label: "Power G", min: 0.1, max: 4, step: 0.01, value: "1" }, { key: "powerB", label: "Power B", min: 0.1, max: 4, step: 0.01, value: "1" }, { key: "saturation", label: "饱和度", min: 0, max: 2, step: 0.01, value: "1" }] },
  { label: "多色调", engineLabel: "多色调", summary: "高光、阴影与中间调的色相和饱和度", controls: [{ key: "shadowHue", label: "阴影色相", min: -180, max: 180, step: 1, value: "0", unit: "°" }, { key: "shadowSat", label: "阴影饱和度", min: 0, max: 2, step: 0.01, value: "0" }, { key: "midtoneHue", label: "中间调色相", min: -180, max: 180, step: 1, value: "0", unit: "°" }, { key: "midtoneSat", label: "中间调饱和度", min: 0, max: 2, step: 0.01, value: "0" }, { key: "highlightHue", label: "高光色相", min: -180, max: 180, step: 1, value: "0", unit: "°" }, { key: "highlightSat", label: "高光饱和度", min: 0, max: 2, step: 0.01, value: "0" }] },
  { label: "高光色域", engineLabel: "高光色域", summary: "高光区域的色域压缩与过渡", controls: [{ key: "threshold", label: "起始阈值", min: 0, max: 1, step: 0.01, value: "0.75" }, { key: "softness", label: "过渡柔和度", min: 0, max: 1, step: 0.01, value: "0.25" }, { key: "desaturation", label: "去饱和", min: 0, max: 1, step: 0.01, value: "0" }] },
  { label: "膝点", engineLabel: "膝点", summary: "高光压缩的起点、斜率与柔和度", controls: [{ key: "point", label: "膝点", min: 0, max: 1, step: 0.01, value: "0.75" }, { key: "slope", label: "斜率", min: 0, max: 1, step: 0.01, value: "0.5" }, { key: "softness", label: "柔和度", min: 0, max: 1, step: 0.01, value: "0.2" }] },
  { label: "黑电平 / 高光电平", engineLabel: "黑电平 / 高光电平", summary: "分别锁定黑位与高光映射", controls: [{ key: "blackLevel", label: "黑电平", min: -7.3, max: 7.3, step: 0.01, value: "0", unit: "% IRE" }, { key: "highlightReflectance", label: "高光反射", min: 0, max: 100, step: 0.1, value: "90", unit: "%" }, { key: "highlightMap", label: "高光映射", min: -7.3, max: 109, step: 0.01, value: "100", unit: "% IRE" }] },
  { label: "黑伽马", engineLabel: "黑伽马", summary: "阴影区的 Power、Stop Limit 与 Feather", controls: [{ key: "power", label: "Power", min: 0.01, max: 10, step: 0.01, value: "1" }, { key: "stopLimit", label: "Stop Limit", min: -9, max: 2, step: 0.1, value: "-1.5", unit: "档" }, { key: "feather", label: "Feather", min: 0, max: 9, step: 0.1, value: "2", unit: "档" }] },
  { label: "SDR 饱和度", engineLabel: "SDR Saturation", summary: "SDR 输出下的饱和度与亮度补偿", controls: [{ key: "saturation", label: "饱和度", min: 0, max: 2, step: 0.01, value: "1" }, { key: "brightness", label: "亮度", min: -1, max: 1, step: 0.01, value: "0" }] },
  { label: "显示色彩空间转换", engineLabel: "显示色彩空间转换", summary: "显示色彩空间、白点和适配模型", controls: [], selects: [{ key: "inputSpace", label: "输入色彩空间", value: "Rec709", options: ["Rec709", "Rec2020", "P3-D65", "ACEScg"] }, { key: "outputSpace", label: "输出色彩空间", value: "Rec709", options: ["Rec709", "Rec2020", "P3-D65", "sRGB"] }, { key: "cat", label: "适配模型", value: "CIECAT02", options: ["CIECAT02", "Bradford", "Von Kries"] }] },
  { label: "色域限制", engineLabel: "色域限制", summary: "选择限制色域和压缩方式", controls: [{ key: "threshold", label: "限制阈值", min: 0, max: 1, step: 0.01, value: "1" }, { key: "softness", label: "压缩柔和度", min: 0, max: 1, step: 0.01, value: "0.2" }], selects: [{ key: "gamut", label: "目标色域", value: "Rec709", options: ["Rec709", "Rec2020", "sRGB", "P3-D65"] }] },
  { label: "伪色", engineLabel: "伪色", summary: "以伪色显示 IRE 区间和曝光状态", controls: [{ key: "low", label: "低阈值", min: 0, max: 100, step: 1, value: "0", unit: "% IRE" }, { key: "high", label: "高阈值", min: 0, max: 109, step: 1, value: "100", unit: "% IRE" }], selects: [{ key: "mode", label: "显示模式", value: "Rec709 Gamut", options: ["Rec709 Gamut", "灰度", "RGB 采样"] }] },
  { label: "RGB 采样器", engineLabel: "RGB Sampler", summary: "采样并读取预览中的 RGB 数值", controls: [], selects: [{ key: "mode", label: "采样模式", value: "10-bit", options: ["8-bit", "10-bit", "12-bit", "浮点"] }] },
];

function SliderControl({ module, spec, value, disabled, onChange }: { module: string; spec: ControlSpec; value: string; disabled: boolean; onChange: (module: string, key: string, value: string) => void })
{
  return (
    <label className="adjustment-control">
      <span>{spec.label}</span>
      <div className="adjustment-control-input">
        <input type="range" min={spec.min} max={spec.max} step={spec.step} value={value} disabled={disabled} onChange={(event) => onChange(module, spec.key, event.target.value)} />
        <input type="number" min={spec.min} max={spec.max} step={spec.step} value={value} disabled={disabled} onChange={(event) => onChange(module, spec.key, event.target.value)} />
        {spec.unit && <em>{spec.unit}</em>}
      </div>
    </label>
  );
}

export function NativeAdjustments({ engineReady, onToggle, onImportLut, onAnalyzeLut, onResetLut, onControlChange, onLutAnalystConfigChange, lutAnalystChoices, analysisState }: NativeAdjustmentsProps)
{
  const fileRef = useRef<HTMLInputElement>(null);
  const defaultSyncRef = useRef(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(ADJUSTMENTS.map((item) => [item.label, false])));
  const [customizationEnabled, setCustomizationEnabled] = useState(true);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(ADJUSTMENTS.flatMap((item) => item.controls.map((control) => [`${item.label}.${control.key}`, control.value]))));
  const [selectValues, setSelectValues] = useState<Record<string, string>>(() => Object.fromEntries(ADJUSTMENTS.flatMap((item) => (item.selects || []).map((select) => [`${item.label}.${select.key}`, select.value]))));
    const [lutOpen, setLutOpen] = useState(false);
  const [lutFileName, setLutFileName] = useState("");
  const [lutAnalyst, setLutAnalyst] = useState({ title: "自定义 LUT", inputGamma: "S-Log3", inputGamut: "Sony S-Gamut3.cine", dimension: "33³", method: "三线性", range: "109%→100%" });
  const [lutAdvancedOpen, setLutAdvancedOpen] = useState(false);
  const [lutCompatibility, setLutCompatibility] = useState({ compatible: true, message: "导入后将根据 LUT 文件头核对输入 Gamma 与色域。" });
  const [lutMetadata, setLutMetadata] = useState<LutFileMetadata | null>(null);
  const analystGammaChoices = lutAnalystChoices?.gamma || [];
  const analystGamutChoices = lutAnalystChoices?.gamut || [];

  const toggleItem = (item: AdjustmentItem, checked?: boolean) =>
  {
    const nextValue = checked ?? !enabled[item.label];
    setEnabled((current) => ({ ...current, [item.label]: nextValue }));
    onToggle(item.engineLabel, nextValue);
  };

  const updateControl = (module: string, key: string, value: string | boolean) =>
  {
    const stateKey = `${module}.${key}`;
    if (typeof value === "string")
    {
      setValues((current) => ({ ...current, [stateKey]: value }));
      setSelectValues((current) => ({ ...current, [stateKey]: value }));
    }
    onControlChange?.(module, key, value);
  };

  useEffect(() =>
  {
    if (!engineReady || defaultSyncRef.current) return;
    defaultSyncRef.current = true;
    ADJUSTMENTS.forEach((item) => onToggle(item.engineLabel, false));
  }, [engineReady, onToggle]);

  /* 下拉框的候选项只使用隐藏原版引擎的真实目录，避免 React 外壳缩减支持范围。 */
  useEffect(() =>
  {
    setLutAnalyst((current) =>
    {
      const nextGamma = analystGammaChoices.some((item) => item.label === current.inputGamma) ? current.inputGamma : analystGammaChoices[0]?.label || current.inputGamma;
      const nextGamut = analystGamutChoices.some((item) => item.label === current.inputGamut) ? current.inputGamut : analystGamutChoices[0]?.label || current.inputGamut;
      return nextGamma === current.inputGamma && nextGamut === current.inputGamut ? current : { ...current, inputGamma: nextGamma, inputGamut: nextGamut };
    });
  }, [analystGammaChoices, analystGamutChoices]);

  const updateLutAnalyst = (control: string, value: string) =>
  {
    setLutAnalyst((current) => ({ ...current, [control]: value }));
    onLutAnalystConfigChange?.(control, value);
  };

  const chooseLut = (file?: File) =>
  {
    if (!file) return;
    setLutFileName(file.name);
    setLutOpen(true);
    onImportLut(file);
    void file.text().then((content) =>
    {
      const readComment = (key: string) => content.match(new RegExp(`^\\s*#${key}\\s*:\\s*(.+)$`, "im"))?.[1]?.trim() || "";
      const dimension = content.match(/^\s*LUT_3D_SIZE\s+(\d+)/im)?.[1] || content.match(/^\s*LUT_1D_SIZE\s+(\d+)/im)?.[1] || "";
      const fileIdentity = `${file.name}\n${content}`;
      const leicaLLog = /Leica[^\n]*L[-_ ]?Log|(?:^|[_\s])L[-_ ]?Log/i.test(fileIdentity);
      const leicaRec2020 = /Rec[ ._-]?2020|BT\.?2020|ITU-R\s+BT\.?(?:2020)/i.test(fileIdentity);
      const inferredInput = leicaLLog && leicaRec2020 ? "Leica L-Log / Rec.2020（由文件名推断，待用户确认）" : "";
      const inferredOutput = /Rec[ ._-]?709[_ -]?Gamma(?:[ _-]?2[._-]?4)?/i.test(fileIdentity) ? "Rec.709 / Gamma 2.4（由文件名推断）" : "";
      const kind = /Viewing/i.test(file.name) ? "Viewing LUT（监看预览用途）" : /Cine/i.test(file.name) ? "Cine LUT（正式调色候选）" : "未从文件名推断用途";
      const diagnostics: string[] = [];
      if (!dimension) diagnostics.push("未找到 LUT_3D_SIZE 或 LUT_1D_SIZE；原版引擎可能无法确定网格维度。");
      if (!/^\s*(?:#|TITLE|LUT_|DOMAIN_|-?\d)/im.test(content)) diagnostics.push("文件内容不符合常见 Cube/LUT 文本结构。");
      const isThreeDimensional = /^\s*LUT_3D_SIZE\s+/im.test(content);
      const dataRows = content.split(/\r?\n/).map((line) => line.trim()).filter((line) => /^-?(?:\d|\.\d)/.test(line)).map((line) => line.split(/\s+/).slice(0, 3).map(Number));
      if (dataRows.some((row) => row.length !== 3 || row.some((value) => !Number.isFinite(value)))) diagnostics.push("检测到非数值或非 RGB 三元组数据行；请导出标准 Cube/LUT 文本文件后重试。");
      if (dimension && isThreeDimensional && dataRows.length < Math.pow(Number(dimension), 3)) diagnostics.push(`3D 网格声明为 ${dimension}³，但只读取到 ${dataRows.length} 行 RGB 数据；文件可能截断。`);
      void crypto.subtle.digest("SHA-256", new TextEncoder().encode(content)).then((hash) =>
      {
        const sha256 = Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
        setLutMetadata({ title: readComment("title"), model: readComment("model"), gamma: readComment("Gamma"), gamut: readComment("Gamut"), dimension, dataRows: dataRows.length, inferredInput, inferredOutput, kind, sha256, diagnostics });
      }).catch(() => setLutMetadata({ title: readComment("title"), model: readComment("model"), gamma: readComment("Gamma"), gamut: readComment("Gamut"), dimension, dataRows: dataRows.length, inferredInput, inferredOutput, kind, sha256: "浏览器未提供 SHA-256", diagnostics }));
      const sourceTitle = readComment("title") || file.name.replace(/^pasted_file_[^_]+_/, "").replace(/\.(cube|3dl|lut|txt)$/i, "");
      if (sourceTitle)
      {
        const detectedDimension = dimension === "65" ? "65³" : dimension === "33" ? "33³" : undefined;
        setLutAnalyst((current) => ({ ...current, title: sourceTitle, ...(detectedDimension ? { dimension: detectedDimension } : {}) }));
        onLutAnalystConfigChange?.("title", sourceTitle);
        if (detectedDimension) onLutAnalystConfigChange?.("dimension", detectedDimension);
      }
      if (diagnostics.length)
      {
        setLutCompatibility({ compatible: false, message: `分析前诊断：${diagnostics[0]}` });
        return;
      }
      const requestedGamma = leicaLLog ? "Leica L-Log" : (/F-Log2/i.test(content) || /FLog2/i.test(file.name) ? "Fujifilm F-Log2" : "");
      const requestedGamut = leicaLLog ? (leicaRec2020 ? "Rec2020" : "") : (/F-GamutC/i.test(content) || /F-Log\s*Gamut/i.test(content) ? "Fujifilm F-Log Gamut" : "");
      if (leicaLLog && !leicaRec2020)
      {
        setLutCompatibility({ compatible: false, message: "已识别 Leica L-Log，但文件未明确声明 Rec.2020 / BT.2020 输入色域。为避免静默错配，已阻止分析；请核对官方来源后手动确认输入色域。" });
        return;
      }
      const gammaSupported = !requestedGamma || analystGammaChoices.some((item) => item.label === requestedGamma);
      const gamutSupported = !requestedGamut || analystGamutChoices.some((item) => item.label === requestedGamut);
      if (!gammaSupported || !gamutSupported)
      {
        setLutCompatibility({ compatible: false, message: `无法安全分析：文件需要 ${requestedGamma || "指定 Gamma"}${requestedGamut ? ` / ${requestedGamut}` : ""}，当前引擎未提供完全匹配项。` });
        return;
      }
      if (requestedGamma || requestedGamut)
      {
        setLutAnalyst((current) => ({ ...current, inputGamma: requestedGamma || current.inputGamma, inputGamut: requestedGamut || current.inputGamut }));
        if (requestedGamma) onLutAnalystConfigChange?.("inputGamma", requestedGamma);
        if (requestedGamut) onLutAnalystConfigChange?.("inputGamut", requestedGamut);
        const sourceKind = /Viewing/i.test(file.name) ? "检测到 Leica Viewing LUT：适合监看预览，建议不要将其误作正式调色母版。" : leicaLLog ? "已识别 Leica Cine LUT 候选输入：Leica L-Log / Rec2020；请继续核对项目中的范围与机型白位。" : "";
        setLutCompatibility({ compatible: true, message: `已根据 LUT 文件头匹配：${requestedGamma || "保留当前 Gamma"}${requestedGamut ? ` / ${requestedGamut}` : ""}。${sourceKind}` });
        return;
      }
      setLutCompatibility({ compatible: true, message: "未检测到可自动匹配的输入标记；将按当前选择分析。" });
    }).catch(() => { setLutMetadata(null); setLutCompatibility({ compatible: true, message: "无法读取 LUT 文件头；将按当前选择分析。" }); });
  };

  useEffect(() =>
  {
    if (!lutOpen) return;
    window.requestAnimationFrame(() =>
    {
      document.querySelector('.adjustment-lut-item')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [lutOpen]);

  return (
    <section className="native-card adjustments-card" aria-label="调整项">
      <div className="card-title adjustments-title">
        <span>04</span>
        <div><h3>调整项</h3><p>勾选模块后直接显示参数；LUT 解析保留独立工具展开。</p></div>
        <label className="adjustments-master-toggle"><input type="checkbox" checked={customizationEnabled} disabled={!engineReady} onChange={(event) => { const nextValue = event.target.checked; setCustomizationEnabled(nextValue); ADJUSTMENTS.forEach((item) => onToggle(item.engineLabel, nextValue ? Boolean(enabled[item.label]) : false)); }} /><span>启用调整项</span></label>
      </div>
      <div className="adjustment-list">
        {ADJUSTMENTS.map((item) => (
          <div className={`adjustment-item ${enabled[item.label] ? "is-active" : ""}`} key={item.label}>
            <div className="adjustment-item-main">
              <span className="adjustment-check"><input type="checkbox" checked={Boolean(enabled[item.label])} disabled={!engineReady || !customizationEnabled} onChange={(event) => toggleItem(item, event.target.checked)} /></span>
              <span className="adjustment-item-name">{item.label}</span><span className="adjustment-item-summary">{item.summary}</span><span className="adjustment-state">{enabled[item.label] ? "启用" : "关闭"}</span>
            </div>
            {enabled[item.label] && <div className="adjustment-details">
              <div className="adjustment-detail-grid">
                {item.controls.map((spec) => <SliderControl key={spec.key} module={item.label} spec={spec} value={values[`${item.label}.${spec.key}`] ?? spec.value} disabled={!engineReady || !customizationEnabled || !enabled[item.label]} onChange={updateControl} />)}
                {(item.selects || []).map((select) => <label className="adjustment-control adjustment-select-control" key={select.key}><span>{select.label}</span><select value={selectValues[`${item.label}.${select.key}`] ?? select.value} disabled={!engineReady || !customizationEnabled || !enabled[item.label]} onChange={(event) => updateControl(item.label, select.key, event.target.value)}>{select.options.map((option) => <option value={option} key={option}>{option}</option>)}</select></label>)}
              </div>
              {item.label === "白平衡" && <button type="button" className="adjustment-inline-button" disabled={!engineReady}>从新白平衡解锁光源</button>}
              <div className="adjustment-details-foot"><span>参数变化会同步到兼容计算引擎</span><button type="button" onClick={() => item.controls.forEach((control) => updateControl(item.label, control.key, control.value))}>重置本模块</button></div>
            </div>}
          </div>
        ))}
        <div className={`adjustment-item adjustment-lut-item ${lutOpen ? "is-expanded" : ""}`}>
          <button type="button" className="adjustment-item-main adjustment-lut-trigger" aria-expanded={lutOpen} onClick={() => setLutOpen((current) => !current)}><span className="adjustment-item-name">LUT 解析</span><span className="adjustment-item-summary">按原版 LUTAnalyst 分析外部 LUT，并将结果同步到曲线预览</span><span className="adjustment-state">{lutFileName ? "已载入" : "工具"}</span><ChevronDown size={16} className="adjustment-chevron" /></button>
          {lutOpen && <div className="adjustment-details lut-analysis-panel">
            <div className="lut-analyst-head"><div><strong>LUTAnalyst</strong><span>原版 LUT 分析工具</span></div>{lutFileName && <span className="lut-analyst-file">{lutFileName}</span>}</div>
            <div className="lut-analyst-grid">
              <label className="adjustment-control lut-analyst-title"><span>LUT 标题</span><input type="text" value={lutAnalyst.title} disabled={!engineReady} onChange={(event) => updateLutAnalyst("title", event.target.value)} /></label>
              <label className="adjustment-control"><span>输入 Gamma</span><select value={lutAnalyst.inputGamma} disabled={!engineReady || !analystGammaChoices.length} onChange={(event) => updateLutAnalyst("inputGamma", event.target.value)}>{analystGammaChoices.length ? analystGammaChoices.map((item) => <option value={item.label} key={item.value}>{item.label}</option>) : <option>正在读取原版 Gamma 目录…</option>}</select></label>
              <label className="adjustment-control"><span>输入 Gamut</span><select value={lutAnalyst.inputGamut} disabled={!engineReady || !analystGamutChoices.length} onChange={(event) => updateLutAnalyst("inputGamut", event.target.value)}>{analystGamutChoices.length ? analystGamutChoices.map((item) => <option value={item.label} key={item.value}>{item.label}</option>) : <option>正在读取原版色域目录…</option>}</select></label>
            </div>
            <div className="lut-analyst-section"><span className="lut-analyst-section-label">分析设置</span><div className="lut-analyst-choice-row"><span>分析维度</span><label><input type="radio" name="lut-dimension" checked={lutAnalyst.dimension === "33³"} disabled={!engineReady} onChange={() => updateLutAnalyst("dimension", "33³")} />33³</label><label><input type="radio" name="lut-dimension" checked={lutAnalyst.dimension === "65³"} disabled={!engineReady} onChange={() => updateLutAnalyst("dimension", "65³")} />65³</label></div><div className="lut-analyst-choice-row"><span>分析方法</span><label><input type="radio" name="lut-method" checked={lutAnalyst.method === "三线性"} disabled={!engineReady} onChange={() => updateLutAnalyst("method", "三线性")} />三线性</label><label><input type="radio" name="lut-method" checked={lutAnalyst.method === "四面体"} disabled={!engineReady} onChange={() => updateLutAnalyst("method", "四面体")} />四面体</label><label><input type="radio" name="lut-method" checked={lutAnalyst.method === "三次插值（Tricubic）"} disabled={!engineReady} onChange={() => updateLutAnalyst("method", "三次插值（Tricubic）")} />三次插值（Tricubic）</label></div></div>
            <div className="lut-analyst-section"><span className="lut-analyst-section-label">LUT 范围</span><div className="lut-analyst-range-grid">{["109%→100%", "109%→109%", "100%→100%", "100%→109%"].map((range) => <label key={range}><input type="radio" name="lut-range" checked={lutAnalyst.range === range} disabled={!engineReady} onChange={() => updateLutAnalyst("range", range)} />{range}</label>)}</div><p className="lut-analyst-range-help">箭头左侧为文件输入编码范围，右侧为分析后的显示输出范围。100% 表示视频合法范围，109% 保留超白；范围不符时高光裁切与灰阶结果会改变。</p></div>
            <label className="adjustment-control lut-file-field"><span>LUT 文件</span><input ref={fileRef} type="file" accept=".cube,.3dl,.lut,.txt" disabled={!engineReady} onChange={(event) => chooseLut(event.target.files?.[0])} /></label><div className="lut-file-status">{lutFileName || "尚未选择文件"}</div><p className={`lut-analyst-compatibility ${lutCompatibility.compatible ? "is-compatible" : "is-error"}`}>{lutCompatibility.message}</p>
            {lutMetadata && <div className="lut-analyst-metadata"><span>原始标题：{lutMetadata.title || "未提供"}</span><span>原始输入：{lutMetadata.gamma || "未提供"}</span><span>原始色域：{lutMetadata.gamut || "未提供"}</span><span>网格：{lutMetadata.dimension ? `${lutMetadata.dimension}³` : "未声明"}</span><span>RGB 数据行：{lutMetadata.dataRows.toLocaleString("zh-CN")}</span><span>机型：{lutMetadata.model || "未提供"}</span><span>用途：{lutMetadata.kind}</span><span>SHA-256：{lutMetadata.sha256 ? `${lutMetadata.sha256.slice(0, 16)}…` : "计算中"}</span>{lutMetadata.inferredInput && <span className="lut-analyst-mapping">文件推断输入：{lutMetadata.inferredInput}</span>}{lutMetadata.inferredOutput && <span className="lut-analyst-mapping">文件推断输出：{lutMetadata.inferredOutput}</span>}<span className="lut-analyst-mapping">引擎映射：{lutAnalyst.inputGamma} / {lutAnalyst.inputGamut}</span><span className="lut-analyst-mapping">输出解释：{lutMetadata.gamut || lutMetadata.inferredOutput || "文件未声明"}；分析后以 LA - {lutAnalyst.title} 注册为原版输出。</span>{/(F-Log2C|F-GamutC|ITU-R BT\.709)/i.test(`${lutMetadata.gamma} ${lutMetadata.gamut}`) && <span className="lut-analyst-alias-warning">别名提示：保留文件中的 F-Log2C / F-GamutC / ITU-R BT.709 原始定义；原版引擎采用上方标准选项映射，不宣称二者为严格同名空间。</span>}{lutMetadata.diagnostics.map((diagnostic) => <span className="lut-analyst-diagnostic" key={diagnostic}>分析前诊断：{diagnostic}</span>)}</div>}
            {analysisState && analysisState.status !== "idle" && <div className={`lut-analysis-result is-${analysisState.status}`}><strong>{analysisState.status === "ready" ? "分析结果已同步" : analysisState.status === "error" ? "分析未完成" : "分析状态"}</strong><span>{analysisState.message}</span>{analysisState.status === "ready" && <small>当前输出：{analysisState.outputGamma} / {analysisState.outputGamut}；分析参数：{lutAnalyst.dimension}、{lutAnalyst.method}、{lutAnalyst.range}；完成时间：{analysisState.completedAt}</small>}{analysisState.status === "ready" && Boolean(analysisState.samples.length) && <div className="lut-analysis-samples">{analysisState.samples.map((sample) => <span key={sample.label}><b>{sample.label}</b>{sample.ire} / 10-bit {sample.code10}</span>)}</div>}</div>}
            <div className="adjustment-detail-actions lut-analyst-actions"><button type="button" className="adjustment-inline-button is-primary" disabled={!engineReady || !lutFileName || !lutCompatibility.compatible || analysisState?.status === "analyzing"} onClick={() => { onAnalyzeLut(); /* 原版完成分析时会以文件名回填标题；完成期间多次回写用户标题，确保 LA 名称与导出名称一致。 */ [700, 1800, 3600, 7200].forEach((delay) => window.setTimeout(() => onLutAnalystConfigChange?.("title", lutAnalyst.title), delay)); }}><Sparkles size={14} />{analysisState?.status === "analyzing" ? "正在分析…" : "分析 LUT 并应用当前输出"}</button><button type="button" className="adjustment-inline-button" disabled={!engineReady} onClick={() => { setLutFileName(""); setLutMetadata(null); setLutOpen(true); setLutCompatibility({ compatible: true, message: "导入后将根据 LUT 文件头核对输入 Gamma 与色域。" }); setLutAnalyst({ title: "自定义 LUT", inputGamma: "S-Log3", inputGamut: "Sony S-Gamut3.cine", dimension: "33³", method: "三线性", range: "109%→100%" }); onResetLut(); }}><RotateCcw size={14} />新建 LUT</button><button type="button" className="adjustment-inline-button" disabled={!engineReady} onClick={() => fileRef.current?.click()}><FileUp size={14} />选择文件</button></div>
            <button type="button" className="lut-advanced-toggle" aria-expanded={lutAdvancedOpen} onClick={() => setLutAdvancedOpen((current) => !current)}><span>高级设置</span><ChevronDown size={14} /></button>{lutAdvancedOpen && <div className="lut-advanced-panel"><label><input type="checkbox" disabled={!engineReady} />保留原始采样范围</label><label><input type="checkbox" disabled={!engineReady} />写入分析元数据</label><span>高级选项由原版 LUTAnalyst 提供，默认保持关闭。</span></div>}
          </div>}
        </div>
      </div>
    </section>
  );
}

export default NativeAdjustments;
