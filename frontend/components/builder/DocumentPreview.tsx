"use client";
import { useEffect, useRef } from "react";
import type { Theme } from "../../lib/builder/model";
import { previewEvents, rectOf, type CanvasRect, type CanvasSelection } from "../../lib/builder/preview-protocol";
import { navigateEvent, targetFromLink, type DocumentDraft } from "../../lib/builder/document-protocol";
import { scrollBehavior } from "../../lib/motion";
import { ArticlePageView } from "./ArticlePage";
import { SeriesPageView } from "../series/SeriesPage";
export function DocumentPreview({ draft, theme, selection, onSelect }: { draft: DocumentDraft; theme: Theme; selection: CanvasSelection; onSelect: (field: string, rect?: CanvasRect) => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelectorAll("[data-edit-field]").forEach((node) => node.classList.toggle("document-selected", node.getAttribute("data-edit-field") === selection.id));
    root.current?.classList.toggle("document-focus", selection.editing && selection.id !== "body" && !!root.current?.querySelector(".document-selected"));
  }, [selection.id, selection.editing, draft]);
  useEffect(() => {
    if (selection.editing && selection.id) root.current?.querySelector(`[data-edit-field="${CSS.escape(selection.id)}"]`)?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, [selection.id, selection.request, selection.editing]);
  // The settings card beside the selected block follows it while the page scrolls or reflows.
  useEffect(() => {
    if (!selection.editing || !selection.id) return;
    let frame = 0;
    const report = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const node = root.current?.querySelector(`[data-edit-field="${CSS.escape(selection.id!)}"]`);
      if (node) window.parent.postMessage({ type: previewEvents.anchor, rect: rectOf(node) }, window.location.origin);
    }); };
    window.addEventListener("scroll", report, true); window.addEventListener("resize", report);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", report, true); window.removeEventListener("resize", report); };
  }, [selection.id, selection.editing]);
  return <div ref={root} className={selection.editing ? "document-editing" : ""} onClickCapture={(event) => {
    const node = event.target as HTMLElement;
    if (!selection.editing) {
      const link = node.closest("a");
      const destination = link && targetFromLink(link.getAttribute("href") ?? "");
      if (destination) { event.preventDefault(); event.stopPropagation(); window.parent.postMessage({ type: navigateEvent, target: destination }, window.location.origin); }
      return;
    }
    event.preventDefault(); event.stopPropagation();
    const target = node.closest("[data-edit-field]");
    const field = target?.getAttribute("data-edit-field");
    if (target && field) { event.preventDefault(); event.stopPropagation(); onSelect(field, rectOf(target)); }
  }}>
    {draft.kind === "article" ? <ArticlePageView article={draft.article} theme={theme} preview /> : <SeriesPageView slug={draft.series.slug} theme={theme} series={[draft.series]} preview />}
  </div>;
}
