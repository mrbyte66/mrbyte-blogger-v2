"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { allPages } from "../../lib/api/http";
import type { Schema } from "../../lib/api/contract";
import { articleCategories, articleDate, formatArticleDate } from "../../lib/articles/metadata";
import type { StudioTarget } from "../../lib/builder/document-protocol";
import type { Article } from "../../lib/content";
import { articleStatus, statusLabels, type ContentStatus } from "../../lib/editorial/store";
import type { BlogSeries } from "../../lib/series/model";
import { EditorIcon } from "./EditorIcon";
import { CrtIcon } from "./StudioIcons";

type Stats = Schema<"OwnerArticleStatsPage">["items"][number];
type Tone = "peach" | "sky" | "mint" | "lilac" | "sand" | "rose";
type Filter = "all" | "published" | "draft" | "scheduled" | "archived" | "trashed";
type Sort = "newest" | "oldest" | "title";
export type LibraryKind = "article" | "series";

const filterLabels: Record<Filter, string> = { all: "Tümü", published: "Yayında", draft: "Taslak", scheduled: "Planlandı", archived: "Arşiv", trashed: "Çöp kutusu" };
const toneOf: Record<ContentStatus, Tone> = { draft: "peach", scheduled: "sky", published: "mint", archived: "sand", trashed: "rose" };
const scheduleFormat = new Intl.DateTimeFormat("tr-TR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
const shortDate = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", timeZone: "UTC" });

function tagOf(article: Article): { label: string; tone: Tone } {
  const status = articleStatus(article);
  if (article.visibility === "private" && status !== "trashed" && status !== "archived") return { label: "Özel", tone: "lilac" };
  if (status === "scheduled" && article.scheduledAt) return { label: `Planlandı · ${scheduleFormat.format(new Date(article.scheduledAt))}`, tone: "sky" };
  return { label: statusLabels[status], tone: toneOf[status] };
}
const dateOf = (article: Article) => Date.parse(`${articleDate(article)}T12:00:00Z`);

/** Pastel stand-in shapes for a series without a cover; stable per series. */
function seriesShapes(slug: string) {
  let hash = 0; for (const character of slug) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return ["mint", "sky", "peach", "lilac"][hash % 4];
}

/** True while the media query matches; the drawer only exists on wide screens. */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => { if (typeof window.matchMedia !== "function") return () => {}; const media = window.matchMedia(query); media.addEventListener("change", notify); return () => media.removeEventListener("change", notify); },
    () => typeof window.matchMedia === "function" && window.matchMedia(query).matches,
    () => false,
  );
}

type Props = {
  articles: readonly Article[]; series: readonly BlogSeries[]; target: StudioTarget; ready: boolean; error: string | null;
  kind: LibraryKind; onKind: (kind: LibraryKind) => void; query: string; onQuery: (query: string) => void;
  onChoose: (target: StudioTarget, options?: { field?: string }) => void;
  onCreateArticle: () => void; onCreateSeries?: () => void; onReload: () => void; onClose: () => void; headingId: string;
};

/**
 * The page library as a gallery of cover cards with a detail drawer (Kontakt). It shows the same
 * pages as the list dialog and opens them through the same navigation.
 */
