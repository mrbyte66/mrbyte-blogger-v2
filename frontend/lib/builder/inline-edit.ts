import type { PageBlock } from "./model";
import type { DocumentDraft } from "./document-protocol";
import { adjustMarks, safeMarks, splitMarks, validMarks, type TextMark } from "../articles/marks";
export const inlineEditEvent = "mrbyte:inline-edit";
export type InlineEdit = { scope: "theme" | "document"; id: string; field: string; value: string; previous: string; offset?: number; marks?: TextMark[]; action?: "split" | "move-up" | "move-down" | "insert-after" | "remove" | "paragraph" | "heading2" | "heading3" | "quote" };
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
export function documentText(draft: DocumentDraft, field: string): { value: string; max: number; marks?: readonly TextMark[] } | null {
  if (draft.kind === "article") {
    if (field === "title") return { value: draft.article.title, max: 160 };
    if (field === "excerpt") return { value: draft.article.excerpt, max: 4000 };
    if (/^paragraph-\d{1,3}$/.test(field)) {
      const value = draft.article.paragraphs[Number(field.slice(10))];
      if (typeof value === "string") { const format=draft.article.paragraphFormats?.[Number(field.slice(10))]; return {value,max:format?.kind === "heading" ? 300 : format?.kind === "quote" ? 4000 : 20000,...(format?.kind !== "heading" ? {marks:draft.article.paragraphMarks?.[Number(field.slice(10))] ?? []} : {})}; }
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
  return (e.marks === undefined || (typeof e.value === "string" && /^paragraph-\d{1,3}$/.test(String(e.field)) && validMarks(e.value, e.marks))) && (e.offset === undefined || (Number.isInteger(e.offset) && e.offset>=0 && e.offset<=20000)) && (e.action === undefined || ["split", "move-up", "move-down", "insert-after", "remove", "paragraph", "heading2", "heading3", "quote"].includes(e.action)) && (e.scope === "theme" || e.scope === "document") && typeof e.id === "string" && /^[a-zA-Z0-9-]{1,100}$/.test(e.id) && typeof e.field === "string" && /^[a-z-]+(?:\d{1,3})?$/.test(e.field) && typeof e.value === "string" && typeof e.previous === "string" && e.value.length <= 20000 && e.previous.length <= 20000 ? e : null;
}
export function editThemeText(block: PageBlock, edit: InlineEdit): PageBlock | null {
  const text = themeText(block, edit.field);
  if (edit.action || edit.scope !== "theme" || edit.id !== block.id || !text || text.value !== edit.previous || edit.value.length > text.max || !edit.value.trim()) return null;
  return { ...block, [edit.field]: edit.value } as PageBlock;
}
export function editDocumentText(draft: DocumentDraft, edit: InlineEdit): DocumentDraft | null {
  const record = draft.kind === "article" ? draft.article : draft.series;
  const text = documentText(draft, edit.field);
  const allowEmpty=draft.kind==="article" && (edit.field==="excerpt" || (edit.field.startsWith("paragraph-") && (!draft.article.paragraphFormats?.[Number(edit.field.slice(10))] || draft.article.paragraphFormats[Number(edit.field.slice(10))].kind==="paragraph")));
  if (edit.scope !== "document" || edit.id !== record.slug || !text || text.value !== edit.previous || edit.value.length > text.max || (!allowEmpty && !edit.value.trim())) return null;
  if (edit.action && !edit.field.startsWith("paragraph-")) return null;
  if (draft.kind === "series") return { ...draft, series: { ...draft.series, [edit.field]: edit.value } };
  if (edit.field.startsWith("paragraph-")) {
    if ((edit.action==="insert-after" || edit.action==="split") && draft.article.paragraphs.length>=200) return null;
    const paragraphs = [...draft.article.paragraphs]; const index=Number(edit.field.slice(10)); paragraphs[index] = edit.value;
    const paragraphFormats = draft.article.paragraphs.map((_,i)=>({...draft.article.paragraphFormats?.[i] ?? {kind:"paragraph" as const}}));
    const blockIds = draft.article.blockIds ? { ...draft.article.blockIds, paragraphs:[...draft.article.blockIds.paragraphs] } : undefined;
    // Marks follow the text: the editor sends the full list, otherwise they are carried through the edit.
    const paragraphMarks: TextMark[][] = draft.article.paragraphs.map((_,i)=>[...(draft.article.paragraphMarks?.[i] ?? [])]);
    const carried = paragraphFormats[index].kind === "heading" ? [] : safeMarks(edit.value, edit.marks ?? adjustMarks(edit.previous, edit.value, paragraphMarks[index]));
    paragraphMarks[index] = carried;
    if (edit.action === "insert-after") { paragraphs.splice(index+1,0,""); paragraphFormats.splice(index+1,0,{kind:"paragraph"}); paragraphMarks.splice(index+1,0,[]); blockIds?.paragraphs.splice(index+1,0,crypto.randomUUID()); }
    if(edit.action === "split") {
      if(edit.offset === undefined || edit.offset>edit.value.length) return null;
      paragraphs[index]=edit.value.slice(0,edit.offset); paragraphs.splice(index+1,0,edit.value.slice(edit.offset));
      const [left,right]=splitMarks(carried,edit.offset,edit.value.length);
      paragraphMarks[index]=safeMarks(paragraphs[index],left); paragraphMarks.splice(index+1,0,safeMarks(paragraphs[index+1],right));
      paragraphFormats.splice(index+1,0,{kind:"paragraph"}); blockIds?.paragraphs.splice(index+1,0,crypto.randomUUID());
      if(!paragraphs[index].trim()) paragraphFormats[index]={kind:"paragraph"};
    }
    if (edit.action === "remove") {
      // The last block stays as an empty paragraph, so the article always has somewhere to write.
      if (paragraphs.length === 1) { paragraphs[0] = ""; paragraphFormats[0] = { kind: "paragraph" }; paragraphMarks[0] = []; }
      else { paragraphs.splice(index, 1); paragraphFormats.splice(index, 1); paragraphMarks.splice(index, 1); blockIds?.paragraphs.splice(index, 1); }
    }
    if (edit.action === "move-up" || edit.action === "move-down") {
      const target=index+(edit.action === "move-up" ? -1 : 1);
      if(target<0 || target>=paragraphs.length) return null;
      [paragraphs[index],paragraphs[target]]=[paragraphs[target],paragraphs[index]];
      [paragraphFormats[index],paragraphFormats[target]]=[paragraphFormats[target],paragraphFormats[index]];
      [paragraphMarks[index],paragraphMarks[target]]=[paragraphMarks[target],paragraphMarks[index]];
      if(blockIds) [blockIds.paragraphs[index],blockIds.paragraphs[target]]=[blockIds.paragraphs[target],blockIds.paragraphs[index]];
    }
    if(edit.action === "heading2" || edit.action === "heading3") { if(!edit.value.trim() || edit.value.length>300) return null; paragraphFormats[index]={kind:"heading",level:edit.action==="heading2" ? 2 : 3}; paragraphMarks[index]=[]; }
    if(edit.action === "quote") { if(!edit.value.trim() || edit.value.length>4000) return null; paragraphFormats[index]={kind:"quote"}; }
    if(edit.action === "paragraph") paragraphFormats[index]={kind:"paragraph"};
    const hasMarks = paragraphMarks.some((marks) => marks.length);
    const { paragraphMarks: _dropped, ...rest } = draft.article;
    return { ...draft, article: { ...rest, paragraphs, paragraphFormats, ...(hasMarks ? { paragraphMarks } : {}), ...(blockIds ? {blockIds} : {}) } };
  }
  return { ...draft, article: { ...draft.article, [edit.field]: edit.value } };
}
