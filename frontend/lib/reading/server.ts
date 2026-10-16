"use client";
import type { Input, Schema, Output } from "../api/contract";

import { api } from "../api/http";
import type { ReadingMark, TextAnchor, AudioInput } from "./model";

/**
 * Member reading marks on the server (API contract §5). The page marks the abstract as "excerpt"
 * and paragraphs by their stable block ID; the API calls the abstract "abstract". Older guest notes
 * used "paragraph-N", which is translated with the article's block IDs when they are imported.
 */
export type ServerArticle = { id: string; revisionId: string; blockIds?: { paragraphs: string[] } };
type FragmentDto = Schema<"Fragment">;
type AnnotationDto = Schema<"Annotation">;
type ListDto = Output<"listAnnotations">;

export function toServerAnchor(anchorId: string, article: ServerArticle): string | null {
  if (anchorId === "excerpt") return "abstract";
  const legacy = /^paragraph-(\d+)$/.exec(anchorId);
  if (legacy) return article.blockIds?.paragraphs[Number(legacy[1])] ?? null;
  return anchorId;
}
const fromServerAnchor = (blockId: string) => blockId === "abstract" ? "excerpt" : blockId;

function fragmentsFor(mark: Pick<ReadingMark, "fragments">, article: ServerArticle): FragmentDto[] | null {
  const fragments: FragmentDto[] = [];
  for (const fragment of mark.fragments) {
    const blockId = toServerAnchor(fragment.anchorId, article);
    if (!blockId) return null;
    fragments.push({ blockId, start: fragment.start, end: fragment.end, quote: fragment.quote, before: fragment.before, after: fragment.after });
  }
  return fragments;
}

export async function loadServerMarks(article: ServerArticle, signal?: AbortSignal): Promise<ReadingMark[]> {
  const { data } = await api<ListDto>("GET", `/me/articles/${article.id}/annotations`, { signal });
  return data.items.filter((item): item is AnnotationDto => "kind" in item).map((item) => ({
    id: item.id, kind: item.kind, note: item.note, createdAt: item.createdAt, color: item.color, audio: item.audio, version: item.version, revisionId: item.revisionId,
    fragments: item.fragments.map((f): TextAnchor => ({ anchorId: fromServerAnchor(f.blockId), start: f.start, end: f.end, quote: f.quote, before: f.before ?? "", after: f.after ?? "" })),
  }));
}

/** Creates a mark under its client ID; undoing a removal re-creates the same ID. */
export async function saveServerMark(article: ServerArticle, mark: ReadingMark, creating: boolean, audio?: AudioInput, signal?: AbortSignal): Promise<ReadingMark> {
  const fragments = fragmentsFor(mark, article);
  if (!fragments) throw new Error("anchor");
  const { data } = await api<AnnotationDto>("PUT", `/me/articles/${article.id}/annotations/${mark.id}`, { signal, body: ({ kind: mark.kind, revisionId: mark.revisionId ?? article.revisionId, fragments, note: mark.note, color: mark.color ?? "lavender", ...(audio ? { audio } : {}) } satisfies Input<"putAnnotation">), ...(creating ? { ifNoneMatch: "*" } : { ifMatch: mark.version ?? 0 }) });
  return { ...mark, version: data.version, revisionId: data.revisionId, audio: data.audio, color: data.color };
}
export async function createServerMark(article: ServerArticle, mark: ReadingMark): Promise<void> { await saveServerMark(article, mark, true); }

export async function deleteServerMark(article: ServerArticle, markId: string, signal?: AbortSignal): Promise<void> {
  await api("DELETE", `/me/articles/${article.id}/annotations/${markId}`, { signal });
}

/** Imports browser-only guest marks into the account; returns the IDs of accepted local marks. */
export async function importGuestMarks(article: ServerArticle, marks: ReadingMark[], clientImportId: string, signal?: AbortSignal): Promise<{ accepted: string[]; rejected: number }> {
  const candidates = marks.map((mark) => ({ mark, fragments: fragmentsFor(mark, article) }));
  const items = candidates.filter((c): c is { mark: ReadingMark; fragments: FragmentDto[] } => c.fragments !== null).map(({ mark, fragments }) => ({ articleId: article.id, revisionId: article.revisionId, kind: mark.kind, fragments, note: mark.note, createdAt: mark.createdAt, ...(mark.color ? { color: mark.color } : {}) }));
  const sent = candidates.filter((c) => c.fragments).map((c) => c.mark.id);
  if (!items.length) return { accepted: [], rejected: marks.length };
  const { data } = await api<Output<"importAnnotations">>("POST", "/me/imports/annotations", { signal, body: ({ clientImportId, items } satisfies Input<"importAnnotations">) });
  return { accepted: (data.accepted ?? []).flatMap((a) => a.index === undefined ? [] : [sent[a.index]]), rejected: (data.rejected ?? []).length + (marks.length - items.length) };
}
