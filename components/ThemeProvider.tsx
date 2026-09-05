"use client";
import { createContext, useContext, useState, useLayoutEffect } from "react";
type Theme = "dark"|"light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useLayoutEffect(() => {
    const stored = (localStorage.getItem("ac_theme") as Theme|null) ?? "dark";
    setTheme(stored);
    document.documentElement.setAttribute("data-theme", stored);
  }, []);

  function toggle() {
    setTheme(prev => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("ac_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  }
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}
export function useTheme() { return useContext(ThemeCtx); }
