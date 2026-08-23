import kde from "./kde.theme.json";
import macos from "./macos.theme.json";
import omarchy from "./omarchy.theme.json";
import original from "./original.theme.json";
import ubuntu from "./ubuntu.theme.json";

export type ThemeMode = "light" | "dark";

/** 工作台主题的颜色令牌，父页面和同源引擎 iframe 共用这一组语义变量。 */
export type ThemeColors =
{
  canvas: string;
  surface: string;
  surfaceMuted: string;
  sidebar: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  topbar: string;
  topbarText: string;
  control: string;
  controlHover: string;
  input: string;
  inputDisabled: string;
  focus: string;
  success: string;
  danger: string;
  shadow: string;
  link: string;
  previewBlend: string;
};

export type WorkbenchTheme =
{
  $schema: string;
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  fontFace?:
  {
    family: string;
    source: string;
    format?: string;
    weight?: string;
    style?: string;
  };
  radius: string;
  modes: Record<ThemeMode, { label: string; colors: ThemeColors }>;
};

export const THEME_STORAGE_KEY = "lutcalc-workbench-theme";
export const THEME_MODE_STORAGE_KEY = "lutcalc-workbench-mode";
export const DEFAULT_THEME_ID = "ubuntu";

/** 主题只允许来自内置清单，不提供运行时上传入口。 */
export const BUILTIN_THEMES =
[
  ubuntu,
  kde,
  macos,
  omarchy,
  original,
] as unknown as WorkbenchTheme[];

export function resolveTheme(id: string | null | undefined)
{
  return BUILTIN_THEMES.find((theme) => theme.id === id) || BUILTIN_THEMES[0];
}

export function readStoredThemeId()
{
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  const resolved = resolveTheme(stored).id;

  /* 已移除主题的旧本地偏好统一回退为默认 Ubuntu，防止刷新后得到无效主题。 */
  if (stored !== resolved)
  {
    localStorage.setItem(THEME_STORAGE_KEY, resolved);
  }

  return resolved;
}

export function readStoredThemeMode(): ThemeMode
{
  return localStorage.getItem(THEME_MODE_STORAGE_KEY) === "dark" ? "dark" : "light";
}

/**
 * 将主题令牌应用到父文档或同源计算引擎文档。
 * 通过 targetDocument 参数复用同一逻辑，避免 iframe 再维护一套主题配置。
 */
export function applyWorkbenchTheme(
  theme: WorkbenchTheme,
  mode: ThemeMode,
  targetDocument: Document = document,
)
{
  const root = targetDocument.documentElement;
  const colors = theme.modes[mode].colors;

  root.dataset.workbenchTheme = theme.id;
  root.dataset.workbenchMode = mode;
  root.classList.toggle("dark", mode === "dark");
  root.style.setProperty("--theme-font", theme.fontFamily);

  if (theme.fontFace)
  {
    const styleId = "lutcalc-theme-font-face";
    let style = targetDocument.getElementById(styleId) as HTMLStyleElement | null;

    if (!style)
    {
      style = targetDocument.createElement("style");
      style.id = styleId;
      targetDocument.head.appendChild(style);
    }

    const fontFormat = theme.fontFace.format || "opentype";
    const fontWeight = theme.fontFace.weight || "400";
    const fontStyle = theme.fontFace.style || "normal";

    style.textContent =
      `@font-face{font-family:${theme.fontFace.family};` +
      `src:url("${theme.fontFace.source}") format("${fontFormat}");` +
      `font-weight:${fontWeight};font-style:${fontStyle};font-display:swap;}`;
  }

  root.style.setProperty("--theme-radius", theme.radius);

  Object.entries(colors).forEach(([token, value]) =>
  {
    const cssToken = token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    root.style.setProperty(`--theme-${cssToken}`, value);
  });
}
