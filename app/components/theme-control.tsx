"use client";

import { useEffect, useState } from "react";

const storageKey = "graphcode-theme";
type Theme = "system" | "light" | "dark";

function isTheme(value: string | null): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeControl() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey);
    const initialTheme = isTheme(storedTheme) ? storedTheme : "system";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
    setMounted(true);
  }, []);

  function updateTheme(value: Theme) {
    setTheme(value);
    window.localStorage.setItem(storageKey, value);
    document.documentElement.dataset.theme = value;
  }

  const themes: { value: Theme; label: string }[] = [
    { value: "system", label: "system" },
    { value: "light", label: "light" },
    { value: "dark", label: "dark" },
  ];

  const activeIndex = themes.findIndex((t) => t.value === theme);

  return (
    <div className="relative flex items-center rounded-sm border border-border/50 bg-surface/10 p-1">
      {/* Sliding background pill */}
      <div
        className={`absolute top-1 bottom-1 left-1 w-[64px] bg-surface rounded-[2px] shadow-sm transition-transform duration-200 ease-out pointer-events-none ${
          mounted ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transform: `translateX(${activeIndex * 64}px)`,
        }}
      />
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => updateTheme(t.value)}
          className={`relative z-10 w-[64px] py-1 font-mono text-[10px] uppercase tracking-widest transition-colors cursor-pointer text-center ${
            theme === t.value
              ? "text-foreground"
              : "text-muted hover:text-foreground"
          }`}
          aria-label={`Switch to ${t.label} theme`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
