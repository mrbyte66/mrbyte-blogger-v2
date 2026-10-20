"use client";
import { PublicFrame } from "../PublicFrame";
import { useEffect, useRef } from "react";
import type { Theme } from "../../lib/builder/model";
import { previewEvents, rectOf, type CanvasRect, type CanvasSelection } from "../../lib/builder/preview-protocol";
import { navigateEvent, targetFromLink, type DocumentDraft } from "../../lib/builder/document-protocol";
import { documentOutline } from "../../lib/builder/document-outline";
import { scrollBehavior } from "../../lib/motion";
import { ArticlePageView } from "./ArticlePage";
import { SeriesPageView } from "../series/SeriesPage";
/** Settings of the whole page that have no block of their own on the canvas. */
const pageChips = [["cover", "Kapak ekle"]] as const;

export function DocumentPreview({ showNotes = false, draft, theme, selection, onSelect }: { showNotes?: boolean; draft: DocumentDraft; theme: Theme; selection: CanvasSelection; onSelect: (field: string, rect?: CanvasRect) => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelectorAll("[data-edit-field]").forEach((node) => node.classList.toggle("document-selected", node.getAttribute("data-edit-field") === selection.id));
    root.current?.classList.toggle("document-focus", selection.editing && selection.id !== "body" && !!root.current?.querySelector(".document-selected"));
  }, [selection.id, selection.editing, draft]);
  const outlineKey = documentOutline(draft).map(item => item.field).join(",");
  useEffect(() => {
    const fields = outlineKey.split(",");
    let frame = 0, last = "";
    const nodes = () => fields.map(field => root.current?.querySelector<HTMLElement>(`[data-edit-field="${field}"]`)).filter((node): node is HTMLElement => !!node);
    const report = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
      const headings = nodes();
      const scroll = document.scrollingElement;
      const atEnd = scroll && scroll.scrollTop > 0 && scroll.scrollHeight - scroll.clientHeight - scroll.scrollTop < 3;
      const current = atEnd ? headings.at(-1) : headings.filter(node => node.getBoundingClientRect().top <= 130).at(-1) ?? headings[0];
      const field = current?.dataset.editField;
      if (field && field !== last) { last = field; window.parent.postMessage({type:previewEvents.outline, field}, window.location.origin); }
    }); };
    function jump(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== previewEvents.outlineJump || !fields.includes(event.data.field)) return;
      const node = nodes().find(node => node.dataset.editField === event.data.field);
      if (node) { node.scrollIntoView({block:"start", behavior:scrollBehavior()}); node.focus({preventScroll:true}); report(); }
    }
    window.addEventListener("message", jump); window.addEventListener("scroll", report, true); window.addEventListener("resize", report); report();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("message", jump); window.removeEventListener("scroll", report, true); window.removeEventListener("resize", report); };
  }, [outlineKey]);
  return <div ref={root} className={selection.editing ? "document-editing" : ""} onClickCapture={(event) => {
    const node = event.target as HTMLElement;
    if (node.closest(".rn-ui")) return;
    if (!selection.editing) {
      const link = node.closest("a");
      const destination = link && targetFromLink(link.getAttribute("href") ?? "");
      if (destination) { event.preventDefault(); event.stopPropagation(); window.parent.postMessage({ type: navigateEvent, target: destination }, window.location.origin); }
      return;
    }
    event.preventDefault(); event.stopPropagation();
    const chip = node.closest<HTMLElement>("[data-chip]");
    if (chip) { onSelect(chip.dataset.chip!, rectOf(chip)); return; }
    const target = node.closest("[data-edit-field]");
    const field = target?.getAttribute("data-edit-field");
    if (target && field) { event.preventDefault(); event.stopPropagation(); onSelect(field, rectOf(target)); }
  }}>
    {selection.editing && draft.kind === "article" && <nav className="canvas-page-chips" aria-label="Sayfa ayarları">
      {pageChips.map(([id, label]) => <button key={id} type="button" data-chip={id} aria-pressed={selection.id === id}>{id === "cover" && draft.article.coverUrl ? <img src={draft.article.coverUrl} alt="" /> : null}{label}</button>)}
    </nav>}
    <PublicFrame theme={theme} includeStudioFooter preview>{draft.kind === "article" ? <ArticlePageView article={draft.article} theme={theme} preview showNotes={showNotes} /> : <SeriesPageView slug={draft.series.slug} theme={theme} series={[draft.series]} preview />}</PublicFrame>
  </div>;
}
