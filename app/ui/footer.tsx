"use client";

import React, { useMemo } from "react";
import { useApp } from "@/app/providers";

const Footer: React.FC = () => {
  const { theme } = useApp();

  const styles = useMemo<React.CSSProperties>(() => {
    const isDark = theme === "dark";
    return {
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      backgroundColor: isDark ? "rgba(11, 15, 26, 0.92)" : "rgba(255, 255, 255, 0.92)",
      color: "var(--fg)",
      textAlign: "center",
      padding: "6px 10px",
      boxShadow: isDark ? "0 -2px 6px rgba(0, 0, 0, 0.65)" : "0 -2px 5px rgba(0, 0, 0, 0.1)",
      borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.05)",
      backdropFilter: "blur(6px)",
      transition: "background-color 300ms ease, box-shadow 300ms ease, border-color 300ms ease",
      zIndex: 50,
    };
  }, [theme]);

  return (
    <footer style={styles}>
      <p className="text-sm">&copy; danzelserrano.com 2025 </p>
    </footer>
  );
};

export default Footer;
