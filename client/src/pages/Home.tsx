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
type RGBReadout = { red: number; green: number; blue: number };
type RGBSample = { id: number; x: number; y: number; red: number; green: number; blue: number };
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
type LutAnalystChoiceSet = { gamma: Choice[]; gamut: Choice[] };
type LutAnalysisState = {
  status: "idle" | "loading" | "analyzing" | "ready" | "error";
  fileName: string;
  title: string;
  outputGamma: string;
  outputGamut: string;
  completedAt: string;
  message: string;
  samples: { label: string; ire: string; code10: string }[];
};
type EngineField = "cameraMaker" | "cameraModel" | "cineEI" | "stopShift" | "recGammaMaker" | "recGamma" | "recGamutMaker" | "recGamut" | "outGammaMaker" | "outGamma" | "outGamutMaker" | "outGamut" | "title" | "lutFormat" | "hardClip";

const WORKFLOW_KEY = "lutcalc-apple-workflows";
const PROFILE_KEY = "lutcalc-log-gamma-profiles";
const ADJUSTMENTS_EMBED_SRC = `${import.meta.env.BASE_URL}lutcalc/index.html?embed=adjustments&workspaceEmbed=20260818-5`;
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
  const [engineFailed, setEngineFailed] = useState(false);
  const engineFailedRef = useRef(false);
  const engineFailureCountRef = useRef(0);
  const analysisTitleRef = useRef<string | null>(null);
  const titleUserEditedRef = useRef(false);
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const [toolTab, setToolTab] = useState<"workflow" | "profiles">("workflow");
  const [recording, setRecording] = useState(false);
  const [workflowName, setWorkflowName] = useState("未命名流程");
  const [events, setEvents] = useState<WorkflowEvent[]>([]);
  const [savedWorkflows, setSavedWorkflows] = useState<WorkflowFile[]>(readWorkflows);
  const [profiles, setProfiles] = useState<LogGammaProfile[]>(readProfiles);
  const [message, setMessage] = useState("正在连接计算引擎");
  const [engineState, setEngineState] = useState<Record<EngineField, string>>(EMPTY_STATE);
  const [lastExportName, setLastExportName] = useState("");
  const [choices, setChoices] = useState<Partial<Record<EngineField, Choice[]>>>({});
  const [lutAnalystChoices, setLutAnalystChoices] = useState<LutAnalystChoiceSet>({ gamma: [], gamut: [] });
  const [previewSrc, setPreviewSrc] = useState("");
  const previewFileRef = useRef<HTMLInputElement>(null);
  const [previewImageSrc, setPreviewImageSrc] = useState("");
  const [enginePreviewSrc, setEnginePreviewSrc] = useState("");
  const [engineScopeSrc, setEngineScopeSrc] = useState({ wfm: "", vector: "", rgb: "" });
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewPreset, setPreviewPreset] = useState("high");
  const [previewRange, setPreviewRange] = useState("109");
  const [previewScope, setPreviewScope] = useState({ wfm: false, vector: false, rgb: false });
  const [rgbAdjustmentEnabled, setRgbAdjustmentEnabled] = useState(false);
  const [rgbSamplerEnabled, setRgbSamplerEnabled] = useState(false);
  const [rgbReadout, setRgbReadout] = useState<RGBReadout>({ red: 0, green: 0, blue: 0 });
  const [rgbSamples, setRgbSamples] = useState<RGBSample[]>([]);
  const [outputConfig, setOutputConfig] = useState({ dimensionMode: "3D", dimension: "33", inputRange: "109", outputRange: "109", usage: "grading", clipLegal: true });
  const [lutAnalysis, setLutAnalysis] = useState<LutAnalysisState>({ status: "idle", fileName: "", title: "", outputGamma: "", outputGamut: "", completedAt: "", message: "尚未分析外部 LUT。", samples: [] });
  const analysisInProgressRef = useRef(false);
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

    const notifyParent = (method: string) => {
      windowRef.setTimeout(() => {
        windowRef.parent.postMessage({ type: "lutcalc:adjustment-complete", method }, windowRef.location.origin);
      }, 0);
    };

    ["gotFile", "doStuff", "doneStuff"].forEach((methodName) => {
      const original = prototype[methodName];
      if (typeof original !== "function") return;
      prototype[methodName] = function bridgedAdjustmentMethod(this: unknown, ...args: unknown[])
      {
        const result = (original as (...methodArgs: unknown[]) => unknown).apply(this, args);
        notifyParent(methodName);
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
    /* 原版 stop 图表画布背景透明，深色主题下呈黑色；统一先铺白底保证曲线/网格/文字可辨识。 */
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    sources.forEach((source) => context.drawImage(source, 0, 0));
    setPreviewSrc(canvas.toDataURL("image/png"));
  }, []);

  /* 原版预览在 iframe 内运行；将其 Canvas 快照同步至工作台，而不是用独立静态图片替代。 */
  const refreshEnginePreview = useCallback(() => {
    const documentRef = engineDocument();
    if (!documentRef) return;
    const snapshot = (selector: string) => {
      const canvas = documentRef.querySelector(selector) as HTMLCanvasElement | null;
      return canvas && canvas.width && canvas.height ? canvas.toDataURL("image/png") : "";
    };
    const preview = snapshot("#can-preview");
    if (preview) setEnginePreviewSrc(preview);
    setEngineScopeSrc({ wfm: snapshot("#can-waveform"), vector: snapshot("#can-vector"), rgb: snapshot("#can-parade") });
  }, []);
  const readPreviewRGB = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const image = event.currentTarget.querySelector("img") as HTMLImageElement | null;
    if (!image) return null;
    const rect = image.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const raw = (engineWindow() as (Window & { lutInputs?: { preRaw?: Float64Array | number[] } }) | null)?.lutInputs?.preRaw;
    if (raw && raw.length >= 960 * 540 * 3) {
      const px = Math.max(0, Math.min(959, Math.round(960 * x)));
      const py = Math.max(0, Math.min(539, Math.round(540 * y)));
      const index = (px + py * 960) * 3;
      const convert = (value: number) => Math.min(1023, Math.round(876 * value) + 64);
      return { x, y, red: convert(Number(raw[index])), green: convert(Number(raw[index + 1])), blue: convert(Number(raw[index + 2])) };
    }
    if (!image.naturalWidth || !image.naturalHeight) return null;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0);
    const px = Math.min(canvas.width - 1, Math.floor(x * canvas.width));
    const py = Math.min(canvas.height - 1, Math.floor(y * canvas.height));
    const pixel = context.getImageData(px, py, 1, 1).data;
    return { x, y, red: Math.round(pixel[0] * 1023 / 255), green: Math.round(pixel[1] * 1023 / 255), blue: Math.round(pixel[2] * 1023 / 255) };
  }, []);
  const updatePreviewRGB = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const next = readPreviewRGB(event);
    if (next) setRgbReadout({ red: next.red, green: next.green, blue: next.blue });
  }, [readPreviewRGB]);
  const samplePreviewPixel = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!rgbSamplerEnabled) return;
    const next = readPreviewRGB(event);
    if (!next) return;
    setRgbReadout({ red: next.red, green: next.green, blue: next.blue });
    setRgbSamples((current) => [...current, { id: current.length + 1, x: next.x, y: next.y, red: next.red, green: next.green, blue: next.blue }]);
  }, [readPreviewRGB, rgbSamplerEnabled]);

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
      title: documentRef.querySelector("#box-lut input:not([type]), #box-lut input[type=text]") as HTMLInputElement | null,
      lutFormat: lut[0] || null,
      hardClip: lut[5] || null,
    };
    return map[field] || null;
  }, []);

  const optionsOf = (node: HTMLSelectElement | null): Choice[] => node ? Array.from(node.options).map((option) => ({ value: option.value, label: option.textContent || option.value })) : [];

  const hydrateEngine = useCallback(() => {
    const documentRef = engineDocument();
    if (!documentRef) return;
    /* 引擎 iframe 必须包含原版工作区结构才算加载成功；404/错误页不得误报“已连接”。 */
    const hasEngineStructure = Boolean(documentRef.querySelector("#box-cam, #box-gam, #box-lut, #box-twk"));
    if (!hasEngineStructure)
    {
      engineFailureCountRef.current += 1;
      if (engineFailureCountRef.current >= 10 && !engineFailedRef.current)
      {
        engineFailedRef.current = true;
        setEngineFailed(true);
        setMessage("原版计算引擎加载失败：请检查网络连接或刷新页面重试");
      }
      return;
    }
    engineFailureCountRef.current = 0;
    if (engineFailedRef.current)
    {
      engineFailedRef.current = false;
      setEngineFailed(false);
      setMessage("计算引擎已就绪");
    }
    documentRef.querySelectorAll("select, input, textarea, button, [role=button]").forEach((control, index) => {
      if (!control.getAttribute("data-lutcalc-workflow-id")) control.setAttribute("data-lutcalc-workflow-id", `lc-${String(index + 1).padStart(4, "0")}`);
    });
    const fields = Object.keys(EMPTY_STATE) as EngineField[];
    const nextState = { ...EMPTY_STATE };
    const nextChoices: Partial<Record<EngineField, Choice[]>> = {};
    const tweakSelects = Array.from(documentRef.querySelectorAll("#box-twk select")) as HTMLSelectElement[];
    const nextLutAnalystChoices: LutAnalystChoiceSet = {
      gamma: optionsOf(tweakSelects[20] || null),
      gamut: optionsOf(tweakSelects[22] || null),
    };
    fields.forEach((field) => {
      const node = fieldNode(field);
      if (!node) return;
      nextState[field] = node.value;
      // iframe 内的 select 属于另一个 Window，不能使用父窗口的 instanceof HTMLSelectElement。
      if (node?.tagName === "SELECT") nextChoices[field] = optionsOf(node as HTMLSelectElement);
    });
    /* 缺陷 A 粘性回填：分析完成后引擎可能把标题重置为「自定义 LUT」；
       只要用户未手动编辑标题，轮询时就把分析标题写回引擎与 React 两侧。 */
    if (analysisTitleRef.current && !titleUserEditedRef.current)
    {
      const engineTitle = nextState.title;
      if (!engineTitle || engineTitle === "自定义 LUT" || engineTitle === "Custom LUT")
      {
        nextState.title = analysisTitleRef.current;
        const titleNode = fieldNode("title");
        const windowRef = engineWindow();
        if (titleNode && windowRef && titleNode.value !== analysisTitleRef.current)
        {
          titleNode.value = analysisTitleRef.current;
          const IframeEvent = (windowRef as unknown as { Event: typeof Event }).Event;
          titleNode.dispatchEvent(new IframeEvent("input", { bubbles: true }));
          titleNode.dispatchEvent(new IframeEvent("change", { bubbles: true }));
        }
      }
    }
    const snapshot = JSON.stringify({ nextState, nextChoices, nextLutAnalystChoices });
    if (engineSnapshotRef.current !== snapshot)
    {
      engineSnapshotRef.current = snapshot;
      setEngineState(nextState);
      setChoices(nextChoices);
      setLutAnalystChoices(nextLutAnalystChoices);
    }
    const lutBox = documentRef.querySelector("#box-lut");
    const radioIndex = (name: string) => Array.from(lutBox?.querySelectorAll(`input[type=radio][name="${name}"]`) || []).findIndex((node) => (node as HTMLInputElement).checked);
    const checkedDimension = Array.from(lutBox?.querySelectorAll('input[type=radio][name="dimension"]') || []).find((node) => (node as HTMLInputElement).checked) as HTMLInputElement | undefined;
    const clipLegal = Array.from(lutBox?.querySelectorAll('input[type=checkbox]') || []).find((node) => /0%-100%/.test((node.parentElement?.textContent || "").replace(/\s/g, ""))) as HTMLInputElement | undefined;
    setOutputConfig({
      dimensionMode: radioIndex("dims") === 0 ? "1D" : "3D",
      dimension: checkedDimension?.value || "33",
      inputRange: radioIndex("inrange") === 0 ? "100" : "109",
      outputRange: radioIndex("outrange") === 0 ? "100" : "109",
      usage: radioIndex("lutusage") === 0 ? "grading" : "mlut",
      clipLegal: clipLegal?.checked ?? true,
    });
    setEngineReady(true);
    setMessage("计算引擎已就绪");
    window.setTimeout(refreshPreview, 260);
    window.setTimeout(refreshEnginePreview, 520);
    window.setTimeout(syncAdjustmentFrameHeight, 60);
  }, [fieldNode, refreshEnginePreview, refreshPreview, syncAdjustmentFrameHeight]);

  /* 引擎存活检测：iframe 加载失败（404/断网）时，不能依赖 engineReady 驱动的轮询，
     需独立周期检查并给出可理解的失败提示，避免长期停留在“正在连接”。 */
  useEffect(() =>
  {
    const check = window.setInterval(() =>
    {
      const documentRef = engineDocument();
      if (!documentRef) return;
      const hasEngine = Boolean(documentRef.querySelector("#box-cam, #box-gam, #box-lut, #box-twk"));
      if (hasEngine)
      {
        engineFailureCountRef.current = 0;
        if (engineFailedRef.current)
        {
          engineFailedRef.current = false;
          setEngineFailed(false);
        }
        return;
      }
      engineFailureCountRef.current += 1;
      if (engineFailureCountRef.current >= 10 && !engineFailedRef.current)
      {
        engineFailedRef.current = true;
        setEngineFailed(true);
        setMessage("原版计算引擎加载失败：请检查网络连接或刷新页面重试");
      }
    }, 1200);
    return () => window.clearInterval(check);
  }, []);

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
        refreshEnginePreview();
      }, delay);
    });
  }, [hydrateEngine, refreshEnginePreview, refreshPreview]);

  /*
   * TWKLA.doneStuff 会把“LA - 标题”注册为当前输出 Gamma/Gamut。
   * 读取到该成对状态才允许报告分析完成，不能仅凭按钮点击或固定短延时判定。
   */
  const captureCompletedLutAnalysis = useCallback((finalAttempt = false) =>
  {
    const documentRef = engineDocument();
    if (!documentRef || !analysisInProgressRef.current) return false;
    const gammaSelects = Array.from(documentRef.querySelectorAll("#box-gam select")) as HTMLSelectElement[];
    const outputGamma = gammaSelects[7]?.options[gammaSelects[7]?.selectedIndex]?.textContent?.trim() || "";
    const outputGamut = gammaSelects[11]?.options[gammaSelects[11]?.selectedIndex]?.textContent?.trim() || "";

    if (outputGamma.startsWith("LA - ") && outputGamut.startsWith("LA - "))
    {
      analysisInProgressRef.current = false;
      const title = outputGamma.replace(/^LA -\s*/, "");
      const analyst = (engineWindow() as (Window & { lutInputs?: { lutAnalyst?: { getL?: () => ArrayBuffer } } }) | null)?.lutInputs?.lutAnalyst;
      const transferBuffer = analyst?.getL?.();
      const transfer = transferBuffer ? new Float64Array(transferBuffer) : new Float64Array();
      const sampleIndices = [0, Math.floor((transfer.length - 1) / 2), transfer.length - 1].filter((index, position, values) => index >= 0 && values.indexOf(index) === position);
      const samples = sampleIndices.map((index) =>
      {
        const encoded = transfer[index];
        const ire = Math.max(0, Math.min(100, ((encoded * 1023 - 64) / 876) * 100));
        return { label: index === 0 ? "起点" : index === transfer.length - 1 ? "终点" : "中点", ire: `${ire.toFixed(1)} IRE`, code10: String(Math.round(encoded * 1023)) };
      });
      setLutAnalysis((current) => ({ ...current, status: "ready", title, outputGamma, outputGamut, completedAt: new Date().toLocaleTimeString("zh-CN"), message: "原版 LUTAnalyst 已完成分析，结果已成为当前输出管线。", samples }));
      setMessage(`分析完成：${title} 已同步到输出与曲线预览`);
      analysisTitleRef.current = title;
      titleUserEditedRef.current = false;
      /* 缺陷 A：分析成功后回填「LUT 标题 / 文件名」，使导出文件名与 Cube TITLE 使用分析标题；仅在用户未自定义标题时覆盖。 */
      const titleNode = fieldNode("title");
      const currentTitle = (titleNode?.value ?? "").trim();
      if (!currentTitle || currentTitle === "自定义 LUT")
      {
        const windowRef = engineWindow();
        if (titleNode && windowRef)
        {
          titleNode.value = title;
          const IframeEvent = (windowRef as unknown as { Event: typeof Event }).Event;
          titleNode.dispatchEvent(new IframeEvent("input", { bubbles: true }));
          titleNode.dispatchEvent(new IframeEvent("change", { bubbles: true }));
        }
        setEngineState((current) => ({ ...current, title }));
      }
      return true;
    }

    if (finalAttempt)
    {
      analysisInProgressRef.current = false;
      setLutAnalysis((current) => ({ ...current, status: "error", message: "原版引擎未注册 LA 输出；默认 S-Log3 状态不会被误报为分析成功。请检查 LUT 格式、范围和输入基底。" }));
      setMessage("LUT 分析未完成：未检测到 LA 输出注册");
    }
    return false;
  }, []);

  const scheduleLutAnalysisCompletion = useCallback(() =>
  {
    const delays = [120, 360, 800, 1500, 2800, 4800, 7600, 12000, 18000];
    delays.forEach((delay, index) =>
    {
      window.setTimeout(() =>
      {
        hydrateEngine();
        refreshPreview();
        refreshEnginePreview();
        window.setTimeout(() => captureCompletedLutAnalysis(index === delays.length - 1), 80);
      }, delay);
    });
  }, [captureCompletedLutAnalysis, hydrateEngine, refreshEnginePreview, refreshPreview]);

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
      if (event.data?.type !== "lutcalc:adjustment-complete") return;
      scheduleEngineRefresh();
      if (event.data?.method === "doneStuff") scheduleLutAnalysisCompletion();
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
      refreshEnginePreview();
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
  }, [engineReady, recordEvent, scheduleEngineRefresh, scheduleLutAnalysisCompletion]);

  useEffect(() => {
    if (!iframeRef.current?.contentDocument) return;
    const timer = window.setTimeout(hydrateEngine, 120);
    return () => window.clearTimeout(timer);
  }, [hydrateEngine]);

  const setEngineField = (field: EngineField, value: string) => {
    const node = fieldNode(field);
    const windowRef = engineWindow();
    if (!node || !windowRef) return;
    if (field === "title")
    {
      titleUserEditedRef.current = true;
      analysisTitleRef.current = null;
    }
    node.value = value;
    const IframeEvent = (windowRef as unknown as { Event: typeof Event }).Event;
    node.dispatchEvent(new IframeEvent("input", { bubbles: true }));
    node.dispatchEvent(new IframeEvent("change", { bubbles: true }));
    setEngineState((current) => ({ ...current, [field]: value }));
    if (field === "cameraMaker" || field === "cameraModel") window.setTimeout(hydrateEngine, 90);
    window.setTimeout(refreshPreview, 120);
  };

  /* 原版 03 输出区大部分通过无 id 的 radio/select 实现；按原始 name/value 精确桥接。 */
  const setOutputOption = (key: keyof typeof outputConfig, value: string | boolean) =>
  {
    const documentRef = engineDocument();
    const windowRef = engineWindow();
    if (!documentRef || !windowRef) return;
    const box = documentRef.querySelector("#box-lut");
    if (!box) return;
    const next = { ...outputConfig, [key]: value };
    setOutputConfig(next);
    const clickRadio = (name: string, index: number) =>
    {
      const radios = Array.from(box.querySelectorAll(`input[type=radio][name="${name}"]`)) as HTMLInputElement[];
      const target = radios[index];
      if (!target) return;
      target.checked = true;
      const IframeEvent = (windowRef as unknown as { Event: typeof Event }).Event;
      target.dispatchEvent(new IframeEvent("input", { bubbles: true }));
      target.dispatchEvent(new IframeEvent("change", { bubbles: true }));
    };
    if (key === "dimensionMode") clickRadio("dims", value === "1D" ? 0 : 1);
    if (key === "dimension")
    {
      const target = Array.from(box.querySelectorAll(`input[type=radio][name="dimension"]`)).find((node) => (node as HTMLInputElement).value === value) as HTMLInputElement | undefined;
      if (target)
      {
        target.checked = true;
        const IframeEvent = (windowRef as unknown as { Event: typeof Event }).Event;
        target.dispatchEvent(new IframeEvent("input", { bubbles: true }));
        target.dispatchEvent(new IframeEvent("change", { bubbles: true }));
      }
    }
    if (key === "inputRange") clickRadio("inrange", value === "100" ? 0 : 1);
    if (key === "outputRange") clickRadio("outrange", value === "100" ? 0 : 1);
    if (key === "usage") clickRadio("lutusage", value === "grading" ? 0 : 1);
    if (key === "clipLegal")
    {
      const input = Array.from(box.querySelectorAll("input[type=checkbox]")).find((node) => /0%-100%/.test((node.parentElement?.textContent || "").replace(/\s/g, ""))) as HTMLInputElement | undefined;
      if (input)
      {
        input.checked = Boolean(value);
        input.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("change", { bubbles: true }));
      }
    }
    window.setTimeout(hydrateEngine, 120);
    window.setTimeout(refreshPreview, 180);
  };

  const loadPreviewImage = (file?: File) =>
  {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreviewImageSrc(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const findAdjustmentToggle = (label: string) =>
  {
    const documentRef = engineDocument();
    if (!documentRef) return null;
    return Array.from(documentRef.querySelectorAll("#box-twk .tweakholder")).map((node) => node as HTMLElement).find((node) => normalizeText(node.firstChild?.textContent || "") === label)?.querySelector("input[type=checkbox]") as HTMLInputElement | null;
  };

  const toggleAdjustment = (label: string, checked: boolean) =>
  {
    if (/RGB Sampler|RGB 采样器/.test(label)) {
      setRgbAdjustmentEnabled(checked);
      if (!checked) { setRgbSamplerEnabled(false); setRgbSamples([]); }
    }
    const toggle = findAdjustmentToggle(label);
    const windowRef = engineWindow();
    if (!toggle || !windowRef) return;
    toggle.checked = checked;
    toggle.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("input", { bubbles: true }));
    toggle.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("change", { bubbles: true }));
    window.setTimeout(refreshPreview, 180);
    window.setTimeout(syncAdjustmentFrameHeight, 220);
  };

  const syncAdjustmentControl = (module: string, control: string, value: string | boolean) =>
  {
    const documentRef = engineDocument();
    const windowRef = engineWindow();
    if (!documentRef || !windowRef || typeof value === "boolean") return;
    const moduleIndex: Record<string, number> = {
      "Custom Colour Space": 0,
      "自定义色彩空间": 0,
      "白平衡": 1,
      "PSST-CDL": 2,
      "ASC-CDL": 3,
      "多色调": 4,
      "高光色域": 5,
      "膝点": 6,
      "黑电平 / 高光电平": 7,
      "黑伽马": 8,
      "SDR Saturation": 9,
      "SDR 饱和度": 9,
      "显示色彩空间转换": 10,
      "Display Colourspace Converter": 10,
      "色域限制": 11,
      "伪色": 12,
      "RGB 采样器": 13,
    };
    const holder = (documentRef.querySelectorAll("#tweaksholder > div")[moduleIndex[module]] || null) as HTMLElement | null;
    if (!holder) return;
    const ranges = Array.from(holder.querySelectorAll("input[type=range]")) as HTMLInputElement[];
    const numbers = Array.from(holder.querySelectorAll("input[type=number]")) as HTMLInputElement[];
    const selects = Array.from(holder.querySelectorAll("select")) as HTMLSelectElement[];
    const precise: Record<string, number> = {
      "白平衡.referenceWhite": 0,
      "白平衡.newWhiteBalance": 1,
      "白平衡.cto": 0,
      "白平衡.green": 1,
      "黑伽马.power": 0,
      "黑伽马.stopLimit": 1,
      "黑伽马.feather": 2,
      "黑电平 / 高光电平.blackLevel": 0,
      "黑电平 / 高光电平.highlightReflectance": 1,
      "黑电平 / 高光电平.highlightMap": 2,
    };
    const key = `${module}.${control}`;
    let target: HTMLInputElement | HTMLSelectElement | undefined;
    if (precise[key] !== undefined)
    {
      target = module === "白平衡" && control.includes("White") ? numbers[precise[key]] : module === "白平衡" && control === "referenceWhite" ? numbers[0] : module === "白平衡" && control === "newWhiteBalance" ? numbers[1] : module === "白平衡" ? ranges[precise[key]] : numbers[precise[key]];
    }
    if (!target && ranges.length)
    {
      const ordinal = ["exposure", "contrast", "pivot", "saturation", "hue", "slopeR", "slopeG", "slopeB", "offsetR", "offsetG", "offsetB", "powerR", "powerG", "powerB", "shadowHue", "shadowSat", "midtoneHue", "midtoneSat", "highlightHue", "highlightSat", "threshold", "softness", "desaturation", "point", "slope", "blackLevel", "highlightReflectance", "highlightMap", "power", "stopLimit", "feather", "brightness", "low", "high"].indexOf(control);
      target = ranges[Math.max(0, ordinal)] || ranges[0];
    }
    if (!target && numbers.length) target = numbers[0];
    if (!target && selects.length) target = selects[0];
    if (!target) return;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
    setter?.call(target, String(value));
    target.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("input", { bubbles: true }));
    target.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("change", { bubbles: true }));
    window.setTimeout(refreshPreview, 160);
  };
  const syncLutAnalystConfig = (control: string, value: string) =>
  {
    const documentRef = engineDocument();
    const windowRef = engineWindow();
    const box = documentRef?.querySelector("#box-twk");
    if (!box || !windowRef) return;
    const selects = Array.from(box.querySelectorAll("select")) as HTMLSelectElement[];
    const targetIndex: Record<string, number> = { inputGamma: 20, inputGamut: 22 };
    const radioMap: Record<string, { name: string; index: number }> = {
      dimension: { name: "lutAnalystDim", index: value === "33³" ? 0 : 1 },
      method: { name: "intMethod", index: value === "三线性" ? 0 : value === "四面体" ? 1 : 2 },
      range: { name: "range", index: ["109%→100%", "109%→109%", "100%→100%", "100%→109%"].indexOf(value) },
    };
    const radio = radioMap[control];
    if (radio)
    {
      const radios = Array.from(box.querySelectorAll(`input[type=radio][name="${radio.name}"]`)) as HTMLInputElement[];
      radios[radio.index]?.click();
      window.setTimeout(refreshPreview, 180);
      return;
    }
    let target: HTMLInputElement | HTMLSelectElement | undefined;
    if (targetIndex[control] !== undefined) target = selects[targetIndex[control]];
    if (control === "title")
    {
      const analystHolder = Array.from(box.querySelectorAll(".tweakholder"))
        .find((node) => /^(LUTAnalyst|LUT分析)/i.test(normalizeText(node.textContent || "")));
      /* 原版 title 没有显式 type 属性；它是分析设置容器的第一个 input。 */
      target = analystHolder?.querySelector(".tweak > div:nth-child(2) > input") as HTMLInputElement | undefined;
    }
    if (!target) return;
    /* iframe 内 Select 属于独立 Window，不能使用父窗口的 instanceof 判断。 */
    const option = target.tagName === "SELECT" ? Array.from((target as HTMLSelectElement).options).find((item) => item.textContent?.trim() === value || item.value === value) : undefined;
    const nextValue = option?.value ?? value;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
    setter?.call(target, nextValue);
    target.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("input", { bubbles: true }));
    target.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("change", { bubbles: true }));
    window.setTimeout(refreshPreview, 180);
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
    analysisInProgressRef.current = false;
    setLutAnalysis({ status: "loading", fileName: file.name, title: "", outputGamma: "", outputGamut: "", completedAt: "", message: "文件已载入，正在读取原始元数据与分析参数。", samples: [] });
    setMessage(`已载入 LUT：${file.name}`);
  };

  const analyzeAdjustmentLut = () =>
  {
    const documentRef = engineDocument();
    const button = Array.from(documentRef?.querySelectorAll("#box-twk input[type=button], #box-twk button") || []).find((node) => /Analyse|分析|Re-Analyse/.test((node as HTMLInputElement).value || node.textContent || "")) as HTMLElement | undefined;
    analysisInProgressRef.current = Boolean(button);
    setLutAnalysis((current) => ({ ...current, status: button ? "analyzing" : "error", outputGamma: "", outputGamut: "", completedAt: "", message: button ? "正在由原版 LUTAnalyst 计算 Gamma、Gamut 与分析 LUT。" : "未找到原版 LUT 分析操作。", samples: [] }));
    button?.click();
    setMessage(button ? "正在分析 LUT" : "未找到 LUT 分析操作");
    if (button) scheduleLutAnalysisCompletion();
  };

  const resetAdjustmentLut = () =>
  {
    const documentRef = engineDocument();
    const button = Array.from(documentRef?.querySelectorAll("#box-twk input[type=button], #box-twk button") || []).find((node) => /New LUT|新建 LUT/.test((node as HTMLInputElement).value || node.textContent || "")) as HTMLElement | undefined;
    button?.click();
    analysisInProgressRef.current = false;
    analysisTitleRef.current = null;
    titleUserEditedRef.current = false;
    setLutAnalysis({ status: "idle", fileName: "", title: "", outputGamma: "", outputGamut: "", completedAt: "", message: "已清除外部 LUT 分析状态。", samples: [] });
    setMessage("已重置 LUT 解析");
    window.setTimeout(() => { hydrateEngine(); refreshPreview(); refreshEnginePreview(); }, 260);
  };

  const buildExportTitle = () => {
    const compact = (value: string) => normalizeText(value).replace(/[^\u4e00-\u9fa5a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const readable = (field: EngineField) => choices[field]?.find((choice) => choice.value === engineState[field])?.label || engineState[field];
    const source = [readable("cameraModel"), readable("recGamma"), readable("recGamut")].filter(Boolean).map(compact);
    const target = [readable("outGamma"), readable("outGamut")].filter(Boolean).map(compact);
    if (!source.length && !target.length) return "LUTCalc_Output";
    const range = `${outputConfig.inputRange}to${outputConfig.outputRange}`;
    return [...source, ...(target.length ? ["to", ...target] : []), range].join("_") || "LUTCalc_Output";
  };

  const ensureExportTitle = () => {
    const current = normalizeText(engineState.title);
    if (current && !["自定义 LUT", "Custom LUT", "_LUT"].includes(current)) return current;
    const nextTitle = buildExportTitle();
    setEngineField("title", nextTitle);
    return nextTitle;
  };

  const engineAction = (labels: string[], success: string) => {
    const documentRef = engineDocument();
    if (!documentRef) return;
    const isExport = labels.some((label) => ["Generate LUT", "Generate Set", "生成 LUT", "生成套装"].includes(label));
    const exportTitle = isExport ? ensureExportTitle() : "";
    const candidate = Array.from(documentRef.querySelectorAll("button, input[type=button], input[type=submit]")).find((node) => {
      const input = node as HTMLInputElement;
      const text = `${input.value || ""} ${node.textContent || ""} ${node.getAttribute("data-lc-original-value") || ""}`;
      return labels.some((label) => text.includes(label));
    }) as HTMLElement | undefined;
    candidate?.click();
    if (candidate && isExport) {
      const suffix = labels.some((label) => ["Generate Set", "生成套装"].includes(label)) ? "套装" : "LUT";
      const fileName = `${exportTitle}.cube`;
      setLastExportName(fileName);
      setMessage(`已触发${suffix}下载：${fileName}`);
    } else {
      setMessage(candidate ? success : "未找到对应的计算引擎操作");
    }
    window.setTimeout(refreshPreview, 250);
    window.setTimeout(hydrateEngine, 420);
  };

  const syncOriginalPreview = (kind: "toggle" | "preset" | "range" | "scope" | "load", value?: string | boolean) =>
  {
    const documentRef = engineDocument();
    const windowRef = engineWindow();
    if (!documentRef || !windowRef) return;
    const holder = documentRef.querySelector("#preview-holder");
    const emit = (control: HTMLInputElement | HTMLSelectElement) =>
    {
      control.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("input", { bubbles: true }));
      control.dispatchEvent(new (windowRef as unknown as { Event: typeof Event }).Event("change", { bubbles: true }));
    };
    if (kind === "toggle")
    {
      engineAction(["Preview", "预览"], previewVisible ? "正在隐藏原版预览" : "正在显示原版预览");
      setPreviewVisible((current) => !current);
    }
    else if (kind === "preset")
    {
      const select = holder?.querySelector("select") as HTMLSelectElement | null;
      if (select)
      {
        const presetIndex: Record<string, string> = { high: "0", low: "1", rec709: "2", chromaticity: "3", gray: "4" };
        select.value = presetIndex[String(value)] || "0";
        emit(select);
      }
      setPreviewPreset(String(value));
    }
    else if (kind === "range")
    {
      const radios = Array.from(holder?.querySelectorAll('input[type=radio][name="prelegdat"]') || []) as HTMLInputElement[];
      const target = radios[String(value) === "100" ? 0 : 1];
      if (target && !target.checked) target.click();
      setPreviewRange(String(value));
    }
    else if (kind === "scope")
    {
      const checks = Array.from(holder?.querySelectorAll('input[type=checkbox]') || []) as HTMLInputElement[];
      const map = { wfm: 0, vector: 1, rgb: 2 };
      const key = String(value) as keyof typeof map;
      const target = checks[map[key]];
      if (target) { target.click(); setPreviewScope((current) => ({ ...current, [key]: target.checked })); }
    }
    else if (kind === "load")
    {
      const button = Array.from(holder?.querySelectorAll("input[type=button], button") || []).find((node) => /Load Preview|载入预览/.test((node as HTMLInputElement).value || node.textContent || "")) as HTMLElement | undefined;
      button?.click();
      setMessage(button ? "原版预览将先要求确认图像 Gamma、色彩空间与范围" : "未找到原版载入预览操作");
    }
    [260, 900].forEach((delay) => window.setTimeout(refreshEnginePreview, delay));
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

  const previewHint = useMemo(() => engineReady ? "预览由原始计算引擎实时生成" : engineFailed ? "原版计算引擎加载失败；预览不可用" : "正在读取原始计算引擎…", [engineFailed, engineReady]);
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
          <div className="native-calculator-head"><div><span className="eyebrow">LUT 转换</span><h2>主计算器</h2><p>所有参数直接驱动兼容计算引擎；旧界面不再显示。</p></div><div className={`engine-indicator ${engineReady ? "is-ready" : ""} ${engineFailed ? "is-failed" : ""}`}><i />{engineReady ? "引擎已连接" : engineFailed ? "引擎加载失败" : "正在连接"}</div></div>
          <div className="native-calculator-grid">
            <section className="native-card capture-card"><div className="card-title"><span>01</span><div><h3>相机输入</h3><p>选择相机、曝光基准与输入记录设置。</p></div></div><div className="form-grid camera-grid">{select("cameraMaker", "相机品牌")}{select("cameraModel", "相机型号")}<Field label="原生 ISO"><output className="native-output">{engineState.cineEI || "—"}</output></Field><Field label="CineEI ISO"><input type="number" value={engineState.cineEI} disabled={!engineReady} onChange={(event) => setEngineField("cineEI", event.target.value)} /></Field><Field label="挡位修正"><input type="number" step="any" value={engineState.stopShift} disabled={!engineReady} onChange={(event) => setEngineField("stopShift", event.target.value)} /></Field></div></section>
            <section className="native-card pipeline-card"><div className="card-title"><span>02</span><div><h3>色彩管线</h3><p>定义记录伽马、色域与目标输出。</p></div></div><div className="pipeline-groups"><div><h4>记录设置</h4><div className="form-grid">{select("recGammaMaker", "伽马品牌")}{select("recGamma", "记录伽马")}{select("recGamutMaker", "色域品牌")}{select("recGamut", "记录色域")}</div></div><div><h4>输出设置</h4><div className="form-grid">{select("outGammaMaker", "伽马品牌")}{select("outGamma", "输出伽马")}{select("outGamutMaker", "色域品牌")}{select("outGamut", "输出色域")}</div></div></div></section>
            <section className="native-card export-card"><div className="card-title"><span>03</span><div><h3>LUT 输出</h3><p>保留原版输出维度、范围、用途、格式与硬裁切选项。</p></div></div><div className="form-grid export-fields"><Field label="LUT 标题 / 文件名"><input value={engineState.title} placeholder={buildExportTitle()} disabled={!engineReady} onChange={(event) => { titleUserEditedRef.current = true; setEngineField("title", event.target.value); }} /><small className="field-hint">未填写时将自动使用输入/输出管线生成文件名，避免导出为 _LUT.cube。</small></Field><button type="button" className="apple-button output-auto-title" disabled={!engineReady} onClick={() => { if (lutAnalysis.status === "ready" && lutAnalysis.title) { setEngineField("title", lutAnalysis.title); setMessage(`已应用分析标题：${lutAnalysis.title}`); } else { engineAction(["Auto Title", "自动标题"], "已更新自动标题"); } }}>自动标题</button></div><div className="output-option-board"><div className="output-option-row"><span>输出维度</span><label><input type="radio" name="output-dimension-mode" checked={outputConfig.dimensionMode === "1D"} disabled={!engineReady} onChange={() => setOutputOption("dimensionMode", "1D")} />1D</label><label><input type="radio" name="output-dimension-mode" checked={outputConfig.dimensionMode === "3D"} disabled={!engineReady} onChange={() => setOutputOption("dimensionMode", "3D")} />3D</label><div className="output-chip-group">{(outputConfig.dimensionMode === "1D" ? ["1024", "4096", "16384"] : ["17", "33", "65"]).map((size) => <label key={size}><input type="radio" name="output-dimension" checked={outputConfig.dimension === size} disabled={!engineReady} onChange={() => setOutputOption("dimension", size)} />{outputConfig.dimensionMode === "3D" ? `${size}³` : size}</label>)}</div></div><div className="output-option-row"><span>输入范围</span><label><input type="radio" name="output-input-range" checked={outputConfig.inputRange === "100"} disabled={!engineReady} onChange={() => setOutputOption("inputRange", "100")} />100%</label><label><input type="radio" name="output-input-range" checked={outputConfig.inputRange === "109"} disabled={!engineReady} onChange={() => setOutputOption("inputRange", "109")} />109%</label><span>输出范围</span><label><input type="radio" name="output-output-range" checked={outputConfig.outputRange === "100"} disabled={!engineReady} onChange={() => setOutputOption("outputRange", "100")} />100%</label><label><input type="radio" name="output-output-range" checked={outputConfig.outputRange === "109"} disabled={!engineReady} onChange={() => setOutputOption("outputRange", "109")} />109%</label></div><div className="output-option-row"><span>LUT 用途</span><label><input type="radio" name="output-usage" checked={outputConfig.usage === "grading"} disabled={!engineReady} onChange={() => setOutputOption("usage", "grading")} />调色 LUT</label><label><input type="radio" name="output-usage" checked={outputConfig.usage === "mlut"} disabled={!engineReady} onChange={() => setOutputOption("usage", "mlut")} />相机 / 监看 LUT（MLUT）</label></div><div className="form-grid output-format-fields">{select("lutFormat", "LUT 类型")}{select("hardClip", "硬裁切")}<label className="native-field output-clip-legal"><span>0%–100%</span><input type="checkbox" checked={outputConfig.clipLegal} disabled={!engineReady} onChange={(event) => setOutputOption("clipLegal", event.target.checked)} /></label></div></div><div className="native-actions"><button className="apple-button" onClick={() => syncOriginalPreview("toggle")}><Eye size={15} />显示原版预览</button><button className="apple-button is-primary" onClick={() => engineAction(["Generate LUT", "生成 LUT"], "正在生成 LUT")}><WandSparkles size={15} />生成 LUT</button><button className="apple-button" onClick={() => engineAction(["Generate Set", "生成套装"], "正在生成 LUT 套装")}><Download size={15} />生成套装</button></div>{lastExportName && <div className="export-feedback" role="status" aria-live="polite"><CheckCircle2 size={15} /><span>最近一次导出已触发：<strong>{lastExportName}</strong></span><button type="button" className="text-button" onClick={() => setLastExportName("")}>知道了</button></div>}</section>
            {lutAnalysis.status !== "idle" && <section className={`lut-analysis-context is-${lutAnalysis.status}`} aria-live="polite"><strong>{lutAnalysis.status === "ready" ? "当前输出使用外部 LUT 分析结果" : "外部 LUT 分析状态"}</strong><span>{lutAnalysis.message}</span>{lutAnalysis.status === "ready" && <small>{lutAnalysis.outputGamma} / {lutAnalysis.outputGamut}；生成 LUT 将使用这一已应用的原版引擎输出状态。</small>}</section>}
            <NativeAdjustments engineReady={engineReady} onToggle={toggleAdjustment} onImportLut={importAdjustmentLut} onAnalyzeLut={analyzeAdjustmentLut} onResetLut={resetAdjustmentLut} onControlChange={syncAdjustmentControl} onLutAnalystConfigChange={syncLutAnalystConfig} lutAnalystChoices={lutAnalystChoices} analysisState={lutAnalysis} />
            <iframe ref={iframeRef} className="engine-frame" src={ADJUSTMENTS_EMBED_SRC} title="LUTCalc 同源计算引擎" onLoad={() => { enforceAdjustmentEmbedLayout(); if (!verifyAdjustmentEmbed()) return; installAdjustmentBridge(); [180, 520, 1100].forEach((delay) => window.setTimeout(installAdjustmentBridge, delay)); const documentRef = engineDocument(); if (documentRef) applyWorkbenchTheme(activeTheme, themeMode, documentRef); hydrateEngine(); window.setTimeout(hydrateEngine, 720); }} />
            <section className={`native-card preview-card ${previewVisible ? "is-open" : "is-closed"}`}>
              <div className="card-title"><span>05</span><div><h3>原版预览与曲线</h3><p>{previewHint}</p></div></div>
              <div className="preview-tool-bar">
                <button type="button" className="apple-button" onClick={() => syncOriginalPreview("toggle")}>{previewVisible ? "隐藏预览" : "显示预览"}</button>
                <select aria-label="原版预览类型" value={previewPreset} onChange={(event) => syncOriginalPreview("preset", event.target.value)}><option value="high">高对比度</option><option value="low">低对比度</option><option value="rec709">Rec.709 色域</option><option value="chromaticity">xy / uv 色度图</option><option value="gray">灰度</option></select>
                <button type="button" className="apple-button" onClick={() => syncOriginalPreview("load")}>载入预览…</button>
              </div>
              <div className="preview-tool-options"><span>预览范围</span><label><input type="radio" name="preview-range" checked={previewRange === "100"} onChange={() => syncOriginalPreview("range", "100")} />100%</label><label><input type="radio" name="preview-range" checked={previewRange === "109"} onChange={() => syncOriginalPreview("range", "109")} />109%</label><label><input type="checkbox" checked={previewScope.wfm} onChange={() => syncOriginalPreview("scope", "wfm")} />WFM</label><label><input type="checkbox" checked={previewScope.vector} onChange={() => syncOriginalPreview("scope", "vector")} />Vector</label><label><input type="checkbox" checked={previewScope.rgb} onChange={() => syncOriginalPreview("scope", "rgb")} />RGB</label>{previewVisible && <span className="rgb-readout">10-bit Values - R: {rgbReadout.red} G: {rgbReadout.green} B: {rgbReadout.blue}</span>}</div>
              <div className="preview-content">
                <div className={`engine-preview-surface ${rgbSamplerEnabled ? "is-sampling" : ""}`} onMouseMove={updatePreviewRGB} onClick={samplePreviewPixel} role={rgbSamplerEnabled ? "button" : undefined} tabIndex={rgbSamplerEnabled ? 0 : undefined}>
                  {enginePreviewSrc ? <img src={enginePreviewSrc} alt="原版 LUTCalc Canvas 预览" /> : <div className="preview-placeholder"><Eye size={22} />点击“显示预览”后读取原版 Canvas</div>}
                  {rgbSamples.map((sample) => <span key={sample.id} className="rgb-sample-marker" style={{ left: `${sample.x * 100}%`, top: `${sample.y * 100}%` }}>{sample.id}</span>)}
                </div>
                {rgbAdjustmentEnabled && <div className="rgb-sampler-panel" aria-label="RGB采样器">
                  <div className="rgb-sampler-actions"><strong>RGB 采样器</strong><button type="button" className={`apple-button ${rgbSamplerEnabled ? "is-primary" : ""}`} onClick={() => setRgbSamplerEnabled((current) => !current)}>{rgbSamplerEnabled ? "停止点击取样" : "开始点击取样"}</button><button type="button" className="apple-button" onClick={() => setRgbSamples([])} disabled={!rgbSamples.length}>清除</button><span>{rgbSamplerEnabled ? "点击预览图添加采样点" : "开启后点击预览图"}</span></div>
                  {rgbSamples.length > 0 && <div className="rgb-sampler-values">{rgbSamples.map((sample) => <div key={sample.id}><b>{sample.id}</b><span>R {sample.red}</span><span>G {sample.green}</span><span>B {sample.blue}</span></div>)}</div>}
                </div>}
              </div>
              {(previewScope.wfm || previewScope.vector || previewScope.rgb) && <div className="engine-scope-grid">{previewScope.wfm && <div>{engineScopeSrc.wfm ? <img src={engineScopeSrc.wfm} alt="原版波形监看" /> : <span>正在生成 WFM</span>}</div>}{previewScope.vector && <div>{engineScopeSrc.vector ? <img src={engineScopeSrc.vector} alt="原版矢量示波器" /> : <span>正在生成 Vector</span>}</div>}{previewScope.rgb && <div>{engineScopeSrc.rgb ? <img src={engineScopeSrc.rgb} alt="原版 RGB Parade" /> : <span>正在生成 RGB Parade</span>}</div>}</div>}
              <div className="preview-surface">{previewSrc ? <img src={previewSrc} alt="LUT 输出曲线预览" /> : <div className="preview-placeholder"><SlidersHorizontal size={22} />等待引擎曲线</div>}</div>
              <div className="preview-footnote"><span>状态</span><strong>{engineReady ? "原版 Canvas 已桥接" : engineFailed ? "引擎不可用" : "加载中"}</strong><span>鼠标移动可在原版预览中读取 10-bit RGB；载入图片会要求确认 Gamma、色彩空间与范围。</span></div>
            </section>
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
