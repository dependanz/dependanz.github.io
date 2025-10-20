"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

type AppState = {
    theme : "light" | "dark";
    setTheme : (t : "light" | "dark") => void
};
const AppContext = createContext<AppState | null>(null);

export default function AppProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Hydrate from storage once on mount
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  // Persist on change
  useEffect(() => {
    localStorage.setItem("theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
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