export function LibraryGallery({ articles, series, target, ready, error, kind, onKind, query, onQuery, onChoose, onCreateArticle, onCreateSeries, onReload, onClose, headingId }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [layout, setLayout] = useState<"gallery" | "list">("gallery");
  const [selected, setSelected] = useState<string | null>(target.kind === kind ? target.slug : null);
  const [stats, setStats] = useState<Map<string, Stats> | null>(null);
  // Without the drawer (phones, tablets) a card opens its page right away.
  const compact = useMediaQuery("(max-width: 1099px)");
  useEffect(() => {
    let current = true;
    allPages<Stats>("/studio/article-stats").then((rows) => { if (current) setStats(new Map(rows.map((row) => [row.articleId, row]))); }).catch(() => { if (current) setStats(null); });
    return () => { current = false; };
  }, []);

  const seriesOf = (slug: string) => series.find((item) => item.status !== "trashed" && item.articleSlugs.includes(slug));
  const matches = (title: string) => title.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr").trim());

  const articleItems = useMemo(() => {
    const pool = articles.filter((article) => matches(article.title));
    return pool;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, query]);
  const counts = useMemo(() => {
    const total: Record<Filter, number> = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0, trashed: 0 };
    for (const article of articleItems) {
      const status = articleStatus(article);
      total[status] += 1;
      if (status !== "trashed") total.all += 1;
    }
    return total;
  }, [articleItems]);

  const visibleArticles = articleItems
    .filter((article) => filter === "all" ? articleStatus(article) !== "trashed" : articleStatus(article) === filter)
    .sort((a, b) => sort === "title" ? a.title.localeCompare(b.title, "tr") : sort === "oldest" ? dateOf(a) - dateOf(b) : dateOf(b) - dateOf(a));
  const visibleSeries = series
    .filter((item) => matches(item.title))
    .filter((item) => filter === "all" ? item.status !== "trashed" : item.status === filter)
    .sort((a, b) => sort === "title" || sort === "newest" || sort === "oldest" ? a.title.localeCompare(b.title, "tr") : 0);
  const items = kind === "article" ? visibleArticles : visibleSeries;
  const current = kind === "article" ? visibleArticles.find((article) => article.slug === selected) ?? visibleArticles[0] : visibleSeries.find((item) => item.slug === selected) ?? visibleSeries[0];
  const open = (slug: string, options?: { field?: string }) => onChoose({ kind, slug }, options);
  const filters = (Object.keys(filterLabels) as Filter[]).filter((key) => key !== "trashed" || counts.trashed > 0);
  const seriesCount = (key: Filter) => series.filter((item) => matches(item.title) && (key === "all" ? item.status !== "trashed" : item.status === key)).length;

  return <div className="library-gallery">
    <header className="library-head">
      <div className="library-title"><h2 id={headingId}>{kind === "article" ? "Yazılar" : "Seriler"}</h2><span className="library-count">{kind === "article" ? counts.all : seriesCount("all")}</span></div>
      <div className="library-kind" role="group" aria-label="Kitaplık türü">
        <button type="button" aria-pressed={kind === "article"} onClick={() => { onKind("article"); setSelected(null); }}>Yazılar</button>
        <button type="button" aria-pressed={kind === "series"} onClick={() => { onKind("series"); setSelected(null); }}>Seriler</button>
      </div>
      <label className="library-search"><span className="sr-only">Başlığa göre ara</span><EditorIcon name="search" size={18} /><input autoFocus value={query} placeholder={kind === "article" ? "Yazılarda ara…" : "Serilerde ara…"} onChange={(event) => onQuery(event.target.value)} /></label>
      <div className="library-create">
        {onCreateSeries && <button type="button" className="studio-secondary" disabled={!ready} onClick={onCreateSeries}>＋ Yeni seri</button>}
        <button type="button" className="studio-primary" disabled={!ready} onClick={onCreateArticle}>＋ Yeni yazı</button>
      </div>
      <button type="button" className="page-menu-close" aria-label="Sayfa yönetimini kapat" onClick={onClose}>×</button>
    </header>
    <div className="library-filters">
      <div className="library-chips" role="group" aria-label="Durum süzgeci">
        {filters.map((key) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>{filterLabels[key]} <span>{kind === "article" ? counts[key] : seriesCount(key)}</span></button>)}
      </div>
      <label className="library-sort"><span className="sr-only">Sıralama</span><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="newest">En yeni önce</option><option value="oldest">En eski önce</option><option value="title">Başlığa göre A–Z</option></select></label>
      <div className="library-layout" role="group" aria-label="Görünüm">
        <button type="button" aria-label="Galeri" aria-pressed={layout === "gallery"} onClick={() => setLayout("gallery")}><EditorIcon name="grid" size={16} /></button>
        <button type="button" aria-label="Liste" aria-pressed={layout === "list"} onClick={() => setLayout("list")}><EditorIcon name="list" size={16} /></button>
      </div>
    </div>
    <div className="library-body">
      <div className="library-main">
        {!ready ? <><p role="status" className="library-status">Kitaplık yükleniyor…</p><ul className="library-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <li key={index} className="library-card library-skeleton"><span className="library-cover" /><span className="library-line" /><span className="library-line short" /></li>)}</ul></>
          : !items.length ? <div className="library-empty"><CrtIcon /><h3>{query ? "Bu aramayla eşleşen bir şey yok." : kind === "article" ? "Henüz bu durumda yazı yok." : "Henüz bu durumda seri yok."}</h3><p>{query ? "Başka bir sözcük dene ya da süzgeci kaldır." : "Yeni bir yazıyla başlayabilirsin; taslak olarak kaydedilir."}</p><button type="button" className="studio-primary" onClick={onCreateArticle}>＋ Yeni yazı</button></div>
          : <ul className="library-grid" data-layout={layout}>{kind === "article" ? visibleArticles.map((article) => {
            const tag = tagOf(article); const within = seriesOf(article.slug); const isSelected = current?.slug === article.slug;
            return <li key={article.slug}><button type="button" className={`library-card${isSelected ? " is-selected" : ""}`} aria-pressed={isSelected} onClick={() => { if (compact) open(article.slug); else setSelected(article.slug); }} onDoubleClick={() => open(article.slug)}>
              <span className="library-cover">{article.coverUrl ? <img src={article.coverUrl} alt="" loading="lazy" /> : <span className="library-nocover"><CrtIcon /><span>Kapak ekle</span></span>}
                <span className={`library-tag tone-${tag.tone}`}>{tag.label}</span>
                {isSelected && <span className="library-check" aria-hidden="true"><EditorIcon name="check" size={14} /></span>}
                {within && <span className="library-series-chip">{within.title} · {within.articleSlugs.length}</span>}
              </span>
              <span className="library-card-title">{article.title}</span>
              <span className="library-card-meta">{articleCategories(article).join(" · ")} · {article.minutes} dk · {shortDate.format(new Date(`${articleDate(article)}T12:00:00Z`))}</span>
            </button></li>;
          }) : visibleSeries.map((item) => {
            const isSelected = current?.slug === item.slug;
            return <li key={item.slug}><button type="button" className={`library-card${isSelected ? " is-selected" : ""}`} aria-pressed={isSelected} onClick={() => { if (compact) open(item.slug); else setSelected(item.slug); }} onDoubleClick={() => open(item.slug)}>
              <span className={`library-cover shapes-${seriesShapes(item.slug)}`}>{item.coverImage ? <img src={item.coverImage} alt="" loading="lazy" /> : <span className="library-shapes" aria-hidden="true"><i /><i /><i /></span>}
                <span className={`library-tag tone-${toneOf[item.status]}`}>{statusLabels[item.status]}</span>
                {isSelected && <span className="library-check" aria-hidden="true"><EditorIcon name="check" size={14} /></span>}
              </span>
              <span className="library-card-title">{item.title}</span>
              <span className="library-card-meta">{item.articleSlugs.length} bölüm · {item.ongoing ? "Süren seri" : "Tamamlandı"}</span>
            </button></li>;
          })}</ul>}
      </div>
      <aside className="library-drawer" aria-label={kind === "article" ? "Seçili yazı" : "Seçili seri"}>
        {!current ? <p className="library-drawer-empty">Ayrıntıları görmek için bir kart seç.</p> : kind === "article" ? <ArticleDrawer article={current as Article} stats={stats} within={seriesOf((current as Article).slug)} onOpen={(options) => open((current as Article).slug, options)} />
          : <SeriesDrawer item={current as BlogSeries} articles={articles} onOpen={() => open((current as BlogSeries).slug)} />}
      </aside>
    </div>
    {error && <div role="alert" className="library-toast"><span aria-hidden="true">!</span><p>{error}</p><button type="button" className="studio-primary" onClick={onReload}>Yeniden dene</button></div>}
  </div>;
}

