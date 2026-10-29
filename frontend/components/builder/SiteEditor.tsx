"use client";
import { useEffect, useState } from "react";
import type { Article } from "../../lib/content";
import { createArticle } from "../../lib/articles/model";
import { describe } from "../../lib/api/http";
import { useContentWorkspace } from "../../lib/editorial/use-content-workspace";
import { createSeries, type BlogSeries } from "../../lib/series/model";
import { parseStudioTarget, type DocumentDraft, type StudioTarget } from "../../lib/builder/document-protocol";
import { PageNavigator } from "./PageNavigator";
import { ThemeEditor } from "./ThemeEditor";
import { DocumentEditor } from "./DocumentEditor";
import { announceContentChange } from "../data/PublicContentRefresh";
import { StudioShellProvider } from "../../lib/studio/shell";

const recentKey = "satir:studio-recent";
const leaveMessage = "Kaydedilmemiş değişiklikler var. Kaydetmeden bu sayfadan çıkmak istiyor musun?";
/** Asks before discarding unsaved edits; environments without dialogs keep the edits. */
function confirmLeave(): boolean { try { return window.confirm(leaveMessage) === true; } catch { return false; } }

const savedNotices = new Set(["Kaydedildi ve yayında.", "Yayın planı kaydedildi.", "Arşivlendi; ziyaretçilerden gizlendi.", "Çöp kutusuna taşındı.", "Taslak kaydedildi; ziyaretçilerden gizli."]);
function savedNotice(status: string) {
  return status === "published" ? "Kaydedildi ve yayında." : status === "scheduled" ? "Yayın planı kaydedildi." : status === "archived" ? "Arşivlendi; ziyaretçilerden gizlendi." : status === "trashed" ? "Çöp kutusuna taşındı." : "Taslak kaydedildi; ziyaretçilerden gizli.";
}

