/* Design philosophy: 胶片实验室 / 编辑型新粗野主义；原生参数卡以编号、规则线、等宽数值和硫磺黄 active state 组织 LutCalc 的真实计算入口。 */
import { useEffect, useRef, useState } from "react";
import { ExternalLink, FileDown, FlaskConical, Menu, PanelRight, Play, SlidersHorizontal, Sparkles } from "lucide-react";

const LUTCALC_URL = "/lutcalc/index.html";

type SelectOption = { value: string; label: string };
type EngineState = { camera: string; model: string; recGamma: string; recGamut: string; outGamma: string; outGamut: string; lutFormat: string; hardClip: string; nativeIso: string; stopCorrection: string };

const emptyEngine: EngineState = { camera: "", model: "", recGamma: "", recGamut: "", outGamma: "", outGamut: "", lutFormat: "", hardClip: "", nativeIso: "", stopCorrection: "" };
const adjustmentLabels = ["白平衡", "PSST-CDL", "ASC-CDL", "多色调", "高光色域", "膝点", "黑电平", "黑伽马", "显示转换", "色域限制", "伪色", "LUT分析"];

const optionTranslations: Record<string, string> = {
  "General cube LUT (.cube)": "通用立方体 LUT（.cube）",
  "Black Only": "仅黑场",
  "Passthrough": "直通",
  "Legal": "合法范围",
  "Full Range": "全范围",
  "Input": "输入",
  "Output": "输出",
  "None": "无",
};

function optionsFrom(select: HTMLSelectElement | undefined): SelectOption[] {
  return select ? Array.from(select.options).map((option) => ({ value: option.value, label: optionTranslations[option.text] ?? option.text })) : [];
}

function selectByLabel(root: Element | null, text: string): HTMLSelectElement | undefined {
  const label = root ? Array.from(root.querySelectorAll("label")).find((item) => item.textContent?.trim().startsWith(text)) : undefined;
  if (label?.parentElement?.querySelector("select")) return label.parentElement.querySelector("select") ?? undefined;
  const container = root ? Array.from(root.querySelectorAll(".emptybox")).find((item) => item.textContent?.includes(text)) : undefined;
  return container?.querySelector("select") ?? undefined;
}

function ParamSelect({ label, value, options, onChange, wide = false }: { label: string; value: string; options: SelectOption[]; onChange: (value: string) => void; wide?: boolean }) {
  return <label className={`param-field ${wide ? "wide" : ""}`}><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={`${label}-${option.value}`} value={option.value}>{option.label}</option>)}</select></label>;
}

