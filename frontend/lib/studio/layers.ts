"use client";
import { useEffect, useLayoutEffect, type RefObject } from "react";

/**
 * Floating Studio surfaces (top bar, rail, tool strips, settings panels) are "layers", marked with
 * `data-layer`. The last one opened or pressed is drawn above the others, so a panel never opens behind
 * another one. Raised layers stay below site-wide controls such as the sound button (z-index 50).
 */
const base = 41;
const order: HTMLElement[] = [];

function layerOf(target: Element | null | undefined): HTMLElement | null {
  let found: HTMLElement | null = null;
  for (let node = target ?? null; node && !node.classList.contains("studio"); node = node.parentElement) {
    // Sahne flattens the header into grid items; a display:contents element has no
    // stacking box, so raising it cannot bring its menus above the canvas.
    if (node instanceof HTMLElement && node.hasAttribute("data-layer") && getComputedStyle(node).display !== "contents") found = node;
  }
  return found;
}

/** Brings the layer that holds `target` to the front. */
export function raiseLayer(target: Element | null | undefined) {
  const layer = layerOf(target);
  if (!layer || order[order.length - 1] === layer) return;
  for (let i = order.length - 1; i >= 0; i--) if (order[i] === layer || !order[i].isConnected) order.splice(i, 1);
  order.push(layer);
  order.forEach((node, index) => { node.style.zIndex = String(base + index); });
}

/** True when the layer holding `target` is already drawn in front of the others. */
export function isTopLayer(target: Element | null | undefined) {
  const layer = layerOf(target);
  return !!layer && order[order.length - 1] === layer;
}

/** Installs the "last pressed is on top" rule for the whole Studio page. */
export function useStudioLayers() {
  useEffect(() => {
    const raise = (event: Event) => raiseLayer(event.target as Element);
    document.addEventListener("pointerdown", raise, true);
    document.addEventListener("focusin", raise, true);
    return () => { document.removeEventListener("pointerdown", raise, true); document.removeEventListener("focusin", raise, true); };
  }, []);
}

/** A panel opened from somewhere else (a canvas click, another toolbar) comes to the front as it opens. */
export function useLayer(open: boolean, ref: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => { if (open) raiseLayer(ref.current); }, [open, ref]);
}
