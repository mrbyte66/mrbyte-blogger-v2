import type { DocumentDraft } from "./document-protocol";

export type OutlineHeading = { key: string; field: string; title: string; level: number };
/** Only actual headings, never every paragraph or the private writing notes. */
export function documentOutline(draft: DocumentDraft): OutlineHeading[] {
  const record = draft.kind === "article" ? draft.article : draft.series;
  const headings: OutlineHeading[] = [{ key: "title", field: "title", title: record.title, level: 1 }];
  if (draft.kind === "series") return headings;
  draft.article.paragraphs.forEach((text, index) => {
    const format = draft.article.paragraphFormats?.[index];
    if (format?.kind === "heading" && text.trim()) headings.push({ key: draft.article.blockIds?.paragraphs[index] ?? `paragraph-${index}`, field: `paragraph-${index}`, title: text, level: format.level ?? 2 });
  });
  return headings;
}
