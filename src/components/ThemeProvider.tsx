"use client";
import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
type Theme = "light" | "dark";
let memoryTheme: Theme | undefined;
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });
function getTheme(): Theme {
  if (memoryTheme) return memoryTheme;
  try { const saved = localStorage.getItem("nolyp-theme"); if (saved === "dark" || saved === "light") return saved; } catch { /* Preferência do sistema se o armazenamento estiver bloqueado. */ }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function subscribe(callback: () => void) {
  const media = matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener("nolyp-theme", callback); window.addEventListener("storage", callback); media.addEventListener("change", callback);
  return () => { window.removeEventListener("nolyp-theme", callback); window.removeEventListener("storage", callback); media.removeEventListener("change", callback); };
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light" as Theme);
  useEffect(() => { document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; }, [theme]);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("nolyp-theme", next); memoryTheme = undefined; } catch { memoryTheme = next; }
    window.dispatchEvent(new Event("nolyp-theme"));
  };
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
