/* 设计方向：GNOME/Ubuntu 工作台。使用 Ubuntu 字体、Ubuntu 橙与深石墨色，强调清晰层级、低圆角、键盘可达和原生工具感；iframe 只承载 LutCalc 计算引擎，工作流程管理由 React 控制。 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FolderOpen,
  Play,
  Plus,
  Save,
  Square,
  Trash2,
  Upload,
  Workflow,
  X,
} from "lucide-react";

type WorkflowEvent = {
  action: "change" | "click";
  selector: string;
  value?: string;
  checked?: boolean;
  label: string;
};

type WorkflowFile = {
  version: 1;
  name: string;
  createdAt: string;
  events: WorkflowEvent[];
};

const WORKFLOW_KEY = "lutcalc-ubuntu-workflows";

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function elementLabel(element: Element) {
  const htmlElement = element as HTMLElement;
  const fromLabel = element.closest("label")?.textContent;
  const fromAria = element.getAttribute("aria-label") || element.getAttribute("title");
  const fromPlaceholder = element.getAttribute("placeholder");
  const fromParent = element.parentElement?.textContent;
  return normalizeText(fromLabel || fromAria || fromPlaceholder || fromParent || htmlElement.tagName);
}

function elementSelector(element: Element) {
  const htmlElement = element as HTMLElement;
  if (htmlElement.id) return `#${htmlElement.id}`;
  if (htmlElement.getAttribute("name")) {
    return `${htmlElement.tagName.toLowerCase()}[name="${htmlElement.getAttribute("name")}"]`;
  }
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current.tagName.toLowerCase() !== "body" && parts.length < 8) {
    const parent: Element | null = current.parentElement;
    if (!parent) break;
    const currentTagName = current.tagName;
    const siblings = Array.from(parent.children).filter((child: Element) => child.tagName === currentTagName);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${index})`);
    current = parent;
  }
  return parts.join(" > ");
}

function readWorkflows(): WorkflowFile[] {
  try {
    const stored = JSON.parse(localStorage.getItem(WORKFLOW_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export default function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const [recording, setRecording] = useState(false);
  const [workflowName, setWorkflowName] = useState("未命名流程");
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowFile[]>(readWorkflows);
  const [message, setMessage] = useState("就绪");

  const persist = useCallback((next: WorkflowFile[]) => {
    setSavedWorkflows(next);
    localStorage.setItem(WORKFLOW_KEY, JSON.stringify(next));
  }, []);

  const recordEvent = useCallback(
    (event: Event) => {
      if (!recording) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const isControl = target.matches("select, input, textarea, button, [role=button]");
      if (!isControl) return;
      const isChange = event.type === "change";
      const isClick = event.type === "click";
      if (!isChange && !isClick) return;
      const input = target as HTMLInputElement;
      const next: WorkflowEvent = {
        action: isChange ? "change" : "click",
        selector: elementSelector(target),
        label: elementLabel(target).slice(0, 80),
      };
      if ("value" in input) next.value = input.value;
      if ("checked" in input) next.checked = input.checked;
      setEvents((current) => [...current, next].slice(-80));
    },
    [recording],
  );

  const attachRecorder = useCallback(() => {
    const documentRef = iframeRef.current?.contentDocument;
    if (!documentRef) return () => undefined;
    documentRef.addEventListener("change", recordEvent, true);
    documentRef.addEventListener("click", recordEvent, true);
    return () => {
      documentRef.removeEventListener("change", recordEvent, true);
      documentRef.removeEventListener("click", recordEvent, true);
    };
  }, [recordEvent]);

  useEffect(() => attachRecorder(), [attachRecorder, loaded]);

  const saveWorkflow = () => {
    if (!events.length) {
      setMessage("请先录制至少一个操作");
      return;
    }
    const workflow: WorkflowFile = {
      version: 1,
      name: workflowName.trim() || "未命名流程",
      createdAt: new Date().toISOString(),
      events,
    };
    persist([workflow, ...savedWorkflows.filter((item) => item.name !== workflow.name)]);
    setMessage(`已保存 ${events.length} 个操作`);
  };

  const exportWorkflow = (workflow: WorkflowFile = { version: 1, name: workflowName || "未命名流程", createdAt: new Date().toISOString(), events }) => {
    if (!workflow.events.length) {
      setMessage("当前没有可导出的操作");
      return;
    }
    const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${workflow.name.replace(/[^\u4e00-\u9fa5\w-]+/g, "-")}.lut流程.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("流程文件已导出");
  };

  const importWorkflow = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workflow = JSON.parse(String(reader.result)) as WorkflowFile;
        if (!workflow?.name || !Array.isArray(workflow.events)) throw new Error("invalid");
        persist([workflow, ...savedWorkflows.filter((item) => item.name !== workflow.name)]);
        setWorkflowName(workflow.name);
        setEvents(workflow.events);
        setMessage(`已导入 ${workflow.events.length} 个操作`);
      } catch {
        setMessage("流程文件格式不正确");
      }
    };
    reader.readAsText(file);
  };

  const replayWorkflow = async (workflow: WorkflowFile) => {
    const documentRef = iframeRef.current?.contentDocument;
    if (!documentRef) return;
    setMessage(`正在执行：${workflow.name}`);
    for (const step of workflow.events) {
      const target = documentRef.querySelector(step.selector) as HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null;
      if (!target) continue;
      if (step.action === "click") {
        target.click();
      } else {
        if (step.value !== undefined && "value" in target) target.value = step.value;
        if (step.checked !== undefined && "checked" in target) target.checked = step.checked;
        target.dispatchEvent(new Event("input", { bubbles: true }));
        target.dispatchEvent(new Event("change", { bubbles: true }));
      }
      await new Promise((resolve) => window.setTimeout(resolve, 90));
    }
    setMessage("流程执行完成");
  };

  const clearCurrent = () => {
    setEvents([]);
    setMessage("已清空当前流程");
  };

  return (
    <main className="ubuntu-app-shell" aria-label="LUTCalc 中文计算器工作台">
      <header className="ubuntu-topbar">
        <div className="ubuntu-brand"><span className="ubuntu-brand-mark">●</span><span>LUTCalc 中文计算器</span></div>
        <div className="ubuntu-topbar-center">工作台</div>
        <div className="ubuntu-topbar-actions"><span className="ubuntu-status-dot" />{message}</div>
      </header>
      <div className="ubuntu-workspace">
        <aside className={`workflow-sidebar ${workflowOpen ? "is-open" : "is-closed"}`} aria-label="工作流程">
          <div className="workflow-sidebar-head">
            <div><span className="eyebrow">工具</span><h1><Workflow size={17} />工作流程</h1></div>
            <button className="icon-button" onClick={() => setWorkflowOpen(false)} aria-label="关闭工作流程"><X size={16} /></button>
          </div>
          <p className="workflow-intro">把一组参数调整记录为可重复执行的快捷流程。</p>
          <label className="workflow-name-label">流程名称<input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} /></label>
          <div className="workflow-record-row">
            <button className={`ubuntu-button ${recording ? "is-recording" : "is-primary"}`} onClick={() => { setRecording((current) => !current); setMessage(recording ? "已停止记录" : "正在记录操作"); }}>
              {recording ? <Square size={14} /> : <span className="record-dot" />} {recording ? "停止记录" : "开始记录"}
            </button>
            <span className="workflow-count">{events.length} 步</span>
          </div>
          <div className="workflow-actions">
            <button className="ubuntu-button" onClick={saveWorkflow}><Save size={14} />保存流程</button>
            <button className="ubuntu-button" onClick={() => exportWorkflow()}><Download size={14} />导出文件</button>
            <button className="ubuntu-button" onClick={() => fileRef.current?.click()}><Upload size={14} />导入文件</button>
            <button className="ubuntu-button is-quiet" onClick={clearCurrent}><Trash2 size={14} />清空当前</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { importWorkflow(event.target.files?.[0]); event.currentTarget.value = ""; }} />
          </div>
          <div className="workflow-list-head"><span>已保存流程</span><span>{savedWorkflows.length}</span></div>
          <div className="workflow-list">
            {savedWorkflows.length === 0 && <div className="workflow-empty"><Plus size={16} />保存后会出现在这里</div>}
            {savedWorkflows.map((workflow) => (
              <article className="workflow-item" key={`${workflow.name}-${workflow.createdAt}`}>
                <div className="workflow-item-title"><FolderOpen size={14} /><strong>{workflow.name}</strong></div>
                <div className="workflow-item-meta">{workflow.events.length} 步操作</div>
                <div className="workflow-item-actions"><button onClick={() => replayWorkflow(workflow)} aria-label={`执行${workflow.name}`}><Play size={13} />执行</button><button onClick={() => exportWorkflow(workflow)} aria-label={`导出${workflow.name}`}><Download size={13} />导出</button></div>
              </article>
            ))}
          </div>
        </aside>
        <section className="calculator-pane">
          {!workflowOpen && <button className="workflow-reopen" onClick={() => setWorkflowOpen(true)}><Workflow size={15} />工作流程</button>}
          <iframe ref={iframeRef} className={`standalone-frame ${loaded ? "is-loaded" : ""}`} src="/lutcalc/index.html" title="LUTCalc 中文 LUT 计算器" onLoad={() => setLoaded(true)} />
          {!loaded && <div className="standalone-loading">正在加载计算器…</div>}
        </section>
      </div>
    </main>
  );
}
