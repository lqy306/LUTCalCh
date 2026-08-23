import React, { createContext, useContext, useEffect, useState } from "react";
import { THEME_MODE_STORAGE_KEY } from "@/themes/themeRegistry";

type Theme = "light" | "dark";

interface ThemeContextType
{
  theme: Theme;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps
{
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

/**
 * 提供基础明暗模式上下文。
 * 工作台的完整主题由 themeRegistry 负责；这里仅保留模板级兼容接口。
 */
export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps)
{
  const [theme, setTheme] = useState<Theme>(() =>
  {
    /* 非可切换的模板级 Provider 也不得与工作台主题冲突：挂载时跟随
       themeRegistry 的明暗模式，避免把 html.dark 类清掉导致主题失效。 */
    const stored = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    if (stored === "dark" || stored === "light")
    {
      return stored;
    }

    if (switchable)
    {
      const legacy = localStorage.getItem("theme");
      return (legacy as Theme) || defaultTheme;
    }

    return defaultTheme;
  });

  useEffect(() =>
  {
    const root = document.documentElement;

    if (theme === "dark")
    {
      root.classList.add("dark");
    }
    else
    {
      root.classList.remove("dark");
    }

    if (switchable)
    {
      localStorage.setItem("theme", theme);
    }
  }, [theme, switchable]);

  const toggleTheme = switchable
    ? () =>
      {
        setTheme((previous) => (previous === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme()
{
  const context = useContext(ThemeContext);

  if (!context)
  {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
