"use client";
import type { DocumentDraft } from "../../lib/builder/document-protocol";
import type { CaretPosition } from "../../lib/builder/preview-protocol";
import { useFocusDimming } from "../../lib/studio/view";
import { WordGoal } from "./WordGoal";

/**
 * Odak's quiet furniture: the word-goal ring and progress line, a map of the paragraphs on the
 * right edge, the caret position and the switch that dims everything except the block being written.
 */
export function FocusExtras({ draft, saved, field, caret, onSelect }: { draft: DocumentDraft; saved: DocumentDraft | null; field: string; caret: CaretPosition; onSelect: (id: string) => void }) {
  const [dim, setDim] = useFocusDimming();
  const article = draft.kind === "article" ? draft.article : null;
  const savedArticle = saved?.kind === "article" ? saved.article : null;
  const paragraphs = article?.paragraphs ?? [];
  const active = field.startsWith("paragraph-") ? Number(field.slice(10)) : -1;
  return <>
    <div className="focus-goal"><WordGoal current={article} saved={savedArticle ?? article} line /></div>
    {paragraphs.length > 1 && <nav className="focus-minimap" aria-label="Paragraf haritası">
      {paragraphs.map((text, index) => <button key={index} type="button" className={index === active ? "is-active" : undefined} aria-label={`Paragraf ${index + 1}`} aria-current={index === active ? "true" : undefined} style={{ width: Math.min(30, Math.max(14, 12 + Math.round(text.length / 40))) }} onClick={() => onSelect(`paragraph-${index}`)} />)}
    </nav>}
    <div className="focus-readout">
      {caret && <span className="focus-position">Satır {caret.row} · Sütun {caret.column}</span>}
      <button type="button" role="switch" aria-checked={dim} aria-label="Odak modu" onClick={() => setDim(!dim)}><span /></button>
      <span className="focus-switch-label" aria-hidden="true">Odak</span>
    </div>
  </>;
}
