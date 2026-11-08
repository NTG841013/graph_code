"use client";

import { useEffect, useId, useRef } from "react";

const storageKey = "graphcode-theme";
type Theme = "system" | "light" | "dark";

function isTheme(value: string | null): value is Theme {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeControl() {
  const id = useId();
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(storageKey);
    const initialTheme = isTheme(storedTheme) ? storedTheme : "system";
    if (selectRef.current) {
      selectRef.current.value = initialTheme;
    }
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  function updateTheme(value: string) {
    if (!isTheme(value)) {
      throw new Error("Unsupported theme selection.");
    }

    window.localStorage.setItem(storageKey, value);
    document.documentElement.dataset.theme = value;
  }

  return (
    <label
      className="inline-flex min-h-11 items-center gap-2 text-sm text-muted"
      htmlFor={id}
    >
      <span>Theme</span>
      <select
        className="min-h-11 rounded border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        id={id}
        onChange={(event) => updateTheme(event.currentTarget.value)}
        ref={selectRef}
        defaultValue="system"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