function ArticleDrawer({ article, stats, within, onOpen }: { article: Article; stats: Map<string, Stats> | null; within?: BlogSeries; onOpen: (options?: { field?: string }) => void }) {
  const tag = tagOf(article);
  const row = article.id ? stats?.get(article.id) : undefined;
  const published = articleStatus(article) === "published" && article.visibility !== "private";
  const number = (value: number | undefined) => value === undefined ? "—" : value.toLocaleString("tr-TR");
  return <div className="library-drawer-body">
    <div className="library-drawer-cover">{article.coverUrl ? <img src={article.coverUrl} alt="" /> : <span className="library-nocover"><CrtIcon /><span>Henüz kapak yok</span></span>}
      <button type="button" className="library-glass-button" onClick={() => onOpen({ field: "cover" })}>{article.coverUrl ? "Kapağı değiştir" : "Kapak ekle"}</button></div>
    <div className="library-drawer-head">
      <div><span className={`library-tag tone-${tag.tone}`}>{tag.label}</span><span className="library-drawer-meta">{articleCategories(article).join(" · ")} · {formatArticleDate(article)}</span></div>
      <h3>{article.title}</h3>
    </div>
    <dl className="library-stats">
      <div><dt>okuma</dt><dd>{article.minutes} dk</dd></div>
      <div><dt>görüntülenme</dt><dd>{number(row?.views)}</dd></div>
      <div><dt>alkış</dt><dd>{number(row?.claps)}</dd></div>
    </dl>
    <dl className="library-facts">
      <div><dt>Seri</dt><dd>{within?.title ?? "Bağımsız yazı"}</dd></div>
      <div><dt>Adres</dt><dd>/yazilar/{article.slug}</dd></div>
    </dl>
    <div className="library-drawer-actions">
      <button type="button" className="studio-primary" onClick={() => onOpen()}>Düzenle</button>
      <div>
        {published ? <a className="studio-secondary" href={`/yazilar/${article.slug}`} target="_blank" rel="noopener noreferrer">Önizle ↗</a> : <button type="button" className="studio-secondary" onClick={() => onOpen()}>Önizle</button>}
        <button type="button" className="studio-secondary" onClick={() => onOpen({ field: "publication" })}>Planla</button>
      </div>
    </div>
  </div>;
}

