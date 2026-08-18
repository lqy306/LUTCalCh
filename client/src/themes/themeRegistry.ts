import kde from "./kde.theme.json";
import macos from "./macos.theme.json";
import omarchy from "./omarchy.theme.json";
import ubuntu from "./ubuntu.theme.json";

export type ThemeMode = "light" | "dark";

export type ThemeColors = {
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

export type WorkbenchTheme = {
  $schema: string;
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  radius: string;
  modes: Record<ThemeMode, { label: string; colors: ThemeColors }>;
};

export const THEME_STORAGE_KEY = "lutcalc-workbench-theme";
export const THEME_MODE_STORAGE_KEY = "lutcalc-workbench-mode";
export const DEFAULT_THEME_ID = "ubuntu";

export const BUILTIN_THEMES = [ubuntu, kde, macos, omarchy] as unknown as WorkbenchTheme[];

export function resolveTheme(id: string | null | undefined) {
  return BUILTIN_THEMES.find((theme) => theme.id === id) || BUILTIN_THEMES[0];
}

export function readStoredThemeId() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return resolveTheme(stored).id;
}

export function readStoredThemeMode(): ThemeMode {
  return localStorage.getItem(THEME_MODE_STORAGE_KEY) === "dark" ? "dark" : "light";
}

export function applyWorkbenchTheme(theme: WorkbenchTheme, mode: ThemeMode, targetDocument: Document = document) {
  const root = targetDocument.documentElement;
  const colors = theme.modes[mode].colors;
  root.dataset.workbenchTheme = theme.id;
  root.dataset.workbenchMode = mode;
  root.classList.toggle("dark", mode === "dark");
  root.style.setProperty("--theme-font", theme.fontFamily);
  root.style.setProperty("--theme-radius", theme.radius);
  Object.entries(colors).forEach(([token, value]) => root.style.setProperty(`--theme-${token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value));
}
