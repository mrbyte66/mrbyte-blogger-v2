import type { PageBlock } from "./model";
import type { DocumentDraft } from "./document-protocol";
export const inlineEditEvent = "mrbyte:inline-edit";
export type InlineEdit = { scope: "theme" | "document"; id: string; field: string; value: string; previous: string };
const themeFields: Partial<Record<PageBlock["kind"], Record<string, number>>> = {
  scene: { title: 160, emphasis: 160, description: 2000 }, intro: { title: 160, eyebrow: 120, description: 2000 },
  articles: { title: 160 }, series: { title: 160 }, projects: { title: 160 },
  quote: { text: 2000, attribution: 120 }, about: { title: 160, text: 2000 }, footer: { text: 160 },
};
export function themeText(block: PageBlock, field: string): { value: string; max: number } | null {
  const max = themeFields[block.kind]?.[field];
  const value = (block as unknown as Record<string, unknown>)[field];
  return max && typeof value === "string" ? { value, max } : null;
}
export function documentText(draft: DocumentDraft, field: string): { value: string; max: number } | null {
  if (draft.kind === "article") {
    if (field === "title") return { value: draft.article.title, max: 160 };
    if (field === "excerpt") return { value: draft.article.excerpt, max: 4000 };
    if (/^paragraph-\d{1,3}$/.test(field)) {
      const value = draft.article.paragraphs[Number(field.slice(10))];
      if (typeof value === "string") return { value, max: 20000 };
    }
  } else {
    if (field === "title") return { value: draft.series.title, max: 160 };
    if (field === "summary") return { value: draft.series.summary, max: 2000 };
  }
  return null;
}
export function parseInlineEdit(value: unknown): InlineEdit | null {
  if (!value || typeof value !== "object") return null;
  const e = value as InlineEdit;
  return (e.scope === "theme" || e.scope === "document") && typeof e.id === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(e.id) && typeof e.field === "string" && /^[a-z-]+(?:\d{1,3})?$/.test(e.field) && typeof e.value === "string" && typeof e.previous === "string" && e.value.length <= 20000 && e.previous.length <= 20000 ? e : null;
}
export function editThemeText(block: PageBlock, edit: InlineEdit): PageBlock | null {
  const text = themeText(block, edit.field);
  if (edit.scope !== "theme" || edit.id !== block.id || !text || text.value !== edit.previous || edit.value.length > text.max || !edit.value.trim()) return null;
  return { ...block, [edit.field]: edit.value } as PageBlock;
}
export function editDocumentText(draft: DocumentDraft, edit: InlineEdit): DocumentDraft | null {
  const record = draft.kind === "article" ? draft.article : draft.series;
  const text = documentText(draft, edit.field);
  if (edit.scope !== "document" || edit.id !== record.slug || !text || text.value !== edit.previous || edit.value.length > text.max || !edit.value.trim()) return null;
  if (draft.kind === "series") return { ...draft, series: { ...draft.series, [edit.field]: edit.value } };
  if (edit.field.startsWith("paragraph-")) {
    const paragraphs = [...draft.article.paragraphs]; paragraphs[Number(edit.field.slice(10))] = edit.value;
    return { ...draft, article: { ...draft.article, paragraphs } };
  }
  return { ...draft, article: { ...draft.article, [edit.field]: edit.value } };
}
