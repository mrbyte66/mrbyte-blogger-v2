"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { flushSync } from "react-dom";
import { announceAppearanceChange, colorModes, parseColorMode, type ColorMode } from "../lib/appearance";

export { colorModes, parseColorMode, type ColorMode } from "../lib/appearance";
/** `origin: "account"` marks a value applied from the signed-in account, so it is not sent back to it. */
export type PreferenceOrigin = "user" | "account";
type Preferences = { colorMode: ColorMode | null; motionEnabled: boolean; setColorMode: (mode: ColorMode, origin?: PreferenceOrigin) => void; setMotionEnabled: (enabled: boolean, origin?: PreferenceOrigin) => void };
const Context = createContext<Preferences>({ colorMode: null, motionEnabled: true, setColorMode: () => {}, setMotionEnabled: () => {} });
function applyColor(mode: ColorMode | null) {
  const root = document.documentElement;
  if (mode) root.dataset.theme = mode === "dark" ? "dark" : "light"; else delete root.dataset.theme;
  if (mode === "reading") root.dataset.tone = "reading"; else delete root.dataset.tone;
}

export function SitePreferences({ children }: { children: ReactNode }) {
  const [colorMode, setColor] = useState<ColorMode | null>(null);
  const [motionEnabled, setMotion] = useState(true);
  const themeTransition = useRef<ViewTransition | null>(null);
  function updateColor(mode: ColorMode | null) {
    setColor(mode);
    applyColor(mode);
  }
  function updateMotion(enabled: boolean) {
    setMotion(enabled);
    document.documentElement.dataset.motion = enabled ? "on" : "off";
  }
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    function sync() {
      try {
        updateColor(parseColorMode(localStorage.getItem("satir:theme")));
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
    setColorMode(mode, origin = "user") {
      const root = document.documentElement;
      const animate = motionEnabled && !matchMedia("(prefers-reduced-motion: reduce)").matches && typeof document.startViewTransition === "function" && !root.dataset.routeDirection;
      const apply = () => { updateColor(mode); try { localStorage.setItem("satir:theme", mode); } catch { /* Preference still works for this session. */ } if (origin === "user") announceAppearanceChange(); };
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
    setMotionEnabled(enabled, origin = "user") { updateMotion(enabled); try { localStorage.setItem("satir:motion", enabled ? "on" : "off"); } catch { /* Preference still works for this session. */ } if (origin === "user") announceAppearanceChange(); },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSitePreferences() { return useContext(Context); }
const modeLabels: Record<ColorMode, { name: string; hint: string }> = {
  light: { name: "Gündüz", hint: "Açık renkler" },
  reading: { name: "Okuma", hint: "Sıcak kâğıt tonu, daha az mavi ışık" },
  dark: { name: "Gece", hint: "Koyu renkler" },
};
function ModeIcon({ mode }: { mode: ColorMode }) {
  const d = mode === "light" ? "M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 2.5v2M12 19.5v2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M2.5 12h2M19.5 12h2M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
    : mode === "dark" ? "M19.5 14.6A7.8 7.8 0 0 1 9.4 4.5a7.8 7.8 0 1 0 10.1 10.1z"
    : "M12 6.8C10 5.4 7 5 4 5.5v13c3-.5 6 0 8 1.4 2-1.4 5-1.9 8-1.4v-13c-3-.5-6-.1-8 1.3zM12 6.8v13.1";
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

/**
 * Gündüz · Okuma · Gece in one fixed-width control: each mode is one press away and nothing around it moves.
 * `defaultDark` is the site's own atmosphere, shown until the visitor picks a mode.
 */
export function ThemeToggle({ defaultDark = false }: { defaultDark?: boolean }) {
  const { colorMode, setColorMode } = useSitePreferences();
  const [touched, setTouched] = useState(false);
  const current: ColorMode = colorMode ?? (defaultDark ? "dark" : "light");
  // The thumb's place comes from <html data-theme / data-tone>, which the early head script sets before the
  // first paint, so it never slides on page load; `data-default` covers a site that has no stored choice.
  return <div className="color-mode-switch" role="group" aria-label="Renk modu" data-mode={current} data-default={defaultDark ? "dark" : "light"} data-touched={touched ? "" : undefined}>
    <span className="color-mode-thumb" aria-hidden="true" />
    {colorModes.map((mode) => <button key={mode} type="button" aria-label={`${modeLabels[mode].name} modu`} title={`${modeLabels[mode].name} · ${modeLabels[mode].hint}`} aria-pressed={current === mode} onClick={() => { setTouched(true); if (current !== mode) setColorMode(mode); }}><ModeIcon mode={mode} /></button>)}
  </div>;
}
