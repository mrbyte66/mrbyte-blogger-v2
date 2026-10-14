"use client";
import { parseStudioView, type StudioView } from "./studio/view";

/**
 * Colour modes: light ("Gündüz"), dark ("Gece") and reading ("Okuma": light with warm paper tones and less
 * blue light). Reading keeps every light rule (`data-theme="light"`) and adds `data-tone="reading"` on top.
 */
export type ColorMode = "light" | "dark" | "reading";
export const colorModes: readonly ColorMode[] = ["light", "reading", "dark"];
export function parseColorMode(value: unknown): ColorMode | null { return value === "light" || value === "dark" || value === "reading" ? value : null; }

/**
 * Appearance travels with the account: colour mode, motion and (for the owner) the Studio view. Each
 * browser keeps its copy in localStorage; a signed-in account also keeps one on the server.
 */
export type Appearance = { colorMode: ColorMode | null; motion: boolean | null; studioView: StudioView | null };

export { appearanceChangedEvent, announceAppearanceChange } from "./appearance-events";

export function readLocalAppearance(): Appearance {
  try {
    const motion = localStorage.getItem("satir:motion");
    return { colorMode: parseColorMode(localStorage.getItem("satir:theme")), motion: motion === "on" ? true : motion === "off" ? false : null, studioView: parseStudioView(localStorage.getItem("satir:studio-view")) };
  } catch { return { colorMode: null, motion: null, studioView: null }; }
}

export function parseAppearance(value: unknown): Appearance | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return { colorMode: parseColorMode(raw.colorMode), motion: typeof raw.motion === "boolean" ? raw.motion : null, studioView: parseStudioView(raw.studioView) };
}
