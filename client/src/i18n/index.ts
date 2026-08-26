import ar from "./locales/ar.json";
import en from "./locales/en.json";
import es from "./locales/es.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import zhCN from "./locales/zh-CN.json";
import { legacySourceToKey, type I18nKey } from "./legacyKeys";

export type Locale = "zh-CN" | "en" | "es" | "ar" | "ja" | "ko";
export type TranslationValues = Record<string, string | number>;
type Dictionary = Record<I18nKey, string>;

export const LOCALE_STORAGE_KEY = "lutcalc-workbench-locale";

export const LOCALES: ReadonlyArray<{ id: Locale; label: string; dir: "ltr" | "rtl" }> = [
  { id: "zh-CN", label: "简体中文", dir: "ltr" },
  { id: "en", label: "English", dir: "ltr" },
  { id: "es", label: "Español", dir: "ltr" },
  { id: "ar", label: "العربية", dir: "rtl" },
  { id: "ja", label: "日本語", dir: "ltr" },
  { id: "ko", label: "한국어", dir: "ltr" },
] as const;

const dictionaries: Record<Locale, Dictionary> = {
  "zh-CN": zhCN as Dictionary,
  en: en as Dictionary,
  es: es as Dictionary,
  ar: ar as Dictionary,
  ja: ja as Dictionary,
  ko: ko as Dictionary,
};

function format(template: string, values: TranslationValues): string {
  return Object.entries(values).reduce((result, [name, value]) => result.replaceAll(`{${name}}`, String(value)), template);
}

/** Resolves a stable English message id in an explicit per-language package. */
export function translate(locale: Locale, key: I18nKey, values: TranslationValues = {}): string {
  const template = dictionaries[locale][key];
  if (template === undefined) {
    console.error(`[i18n] Missing ${locale} translation: ${key}`);
    return `[${key}]`;
  }
  return format(template, values);
}

/**
 * Compatibility bridge while existing UI components are migrated to `translate`.
 * It resolves Chinese legacy literals to English ids; it never falls back to English.
 */
export function translateLegacy(locale: Locale, source: string, values: TranslationValues = {}): string {
  const key = legacySourceToKey[source as keyof typeof legacySourceToKey];
  if (!key) {
    console.error(`[i18n] Unmapped legacy source: ${source}`);
    return source;
  }
  return translate(locale, key, values);
}

/** Localizes only mapped presentation labels from the untouched original engine. */
export function translateEngineOption(locale: Locale, sourceLabel: string): string {
  const key = legacySourceToKey[sourceLabel as keyof typeof legacySourceToKey];
  return key ? translate(locale, key) : sourceLabel;
}

/**
 * Compatibility renderer for unmigrated components. It translates only source
 * strings that have an explicit English-key mapping; technical values and
 * numeric labels are deliberately left unchanged and never logged as errors.
 */
export function localizeElementText(root: ParentNode | null, locale: Locale): void {
  if (!root) return;
  const resolveMapped = (source: string) => {
    const key = legacySourceToKey[source as keyof typeof legacySourceToKey];
    return key ? translate(locale, key) : source;
  };
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const textNode = node as Text & { __lutcalcSource?: string };
    const parent = textNode.parentElement;
    if (!parent || parent.closest("[data-no-i18n]")) continue;
    const source = textNode.__lutcalcSource ?? textNode.data;
    textNode.__lutcalcSource = source;
    const translated = resolveMapped(source);
    if (translated !== textNode.data) textNode.data = translated;
  }
  root.querySelectorAll?.("[aria-label], [title], [placeholder]").forEach((element) => {
    const html = element as HTMLElement & { __lutcalcI18nAttributes?: Record<string, string> };
    const sources = html.__lutcalcI18nAttributes || {};
    ["aria-label", "title", "placeholder"].forEach((attribute) => {
      const current = html.getAttribute(attribute);
      if (!current) return;
      const source = sources[attribute] || current;
      sources[attribute] = source;
      html.setAttribute(attribute, resolveMapped(source));
    });
    html.__lutcalcI18nAttributes = sources;
  });
}

export function getStoredLocale(): Locale {
  const value = typeof window === "undefined" ? null : window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return LOCALES.some((locale) => locale.id === value) ? value as Locale : "zh-CN";
}

export function applyLocale(locale: Locale): void {
  const config = LOCALES.find((item) => item.id === locale) || LOCALES[0];
  document.documentElement.lang = locale;
  document.documentElement.dir = config.dir;
  document.title = `LUTCalc · ${translate(locale, "calculator_workbench")}`;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
