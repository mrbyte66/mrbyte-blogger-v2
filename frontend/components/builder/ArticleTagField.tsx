"use client";
import { useId, useState } from "react";
import type { Article } from "../../lib/content";
import { addTag, MAX_SERIES_TAG_LENGTH, MAX_SERIES_TAGS, removeTag, seriesTags } from "../../lib/series/tags";
import { useContent } from "../data/SiteData";

/** Free tags of a chapter. They only filter chapters on the article's own series page, never the global catalog. */
export function ArticleTagField({ article, onChange }: { article: Article; onChange: (next: Partial<Article>) => void }) {
  const { articles } = useContent();
  const [draft, setDraft] = useState("");
  const listId = useId();
  const tags = article.tags ?? [];
  const suggestions = article.seriesId ? seriesTags(articles.filter((a) => a.seriesId === article.seriesId && a.slug !== article.slug)).filter((tag) => !tags.some((t) => t.toLocaleLowerCase("tr-TR") === tag.toLocaleLowerCase("tr-TR"))) : [];
  function commit(value = draft) {
    const next = addTag(tags, value);
    if (next !== tags) onChange({ tags: next });
    setDraft("");
  }
  return <section className="category-field tag-field" aria-label="Seri etiketleri">
    <div className="category-field-heading"><span>Seri etiketleri</span></div>
    {tags.length > 0 && <ul className="tag-chips">{tags.map((tag) => <li key={tag}><span>#{tag}</span><button type="button" aria-label={`Etiketi kaldır: ${tag}`} onClick={() => onChange({ tags: removeTag(tags, tag) })}>×</button></li>)}</ul>}
    <label className="studio-field"><span className="sr-only">Yeni etiket</span><input list={listId} value={draft} maxLength={MAX_SERIES_TAG_LENGTH + 1} disabled={tags.length >= MAX_SERIES_TAGS} placeholder={tags.length >= MAX_SERIES_TAGS ? "En fazla 10 etiket" : "Etiket yaz, Enter'a bas"} onChange={(e) => setDraft(e.target.value)} onBlur={() => draft.trim() && commit()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }} /></label>
    <datalist id={listId}>{suggestions.map((tag) => <option key={tag} value={tag} />)}</datalist>
    {suggestions.length > 0 && <div className="tag-suggestions" aria-label="Serideki diğer etiketler">{suggestions.slice(0, 12).map((tag) => <button type="button" key={tag} disabled={tags.length >= MAX_SERIES_TAGS} onClick={() => commit(tag)}>+ {tag}</button>)}</div>}
    <p className="category-hint">Yazı bir serideyse okurlar bu etiketlerle o serinin bölümlerini süzer. Genel kategorileri etkilemez.</p>
  </section>;
}
