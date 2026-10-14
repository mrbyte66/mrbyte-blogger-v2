"use client";
import { useFocusDimming, useStudioView } from "../../lib/studio/view";

/** Keeps the canvas frame's <html data-studio-view / data-studio-dim> in step with the Studio's choice. */
export function StudioViewSync() {
  useStudioView();
  useFocusDimming();
  return null;
}
