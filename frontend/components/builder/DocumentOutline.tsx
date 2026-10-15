"use client";
import type { DocumentDraft } from "../../lib/builder/document-protocol";
import { documentOutline } from "../../lib/builder/document-outline";
import { EditorIcon } from "./EditorIcon";

export function DocumentOutline({ draft, current, onNavigate, onAddHeading, canAddHeading = true }: { draft: DocumentDraft; current: string; onNavigate: (field: string) => void; onAddHeading: () => void; canAddHeading?: boolean }) {
  const headings = documentOutline(draft);
  const active = headings.find(heading => heading.field === current) ?? headings[0];
  return <nav className="document-outline" aria-label="Yazının içindekileri">
    <span className="studio-eyebrow">YAZININ HARİTASI</span>
    <ol>{headings.map((heading, index) => <li key={heading.key} data-level={heading.level}>
      <button aria-current={heading.field === active.field ? "location" : undefined} onClick={() => onNavigate(heading.field)}>
        <i aria-hidden="true"/><span className="outline-number" aria-hidden="true">{heading.level < 3 ? String(index + 1).padStart(2, "0") : ""}</span><span>{heading.title}</span>
      </button>
    </li>)}</ol>
    {draft.kind === "article" && headings.length === 1 && <div className="outline-empty"><EditorIcon name="heading" size={24}/><p>Başlık ekledikçe yazının haritası burada oluşur.</p><button disabled={!canAddHeading} onClick={onAddHeading}>Ara başlık ekle <EditorIcon name="plus" size={15}/></button></div>}
    <footer><span>Bulunduğun bölüm</span><strong>{active.title}</strong></footer>
  </nav>;
}
