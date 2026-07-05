"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") {
      setTheme(current);
      return;
    }
    const prefersLight = window.matchMedia(
      "(prefers-color-scheme: light)"
    ).matches;
    setTheme(prefersLight ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  };

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light and dark theme"
      className="flex h-7 w-7 items-center justify-center rounded-full border border-ink-4 text-[13px] text-bone-muted transition-colors duration-300 hover:text-bone"
    >
      {theme === "light" ? "☾" : theme === "dark" ? "☀" : ""}
    </button>
  );
}
