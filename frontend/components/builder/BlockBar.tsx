"use client";
import { useEffect, useRef, useState } from "react";
import { editDocumentText, type InlineEdit } from "../../lib/builder/inline-edit";
import type { DocumentDraft } from "../../lib/builder/document-protocol";

export type BlockKind = "paragraph" | "heading" | "quote";
export const blockKinds: { kind: BlockKind; label: string; hint: string; key: string }[] = [
  { kind: "paragraph", label: "Paragraf", hint: "¶", key: "↵" },
  { kind: "heading", label: "Başlık", hint: "H2", key: "#" },
  { kind: "quote", label: "Alıntı", hint: "“ ”", key: ">" },
];
const starter: Record<BlockKind, string> = { paragraph: "", heading: "Yeni başlık", quote: "Alıntı metni" };

/**
 * Inserts a text block after the selected paragraph (or at the end) through the same pure edit the
 * canvas uses, so ordering, block IDs and marks stay consistent. Returns the draft and the new field.
 */
export function insertBlock(draft: DocumentDraft, field: string, kind: BlockKind): { draft: DocumentDraft; field: string } | null {
  if (draft.kind !== "article") return null;
  const { article } = draft;
  const index = /^paragraph-\d+$/.test(field) ? Math.min(Number(field.slice(10)), article.paragraphs.length - 1) : article.paragraphs.length - 1;
  if (index < 0) return null;
  const edit = (target: number, value: string, previous: string, action: InlineEdit["action"]): InlineEdit => ({ scope: "document", id: article.slug, field: `paragraph-${target}`, value, previous, action });
  const current = article.paragraphs[index];
  const inserted = editDocumentText(draft, edit(index, current, current, "insert-after"));
  if (!inserted) return null;
  const at = index + 1;
  if (kind === "paragraph") return { draft: inserted, field: `paragraph-${at}` };
  const converted = editDocumentText(inserted, edit(at, starter[kind], "", kind === "heading" ? "heading2" : "quote"));
  return converted ? { draft: converted, field: `paragraph-${at}` } : null;
}

/**
 * Marjinalya's bar under the sheet: blocks are added on the canvas itself (＋ beside an empty line or "/"),
 * so the bar only says how and where the caret is.
 */
export function BlockBar({ draft, caret }: { draft: DocumentDraft; caret?: { row: number; column: number } | null }) {
  if (draft.kind !== "article") return null;
  return <div className="block-bar">
    <span className="block-bar-hint">Boş satırda <kbd>＋</kbd> ya da <kbd>/</kbd> ile blok ekle · <kbd>##</kbd> başlık · <kbd>&gt;</kbd> alıntı</span>
    {caret && <span className="block-bar-position" aria-live="off">SATIR {caret.row} · SÜTUN {caret.column}</span>}
  </div>;
}

const fieldBlocks: { id: string; label: string; hint: string }[] = [
  { id: "figure", label: "Görsel", hint: "▣" },
  { id: "code", label: "Kod bloğu", hint: "{ }" },
  { id: "table", label: "Tablo", hint: "▦" },
];

/** Odak's block menu: opens above the dock; text blocks are inserted, figure/code/table open their panels. */
export function DockBlockMenu({ draft, field, disabled, onInsert, onOpenField }: { draft: DocumentDraft; field: string; disabled: boolean; onInsert: (kind: BlockKind) => void; onOpenField: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setOpen(false); root.current?.querySelector("button")?.focus(); } }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  if (draft.kind !== "article") return null;
  const full = draft.article.paragraphs.length >= 200;
  return <div className="dock-block" ref={root}>
    <button type="button" aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={() => setOpen(!open)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>Blok</span></button>
    {open && <div role="menu" className="dock-block-menu" aria-label="Blok ekle">
      <span className="dock-block-title">BLOK EKLE</span>
      {blockKinds.map((item) => <button key={item.kind} role="menuitem" type="button" disabled={full} onClick={() => { setOpen(false); onInsert(item.kind); }}><span className="dock-block-hint" aria-hidden="true">{item.hint}</span><span>{item.label}</span></button>)}
      {fieldBlocks.map((item) => <button key={item.id} role="menuitem" type="button" onClick={() => { setOpen(false); onOpenField(item.id); }}><span className="dock-block-hint" aria-hidden="true">{item.hint}</span><span>{item.label}</span></button>)}
      <span className="dock-block-note">{field.startsWith("paragraph-") ? `Paragraf ${Number(field.slice(10)) + 1} sonrasına eklenir.` : "Yazının sonuna eklenir."}</span>
    </div>}
  </div>;
}
