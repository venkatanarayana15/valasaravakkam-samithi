"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
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

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return null;
}

function getInitialTheme(): Theme {
  // Light-first: only an explicit stored choice enables dark; the OS
  // preference never auto-switches the site theme.
  return getStoredTheme() ?? "light";
}

// True only after hydration on the client (false on the server), so
// theme-dependent consumers never render with SSR values once mounted.
const emptySubscribe = () => () => {};

export function DarkModeProvider({ children }: { children: ReactNode }) {
  // Lazy init reads localStorage exactly once at first render, so consumers
  // get the stored theme immediately instead of a light-flash first pass.
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);
  const [resolved, setResolved] = useState<ResolvedTheme>(getInitialTheme);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

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
      try {
        localStorage.setItem("theme", t);
      } catch {
        // Private-mode Safari / full storage: keep the in-memory toggle working.
      }
      applyTheme(resolve(t));
    },
    [applyTheme, resolve],
  );

  // Toggle between light and dark
  const toggle = useCallback(() => {
    setTheme(theme === "light" ? "dark" : "light");
  }, [theme, setTheme]);

  // Mirror theme state to the document element (class + data-theme) on
  // mount and every toggle. DOM writes only — no setState inside, so the
  // set-state-in-effect rule stays satisfied and lint stays clean.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.setAttribute("data-theme", theme);
  }, [theme]);

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
