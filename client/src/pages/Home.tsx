/*
 * 设计方向：统一 Ubuntu 工作台。
 * 所有可见控件使用同一 React 参数卡与 Ubuntu 控件系统；原始 LutCalc iframe
 * 仅作为同源计算、预览、导出和调整项兼容引擎，不承担第二套品牌界面。
 * 主计算器保持低圆角、石墨面板与 Ubuntu 橙强调。
 * 调整项直接呈现同源原版模块栈，保证交互结构不被简化。
 * 本文件遵循 BSD Allman 大括号风格；复杂桥接逻辑使用中文注释说明边界。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  FileJson,
  FolderOpen,
  Moon,
  Palette,
  Play,
  Plus,
  Save,
  Settings2,
  SlidersHorizontal,
  Square,
  Trash2,
  Upload,
  WandSparkles,
  Workflow,
  X,
  Sun,
} from "lucide-react";
import { applyWorkbenchTheme, BUILTIN_THEMES, readStoredThemeId, readStoredThemeMode, resolveTheme, THEME_MODE_STORAGE_KEY, THEME_STORAGE_KEY, type ThemeMode } from "@/themes/themeRegistry";
import NativeAdjustments from "@/components/NativeAdjustments";

type WorkflowEvent = { action: "change" | "click"; selector: string; value?: string; checked?: boolean; label: string };
type WorkflowFile = { version: 1; name: string; createdAt: string; events: WorkflowEvent[] };
type CurveSample = { input: number; output: number };
type LogGammaProfile = {
  schema: "lutcalc-log-gamma-profile";
  version: 1;
  id: string;
  name: string;
  kind: "log" | "gamma";
  author?: string;
  description?: string;
  input?: { gamut?: string; range?: "full" | "video"; bitDepth?: number };
  curve: { type: "samples" | "formula"; samples?: CurveSample[]; encode?: string; decode?: string };
  colorSpace?: { primaries?: string; whitePoint?: string; toXYZ?: number[][] };
  metadata?: { middleGrayIRE?: number; source?: string };
};

type Choice = { value: string; label: string };
type EngineField = "cameraMaker" | "cameraModel" | "cineEI" | "stopShift" | "recGammaMaker" | "recGamma" | "recGamutMaker" | "recGamut" | "outGammaMaker" | "outGamma" | "outGamutMaker" | "outGamut" | "title" | "lutFormat" | "hardClip";

const WORKFLOW_KEY = "lutcalc-apple-workflows";
const PROFILE_KEY = "lutcalc-log-gamma-profiles";
const ADJUSTMENTS_EMBED_SRC = "/lutcalc/index.html?embed=adjustments&workspaceEmbed=20260818-5";
const EMPTY_STATE: Record<EngineField, string> = {
  cameraMaker: "", cameraModel: "", cineEI: "", stopShift: "", recGammaMaker: "", recGamma: "", recGamutMaker: "", recGamut: "", outGammaMaker: "", outGamma: "", outGamutMaker: "", outGamut: "", title: "", lutFormat: "", hardClip: "",
};

function normalizeText(value: string)
{
  return value.replace(/\s+/g, " ").trim();
}

/** 从本地存储恢复流程；损坏数据只能回退为空数组，不能阻塞主计算器。 */
function readWorkflows(): WorkflowFile[]
{
  try
  {
    const value = JSON.parse(localStorage.getItem(WORKFLOW_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  }
  catch
  {
    return [];
  }
}

/** 从本地存储恢复用户配置；独立配置仍只保存在本地，不自动注册到引擎。 */
function readProfiles(): LogGammaProfile[]
{
  try
  {
    const value = JSON.parse(localStorage.getItem(PROFILE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  }
  catch
  {
    return [];
  }
}
function validateProfile(value: unknown): value is LogGammaProfile
{
  if (!value || typeof value !== "object")
  {
    return false;
  }

  const profile = value as Partial<LogGammaProfile>;

  if (profile.schema !== "lutcalc-log-gamma-profile" || profile.version !== 1 || !profile.id || !profile.name)
  {
    return false;
  }

  if (profile.kind !== "log" && profile.kind !== "gamma")
  {
    return false;
  }

  if (!profile.curve || (profile.curve.type !== "samples" && profile.curve.type !== "formula"))
  {
    return false;
  }

  if (profile.curve.type === "samples" && (!Array.isArray(profile.curve.samples) || profile.curve.samples.length < 2))
  {
    return false;
  }

  return !(profile.curve.type === "formula" && !profile.curve.encode && !profile.curve.decode);
}

function elementLabel(element: Element)
{
  return normalizeText(
    element.closest("label")?.textContent ||
    element.getAttribute("aria-label") ||
    element.getAttribute("title") ||
    element.parentElement?.textContent ||
    element.tagName,
  );
}

function elementSelector(element: Element)
{
  const html = element as HTMLElement;
  const workflowId = html.getAttribute("data-lutcalc-workflow-id");

  if (workflowId)
  {
    return `[data-lutcalc-workflow-id="${workflowId}"]`;
  }

  if (html.id)
  {
    return `#${html.id}`;
  }

  return html.tagName.toLowerCase();
}

function Field({ label, children }: { label: string; children: React.ReactNode })
{
  return (
    <label className="native-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function Home() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const adjustmentFrameVerifiedRef = useRef(false);
  const workflowFileRef = useRef<HTMLInputElement>(null);
  const profileFileRef = useRef<HTMLInputElement>(null);
  const isReplayingRef = useRef(false);
  const [engineReady, setEngineReady] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const [toolTab, setToolTab] = useState<"workflow" | "profiles">("workflow");
  const [recording, setRecording] = useState(false);
  const [workflowName, setWorkflowName] = useState("未命名流程");
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowFile[]>(readWorkflows);
  const [profiles, setProfiles] = useState<LogGammaProfile[]>(readProfiles);
  const [message, setMessage] = useState("正在连接计算引擎");
  const [engineState, setEngineState] = useState<Record<EngineField, string>>(EMPTY_STATE);
  const [choices, setChoices] = useState<Partial<Record<EngineField, Choice[]>>>({});
  const [previewSrc, setPreviewSrc] = useState("");
  const engineSnapshotRef = useRef("");
  const [themeId, setThemeId] = useState(readStoredThemeId);
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredThemeMode);
  const activeTheme = useMemo(() => resolveTheme(themeId), [themeId]);

  const engineDocument = () => iframeRef.current?.contentDocument || null;
  const engineWindow = () => iframeRef.current?.contentWindow || null;
  const persistWorkflows = useCallback((next: WorkflowFile[]) => { setSavedWorkflows(next); localStorage.setItem(WORKFLOW_KEY, JSON.stringify(next)); }, []);
  const persistProfiles = useCallback((next: LogGammaProfile[]) => { setProfiles(next); localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); }, []);

  useEffect(() => {
    applyWorkbenchTheme(activeTheme, themeMode);
    const documentRef = engineDocument();
    if (documentRef) applyWorkbenchTheme(activeTheme, themeMode, documentRef);
    localStorage.setItem(THEME_STORAGE_KEY, activeTheme.id);
    localStorage.setItem(THEME_MODE_STORAGE_KEY, themeMode);
  }, [activeTheme, themeMode]);

  const syncAdjustmentFrameHeight = useCallback(() => {
    const documentRef = engineDocument();
    const frame = iframeRef.current;
    const adjustments = documentRef?.querySelector("#box-twk") as HTMLElement | null;
    if (!frame || !adjustments) return;
    const nextHeight = Math.ceil(adjustments.getBoundingClientRect().height + 2);
    frame.style.height = `${Math.max(360, nextHeight)}px`;
  }, []);

  const observeAdjustmentFrame = useCallback(() => {
    const documentRef = engineDocument();
    const frame = iframeRef.current as (HTMLIFrameElement & { adjustmentObserver?: ResizeObserver }) | null;
    const adjustments = documentRef?.querySelector("#box-twk") as HTMLElement | null;
    if (!frame || !adjustments) return;
    frame.adjustmentObserver?.disconnect();
    frame.adjustmentObserver = new ResizeObserver(() => window.setTimeout(syncAdjustmentFrameHeight, 0));
    frame.adjustmentObserver.observe(adjustments);
    syncAdjustmentFrameHeight();
  }, [syncAdjustmentFrameHeight]);

  const enforceAdjustmentEmbedLayout = useCallback(() => {
    const documentRef = engineDocument();
    if (!documentRef) return;
    const hiddenSelectors = ["#titlebar", "#footer", "#printable", "#shed", "#javascriptwarning", "#box-cam", "#box-gam", "#box-lut", "#right", "#mob-status"];
    hiddenSelectors.forEach((selector) => {
      const node = documentRef.querySelector(selector) as HTMLElement | null;
      if (node) { node.style.setProperty("display", "none", "important"); node.setAttribute("aria-hidden", "true"); }
    });
    const visibleSelectors = ["#main", "#lutcalcform", "#left", "#box-twk"];
    visibleSelectors.forEach((selector) => {
      const node = documentRef.querySelector(selector) as HTMLElement | null;
      if (node) { node.style.setProperty("display", "block", "important"); node.style.setProperty("position", "static", "important"); node.style.setProperty("float", "none", "important"); node.style.setProperty("width", "100%", "important"); node.style.setProperty("height", "auto", "important"); }
    });
    documentRef.body.style.setProperty("overflow", "hidden", "important");
  }, []);

  const verifyAdjustmentEmbed = useCallback(() => {
    const frame = iframeRef.current;
    const documentRef = frame?.contentDocument;
    if (!frame || !documentRef) return false;
    if (!documentRef.documentElement.classList.contains("embed-adjustments")) {
      if (!adjustmentFrameVerifiedRef.current) {
        adjustmentFrameVerifiedRef.current = true;
        frame.src = ADJUSTMENTS_EMBED_SRC;
      }
      return false;
    }
    adjustmentFrameVerifiedRef.current = true;
    return true;
  }, []);

  /*
   * LUTAnalyst 的文件读取和分析发生在 iframe 内部。
   * 直接监听父窗口的 change/click 无法可靠表达“解析已经完成”，
   * 因此在同源原型方法完成后主动向父窗口发送桥接消息。
   */
  const installAdjustmentBridge = useCallback(() => {
    const windowRef = engineWindow() as (Window & { TWKLA?: { prototype?: Record<string, unknown> } }) | null;
    const prototype = windowRef?.TWKLA?.prototype;
    if (!windowRef || !prototype || prototype.__lutcalcWorkbenchBridge) return;

    const notifyParent = () => {
      windowRef.setTimeout(() => {
        windowRef.parent.postMessage({ type: "lutcalc:adjustment-complete" }, windowRef.location.origin);
      }, 0);
    };

    ["gotFile", "doStuff", "doneStuff"].forEach((methodName) => {
      const original = prototype[methodName];
      if (typeof original !== "function") return;
      prototype[methodName] = function bridgedAdjustmentMethod(this: unknown, ...args: unknown[])
      {
        const result = (original as (...methodArgs: unknown[]) => unknown).apply(this, args);
        notifyParent();
        return result;
      };
    });

    prototype.__lutcalcWorkbenchBridge = true;
  }, []);

  const refreshPreview = useCallback(() => {
    const documentRef = engineDocument();
    if (!documentRef) return;
    const sources = ["#can-stop-bgrnd", "#can-stop-clip", "#can-stop-rec", "#can-stop-out"].map((selector) => documentRef.querySelector(selector) as HTMLCanvasElement | null).filter(Boolean) as HTMLCanvasElement[];
    if (!sources.length || !sources[0].width || !sources[0].height) return;
    const canvas = document.createElement("canvas");
    canvas.width = sources[0].width;
    canvas.height = sources[0].height;
    const context = canvas.getContext("2d");
    if (!context) return;
    sources.forEach((source) => context.drawImage(source, 0, 0));
    setPreviewSrc(canvas.toDataURL("image/png"));
  }, []);

  const fieldNode = useCallback((field: EngineField): HTMLInputElement | HTMLSelectElement | null => {
    const documentRef = engineDocument();
    if (!documentRef) return null;
    const cam = Array.from(documentRef.querySelectorAll("#box-cam select")) as HTMLSelectElement[];
    const gam = Array.from(documentRef.querySelectorAll("#box-gam select")) as HTMLSelectElement[];
    const lut = Array.from(documentRef.querySelectorAll("#box-lut select")) as HTMLSelectElement[];
    const map: Partial<Record<EngineField, HTMLInputElement | HTMLSelectElement | null>> = {
      cameraMaker: cam[0] || null,
      cameraModel: cam[1] || null,
      cineEI: documentRef.querySelector("#box-cam .iso-input") as HTMLInputElement | null,
      stopShift: documentRef.querySelector("#box-cam .shift-input") as HTMLInputElement | null,
      recGammaMaker: gam[0] || null,
      recGamma: gam[1] || null,
      recGamutMaker: gam[4] || null,
      recGamut: gam[5] || null,
      outGammaMaker: gam[6] || null,
      outGamma: gam[7] || null,
      outGamutMaker: gam[10] || null,
      outGamut: gam[11] || null,
      title: documentRef.querySelector("#box-lut input[type=text]") as HTMLInputElement | null,
      lutFormat: lut[0] || null,
      hardClip: lut[5] || null,
    };
    return map[field] || null;
  }, []);

  const optionsOf = (node: HTMLSelectElement | null): Choice[] => node ? Array.from(node.options).map((option) => ({ value: option.value, label: option.textContent || option.value })) : [];

  const hydrateEngine = useCallback(() => {
    const documentRef = engineDocument();
    if (!documentRef) return;
    documentRef.querySelectorAll("select, input, textarea, button, [role=button]").forEach((control, index) => {
      if (!control.getAttribute("data-lutcalc-workflow-id")) control.setAttribute("data-lutcalc-workflow-id", `lc-${String(index + 1).padStart(4, "0")}`);
    });
    const fields = Object.keys(EMPTY_STATE) as EngineField[];
    const nextState = { ...EMPTY_STATE };
    const nextChoices: Partial<Record<EngineField, Choice[]>> = {};
    fields.forEach((field) => {
      const node = fieldNode(field);
      if (!node) return;
      nextState[field] = node.value;
      // iframe 内的 select 属于另一个 Window，不能使用父窗口的 instanceof HTMLSelectElement。
      if (node?.tagName === "SELECT") nextChoices[field] = optionsOf(node as HTMLSelectElement);
    });
    const snapshot = JSON.stringify({ nextState, nextChoices });
    if (engineSnapshotRef.current !== snapshot)
    {
      engineSnapshotRef.current = snapshot;
      setEngineState(nextState);
      setChoices(nextChoices);
    }
    setEngineReady(true);
    setMessage("计算引擎已就绪");
    window.setTimeout(refreshPreview, 260);
    window.setTimeout(syncAdjustmentFrameHeight, 60);
  }, [fieldNode, refreshPreview, syncAdjustmentFrameHeight]);

  const recordEvent = useCallback((event: Event) => {
    if (!recording || isReplayingRef.current) return;
    const target = event.target as Element | null;
    if (!target || typeof target.matches !== "function" || !target.matches("select, input, textarea, button, [role=button]")) return;
    const input = target as unknown as HTMLInputElement;
    const action: WorkflowEvent["action"] = event.type === "click" ? "click" : "change";
    const next: WorkflowEvent = { action, selector: elementSelector(target), label: elementLabel(target).slice(0, 80), value: "value" in input ? input.value : undefined, checked: "checked" in input ? input.checked : undefined };
    setEvents((current) => [...current, next].slice(-100));
  }, [recording]);

  /*
   * 原版 LUTAnalyst 的文件读取是异步的：change 事件只代表文件已选中，
   * 真正的解析、Gamma/Gamut 更新和画布重绘会在后续回调中完成。
   * 因此这里不能只记录流程事件，必须在多个时间点重新同步父工作台预览。
   */
  const scheduleEngineRefresh = useCallback(() =>
  {
    [180, 520, 1100].forEach((delay) =>
    {
      window.setTimeout(() =>
      {
        hydrateEngine();
        refreshPreview();
      }, delay);
    });
  }, [hydrateEngine, refreshPreview]);

  useEffect(() =>
  {
    const documentRef = engineDocument();
    if (!engineReady || !documentRef) return;

    const handleEngineMutation = () =>
    {
      scheduleEngineRefresh();
    };

    const handleBridgeMessage = (event: MessageEvent) =>
    {
      if (event.origin && event.origin !== window.location.origin) return;
      if (event.data?.type === "lutcalc:adjustment-complete") scheduleEngineRefresh();
    };

    window.addEventListener("message", handleBridgeMessage);
    documentRef.addEventListener("input", handleEngineMutation, true);
    documentRef.addEventListener("change", handleEngineMutation, true);
    documentRef.addEventListener("click", handleEngineMutation, true);
    documentRef.addEventListener("change", recordEvent, true);
    documentRef.addEventListener("click", recordEvent, true);

    const poll = window.setInterval(() =>
    {
      hydrateEngine();
      refreshPreview();
    }, 1200);
    return () =>
    {
      window.clearInterval(poll);
      window.removeEventListener("message", handleBridgeMessage);
      documentRef.removeEventListener("input", handleEngineMutation, true);
      documentRef.removeEventListener("change", handleEngineMutation, true);
      documentRef.removeEventListener("click", handleEngineMutation, true);
      documentRef.removeEventListener("change", recordEvent, true);
      documentRef.removeEventListener("click", recordEvent, true);
    };
  }, [engineReady, recordEvent, scheduleEngineRefresh]);

  useEffect(() => {
    if (!iframeRef.current?.contentDocument) return;
    const timer = window.setTimeout(hydrateEngine, 120);
    return () => window.clearTimeout(timer);
  }, [hydrateEngine]);

  const setEngineField = (field: EngineField, value: string) => {
    const node = fieldNode(field);
    const windowRef = engineWindow();
    if (!node || !windowRef) return;
    node.value = value;
    const IframeEvent = (windowRef as unknown as { Event: typeof Event }).Event;
    node.dispatchEvent(new IframeEvent("input", { bubbles: true }));
    node.dispatchEvent(new IframeEvent("change", { bubbles: true }));
    setEngineState((current) => ({ ...current, [field]: value }));
    if (field === "cameraMaker" || field === "cameraModel") window.setTimeout(hydrateEngine, 90);
    window.setTimeout(refreshPreview, 120);
  };

  const findAdjustmentToggle = (label: string) =>
  {
    const documentRef = engineDocument();
    if (!documentRef) return null;
    return Array.from(documentRef.querySelectorAll("#box-twk .tweakholder")).map((node) => node as HTMLElement).find((node) => normalizeText(node.firstChild?.textContent || "") === label)?.querySelector("input[type=checkbox]") as HTMLInputElement | null;
  };

  const toggleAdjustment = (label: string, checked: boolean) =>
  {
    const toggle = findAdjustmentToggle(label);
    const windowRef = engineWindow();
    if (!toggle || !windowRef) return;
    toggle.checked = checked;
    toggle.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("input", { bubbles: true }));
    toggle.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("change", { bubbles: true }));
    window.setTimeout(refreshPreview, 180);
    window.setTimeout(syncAdjustmentFrameHeight, 220);
  };

  const importAdjustmentLut = (file: File) =>
  {
    const documentRef = engineDocument();
    const windowRef = engineWindow();
    const input = documentRef?.querySelector("#box-twk input[type=file]") as HTMLInputElement | null;
    if (!input || !windowRef) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    input.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("change", { bubbles: true }));
    setMessage(`已载入 LUT：${file.name}`);
  };

  const analyzeAdjustmentLut = () =>
  {
    const documentRef = engineDocument();
    const button = Array.from(documentRef?.querySelectorAll("#box-twk input[type=button], #box-twk button") || []).find((node) => /Analyse|分析|Re-Analyse/.test((node as HTMLInputElement).value || node.textContent || "")) as HTMLElement | undefined;
    button?.click();
    setMessage(button ? "正在分析 LUT" : "未找到 LUT 分析操作");
    window.setTimeout(() => { hydrateEngine(); refreshPreview(); }, 500);
  };

  const resetAdjustmentLut = () =>
  {
    const documentRef = engineDocument();
    const button = Array.from(documentRef?.querySelectorAll("#box-twk input[type=button], #box-twk button") || []).find((node) => /New LUT|新建 LUT/.test((node as HTMLInputElement).value || node.textContent || "")) as HTMLElement | undefined;
    button?.click();
    setMessage("已重置 LUT 解析");
    window.setTimeout(() => { hydrateEngine(); refreshPreview(); }, 260);
  };

  const engineAction = (labels: string[], success: string) => {
    const documentRef = engineDocument();
    if (!documentRef) return;
    const candidate = Array.from(documentRef.querySelectorAll("button, input[type=button], input[type=submit]")).find((node) => {
      const input = node as HTMLInputElement;
      const text = `${input.value || ""} ${node.textContent || ""} ${node.getAttribute("data-lc-original-value") || ""}`;
      return labels.some((label) => text.includes(label));
    }) as HTMLElement | undefined;
    candidate?.click();
    setMessage(candidate ? success : "未找到对应的计算引擎操作");
    window.setTimeout(refreshPreview, 250);
  };

  const saveWorkflow = () => {
    if (!events.length) { setMessage("请先调整参数，再保存流程"); return; }
    const workflow: WorkflowFile = { version: 1, name: workflowName.trim() || "未命名流程", createdAt: new Date().toISOString(), events };
    persistWorkflows([workflow, ...savedWorkflows.filter((item) => item.name !== workflow.name)]);
    setMessage(`已保存 ${events.length} 个步骤`);
  };
  const exportWorkflow = (workflow: WorkflowFile = { version: 1, name: workflowName || "未命名流程", createdAt: new Date().toISOString(), events }) => {
    if (!workflow.events.length) { setMessage("当前没有可导出的步骤"); return; }
    const url = URL.createObjectURL(new Blob([JSON.stringify(workflow, null, 2)], { type: "application/json;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${workflow.name.replace(/[^\u4e00-\u9fa5\w-]+/g, "-")}.lut流程.json`; anchor.click(); URL.revokeObjectURL(url); setMessage("流程文件已导出");
  };
  const importWorkflow = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { try { const workflow = JSON.parse(String(reader.result)) as WorkflowFile; if (!workflow?.name || !Array.isArray(workflow.events)) throw new Error("invalid"); persistWorkflows([workflow, ...savedWorkflows.filter((item) => item.name !== workflow.name)]); setWorkflowName(workflow.name); setEvents(workflow.events); setMessage(`已导入 ${workflow.events.length} 个步骤`); } catch { setMessage("流程文件格式不正确"); } };
    reader.readAsText(file);
  };
  const replayWorkflow = async (workflow: WorkflowFile) => {
    const documentRef = engineDocument(); const windowRef = engineWindow(); if (!documentRef || !windowRef) return;
    isReplayingRef.current = true;
    setRecording(false);
    setMessage(`正在执行：${workflow.name}（已停止录制）`);
    try {
      for (const step of workflow.events) {
        const target = documentRef.querySelector(step.selector) as HTMLInputElement | HTMLSelectElement | HTMLButtonElement | null;
        if (!target) continue;
        if (step.action === "click") target.click();
        else { if (step.value !== undefined) target.value = step.value; if (step.checked !== undefined && "checked" in target) target.checked = step.checked; const IframeEvent = (windowRef as unknown as { Event: typeof Event }).Event; target.dispatchEvent(new IframeEvent("input", { bubbles: true })); target.dispatchEvent(new IframeEvent("change", { bubbles: true })); }
        await new Promise((resolve) => window.setTimeout(resolve, 80));
      }
      hydrateEngine(); setMessage("流程执行完成");
    } finally {
      isReplayingRef.current = false;
    }
  };
  const exportProfile = (profile: LogGammaProfile) => { const url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: "application/json;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${profile.id}.lut配置.json`; anchor.click(); URL.revokeObjectURL(url); setMessage(`已导出配置：${profile.name}`); };
  const importProfile = (file?: File) => { if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const profile = JSON.parse(String(reader.result)) as LogGammaProfile; if (!validateProfile(profile)) throw new Error("invalid"); const next = [profile, ...profiles.filter((item) => item.id !== profile.id)]; persistProfiles(next); setMessage(`已导入配置：${profile.name}`); } catch { setMessage("配置文件无效：请检查版本、曲线类型和采样数据"); } }; reader.readAsText(file); };

  const previewHint = useMemo(() => engineReady ? "预览由原始计算引擎实时生成" : "正在读取原始计算引擎…", [engineReady]);
  const select = (field: EngineField, label: string) => <Field label={label}><select value={engineState[field]} disabled={!engineReady} onChange={(event) => setEngineField(field, event.target.value)}>{(choices[field] || [{ value: "", label: "正在读取…" }]).map((item) => <option key={`${field}-${item.value}`} value={item.value}>{item.label}</option>)}</select></Field>;

  return (
    <main className="apple-app-shell" aria-label="LUTCalc 中文计算器工作台">
      <header className="apple-topbar"><div className="apple-brand"><span />LUTCalc 中文计算器</div><div>主工作台</div><div className="topbar-actions"><div className="theme-controls" aria-label="主题设置"><Palette size={14} aria-hidden="true" /><select aria-label="选择主题" value={activeTheme.id} onChange={(event) => setThemeId(event.target.value)}>{BUILTIN_THEMES.map((theme) => <option key={theme.id} value={theme.id}>{theme.name}</option>)}</select><button type="button" className="theme-mode-button" aria-label={`切换到${themeMode === "light" ? "深色" : "亮色"}模式`} onClick={() => setThemeMode((current) => current === "light" ? "dark" : "light")}>{themeMode === "light" ? <Sun size={14} /> : <Moon size={14} />}<span>{activeTheme.modes[themeMode].label}</span></button></div><div className="apple-status"><i />{message}</div></div></header>
      <div className="apple-workspace">
        <aside className={`workflow-sidebar tool-sidebar ${workflowOpen ? "is-open" : "is-closed"}`} aria-label="工具中心">
          <div className="workflow-sidebar-head"><div><span className="eyebrow">工具中心</span><h1><SlidersHorizontal size={17} />工作台工具</h1></div><button className="icon-button" onClick={() => setWorkflowOpen(false)} aria-label="关闭工具中心"><X size={16} /></button></div>
          <div className="tool-tabs" role="tablist"><button className={toolTab === "workflow" ? "is-active" : ""} onClick={() => setToolTab("workflow")}><Workflow size={14} />流程</button><button className={toolTab === "profiles" ? "is-active" : ""} onClick={() => setToolTab("profiles")}><Settings2 size={14} />曲线</button></div>
          {toolTab === "workflow" && <div className="tool-panel"><p className="workflow-intro">录制当前计算器中的参数调整，并将它们保存为可重复执行的流程。</p><label className="workflow-name-label">流程名称<input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} /></label><div className="workflow-record-row"><button className={`apple-button ${recording ? "is-recording" : "is-primary"}`} onClick={() => { setRecording((value) => !value); setMessage(recording ? "已停止记录" : "正在记录参数操作"); }}>{recording ? <Square size={14} /> : <span className="record-dot" />}{recording ? "停止记录" : "开始记录"}</button><span className="workflow-count">{events.length} 步</span></div><div className="workflow-actions"><button className="apple-button" onClick={saveWorkflow}><Save size={14} />保存流程</button><button className="apple-button" onClick={() => exportWorkflow()}><Download size={14} />导出文件</button><button className="apple-button" onClick={() => workflowFileRef.current?.click()}><Upload size={14} />导入文件</button><button className="apple-button is-quiet" onClick={() => { setEvents([]); setMessage("已清空当前流程"); }}><Trash2 size={14} />清空当前</button><input ref={workflowFileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { importWorkflow(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div><div className="workflow-list-head"><span>已保存流程</span><span>{savedWorkflows.length}</span></div><div className="workflow-list">{savedWorkflows.length === 0 && <div className="workflow-empty"><Plus size={16} />保存后会出现在这里</div>}{savedWorkflows.map((workflow) => <article className="workflow-item" key={`${workflow.name}-${workflow.createdAt}`}><div className="workflow-item-title"><FolderOpen size={14} /><strong>{workflow.name}</strong></div><div className="workflow-item-meta">{workflow.events.length} 步操作</div><div className="workflow-item-actions"><button onClick={() => replayWorkflow(workflow)}><Play size={13} />执行</button><button onClick={() => exportWorkflow(workflow)}><Download size={13} />导出</button></div></article>)}</div></div>}
          {toolTab === "profiles" && <div className="tool-panel"><p className="profile-help">导入个人或官方的日志 / 伽马配置。配置独立保存，可在不同流程中复用。</p><div className="profile-actions"><button className="apple-button" onClick={() => profileFileRef.current?.click()}><Upload size={14} />导入配置</button><input ref={profileFileRef} type="file" accept="application/json,.json" hidden onChange={(event) => { importProfile(event.target.files?.[0]); event.currentTarget.value = ""; }} /></div><div className="workflow-list-head"><span>已导入配置</span><span>{profiles.length}</span></div><div className="profile-list">{profiles.length === 0 && <div className="profile-empty"><FileJson size={16} />等待导入配置文件</div>}{profiles.map((profile) => <article className="profile-item" key={profile.id}><div className="profile-item-title"><CheckCircle2 size={14} /><strong>{profile.name}</strong></div><div className="profile-item-meta">{profile.kind === "log" ? "日志曲线" : "伽马曲线"} · {profile.curve.type === "samples" ? `${profile.curve.samples?.length ?? 0} 个采样点` : "公式曲线"}</div><div className="profile-item-actions"><button onClick={() => exportProfile(profile)}><Download size={13} />导出</button><button onClick={() => { persistProfiles(profiles.filter((item) => item.id !== profile.id)); setMessage(`已删除配置：${profile.name}`); }}><Trash2 size={13} />删除</button></div></article>)}</div></div>}
        </aside>

        <section className="native-calculator-pane">
          {!workflowOpen && <button className="workflow-reopen" onClick={() => setWorkflowOpen(true)}><SlidersHorizontal size={15} />工具中心</button>}
          <div className="native-calculator-head"><div><span className="eyebrow">LUT 转换</span><h2>主计算器</h2><p>所有参数直接驱动兼容计算引擎；旧界面不再显示。</p></div><div className={`engine-indicator ${engineReady ? "is-ready" : ""}`}><i />{engineReady ? "引擎已连接" : "正在连接"}</div></div>
          <div className="native-calculator-grid">
            <section className="native-card capture-card"><div className="card-title"><span>01</span><div><h3>相机输入</h3><p>选择相机、曝光基准与输入记录设置。</p></div></div><div className="form-grid camera-grid">{select("cameraMaker", "相机品牌")}{select("cameraModel", "相机型号")}<Field label="原生 ISO"><output className="native-output">{engineState.cineEI || "—"}</output></Field><Field label="CineEI ISO"><input type="number" value={engineState.cineEI} disabled={!engineReady} onChange={(event) => setEngineField("cineEI", event.target.value)} /></Field><Field label="挡位修正"><input type="number" step="any" value={engineState.stopShift} disabled={!engineReady} onChange={(event) => setEngineField("stopShift", event.target.value)} /></Field></div></section>
            <section className="native-card pipeline-card"><div className="card-title"><span>02</span><div><h3>色彩管线</h3><p>定义记录伽马、色域与目标输出。</p></div></div><div className="pipeline-groups"><div><h4>记录设置</h4><div className="form-grid">{select("recGammaMaker", "伽马品牌")}{select("recGamma", "记录伽马")}{select("recGamutMaker", "色域品牌")}{select("recGamut", "记录色域")}</div></div><div><h4>输出设置</h4><div className="form-grid">{select("outGammaMaker", "伽马品牌")}{select("outGamma", "输出伽马")}{select("outGamutMaker", "色域品牌")}{select("outGamut", "输出色域")}</div></div></div></section>
            <section className="native-card export-card"><div className="card-title"><span>03</span><div><h3>LUT 输出</h3><p>命名、选择编码与生成导出文件。</p></div></div><div className="form-grid export-fields"><Field label="LUT 标题 / 文件名"><input value={engineState.title} disabled={!engineReady} onChange={(event) => setEngineField("title", event.target.value)} /></Field>{select("lutFormat", "输出格式")}{select("hardClip", "硬裁切")}</div><div className="native-actions"><button className="apple-button" onClick={() => engineAction(["Preview", "预览"], "预览已更新")}><Eye size={15} />更新预览</button><button className="apple-button is-primary" onClick={() => engineAction(["Generate LUT", "生成 LUT"], "正在生成 LUT")}><WandSparkles size={15} />生成 LUT</button><button className="apple-button" onClick={() => engineAction(["Generate Set", "生成套装"], "正在生成 LUT 套装")}><Download size={15} />生成套装</button></div></section>
            <NativeAdjustments engineReady={engineReady} onToggle={toggleAdjustment} onImportLut={importAdjustmentLut} onAnalyzeLut={analyzeAdjustmentLut} onResetLut={resetAdjustmentLut} />
            <iframe ref={iframeRef} className="engine-frame" src={ADJUSTMENTS_EMBED_SRC} title="LUTCalc 同源计算引擎" onLoad={() => { enforceAdjustmentEmbedLayout(); if (!verifyAdjustmentEmbed()) return; installAdjustmentBridge(); [180, 520, 1100].forEach((delay) => window.setTimeout(installAdjustmentBridge, delay)); const documentRef = engineDocument(); if (documentRef) applyWorkbenchTheme(activeTheme, themeMode, documentRef); hydrateEngine(); window.setTimeout(hydrateEngine, 720); }} />
            <section className="native-card preview-card"><div className="card-title"><span>05</span><div><h3>曲线预览</h3><p>{previewHint}</p></div></div><div className="preview-surface">{previewSrc ? <img src={previewSrc} alt="LUT 输出曲线预览" /> : <div className="preview-placeholder"><SlidersHorizontal size={22} />等待引擎曲线</div>}</div><div className="preview-footnote"><span>状态</span><strong>{engineReady ? "参数已同步" : "加载中"}</strong><span>工作流程记录会自动捕获原生参数调整。</span></div></section>
          </div>
        </section>

      </div>
      <footer className="project-disclosure" aria-label="关于与许可">
        <details>
          <summary>关于与许可</summary>
          <div className="project-disclosure-body">
            <p>本项目是基于 <a href="https://github.com/cameramanben/LUTCalc" target="_blank" rel="noreferrer">原版 LUTCalc</a> 的界面复刻与工作台扩展，并非官方发行版本。</p>
            <p>原版 LUTCalc 与本复刻项目均采用 <a href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.html" target="_blank" rel="noreferrer">GNU GPL-2.0</a> 许可；原始项目版权归其原作者及权利人所有。</p>
            <p>界面与工作台扩展由 Manus 开发。本版本可能不稳定，且不保证持续更新、技术支持或长期兼容性。</p>
          </div>
        </details>
      </footer>
    </main>
  );
}
