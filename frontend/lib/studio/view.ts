"use client";
import { useCallback, useSyncExternalStore } from "react";
import { announceAppearanceChange } from "../appearance-events";

/**
 * Studio "Görünüm": the same tools in four visual arrangements. The choice is kept per browser and, when
 * signed in, on the account (like the colour mode); <html data-studio-view> lets the canvas frame follow it.
 */
export const studioViews = [
  { id: "marjinalya", label: "Marjinalya", detail: "Sessiz sayfa, araçlar gerektiğinde yanında" },
  { id: "odak", label: "Odak", detail: "Yazı merkezde; gerekli kontroller hep elinin altında" },
  { id: "kontakt", label: "Kontakt", detail: "Kapak kartlarıyla yazı kitaplığı, yan çekmece" },
  { id: "sahne", label: "Sahne", detail: "Sayfa sahnede, bloklar altta bir şeritte" },
] as const;
export type StudioView = (typeof studioViews)[number]["id"];

export const defaultStudioView: StudioView = "marjinalya";
export const studioViewStorageKey = "satir:studio-view";
const changedEvent = "satir:studio-view-changed";

export function parseStudioView(value: unknown): StudioView | null {
  return studioViews.some((view) => view.id === value) ? (value as StudioView) : null;
}

function current(): StudioView {
  if (typeof document === "undefined") return defaultStudioView;
  return parseStudioView(document.documentElement.dataset.studioView) ?? defaultStudioView;
}

/** Each view brings its own typefaces; they load once, on first use. */
const fontFamilies: Record<StudioView, string> = {
  marjinalya: "family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400",
  odak: "family=JetBrains+Mono:wght@400;500&family=Manrope:wght@500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400",
  kontakt: "family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700",
  sahne: "family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400",
};
export function ensureStudioFonts(view: StudioView) {
  if (typeof document === "undefined") return;
  const id = `studio-fonts-${view}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id; link.rel = "stylesheet"; link.href = `https://fonts.googleapis.com/css2?${fontFamilies[view]}&display=swap`;
  document.head.appendChild(link);
}

export function readStoredStudioView(): StudioView | null {
  try { return parseStudioView(localStorage.getItem(studioViewStorageKey)); } catch { return null; }
}

export function writeStudioView(view: StudioView) {
  document.documentElement.dataset.studioView = view;
  try { localStorage.setItem(studioViewStorageKey, view); } catch { /* The choice still holds for this tab. */ }
  window.dispatchEvent(new Event(changedEvent));
}

function subscribe(notify: () => void) {
  function storage(event: StorageEvent) {
    if (event.key !== null && event.key !== studioViewStorageKey) return;
    const stored = readStoredStudioView() ?? defaultStudioView;
    document.documentElement.dataset.studioView = stored;
    notify();
  }
  // Late hydration: the early <head> script may have run before this subtree existed.
  const stored = readStoredStudioView() ?? parseStudioView(document.documentElement.dataset.studioView) ?? defaultStudioView;
  if (document.documentElement.dataset.studioView !== stored) document.documentElement.dataset.studioView = stored;
  window.addEventListener(changedEvent, notify);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(changedEvent, notify); window.removeEventListener("storage", storage); };
}

/** The active Studio view and a setter. Server rendering and tests start from the default. */
export function useStudioView(): [StudioView, (view: StudioView) => void] {
  const view = useSyncExternalStore(subscribe, current, () => defaultStudioView);
  const set = useCallback((next: StudioView) => { ensureStudioFonts(next); writeStudioView(next); announceAppearanceChange(); }, []);
  ensureStudioFonts(view);
  return [view, set];
}

/**
 * Odak dims every block except the one being written. The preference is separate from the view so it
 * can be switched off without leaving Odak; the canvas frame follows it through the same <html> hook.
 */
export const studioDimStorageKey = "satir:studio-dim";
const dimChangedEvent = "satir:studio-dim-changed";

function currentDim(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.dataset.studioDim !== "off";
}
function subscribeDim(notify: () => void) {
  function storage(event: StorageEvent) {
    if (event.key !== null && event.key !== studioDimStorageKey) return;
    try { document.documentElement.dataset.studioDim = localStorage.getItem(studioDimStorageKey) === "off" ? "off" : "on"; } catch { /* keep current */ }
    notify();
  }
  try {
    const stored = localStorage.getItem(studioDimStorageKey) === "off" ? "off" : "on";
    if (document.documentElement.dataset.studioDim !== stored) document.documentElement.dataset.studioDim = stored;
  } catch { /* keep current */ }
  window.addEventListener(dimChangedEvent, notify);
  window.addEventListener("storage", storage);
  return () => { window.removeEventListener(dimChangedEvent, notify); window.removeEventListener("storage", storage); };
}
export function useFocusDimming(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(subscribeDim, currentDim, () => true);
  const set = useCallback((next: boolean) => {
    document.documentElement.dataset.studioDim = next ? "on" : "off";
    try { localStorage.setItem(studioDimStorageKey, next ? "on" : "off"); } catch { /* The choice still holds for this tab. */ }
    window.dispatchEvent(new Event(dimChangedEvent));
  }, []);
  return [on, set];
}
