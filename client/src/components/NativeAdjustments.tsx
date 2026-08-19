/*
 * 设计方向：统一 Ubuntu 工作台。
 * 本组件是唯一可见的调整项界面；原版 iframe 仅作为隐藏计算引擎。
 * LUT 解析保持原版层级，作为调整项列表中的最后一个可展开条目。
 * 文件遵循 BSD Allman 大括号风格，并使用中文界面文案。
 */
import { useRef, useState } from "react";
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
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [lutOpen, setLutOpen] = useState(false);
  const [lutFileName, setLutFileName] = useState("");

  const toggleItem = (item: AdjustmentItem) =>
  {
    const nextValue = !enabled[item.label];
    setEnabled((current) => ({ ...current, [item.label]: nextValue }));
    onToggle(item.engineLabel, nextValue);
  };

  const chooseLut = (file?: File) =>
  {
    if (!file) return;
    setLutFileName(file.name);
    setLutOpen(true);
    onImportLut(file);
  };

  return (
    <section className="native-card adjustments-card" aria-label="调整项">
      <div className="card-title">
        <span>04</span>
        <div>
          <h3>调整项</h3>
          <p>按原版层级组织校正模块；LUT 解析位于列表末尾。</p>
        </div>
      </div>
      <div className="adjustment-list">
        {ADJUSTMENTS.map((item) => (
          <div className={`adjustment-item ${enabled[item.label] ? "is-active" : ""}`} key={item.label}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(enabled[item.label])}
                disabled={!engineReady}
                onChange={() => toggleItem(item)}
              />
              <span>{item.label}</span>
            </label>
            <span className="adjustment-state">{enabled[item.label] ? "已启用" : "未启用"}</span>
          </div>
        ))}
        <div className={`adjustment-item adjustment-lut-item ${lutOpen ? "is-active" : ""}`}>
          <button className="adjustment-item-trigger" type="button" onClick={() => setLutOpen((value) => !value)} aria-expanded={lutOpen}>
            <span className="adjustment-item-marker">＋</span>
            <span>LUT 解析</span>
            <span className="adjustment-state">{lutOpen ? "收起" : "展开"}</span>
          </button>
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
