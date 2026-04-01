"use client";
import React from "react";
import { useApp } from "@/app/providers";

const sizes = {
  trackW: 112,
  trackH: 40,
  pad: 4,
  knobH: 30,
  knobWLight: 62,
  knobWDark: 54,
  travelLight: 112 - 2 * 4 - 62,
  travelDark: 112 - 2 * 4 - 54,
};

const LightSwitch: React.FC = () => {
  const {theme, setTheme} = useApp();
  const isDark = theme === "dark";

  const toggle = () => setTheme(isDark ? "light" : "dark");

  const knobWidth   = isDark ? sizes.knobWDark : sizes.knobWLight;
  const knobTravel  = isDark ? sizes.travelDark : 0; // slide right when dark
  const knobRadius  = isDark ? sizes.knobH/2 : sizes.knobH/2; // constant pill radius
  // Slightly different widths makes it feel like “dark” is shorter than “light”

  return (
    <button
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      onClick={toggle}
      style={{
        position: "relative",
        width: sizes.trackW,
        height: sizes.trackH,
        padding: sizes.pad,
        borderRadius: sizes.trackH / 2,
        backgroundColor: "var(--track)",
        border: "1px solid var(--ring)",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-start",
        transition: "background-color 300ms ease, border-color 300ms ease, box-shadow 300ms ease",
        boxShadow: "inset 0 0 0 1px var(--ring)"
      }}
    >
      {/* Left label */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: 10,
          fontSize: 12,
          letterSpacing: 0.2,
          opacity: isDark ? 0.35 : 1,
          transition: "opacity 300ms ease",
          color: "var(--fg)",
          userSelect: "none",
          textTransform: "lowercase"
        }}
      >
        light
      </span>

      {/* Right label */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          right: 10,
          fontSize: 12,
          letterSpacing: 0.2,
          opacity: isDark ? 1 : 0.35,
          transition: "opacity 300ms ease",
          color: "var(--fg)",
          userSelect: "none",
          textTransform: "lowercase"
        }}
      >
        dark
      </span>

      {/* Morphing oval knob with the active label inside */}
      <span
        style={{
          height: sizes.knobH,
          width: knobWidth,
          transform: `translateX(${knobTravel}px)`,
          borderRadius: knobRadius,
          backgroundColor: "var(--thumb)",
          color: isDark ? "#0b0f1a" : "#ffffff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "lowercase",
          transition: "transform 300ms ease, width 300ms ease, background-color 300ms ease, color 300ms ease, border-radius 300ms ease",
          boxShadow: "0 1px 2px rgba(0,0,0,0.25)"
        }}
      >
        {isDark ? "dark" : "light"}
      </span>
    </button>
  );
};

export default LightSwitch;
