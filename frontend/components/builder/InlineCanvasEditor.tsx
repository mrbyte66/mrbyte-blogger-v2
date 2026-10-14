"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Theme } from "../../lib/builder/model";
import type { DocumentDraft } from "../../lib/builder/document-protocol";
import { documentText, inlineEditEvent, themeText, type InlineEdit } from "../../lib/builder/inline-edit";

type Active = { edit: InlineEdit; max: number; style: CSSProperties; label: string; node: HTMLElement };
export function InlineCanvasEditor({ theme, draft, enabled, children }: { theme: Theme; draft: DocumentDraft | null; enabled: boolean; children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const [value, setValue] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const editor = useRef<HTMLTextAreaElement>(null);
  const identity = draft ? `${draft.kind}:${draft.kind === "article" ? draft.article.slug : draft.series.slug}` : "home";
  useEffect(() => { setActive(null); }, [identity, enabled]);
  useEffect(() => {
    if (!active) return;
    editor.current?.focus();
    // Only select on opening; typing never resets the caret.
    editor.current?.setSelectionRange(0, editor.current.value.length);
  }, [active]);
  useEffect(() => {
    if (editor.current) { editor.current.style.height = "auto"; editor.current.style.height = `${Math.min(window.innerHeight - 140, Math.max(54, editor.current.scrollHeight))}px`; }
  }, [active, value]);
  useEffect(() => {
    if (!enabled) return;
    const nodes = root.current?.querySelectorAll<HTMLElement>("[data-edit-field], [data-inline-field]");
    const previous = Array.from(nodes ?? []).map(node => ({ node, tabindex: node.getAttribute("tabindex") }));
    previous.forEach(({ node }) => node.setAttribute("tabindex", "0"));
    return () => previous.forEach(({ node, tabindex }) => tabindex === null ? node.removeAttribute("tabindex") : node.setAttribute("tabindex", tabindex));
  }, [enabled, identity, theme, draft]);
  function finish(apply: boolean) {
    if (!active) return;
    if (apply && value.trim() && value !== active.edit.previous) window.parent.postMessage({ type: inlineEditEvent, edit: { ...active.edit, value } }, window.location.origin);
    active.node.focus({ preventScroll: true }); setActive(null);
  }
  return <div ref={root} className="inline-canvas-root" onKeyDownCapture={(event) => {
    if (enabled && event.key === "Enter" && !(event.target as HTMLElement).closest(".canvas-inline-editor") && (event.target as HTMLElement).matches("[data-edit-field], [data-inline-field]")) {
      event.preventDefault(); (event.target as HTMLElement).click();
    }
  }} onClickCapture={(event) => {
    if (!enabled || (event.target as HTMLElement).closest(".canvas-inline-editor")) return;
    const node = (event.target as HTMLElement).closest<HTMLElement>(draft ? "[data-edit-field]" : "[data-inline-field]");
    if (!node) return;
    const field = node.getAttribute(draft ? "data-edit-field" : "data-inline-field")!;
    const block = theme.blocks.find((b) => b.id === node.closest("[data-block-id]")?.getAttribute("data-block-id"));
    const text = draft ? documentText(draft, field) : block ? themeText(block, field) : null;
    if (!text) return;
    event.preventDefault(); event.stopPropagation();
    const bounds = node.getBoundingClientRect(); const css = getComputedStyle(node);
    const width = Math.min(Math.max(bounds.width + 24, 240), window.innerWidth - 32);
    const edit: InlineEdit = { scope: draft ? "document" : "theme", id: draft ? (draft.kind === "article" ? draft.article.slug : draft.series.slug) : block!.id, field, value: text.value, previous: text.value };
    setValue(text.value);
    setActive({ edit, max: text.max, node, label: field === "title" ? "Başlık" : field === "emphasis" ? "Vurgulu satır" : "Metin", style: { left: Math.max(16, Math.min(bounds.left - 12, window.innerWidth - width - 16)), top: Math.max(58, Math.min(bounds.top - 12, window.innerHeight - 210)), width, fontFamily: css.fontFamily, fontSize: css.fontSize, fontWeight: css.fontWeight, fontStyle: css.fontStyle, lineHeight: css.lineHeight, letterSpacing: css.letterSpacing, color: css.color, "--panel": css.getPropertyValue("--panel") || "#fff", "--ink": css.color } as CSSProperties });
  }}>{children}{active && <section className="canvas-inline-editor" style={active.style} aria-label="Tuvalde metin düzenleme" onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); finish(false); }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) { event.preventDefault(); finish(true); }
  }}><div className="inline-edit-toolbar"><span>{active.label}</span><button onClick={() => finish(false)} title="Vazgeç · Esc">Vazgeç</button><button disabled={!value.trim()} onClick={() => finish(true)} title="Tamam · ⌘/Ctrl + Enter">Tamam <span aria-hidden="true">✓</span></button></div><textarea ref={editor} aria-label={`${active.label} · tuval`} maxLength={active.max} value={value} onChange={(event) => setValue(event.target.value)} /><small>{value.length}/{active.max} · Tamam ile taslağa aktar</small></section>}</div>;
}