export function SiteEditor() {
  const content = useContentWorkspace();
  const [editorEpoch,setEditorEpoch]=useState(0);
  const [target, setTarget] = useState<StudioTarget>({ kind: "home" });
  // Pages opened lately (this browser), so switching back from the site design is one press.
  const [recent, setRecent] = useState<StudioTarget[]>([]);
  useEffect(() => {
    try { const stored: unknown = JSON.parse(sessionStorage.getItem(recentKey) ?? "[]"); if (Array.isArray(stored)) setRecent(stored.map(parseStudioTarget).filter((item): item is StudioTarget => !!item).slice(0, 6)); } catch { /* starts empty */ }
  }, []);
  useEffect(() => {
    if (target.kind === "home") return;
    setRecent((list) => {
      const next = [target, ...list.filter((item) => JSON.stringify(item) !== JSON.stringify(target))].slice(0, 6);
      try { sessionStorage.setItem(recentKey, JSON.stringify(next)); } catch { /* still works for this page */ }
      return next;
    });
  }, [target]);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newArticle, setNewArticle] = useState<Article | null>(null);
  // A new series is an unsaved draft on the live canvas, like a new article; it is created on its first Save.
  const [newSeries, setNewSeries] = useState<BlogSeries | null>(null);
  // A library action can ask the page it opens to show a settings panel (cover, publication plan).
  const [fieldRequest, setFieldRequest] = useState<{ field: string; n: number } | null>(null);
  const availableArticles = newArticle ? [...content.articles, newArticle] : content.articles;
  const availableSeries = newSeries ? [...content.series, newSeries] : content.series;
  function navigate(next: StudioTarget, options?: { field?: string }) {
    const same = JSON.stringify(next) === JSON.stringify(target);
    if (same) { if (options?.field) setFieldRequest((previous) => ({ field: options.field!, n: (previous?.n ?? 0) + 1 })); return; }
    if (dirty && !confirmLeave()) { setNotice("Sayfa değiştirmeden önce düzenlemelerini kaydet veya geri al."); return; }
    if (next.kind === "article" && !availableArticles.some((a) => a.slug === next.slug)) return;
    if (next.kind === "series" && !availableSeries.some((s) => s.slug === next.slug)) return;
    // Leaving an unsaved new article or series discards it (it was never stored).
    if (newArticle && !(next.kind === "article" && next.slug === newArticle.slug)) setNewArticle(null);
    if (newSeries && !(next.kind === "series" && next.slug === newSeries.slug)) setNewSeries(null);
    setFieldRequest(options?.field ? { field: options.field, n: 1 } : null);
    setEditorEpoch(n=>n+1); setTarget(next); setNotice(""); setSaveError(null); setDirty(false);
  }
  const article = target.kind === "article" ? availableArticles.find((a) => a.slug === target.slug) : undefined;
  const series = target.kind === "series" ? availableSeries.find((s) => s.slug === target.slug) : undefined;
  const initial: DocumentDraft | null = article ? { kind: "article", article } : series ? { kind: "series", series } : null;
  async function save(draft: DocumentDraft, seriesId?: string | null): Promise<boolean> {
    if (!content.studio) return false;
    // When the saved slug differs (first save of a new page, renamed slug) the editor reopens and loses its
    // own status line, so the confirmation is shown as a page notice instead.
    let landed: { slug: string; status: string } | null = null;
    try {
      if (draft.kind === "article") {
        const status = draft.article.status ?? "draft";
        const saved = await content.studio.saveArticle(draft.article, { isNew: !!newArticle, seriesId: seriesId ?? null, status, visibility: draft.article.visibility ?? "public" });
        setNewArticle(null); setTarget({ kind: "article", slug: saved.slug }); landed = { slug: saved.slug, status: saved.status ?? "draft" };
      } else if (newSeries) {
        // Create the draft first; chapters and a non-draft state then go through the normal series save.
        const created = await content.studio.createSeries({ ...draft.series, status: "draft", articleSlugs: [] });
        // From here on the series exists: never create it twice, even if the chapter step fails.
        setNewSeries(null);
        let saved = created;
        if (draft.series.articleSlugs.length || draft.series.status !== "draft") {
          try { saved = await content.studio.saveSeries({ ...draft.series, id: created.id, version: created.version }, draft.series.status); }
          catch (cause) {
            setTarget({ kind: "series", slug: created.slug });
            setSaveError(`Seri taslak olarak oluşturuldu ama bölümleri kaydedilemedi; bölümleri yeniden ekleyip kaydet. ${describe(cause)}`);
            return false;
          }
        }
        setTarget({ kind: "series", slug: saved.slug }); landed = { slug: saved.slug, status: saved.status };
      } else {
        const saved = await content.studio.saveSeries(draft.series, draft.series.status);
        setTarget({ kind: "series", slug: saved.slug }); landed = { slug: saved.slug, status: saved.status };
      }
      setNotice(""); setSaveError(null);
      announceContentChange();
      return true;
    } catch (cause) {
      setSaveError(`Kaydedilemedi. ${describe(cause)}`);
      return false;
    }
  }
  async function createInlineSeries(record: BlogSeries): Promise<BlogSeries | null> {
    if (!content.studio) return null;
    try { const created = await content.studio.createSeries(record); setSaveError(null); return created; }
    catch (cause) { setSaveError(`Seri oluşturulamadı. ${describe(cause)}`); return null; }
  }
  function addSeries() {
    if (dirty && !confirmLeave()) { setNotice("Yeni bir seri açmadan önce düzenlemelerini kaydet veya geri al."); return; }
    // Same starting point as a new article: a valid template the canvas can render at once.
    const record: BlogSeries = { ...createSeries(), title: "Yeni seri", slug: `yeni-seri-${crypto.randomUUID().slice(0, 8)}` };
    setEditorEpoch(n=>n+1); setNewArticle(null); setNewSeries(record); setDirty(false); setTarget({ kind: "series", slug: record.slug }); setNotice(""); setSaveError(null);
  }
  function addArticle() {
    if (dirty && !confirmLeave()) { setNotice("Yeni bir yazı açmadan önce düzenlemelerini kaydet veya geri al."); return; }
    // Writing started from a saved series becomes its next chapter (membership is stored on the article's Save).
    // Tags are optional and chosen by the writer, so a new article starts untagged.
    const record = { ...createArticle(), seriesId: target.kind === "series" && !newSeries ? series?.id : undefined, categoryIds: [] as string[] };
    setEditorEpoch(n=>n+1); setNewSeries(null); setDirty(false); setNewArticle(record); setTarget({ kind: "article", slug: record.slug }); setNotice(""); setSaveError(null);
  }
  const navigation = <PageNavigator target={target} articles={availableArticles} series={availableSeries} ready={content.ready} onNavigate={navigate} onCreateArticle={addArticle} onCreateSeries={addSeries} />;
  const error = saveError ?? content.error;
  const known = recent.filter((item) => item.kind === "article" ? availableArticles.some((a) => a.slug === item.slug) : item.kind === "series" ? availableSeries.some((s) => s.slug === item.slug) : false);
  const shell = { active: true, target, recent: known, articles: availableArticles, series: availableSeries, ready: content.ready, error, onNavigate: navigate, onCreateArticle: addArticle, onCreateSeries: addSeries, onReload: () => { void content.studio?.reload(); } };
  return <StudioShellProvider value={shell}><div className="studio-site-editor">
    {target.kind === "home" && error && <p role="alert" className="studio-navigation-notice">{error}</p>}
    {notice && <p className="studio-navigation-notice" role="status">{notice}</p>}
    {!content.ready ? <p role="status" className="studio-navigation-notice">Studio içerikleri yükleniyor…</p>
      : target.kind === "home" ? <ThemeEditor navigation={navigation} onNavigate={navigate} /> : initial ? <DocumentEditor
      navigation={navigation} key={`${target.kind}-${editorEpoch}`} initial={initial} fieldRequest={fieldRequest} isNew={target.kind === "article" ? !!newArticle : !!newSeries}
      articles={content.articles} series={content.series} onCreateSeries={createInlineSeries}
      onDirty={(next) => { setDirty(next); if (next) setNotice((current) => savedNotices.has(current) ? "" : current); }} onNavigate={navigate} onSave={save}
      onDiscard={() => { setNewArticle(null); setNewSeries(null); setDirty(false); setTarget({ kind: "home" }); setNotice(""); setSaveError(null); }} error={error}
    /> : <p role="status">Sayfa yükleniyor…</p>}
  </div></StudioShellProvider>;
}
