import type { Article } from "../content";
import { articleCategories } from "../articles/metadata";

/** Tags (stored as categories) used by the given chapters, in order of first use. */
export function seriesTags(chapters: readonly Article[]): string[] {
  return [...new Set(chapters.flatMap(articleCategories))];
}

/** A chapter matches when it carries every selected tag (selecting more tags narrows the list). */
export function hasAllTags(chapter: Article, selected: readonly string[]): boolean {
  const own = new Set(articleCategories(chapter));
  return selected.every((tag) => own.has(tag));
}
