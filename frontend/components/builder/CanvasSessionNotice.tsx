"use client";
import { useEffect } from "react";
import { previewEvents } from "../../lib/builder/preview-protocol";
export function CanvasSessionNotice() {
  useEffect(()=>{window.parent.postMessage({type:previewEvents.unavailable},window.location.origin);},[]);
  return <p role="status">Tuvali açmak için yeniden giriş yap.</p>;
}
