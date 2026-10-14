"use client";
import { useEffect, useRef, type RefObject } from "react";

const interactive = "button,a[href],input,select,textarea,summary,label,dialog,[role=menu],[role=menuitem],[role=dialog],[role=switch],[contenteditable=true],[contenteditable=plaintext-only]";

/**
 * Closes a floating surface the way people expect: Escape, a press outside it and — because pointer
 * events inside the live canvas never reach this document — the canvas frame taking focus.
 * `mode "empty"` only reacts to presses on empty space, so tools around the surface keep working.
 */
export function useDismiss(open: boolean, onDismiss: () => void, inside: RefObject<HTMLElement | null>[], mode: "outside" | "empty" = "outside") {
  const dismiss = useRef(onDismiss);
  dismiss.current = onDismiss;
  const insideRefs = useRef(inside);
  insideRefs.current = inside;
  useEffect(() => {
    if (!open) return;
    const contains = (node: Node | null) => insideRefs.current.some((ref) => ref.current?.contains(node));
    function pointer(event: PointerEvent) {
      const target = event.target as Element | null;
      if (!target || contains(target)) return;
      if (mode === "empty" && target.closest?.(interactive)) return;
      dismiss.current();
    }
    function key(event: KeyboardEvent) { if (event.key === "Escape" && !event.defaultPrevented) dismiss.current(); }
    function blur() {
      // Focus moving into the canvas iframe is the only trace of a click inside it.
      setTimeout(() => { if (document.activeElement instanceof HTMLIFrameElement) dismiss.current(); }, 0);
    }
    document.addEventListener("pointerdown", pointer, true);
    document.addEventListener("keydown", key);
    window.addEventListener("blur", blur);
    return () => { document.removeEventListener("pointerdown", pointer, true); document.removeEventListener("keydown", key); window.removeEventListener("blur", blur); };
  }, [open, mode]);
}
