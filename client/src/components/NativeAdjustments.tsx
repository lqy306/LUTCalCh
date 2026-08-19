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

export function NativeAdjustments({ engineReady, onToggle, onImportLut, onAnalyzeLut, onResetLut, onControlChange }: NativeAdjustmentsProps)
{
  const fileRef = useRef<HTMLInputElement>(null);
  const defaultSyncRef = useRef(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(ADJUSTMENTS.map((item) => [item.label, false])));
  const [customizationEnabled, setCustomizationEnabled] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(ADJUSTMENTS.flatMap((item) => item.controls.map((control) => [`${item.label}.${control.key}`, control.value]))));
  const [selectValues, setSelectValues] = useState<Record<string, string>>(() => Object.fromEntries(ADJUSTMENTS.flatMap((item) => (item.selects || []).map((select) => [`${item.label}.${select.key}`, select.value]))));
    const [lutOpen, setLutOpen] = useState(false);
  const [lutFileName, setLutFileName] = useState("");

  const toggleItem = (item: AdjustmentItem, checked?: boolean) =>
  {
    const nextValue = checked ?? !enabled[item.label];
    setEnabled((current) => ({ ...current, [item.label]: nextValue }));
    setExpanded((current) => ({ ...current, [item.label]: nextValue }));
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

  const chooseLut = (file?: File) =>
  {
    if (!file) return;
    setLutFileName(file.name);
    setLutOpen(true);
    onImportLut(file);
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
        <div><h3>调整项</h3><p>按原版模块顺序排列；每一项都可展开并直接调整。</p></div>
        <label className="adjustments-master-toggle"><input type="checkbox" checked={customizationEnabled} disabled={!engineReady} onChange={(event) => { const nextValue = event.target.checked; setCustomizationEnabled(nextValue); setExpanded({}); ADJUSTMENTS.forEach((item) => onToggle(item.engineLabel, nextValue ? Boolean(enabled[item.label]) : false)); }} /><span>启用调整项</span></label>
      </div>
      <div className="adjustment-list">
        {ADJUSTMENTS.map((item) => (
          <div className={`adjustment-item ${enabled[item.label] ? "is-active" : ""} ${expanded[item.label] ? "is-expanded" : ""}`} key={item.label}>
            <button type="button" className="adjustment-item-main" disabled={!customizationEnabled || !engineReady} onClick={() => setExpanded((current) => ({ ...current, [item.label]: !current[item.label] }))}>
              <span className="adjustment-check" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={Boolean(enabled[item.label])} disabled={!engineReady || !customizationEnabled} onChange={(event) => toggleItem(item, event.target.checked)} /></span>
              <span className="adjustment-item-name">{item.label}</span><span className="adjustment-item-summary">{item.summary}</span><span className="adjustment-state">{enabled[item.label] ? "启用" : "关闭"}</span><ChevronDown size={16} className="adjustment-chevron" />
            </button>
            {expanded[item.label] && <div className="adjustment-details">
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
          <button type="button" className="adjustment-item-main adjustment-lut-trigger" aria-expanded={lutOpen} onClick={() => setLutOpen((current) => !current)}><span className="adjustment-item-name">LUT 解析</span><span className="adjustment-item-summary">导入、分析并读取外部 LUT；这是独立工具，不属于普通调整项开关</span><span className="adjustment-state">{lutFileName ? "已载入" : "工具"}</span><ChevronDown size={16} className="adjustment-chevron" /></button>
          {lutOpen && <div className="adjustment-details lut-analysis-panel"><label className="adjustment-control lut-file-field"><span>LUT 文件</span><input ref={fileRef} type="file" accept=".cube,.3dl,.lut,.txt" disabled={!engineReady} onChange={(event) => chooseLut(event.target.files?.[0])} /></label><div className="lut-file-status">{lutFileName || "尚未选择文件"}</div><div className="adjustment-detail-actions"><button type="button" className="adjustment-inline-button is-primary" disabled={!engineReady || !lutFileName} onClick={onAnalyzeLut}><Sparkles size={14} />分析 LUT</button><button type="button" className="adjustment-inline-button" disabled={!engineReady} onClick={() => { setLutFileName(""); setLutOpen(false); onResetLut(); }}><RotateCcw size={14} />重置</button><button type="button" className="adjustment-inline-button" disabled={!engineReady} onClick={() => fileRef.current?.click()}><FileUp size={14} />选择文件</button></div></div>}
        </div>
      </div>
    </section>
  );
}

export default NativeAdjustments;
