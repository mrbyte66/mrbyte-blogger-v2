"use client";
import { useEffect, useId, useRef, useState } from "react";
import { articleStatus, statusLabels, type ContentStatus } from "../../lib/editorial/store";
import type { Article } from "../../lib/content";
import type { BlogSeries } from "../../lib/series/model";
import type { StudioTarget } from "../../lib/builder/document-protocol";
import { openLibraryEvent, useStudioShell } from "../../lib/studio/shell";
import { useStudioView } from "../../lib/studio/view";
import { LibraryGallery, type LibraryKind } from "./LibraryGallery";

type Props = {
  target: StudioTarget; articles: readonly Article[]; series: readonly BlogSeries[];
  ready: boolean; onNavigate: (target: StudioTarget) => void;
  onCreateArticle: () => void; onCreateSeries?: () => void;
};
export function PageNavigator({ target, articles, series, ready, onNavigate, onCreateArticle, onCreateSeries }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"active" | "draft" | "scheduled" | "archived" | "trashed">("active");
  const [scheduleSort, setScheduleSort] = useState<"nearest" | "farthest" | "title">("nearest");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const [studioView] = useStudioView();
  const shell = useStudioShell();
  const [libraryKind, setLibraryKind] = useState<LibraryKind>("article");
  // Rail and pill buttons elsewhere in the chrome ask the library to open.
  useEffect(() => {
    function request(event: Event) {
      const kind = (event as CustomEvent<{ kind?: LibraryKind }>).detail?.kind;
      if (kind === "article" || kind === "series") setLibraryKind(kind);
      setOpen(true);
    }
    window.addEventListener(openLibraryEvent, request);
    return () => window.removeEventListener(openLibraryEvent, request);
  }, []);
  const title = target.kind === "home" ? "Ana sayfa" : target.kind === "article" ? articles.find((a) => a.slug === target.slug)?.title : series.find((s) => s.slug === target.slug)?.title;
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  function close() { dialog.current?.close(); setOpen(false); trigger.current?.focus(); }
  function choose(next: StudioTarget, options?: { field?: string }) { close(); setQuery(""); if (options?.field) shell.onNavigate(next, options); else onNavigate(next); }
  function create(action: () => void) { close(); setQuery(""); action(); }
  const matches = (text: string) => text.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr").trim());
  const inView = (status: ContentStatus) => view === "active" ? !["archived", "trashed"].includes(status) : status === view;
  const filteredArticles = articles.filter((a) => matches(a.title) && inView(articleStatus(a)));
  if (view === "scheduled") filteredArticles.sort((a, b) => {
    if (scheduleSort === "title") return a.title.localeCompare(b.title, "tr");
    const order = Date.parse(a.scheduledAt!) - Date.parse(b.scheduledAt!);
    return (scheduleSort === "farthest" ? -order : order) || a.title.localeCompare(b.title, "tr");
  });
  const filteredSeries = series.filter((s) => matches(s.title) && inView(s.status));
  return <div className="studio-page-picker">
    <button className="studio-page-trigger" ref={trigger} aria-label={`Sayfalar: ${title ?? "Sayfa"}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><span><small>{target.kind === "home" ? "Site tasarımı" : target.kind === "article" ? "Yazı" : "Seri"}</small><strong>{title ?? "Sayfa"}</strong></span><span aria-hidden="true">⌄</span></button>
    <dialog ref={dialog} className="studio-page-dialog" aria-labelledby={`${id}-heading`} onCancel={(event) => { event.preventDefault(); close(); }} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>{studioView === "kontakt" ? <nav id={id} className="studio-page-menu library-menu" aria-label="Sayfalar"><LibraryGallery headingId={`${id}-heading`} articles={articles} series={series} target={target} ready={ready} error={shell.error} kind={libraryKind} onKind={setLibraryKind} query={query} onQuery={setQuery} onChoose={choose} onCreateArticle={() => create(onCreateArticle)} onCreateSeries={onCreateSeries ? () => create(onCreateSeries) : undefined} onReload={shell.onReload} onClose={close} /></nav> : <nav id={id} className="studio-page-menu" aria-label="Sayfalar">
      <div className="page-menu-heading"><div><span className="studio-eyebrow">ÇALIŞMA ALANIN</span><h2 id={`${id}-heading`}>Sayfalar</h2></div><button className="page-menu-close" aria-label="Sayfa yönetimini kapat" onClick={close}>×</button></div>
      <label className="page-search"><span className="sr-only">Sayfa ara</span><input autoFocus value={query} placeholder="Başlığa göre ara…" onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="page-menu-create"><button disabled={!ready} onClick={() => create(onCreateArticle)}>＋ Yeni yazı</button>{onCreateSeries && <button disabled={!ready} onClick={() => create(onCreateSeries)}>＋ Yeni seri</button>}</div>
      <label className="page-menu-filter"><span>Göster</span><select aria-label="İçerik görünümü" value={view} onChange={(e) => setView(e.target.value as typeof view)}><option value="active">Aktif içerikler</option><option value="draft">Taslaklar</option><option value="scheduled">Planlanan yazılar</option><option value="archived">Arşiv</option><option value="trashed">Çöp kutusu</option></select></label>
      {view === "scheduled" && <label className="page-menu-filter"><span>Sırala</span><select aria-label="Yayın planı sıralaması" value={scheduleSort} onChange={e => setScheduleSort(e.target.value as typeof scheduleSort)}><option value="nearest">En yakın yayın önce</option><option value="farthest">En uzak yayın önce</option><option value="title">Başlık · A–Z</option></select></label>}
      
      <div className="page-menu-list">
        {view === "active" && matches("Ana sayfa") && <button className="page-menu-home" aria-current={target.kind === "home" ? "page" : undefined} onClick={() => choose({ kind: "home" })}><span>Ana sayfa<small>Site tasarımı ve genel tema</small></span><span aria-hidden="true">↗</span></button>}
        {filteredSeries.length > 0 && <section aria-label="Seriler"><h2>Seriler <span>{filteredSeries.length}</span></h2>{filteredSeries.map((item) => <button key={item.id} aria-current={target.kind === "series" && target.slug === item.slug ? "page" : undefined} onClick={() => choose({ kind: "series", slug: item.slug })}><span>{item.title}</span>{item.status !== "published" && <small>{statusLabels[item.status]}</small>}</button>)}</section>}
        {filteredArticles.length > 0 && <section aria-label="Yazılar"><h2>Yazılar <span>{filteredArticles.length}</span></h2>{filteredArticles.map((article) => <button key={article.slug} aria-current={target.kind === "article" && target.slug === article.slug ? "page" : undefined} onClick={() => choose({ kind: "article", slug: article.slug })}><span>{article.title}{view === "scheduled" && article.scheduledAt && <time dateTime={article.scheduledAt}>{new Date(article.scheduledAt).toLocaleString("tr-TR", { day:"numeric", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}</time>}</span>{articleStatus(article) !== "published" && <small>{statusLabels[articleStatus(article)]}</small>}</button>)}</section>}
        {!filteredArticles.length && !filteredSeries.length && (view !== "active" || !matches("Ana sayfa")) && <p>{view === "scheduled" ? query ? "Aramana uyan planlanmış yazı yok." : "Henüz planlanmış bir yazı yok." : view === "draft" && !query ? "Taslakta bekleyen yazı veya seri yok." : "Bu başlıkta bir sayfa bulunamadı."}</p>}
      </div>
    </nav>}</dialog>
  </div>;
}
