import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Theme is a `data-theme` attribute on `<html>` and nothing else.
 *
 * The design system defines both palettes in `tokens/colors.css` and
 * `tokens/stages.css`, keyed off `[data-theme="dark"]`. The app's only job is
 * to set the attribute — it must never pick a colour, which is why this file
 * has no colour values in it.
 */

export type Theme = "light" | "dark";

const STORAGE_KEY = "gradtracker.theme";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Stored choice wins; otherwise follow the OS. A student who has chosen dark
 *  should not be flipped back by a system setting they did not change. */
export function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider.");
  return value;
}
