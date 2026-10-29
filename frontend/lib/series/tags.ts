import type { Article } from "../content";

/** Same limits and normalisation as the API (EditorialValues.tags): tags filter chapters inside one series. */
export const MAX_SERIES_TAGS = 10;
export const MAX_SERIES_TAG_LENGTH = 40;

const key = (tag: string) => tag.toLocaleLowerCase("tr-TR");

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").replace(/\s+/g, " ").trim();
}

/** Adds one typed tag; returns the list unchanged when it is empty, too long, a duplicate or over the limit. */
export function addTag(tags: readonly string[], raw: string): readonly string[] {
  const tag = normalizeTag(raw);
  if (!tag || [...tag].length > MAX_SERIES_TAG_LENGTH || tags.length >= MAX_SERIES_TAGS || tags.some((t) => key(t) === key(tag))) return tags;
  return [...tags, tag];
}

export function removeTag(tags: readonly string[], tag: string): readonly string[] {
  return tags.filter((t) => key(t) !== key(tag));
}

/** Tags used by the given chapters, first spelling wins, in order of first use. */
export function seriesTags(chapters: readonly Pick<Article, "tags">[]): string[] {
  const unique = new Map<string, string>();
  for (const chapter of chapters) for (const tag of chapter.tags ?? []) if (!unique.has(key(tag))) unique.set(key(tag), tag);
  return [...unique.values()];
}

/** A chapter matches when it carries every selected tag (selecting more tags narrows the list). */
export function hasAllTags(chapter: Pick<Article, "tags">, selected: readonly string[]): boolean {
  const own = new Set((chapter.tags ?? []).map(key));
  return selected.every((tag) => own.has(key(tag)));
}
