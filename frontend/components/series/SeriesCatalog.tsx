"use client";

import { SlideLink as Link } from "../SlideLink";
import PlainLink from "next/link";
import { articleBodyPreview } from "../../lib/content";
import { type BlogSeries } from "../../lib/series/model";
import { publicArticles, publicSeries } from "../../lib/editorial/store";
import { useArticles } from "../../lib/articles/use-articles";
import { useProgressiveItems } from "../../lib/use-progressive-items";
import { hasAllTags, seriesTags } from "../../lib/series/tags";
import { useState } from "react";
import { ArticleCard } from "../ArticleCard";
import { ClapCount } from "../ClapCount";
import { ViewCount } from "../ViewCount";
import { CatalogCover } from "../CatalogCover";
import { seriesDraftCover } from "../../lib/catalog-covers";
import { useSeriesHistory } from "../../lib/reading/history";
import "../../app/series.css";

type Props = {
  series: readonly BlogSeries[];
  selectedSeriesSlug?: string | null;
  onOpenSeries?: (slug: string) => void;
  onOpenArticle?: (slug: string) => void;
  chapterLimit?: number;
  preview?: boolean;
  onChapterLimitChange?: (value: number) => void;
};
export function SeriesCatalog({ series, selectedSeriesSlug, onOpenSeries, onOpenArticle, chapterLimit, onChapterLimitChange, preview = false }: Props) {
  const { articles: storedArticles } = useArticles();
  const articles = preview ? storedArticles : publicArticles(storedArticles);
  const visible = preview ? series : publicSeries(series, storedArticles);
  const selected = visible.find((s) => s.slug === selectedSeriesSlug);
  // Chapter numbers stay the series order; tag filters only hide chapters (every selected tag must match).
  const [tagFilter, setTagFilter] = useState<{ series: string; tags: readonly string[] }>({ series: "", tags: [] });
  const activeTags = tagFilter.series === selectedSeriesSlug ? tagFilter.tags : [];
  const ordered = (selected?.articleSlugs ?? []).map((slug, index) => ({ slug, number: index + 1, article: articles.find((item) => item.slug === slug) }));
  const availableTags = seriesTags(ordered.flatMap((chapter) => chapter.article ? [chapter.article] : []));
  const shown = ordered.filter((chapter) => chapter.article && hasAllTags(chapter.article, activeTags));
  const toggleTag = (tag: string) => setTagFilter({ series: selectedSeriesSlug ?? "", tags: activeTags.includes(tag) ? activeTags.filter((t) => t !== tag) : [...activeTags, tag] });
  const chapters = useProgressiveItems({ total: shown.length, listKey: `${selectedSeriesSlug ?? ""}|${activeTags.join("|")}`, limit: chapterLimit, onLimitChange: onChapterLimitChange });
  // A member's own visit history: "where you left off" means last opened, not finished.
  const visits = useSeriesHistory(preview ? undefined : selected?.id);
  const lastVisit = visits.reduce<(typeof visits)[number] | undefined>((latest, visit) => !latest || (visit.lastVisitedAt ?? "") > (latest.lastVisitedAt ?? "") ? visit : latest, undefined);
  const lastArticle = lastVisit && articles.find((article) => article.id === lastVisit.articleId);
  function articleAction(slug: string, label: React.ReactNode, className?: string) {
    const open = () => onOpenArticle?.(slug);
    return onOpenArticle ? <button type="button" className={className} data-article={slug} onClick={open}>{label}</button> : <Link className={className} href={`/yazilar/${slug}`} onClick={open}>{label}</Link>;
  }
  if (selectedSeriesSlug && !selected) return <div className="series-empty"><h2 id={onOpenSeries ? "panel-title" : undefined} tabIndex={-1}>Seri henüz yayında değil</h2><p>Bu bağlantının serisi kaldırılmış veya taslak olabilir.</p></div>;
  if (selected) {
    return <section className="series-detail" aria-label={selected.title}>
      <div data-edit-field="meta" className="series-meta"><span>{selected.articleSlugs.length} bölüm</span><span>{selected.ongoing ? "Yeni bölümler gelecek" : "Tamamlanmış seri"}</span></div>
      {onOpenSeries ? <h2 id="panel-title" tabIndex={-1}>{selected.title}</h2> : <h1 data-edit-field="title">{selected.title}</h1>}<p data-edit-field="summary" className="series-summary">{selected.summary}</p>
      <div data-edit-field="cover" className="series-detail-cover"><CatalogCover src={selected.coverImage} fallback={seriesDraftCover(selected)} /></div>
      <div className="series-start-actions">{selected.articleSlugs.length > 0 && articleAction(selected.articleSlugs[0], "İlk bölümden başla", "series-primary")}{lastArticle && articleAction(lastArticle.slug, <>Son açtığın bölüm: {lastArticle.title} ↗</>, "series-continue")}</div>
      {availableTags.length > 0 && <div className="topic-filter series-tag-filter" role="group" aria-label="Bölümleri etikete göre süz"><button type="button" aria-pressed={!activeTags.length} onClick={() => setTagFilter({ series: selectedSeriesSlug ?? "", tags: [] })}>Tümü</button>{availableTags.map((tag) => <button type="button" key={tag} aria-pressed={activeTags.includes(tag)} onClick={() => toggleTag(tag)}>#{tag}</button>)}</div>}
      <ol data-edit-field="chapters" className="series-chapters article-list">{shown.slice(0, chapters.visible).map(({ slug, number, article }) => <li key={slug}><ArticleCard article={article!} chapter={number} excerpt={articleBodyPreview(article!)} onOpen={onOpenArticle} preview={preview} /></li>)}</ol>
      {activeTags.length > 0 && !shown.length && <p className="series-empty">Seçtiğin etiketlerin hepsini taşıyan bölüm yok. Bir etiketi kaldırmayı dene.</p>}
      <div className="progressive-footer" ref={chapters.sentinel}><span role="status">{activeTags.length ? `${Math.min(chapters.visible, shown.length)} / ${shown.length} bölüm (${selected.articleSlugs.length} bölümden süzüldü)` : `${chapters.visible} / ${selected.articleSlugs.length} bölüm`}</span>{chapters.hasMore && <button onClick={chapters.loadMore}>Sonraki 5 bölümü göster ↓</button>}</div>
      {onOpenSeries && <Link className="reading-permalink" href={`/seriler/${selected.slug}`}>Serinin kalıcı bağlantısını aç ↗</Link>}
    </section>;
  }
  return <div className="series-catalog">{!visible.length ? <p className="series-empty">Henüz yayınlanmış seri yok. Yeni okuma yolları burada yer alacak.</p> : visible.map((s) => {
    const artwork = <CatalogCover src={s.coverImage} fallback={seriesDraftCover(s)} />;
    const content = <><span className="series-card-visual">{artwork}</span><span className="series-card-content"><span className="series-meta"><span>{s.articleSlugs.length} bölüm</span><ViewCount slugs={s.articleSlugs} series /><ClapCount slugs={s.articleSlugs} series /></span><strong>{s.title}</strong><span className="series-summary">{s.summary}</span><span className="series-card-footer"><span>{s.ongoing ? "Devam eden seri" : "Tamamlanmış seri"}</span><span>Seriyi keşfet ↗</span></span></span></>;
    return onOpenSeries ? <button type="button" key={s.id} className="series-card" data-series={s.slug} onClick={() => onOpenSeries(s.slug)}>{content}</button> : <PlainLink key={s.id} className="series-card" href={`/seriler/${s.slug}`}>{content}</PlainLink>;
  })}</div>;
}
