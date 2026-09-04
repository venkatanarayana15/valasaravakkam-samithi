"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark";
type ResolvedTheme = Theme; // resolved from system if set to "system"

interface DarkModeContextValue {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const DarkModeContext = createContext<DarkModeContextValue>({
  theme: "light",
  resolved: "light",
  setTheme: () => {},
  toggle: () => {},
});

export function useDarkMode() {
  return useContext(DarkModeContext);
}

function getSystemPreference(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return null;
}

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [resolved, setResolved] = useState<ResolvedTheme>("light");
  const [mounted, setMounted] = useState(false);

  // Resolve the actual theme
  const resolve = useCallback((t: Theme): ResolvedTheme => {
    return t; // we only store light/dark, no system option
  }, []);

  // Apply the theme to <html>
  const applyTheme = useCallback((r: ResolvedTheme) => {
    const root = document.documentElement;
    if (r === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.setAttribute("data-theme", r);
    setResolved(r);
  }, []);

  // Set theme and persist
  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      localStorage.setItem("theme", t);
      applyTheme(resolve(t));
    },
    [applyTheme, resolve],
  );

  // Toggle between light and dark
  const toggle = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  // Initialize on mount
  useEffect(() => {
    const stored = getStoredTheme();
    const initial = stored ?? "light";
    setThemeState(initial);
    applyTheme(resolve(initial));
    setMounted(true);

    // Listen for system changes if no stored preference
    if (!stored) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = (e: MediaQueryListEvent) => {
        const r: ResolvedTheme = e.matches ? "dark" : "light";
        applyTheme(r);
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [applyTheme, resolve]);

  // Prevent flash on load - add class immediately in <head> via inline script
  // This is handled by the <script> in layout.tsx

  if (!mounted) {
    // Render children without dark class on first paint
    return <>{children}</>;
  }

  return (
    <DarkModeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </DarkModeContext.Provider>
  );
}
