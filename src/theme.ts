import { useEffect, useState } from "react";

// Light is the default per the design system; dark is the toggle. The choice is
// persisted per-browser and applied as `data-theme` on <html>, which drives the
// CSS token overrides in styles.css.
export type Theme = "light" | "dark";

const STORAGE_KEY = "tac-theme";

export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // localStorage unavailable (private mode / SSR) — fall through to default.
  }
  return "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore persistence failures — the in-memory theme still applies.
    }
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }

  return { theme, setTheme, toggleTheme };
}
