"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { flushSync } from "react-dom";

type ColorMode = "light" | "dark";
type Preferences = { colorMode: ColorMode | null; motionEnabled: boolean; setColorMode: (mode: ColorMode) => void; setMotionEnabled: (enabled: boolean) => void };
const Context = createContext<Preferences>({ colorMode: null, motionEnabled: true, setColorMode: () => {}, setMotionEnabled: () => {} });

export function SitePreferences({ children }: { children: ReactNode }) {
  const [colorMode, setColor] = useState<ColorMode | null>(null);
  const [motionEnabled, setMotion] = useState(true);
  const themeTransition = useRef<ViewTransition | null>(null);
  function updateColor(mode: ColorMode | null) {
    setColor(mode);
    if (mode) document.documentElement.dataset.theme = mode;
    else delete document.documentElement.dataset.theme;
  }
  function updateMotion(enabled: boolean) {
    setMotion(enabled);
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    function sync() {
      try {
        const mode = localStorage.getItem("satir:theme");
        updateColor(mode === "light" || mode === "dark" ? mode : null);
        updateMotion(localStorage.getItem("satir:motion") !== "off" && !media.matches);
      } catch { updateMotion(!media.matches); }
    }
    function storage(event: StorageEvent) { if (!event.key || ["satir:theme", "satir:motion"].includes(event.key)) sync(); }
    sync();
    window.addEventListener("storage", storage);
    media.addEventListener?.("change", sync);
    return () => { window.removeEventListener("storage", storage); media.removeEventListener?.("change", sync); };
  }, []);
  useEffect(() => () => { themeTransition.current?.skipTransition(); delete document.documentElement.dataset.themeTransition; }, []);
  const value: Preferences = {
    colorMode, motionEnabled,
    setColorMode(mode) {
      const root = document.documentElement;
      const animate = motionEnabled && !matchMedia("(prefers-reduced-motion: reduce)").matches && typeof document.startViewTransition === "function" && !root.dataset.routeDirection;
      const apply = () => { updateColor(mode); try { localStorage.setItem("satir:theme", mode); } catch { /* Preference still works for this session. */ } };
      themeTransition.current?.skipTransition();
      if (!animate) { apply(); return; }
      root.dataset.themeTransition = "on";
      const transition = document.startViewTransition(() => flushSync(apply));
      themeTransition.current = transition;
      void transition.finished.catch(() => {}).finally(() => {
        if (themeTransition.current !== transition) return;
        themeTransition.current = null; delete root.dataset.themeTransition;
      });
    },
    setMotionEnabled(enabled) { updateMotion(enabled); try { localStorage.setItem("satir:motion", enabled ? "on" : "off"); } catch { /* Preference still works for this session. */ } },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSitePreferences() { return useContext(Context); }
export function ThemeToggle({ defaultDark = false }: { defaultDark?: boolean }) {
  const { colorMode, setColorMode } = useSitePreferences();
  const dark = colorMode ? colorMode === "dark" : defaultDark;
  return <button className="site-theme-toggle" aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"} aria-pressed={dark} onClick={() => setColorMode(dark ? "light" : "dark")}><span aria-hidden="true">{dark ? "☼" : "☾"}</span><span>{dark ? "Açık tema" : "Koyu tema"}</span></button>;
}
