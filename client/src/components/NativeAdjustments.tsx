/*
 * 设计方向：统一 Ubuntu 工作台。
 * 本组件是唯一可见的调整项界面；原版 iframe 仅作为隐藏计算引擎。
 * LUT 解析保持原版层级，作为调整项列表中的最后一个可展开条目。
 * 文件遵循 BSD Allman 大括号风格，并使用中文界面文案。
 */
import { useEffect, useRef, useState } from "react";
import { FileUp, RotateCcw, Sparkles } from "lucide-react";

type NativeAdjustmentsProps = {
  engineReady: boolean;
  onToggle: (label: string, checked: boolean) => void;
  onImportLut: (file: File) => void;
  onAnalyzeLut: () => void;
  onResetLut: () => void;
};

type AdjustmentItem = {
  label: string;
  engineLabel: string;
};

const ADJUSTMENTS: AdjustmentItem[] = [
  { label: "白平衡", engineLabel: "白平衡" },
  { label: "PSST-CDL", engineLabel: "PSST-CDL" },
  { label: "ASC-CDL", engineLabel: "ASC-CDL" },
  { label: "多色调", engineLabel: "多色调" },
  { label: "高光色域", engineLabel: "高光色域" },
  { label: "膝点", engineLabel: "膝点" },
  { label: "黑电平 / 高光电平", engineLabel: "黑电平 / 高光电平" },
  { label: "黑伽马", engineLabel: "黑伽马" },
  { label: "显示色彩空间转换", engineLabel: "显示色彩空间转换" },
  { label: "色域限制", engineLabel: "色域限制" },
  { label: "伪色", engineLabel: "伪色" },
];

