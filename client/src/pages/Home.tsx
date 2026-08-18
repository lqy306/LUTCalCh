/* Design philosophy: 胶片实验室 / 编辑型新粗野主义；用纸张灰、深墨黑、硫磺黄校准条和清晰的信号工作流包裹原始 LUTCalc 核心。 */
import { useState } from "react";
import { ExternalLink, FileDown, FlaskConical, Menu, PanelRight, SlidersHorizontal, Sparkles } from "lucide-react";

const LUTCALC_URL = "/lutcalc/index.html";

export default function Home() {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <img src="/manus-storage/lutcalc-mark_dfa134db.png" alt="" />
          </div>
          <div>
            <p className="eyebrow">COLOR SCIENCE / WORKBENCH 04</p>
            <div className="brand-name">LUT<span>Calc</span></div>
          </div>
        </div>
        <div className="topbar-meta">
          <span className="status-dot" />
          <span>Local processing · ready</span>
          <button className="icon-button" onClick={() => setShowGuide((value) => !value)} aria-label="Toggle guide" title="显示使用提示">
            <PanelRight size={18} />
          </button>
        </div>
      </header>

      <section className="calibration-bar" aria-label="Calibration status">
        <span className="calibration-label">01 / SIGNAL PATH</span>
        <div className="calibration-line"><i /><i /><i /><i /><i /><i /><i /></div>
        <span className="calibration-value">INPUT → WORKING → OUTPUT</span>
      </section>

      <div className="workspace-heading">
        <div>
          <p className="section-kicker"><FlaskConical size={14} /> FILM LAB INTERFACE</p>
          <h1>把输入信号整理成<br /><em>可控的画面。</em></h1>
          <p className="lede">保留 LUTCalc 的原始计算引擎与 LUT 导出能力，重新整理参数层级，让每一次校准都更容易读懂、检查和导出。</p>
        </div>
        <div className="heading-actions">
          <a className="text-link" href={LUTCALC_URL} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Open standalone</a>
          <span className="version-chip">v4.09 / GPL-2.0</span>
        </div>
      </div>

      <section className="workbench-grid">
        <aside className="project-rail">
          <div className="rail-label"><Menu size={15} /> PROJECT RAIL</div>
          <div className="rail-card active">
            <span className="rail-index">A</span>
            <div><strong>Untitled grade</strong><small>Browser session</small></div>
            <span className="rail-live">LIVE</span>
          </div>
          <div className="rail-divider" />
          <div className="rail-note"><SlidersHorizontal size={15} /><span>所有计算在浏览器本地完成。文件不会离开当前设备。</span></div>
          <div className="rail-bottom"><span>Source engine</span><strong>cameramanben / LUTCalc</strong></div>
        </aside>

        <section className="calculator-stage">
          <div className="stage-head">
            <div><span className="module-tag">02</span><div><p className="stage-title">LUT generator</p><p className="stage-caption">输入、工作空间与输出参数</p></div></div>
            <div className="stage-tools"><span className="small-status"><span className="status-dot" /> synced</span><a href={LUTCALC_URL} target="_blank" rel="noreferrer" aria-label="Open calculator in new window"><FileDown size={17} /></a></div>
          </div>
          <div className="legacy-frame-wrap">
            <iframe className="legacy-frame" src={LUTCALC_URL} title="LUTCalc calculator" />
          </div>
          <div className="output-strip">
            <div><span className="output-mark" /> <span className="output-label">OUTPUT STATION</span><strong>Ready when your signal path is verified.</strong></div>
            <a href={LUTCALC_URL} target="_blank" rel="noreferrer">GENERATE IN FULL WINDOW <ExternalLink size={13} /></a>
          </div>
        </section>

        <aside className={`preview-rail ${showGuide ? "guide-open" : ""}`}>
          <div className="preview-image" style={{ backgroundImage: "url('/manus-storage/lutcalc-preview-grid_79c2c30e.jpg')" }}>
            <div className="preview-overlay"><Sparkles size={15} /><span>PREVIEW / TEST CHART</span></div>
          </div>
          <div className="preview-copy"><span className="module-tag">03</span><div><p className="stage-title">Preview monitor</p><p className="stage-caption">在生成 LUT 前检查信号走势</p></div></div>
          {showGuide ? <div className="guide-card"><strong>快速提示</strong><p>先选相机与输入 gamma，再确认工作色域和输出格式。原始 LUTCalc 面板已完整保留，任何参数变化都会实时参与计算。</p></div> : <div className="signal-bars"><span>R</span><i className="bar red" /><span>G</span><i className="bar green" /><span>B</span><i className="bar blue" /><span>Y</span><i className="bar yellow" /></div>}
          <div className="preview-foot"><span>TEST IMAGE</span><span>RGB / 16 bit</span></div>
        </aside>
      </section>

      <footer className="app-footer"><span>Designed as a clearer front-end for the open-source LUTCalc engine.</span><span>CALIBRATION MARK <b>—</b> {new Date().getFullYear()}</span></footer>
    </main>
  );
}
