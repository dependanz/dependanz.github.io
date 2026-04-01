"use client"

import React, { createContext, useContext, useEffect, useRef, useState } from "react"

type Theme = "light" | "dark";

type AppState = {
    theme : Theme;
    setTheme : (t : Theme) => void
};

const AppContext = createContext<AppState | null>(null);

const getInitialTheme = (): Theme => {
  if (typeof window === "undefined") return "light";

  const saved = localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;

  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export default function AppProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setTheme] = useState<Theme>("light");
  const hasHydrated = useRef(false);

  // Hydrate from storage once on mount
  useEffect(() => {
    const initialTheme = getInitialTheme();
    document.documentElement.setAttribute("data-theme", initialTheme);
    setTheme(initialTheme);
  }, []);

  // Persist on change
  useEffect(() => {
    const root = document.documentElement;

    if (hasHydrated.current) {
      root.classList.add("theme-transition");
      const timeoutId = window.setTimeout(() => root.classList.remove("theme-transition"), 350);
      root.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
      return () => window.clearTimeout(timeoutId);
    }

    hasHydrated.current = true;
    root.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme])

  return (
    <AppContext.Provider value={{ theme, setTheme }}>{children}</AppContext.Provider>
  );
}

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useApp must be used within AppProvider");
    }
    return context;
};