export function NativeAdjustments({ engineReady, onToggle, onImportLut, onAnalyzeLut, onResetLut }: NativeAdjustmentsProps)
{
  const fileRef = useRef<HTMLInputElement>(null);
  const defaultSyncRef = useRef(false);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(ADJUSTMENTS.map((item) => [item.label, true])));
  const [customizationEnabled, setCustomizationEnabled] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ "白平衡": true });
  const [lutEnabled, setLutEnabled] = useState(false);
  const [lutOpen, setLutOpen] = useState(false);
  const [lutFileName, setLutFileName] = useState("");
  const [referenceWhite, setReferenceWhite] = useState("5500");
  const [newWhiteBalance, setNewWhiteBalance] = useState("5500");
  const [ctoValue, setCtoValue] = useState("0");
  const [greenValue, setGreenValue] = useState("0");

  const toggleItem = (item: AdjustmentItem, checked?: boolean) =>
  {
    const nextValue = checked ?? !enabled[item.label];
    setEnabled((current) => ({ ...current, [item.label]: nextValue }));
    setExpanded((current) => ({ ...current, [item.label]: nextValue }));
    onToggle(item.engineLabel, nextValue);
  };

  const toggleCustomization = (checked: boolean) =>
  {
    setCustomizationEnabled(checked);
    if (!checked)
    {
      setExpanded({});
      setLutOpen(false);
    }
  };

  useEffect(() =>
  {
    if (!engineReady || defaultSyncRef.current) return;
    defaultSyncRef.current = true;
    ADJUSTMENTS.forEach((item) => onToggle(item.engineLabel, true));
  }, [engineReady, onToggle]);

  const chooseLut = (file?: File) =>
  {
    if (!file) return;
    setLutFileName(file.name);
    setLutOpen(true);
    onImportLut(file);
  };

  return (
    <section className="native-card adjustments-card" aria-label="调整项">
      <div className="card-title adjustments-title">
        <span>04</span>
        <div>
          <h3>调整项</h3>
          <p>按原版层级组织校正模块；LUT 解析位于列表末尾。</p>
        </div>
        <label className="adjustments-master-toggle" title="启用全部调整项">
          <input type="checkbox" checked={customizationEnabled} disabled={!engineReady} onChange={(event) => toggleCustomization(event.target.checked)} />
          <span>启用调整项</span>
        </label>
      </div>
      <div className="adjustment-list">
        {ADJUSTMENTS.map((item) => (
          <div className={`adjustment-item ${enabled[item.label] ? "is-active" : ""}`} key={item.label}>
            <div className="adjustment-item-main">
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(enabled[item.label])}
                  disabled={!engineReady || !customizationEnabled}
                  onChange={(event) => toggleItem(item, event.target.checked)}
                />
                <span>{item.label}</span>
              </label>
              <span className="adjustment-state">{enabled[item.label] ? "已启用" : "未启用"}</span>
            </div>
            {expanded[item.label] && (
              item.label === "白平衡" ? (
                <div className="adjustment-details white-balance-details">
                  <div className="white-balance-inputs">
                    <label className="native-field"><span>参考白</span><input type="number" value={referenceWhite} onChange={(event) => setReferenceWhite(event.target.value)} /><em>K</em></label>
                    <label className="native-field"><span>新白平衡</span><input type="number" value={newWhiteBalance} onChange={(event) => setNewWhiteBalance(event.target.value)} /><em>K</em></label>
                  </div>
                  <button type="button" className="white-balance-unlock" disabled={!engineReady}>从新白平衡解锁光源</button>
                  <div className="white-balance-slider-group">
                    <input type="range" min="-100" max="100" value={ctoValue} onChange={(event) => setCtoValue(event.target.value)} aria-label="CTO 与 CTB" />
                    <div className="white-balance-slider-meta"><span>CTO</span><span>清除 <button type="button" onClick={() => setCtoValue("0")}>重置</button></span><span>CTB</span></div>
                  </div>
                  <div className="white-balance-slider-group">
                    <input type="range" min="-100" max="100" value={greenValue} onChange={(event) => setGreenValue(event.target.value)} aria-label="Minus Green 与 Plus Green" />
                    <div className="white-balance-slider-meta"><span>Minus Green</span><span>清除 <button type="button" onClick={() => setGreenValue("0")}>重置</button></span><span>Plus Green</span></div>
                  </div>
                </div>
              ) : (
                <div className="adjustment-details adjustment-placeholder-details">
                  <p>该模块已展开，选择框状态会同步到兼容计算引擎。</p>
                  <span>{enabled[item.label] ? "当前已启用" : "当前未启用"}</span>
                </div>
              )
            )}
          </div>
        ))}
        <div className={`adjustment-item adjustment-lut-item ${lutOpen || lutEnabled ? "is-active" : ""}`}>
          <div className="adjustment-item-main">
            <label>
              <input type="checkbox" checked={lutEnabled} disabled={!engineReady || !customizationEnabled} onChange={(event) => { setLutEnabled(event.target.checked); setLutOpen(event.target.checked); }} />
              <span>LUT 解析</span>
            </label>
            <span className="adjustment-state">{lutEnabled ? "已启用" : "未启用"}</span>
          </div>
          {lutOpen && (
            <div className="adjustment-details lut-analysis-panel">
              <div className="lut-analysis-choice">
                <span className="adjustment-detail-label">分析方式</span>
                <div className="segmented-control compact" role="group" aria-label="LUT 分析方式">
                  <button type="button" className="selected" disabled={!engineReady}>导入新 LUT</button>
                  <button type="button" disabled={!engineReady}>读取已分析 LUT</button>
                </div>
              </div>
              <label className="native-field lut-file-field">
                <span>LUT 文件</span>
                <input ref={fileRef} type="file" accept=".cube,.3dl,.lut,.txt" disabled={!engineReady} onChange={(event) => chooseLut(event.target.files?.[0])} />
              </label>
              <div className="lut-file-status">{lutFileName || "尚未选择文件"}</div>
              <div className="adjustment-detail-actions">
                <button type="button" className="apple-button is-primary" disabled={!engineReady || !lutFileName} onClick={onAnalyzeLut}><Sparkles size={14} />分析 LUT</button>
                <button type="button" className="apple-button" disabled={!engineReady} onClick={() => { setLutFileName(""); setLutOpen(false); onResetLut(); }}><RotateCcw size={14} />重置</button>
                <button type="button" className="apple-button is-quiet" disabled={!engineReady} onClick={() => fileRef.current?.click()}><FileUp size={14} />选择文件</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default NativeAdjustments;