function SeriesDrawer({ item, articles, onOpen }: { item: BlogSeries; articles: readonly Article[]; onOpen: () => void }) {
  const chapters = item.articleSlugs.map((slug) => articles.find((article) => article.slug === slug)).filter((article): article is Article => !!article);
  return <div className="library-drawer-body">
    <div className={`library-drawer-cover shapes-${seriesShapes(item.slug)}`}>{item.coverImage ? <img src={item.coverImage} alt="" /> : <span className="library-shapes" aria-hidden="true"><i /><i /><i /></span>}</div>
    <div className="library-drawer-head">
      <div><span className={`library-tag tone-${toneOf[item.status]}`}>{statusLabels[item.status]}</span><span className="library-drawer-meta">{item.ongoing ? "Süren seri" : "Tamamlandı"}</span></div>
      <h3>{item.title}</h3>
      {item.summary && <p className="library-drawer-summary">{item.summary}</p>}
    </div>
    <dl className="library-stats"><div><dt>bölüm</dt><dd>{item.articleSlugs.length}</dd></div></dl>
    {chapters.length > 0 && <ol className="library-chapters">{chapters.slice(0, 6).map((article, index) => <li key={article.slug}><span>{String(index + 1).padStart(2, "0")}</span>{article.title}</li>)}</ol>}
    <div className="library-drawer-actions"><button type="button" className="studio-primary" onClick={onOpen}>Düzenle</button></div>
  </div>;
}