function ParamNumber({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="param-field"><span>{label}</span><input type="number" value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

export default function Home() {
  const [showGuide, setShowGuide] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [engine, setEngine] = useState(emptyEngine);
  const [options, setOptions] = useState<Record<string, SelectOption[]>>({});
  const [title, setTitle] = useState("自定义 LUT");
  const [dimension, setDimension] = useState("33");
  const [lutMode, setLutMode] = useState("3d");
  const [adjustments, setAdjustments] = useState<boolean[]>(() => adjustmentLabels.map(() => false));
  const engineRef = useRef<HTMLIFrameElement>(null);

  const refreshFromEngine = () => {
    const doc = engineRef.current?.contentDocument;
    if (!doc) return;
    const cameraBox = doc.querySelector("#box-cam");
    const gammaBox = doc.querySelector("#box-gam");
    const lutBox = doc.querySelector("#box-lut");
    const cameraSelects = cameraBox ? Array.from(cameraBox.querySelectorAll("select")) : [];
    const gammaSelects = gammaBox ? Array.from(gammaBox.querySelectorAll("select")) : [];
    const lutFormatSelect = selectByLabel(lutBox, "LUT Type");
    const hardClipSelect = selectByLabel(lutBox, "Hard Clip");
    const numbers = cameraBox ? Array.from(cameraBox.querySelectorAll('input[type="number"]')) as HTMLInputElement[] : [];
    const next: EngineState = {
      lutFormat: lutFormatSelect?.value ?? "",
      hardClip: hardClipSelect?.value ?? "",
      camera: cameraSelects[0]?.value ?? "",
      model: cameraSelects[1]?.value ?? "",
      recGamma: gammaSelects[1]?.value ?? "",
      recGamut: gammaSelects[5]?.value ?? "",
      outGamma: gammaSelects[7]?.value ?? "",
      outGamut: gammaSelects[11]?.value ?? "",
      nativeIso: numbers[0]?.value ?? "500",
      stopCorrection: numbers[1]?.value ?? "0",
    };
    setEngine(next);
    setOptions({ format: optionsFrom(lutFormatSelect), clip: optionsFrom(hardClipSelect), camera: optionsFrom(cameraSelects[0]), model: optionsFrom(cameraSelects[1]), recGamma: optionsFrom(gammaSelects[1]), recGamut: optionsFrom(gammaSelects[5]), outGamma: optionsFrom(gammaSelects[7]), outGamut: optionsFrom(gammaSelects[11]) });
    const adjustmentInputs = doc.querySelector("#box-twk") ? Array.from(doc.querySelector("#box-twk")!.querySelectorAll('input[type="checkbox"]')) as HTMLInputElement[] : [];
    setAdjustments(adjustmentLabels.map((_, index) => Boolean(adjustmentInputs[index]?.checked)));
    const radios = Array.from(doc.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    const checkedSize = radios.find((radio) => ["17", "33", "65"].includes(radio.value) && radio.checked);
    if (checkedSize) setDimension(checkedSize.value);
  };

  useEffect(() => {
    if (!engineReady) return;
    const timer = window.setTimeout(refreshFromEngine, 250);
    return () => window.clearTimeout(timer);
  }, [engineReady]);

  const withEngine = (callback: (doc: Document) => void) => {
    const doc = engineRef.current?.contentDocument;
    if (doc) callback(doc);
  };

  const syncSelect = (boxSelector: string, index: number, value: string, key: keyof EngineState) => {
    withEngine((doc) => {
      const select = doc.querySelector(boxSelector)?.querySelectorAll("select")[index] as HTMLSelectElement | undefined;
      if (!select) return;
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    setEngine((current) => ({ ...current, [key]: value }));
    window.setTimeout(refreshFromEngine, 80);
  };

  const syncLabeledSelect = (label: string, value: string, key: keyof EngineState) => {
    withEngine((doc) => {
      const select = selectByLabel(doc.querySelector("#box-lut"), label);
      if (!select) return;
      select.value = value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    setEngine((current) => ({ ...current, [key]: value }));
    window.setTimeout(refreshFromEngine, 80);
  };

  const syncNumber = (index: number, value: string, key: keyof EngineState) => {
    withEngine((doc) => {
      const input = doc.querySelector("#box-cam")?.querySelectorAll('input[type="number"]')[index] as HTMLInputElement | undefined;
      if (!input) return;
      input.value = value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    setEngine((current) => ({ ...current, [key]: value }));
  };

  const syncAdjustment = (index: number, checked: boolean) => {
    withEngine((doc) => {
      const input = doc.querySelector("#box-twk")?.querySelectorAll('input[type="checkbox"]')[index] as HTMLInputElement | undefined;
      if (input && input.checked !== checked) input.click();
    });
    setAdjustments((current) => current.map((value, itemIndex) => itemIndex === index ? checked : value));
  };

  const syncRadio = (group: "dims" | "dimension", radioIndex: number, value: string, key: "dimension" | "lutMode") => {
    withEngine((doc) => {
      const radio = doc.querySelector("#box-lut")?.querySelectorAll(`input[type="radio"][name="${group}"]`)[radioIndex] as HTMLInputElement | undefined;
      if (radio) radio.click();
    });
    if (key === "dimension") setDimension(value); else setLutMode(value);
  };

  const syncTitle = (value: string) => {
    setTitle(value);
    withEngine((doc) => {
      const input = doc.querySelector('input[type="text"]') as HTMLInputElement | null;
      if (input) { input.value = value; input.dispatchEvent(new Event("input", { bubbles: true })); }
    });
  };

  const invoke = (buttonText: string) => withEngine((doc) => {
    const button = Array.from(doc.querySelectorAll('input[type="button"]')).find((input) => (input as HTMLInputElement).value === buttonText) as HTMLInputElement | undefined;
    button?.click();
  });

  const cameraOptions = options.camera ?? [];
  const modelOptions = options.model ?? [];
  const recGammaOptions = options.recGamma ?? [];
  const recGamutOptions = options.recGamut ?? [];
  const outGammaOptions = options.outGamma ?? [];
  const outGamutOptions = options.outGamut ?? [];

  return <main className="app-shell">
    <header className="topbar"><div className="brand-lockup"><div className="brand-mark" aria-hidden="true"><img src="/manus-storage/lutcalc-mark_dfa134db.png" alt="" /></div><div><p className="eyebrow">色彩科学 / 工作台 04</p><div className="brand-name">LUT<span>Calc</span></div></div></div><div className="topbar-meta"><span className="status-dot" /><span>{engineReady ? "本地处理 · 就绪" : "加载引擎 · 待机"}</span><button className="icon-button" onClick={() => setShowGuide((value) => !value)} aria-label="切换使用提示" title="显示使用提示"><PanelRight size={18} /></button></div></header>
    <section className="calibration-bar" aria-label="校准状态"><span className="calibration-label">01 / 信号路径</span><div className="calibration-line"><i /><i /><i /><i /><i /><i /><i /></div><span className="calibration-value">输入 → 工作 → 输出</span></section>
    <div className="workspace-heading"><div><p className="section-kicker"><FlaskConical size={14} /> 胶片实验室界面</p><h1>把输入信号整理成<br /><em>可控的画面。</em></h1><p className="lede">原生参数卡直接连接 LutCalc 的计算引擎，让每一次校准都更容易读懂、检查和导出。</p></div><div className="heading-actions"><a className="text-link" href={LUTCALC_URL} target="_blank" rel="noreferrer"><ExternalLink size={15} /> 打开独立计算器</a><span className="version-chip">v4.09 / GPL-2.0</span></div></div>

    <section className="workbench-grid">
      <aside className="project-rail"><div className="rail-label"><Menu size={15} /> 项目轨道</div><div className="rail-card active"><span className="rail-index">A</span><div><strong>{title || "未命名分级"}</strong><small>React 参数会话</small></div><span className="rail-live">{engineReady ? "运行中" : "加载中"}</span></div><div className="rail-divider" /><div className="rail-note"><SlidersHorizontal size={15} /><span>原生卡片通过同源桥接驱动原始 LUTCalc 引擎，计算仍在浏览器本地完成。</span></div><div className="rail-bottom"><span>计算引擎来源</span><strong>cameramanben / LUTCalc</strong></div></aside>

      <section className="calculator-stage"><div className="stage-head"><div><span className="module-tag">02</span><div><p className="stage-title">LUT 生成器</p><p className="stage-caption">原生参数卡 · 输入、工作空间与输出</p></div></div><div className="stage-tools"><span className="small-status"><span className="status-dot" /> {engineReady ? "已同步" : "加载中"}</span><a href={LUTCALC_URL} target="_blank" rel="noreferrer" aria-label="在新窗口打开计算器"><FileDown size={17} /></a></div></div>
        <div className="native-workbench">
          <section className="param-card param-card-title"><div className="param-card-head"><span className="module-tag small">A1</span><div><h2>项目标识</h2><p>命名导出的 LUT 文件</p></div></div><label className="param-field wide"><span>LUT 标题 / 文件名</span><input value={title} onChange={(event) => syncTitle(event.target.value)} /></label><button className="dark-action" onClick={() => invoke("Auto Title")}>自动命名</button></section>
          <section className="param-card"><div className="param-card-head"><span className="module-tag small">A2</span><div><h2>输入信号</h2><p>相机与记录端参数</p></div></div><div className="param-grid"><ParamSelect label="相机" value={engine.camera} options={cameraOptions} onChange={(value) => syncSelect("#box-cam", 0, value, "camera")} /><ParamSelect label="相机型号" value={engine.model} options={modelOptions} onChange={(value) => syncSelect("#box-cam", 1, value, "model")} wide /><ParamNumber label="原生 / CINEEI ISO" value={engine.nativeIso} onChange={(value) => syncNumber(0, value, "nativeIso")} /><ParamNumber label="挡位修正" value={engine.stopCorrection} onChange={(value) => syncNumber(1, value, "stopCorrection")} /></div></section>
          <section className="param-card"><div className="param-card-head"><span className="module-tag small">A3</span><div><h2>工作变换</h2><p>输入伽马 / 色域与输出转换</p></div></div><div className="param-grid"><ParamSelect label="输入伽马" value={engine.recGamma} options={recGammaOptions} onChange={(value) => syncSelect("#box-gam", 1, value, "recGamma")} /><ParamSelect label="输入色域" value={engine.recGamut} options={recGamutOptions} onChange={(value) => syncSelect("#box-gam", 5, value, "recGamut")} /><ParamSelect label="输出伽马" value={engine.outGamma} options={outGammaOptions} onChange={(value) => syncSelect("#box-gam", 7, value, "outGamma")} /><ParamSelect label="输出色域" value={engine.outGamut} options={outGamutOptions} onChange={(value) => syncSelect("#box-gam", 11, value, "outGamut")} wide /></div></section>
          <section className="param-card"><div className="param-card-head"><span className="module-tag small">A4</span><div><h2>输出格式</h2><p>尺寸、类型与裁切规则</p></div></div><div className="segmented-control"><span className="param-label">LUT 维度</span><div>{[["1D", "1d", 0], ["3D", "3d", 1]].map(([label, value, index]) => <button key={String(value)} className={lutMode === value ? "selected" : ""} onClick={() => syncRadio("dims", Number(index), String(value), "lutMode")}>{label}</button>)}</div></div><div className="segmented-control"><span className="param-label">网格尺寸</span><div>{[["17", 0], ["33", 1], ["65", 2]].map(([value, index]) => <button key={String(value)} className={dimension === String(value) ? "selected" : ""} onClick={() => syncRadio("dimension", Number(index), String(value), "dimension")}>{value}³</button>)}</div></div><div className="param-grid"><ParamSelect label="LUT 格式" value={engine.lutFormat} options={options.format ?? []} onChange={(value) => syncLabeledSelect("LUT Type", value, "lutFormat")} /><ParamSelect label="硬裁切" value={engine.hardClip} options={options.clip ?? []} onChange={(value) => syncLabeledSelect("Hard Clip", value, "hardClip")} /></div></section>
          <section className="param-card adjustments-card"><div className="param-card-head"><span className="module-tag small">A5</span><div><h2>调整项</h2><p>按需启用原始 LutCalc 的精调模块</p></div></div><div className="adjustment-grid">{adjustmentLabels.map((label, index) => <label key={label} className={`adjustment-toggle ${adjustments[index] ? "active" : ""}`}><input type="checkbox" checked={Boolean(adjustments[index])} onChange={(event) => syncAdjustment(index, event.target.checked)} /><span>{label}</span></label>)}</div></section>
          <div className="native-actions"><button className="secondary-action" onClick={() => invoke("Preview")}><Play size={14} />预览</button><button className="primary-action" onClick={() => invoke("Generate LUT")}>生成 LUT <ExternalLink size={14} /></button><button className="secondary-action" onClick={() => invoke("Generate Set")}>生成套装</button></div>
        </div>
        <iframe ref={engineRef} className="engine-frame" src={LUTCALC_URL} title="LUTCalc calculation engine" onLoad={() => setEngineReady(true)} />
        <div className="output-strip"><div><span className="output-mark" /> <span className="output-label">输出站</span><strong>{engineReady ? "React 控件已与 LUTCalc 引擎同步。" : "正在等待计算引擎。"}</strong></div><a href={LUTCALC_URL} target="_blank" rel="noreferrer">在完整窗口中生成 <ExternalLink size={13} /></a></div>
      </section>

      <aside className={`preview-rail ${showGuide ? "guide-open" : ""}`}><div className="preview-image" style={{ backgroundImage: "url('/manus-storage/lutcalc-preview-grid_79c2c30e.jpg')" }}><div className="preview-overlay"><Sparkles size={15} /><span>预览 / 测试图表</span></div></div><div className="preview-copy"><span className="module-tag">03</span><div><p className="stage-title">预览监视器</p><p className="stage-caption">在生成 LUT 前检查信号走势</p></div></div>{showGuide ? <div className="guide-card"><strong>快速提示</strong><p>先选相机与输入伽马，再确认工作色域和输出格式。React 参数卡会将变化实时同步到原始计算引擎。</p></div> : <div className="signal-bars"><span>R</span><i className="bar red" /><span>G</span><i className="bar green" /><span>B</span><i className="bar blue" /><span>Y</span><i className="bar yellow" /></div>}<div className="preview-foot"><span>测试图像</span><span>RGB / 16 位</span></div></aside>
    </section>
    <footer className="app-footer"><span>为开源 LUTCalc 引擎打造的清晰前端。</span><span>校准标记 <b>—</b> {new Date().getFullYear()}</span></footer>
  </main>;
}
