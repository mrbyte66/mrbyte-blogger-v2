"use client";
import { EditorIcon } from "./EditorIcon";
import { documentText, editDocumentText, type InlineEdit } from "../../lib/builder/inline-edit";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArticleSeriesContext } from "./ArticleSeriesContext";
import { InlineSeriesForm } from "./InlineSeriesForm";
import { DocumentActions } from "./DocumentActions";
import { articleStatus, statusLabels, type ContentStatus } from "../../lib/editorial/store";
import { StudioHeader } from "./StudioHeader";
import type { CSSProperties, ReactNode } from "react";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { parseDocumentDraft, type DocumentDraft, type StudioTarget } from "../../lib/builder/document-protocol";
import type { Article } from "../../lib/content";
import { slugifySeriesTitle, type BlogSeries } from "../../lib/series/model";
import { scrollBehavior } from "../../lib/motion";
import { CanvasToolbar } from "./CanvasToolbar";
import { insertBlock, type BlockKind } from "./BlockBar";
import { FocusExtras } from "./FocusExtras";

import { WordGoal } from "./WordGoal";
import { NotesPanel } from "./NotesPanel";

import { useDismiss } from "../../lib/studio/dismiss";
import { useLayer } from "../../lib/studio/layers";
import type { CaretPosition } from "../../lib/builder/preview-protocol";
import { useStudioView } from "../../lib/studio/view";
import { PreviewCanvas } from "./PreviewCanvas";
import { ArticleProperties, articleFields } from "./ArticleProperties";
import { SeriesProperties, hasPublicChapter, seriesFields } from "./SeriesProperties";
/** Beside the block when there is room (right, then left), otherwise just under it; always inside the window. */
function cardPlacement(rect: DOMRect): CSSProperties {
  const width = Math.min(360, window.innerWidth - 24), gap = 14, edge = 12;
  let left: number, top: number;
  if (rect.right + gap + width <= window.innerWidth - edge) { left = rect.right + gap; top = rect.top; }
  else if (rect.left - gap - width >= edge) { left = rect.left - gap - width; top = rect.top; }
  else { left = Math.min(Math.max(rect.left, edge), window.innerWidth - width - edge); top = rect.bottom + gap; }
  top = Math.min(Math.max(top, 76), window.innerHeight - 220);
  return { position: "fixed", left, top, right: "auto", bottom: "auto", width, height: "auto", maxHeight: window.innerHeight - top - edge, gridArea: "auto" };
}

function documentFingerprint(draft:DocumentDraft) {
  const record=draft.kind==="article" ? draft.article : draft.series;
  const {id,version,...content}=record;
  return JSON.stringify(content);
}
export function DocumentEditor({ navigation, initial, fieldRequest = null, articles, series, isNew = false, onDirty, onNavigate, onSave, onDiscard, onCreateSeries, error }: { navigation?: ReactNode; initial: DocumentDraft; fieldRequest?: { field: string; n: number } | null; articles: readonly Article[]; series: readonly BlogSeries[]; isNew?: boolean; onDirty: (dirty: boolean) => void; onNavigate: (target: StudioTarget) => void; onSave: (draft: DocumentDraft, seriesId?: string | null) => Promise<boolean>; onCreateSeries: (series: BlogSeries) => Promise<BlogSeries | null>; onDiscard: () => void; error: string | null }) {
  const { workspace, ready } = useWorkspace();
  const inspectorRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<DocumentDraft>(() => structuredClone(initial));
  // Canvas edits can arrive faster than React renders: each one is applied to the newest draft, never to a render's copy.
  const latest = useRef(draft);
  latest.current = draft;
  function commit(next: DocumentDraft) { latest.current = next; setDraft(next); }
  // Bumped when the draft is replaced from outside the canvas, so writing there ends and shows the new text.
  const [resetKey, setResetKey] = useState(0);
  const [baseline, setBaseline] = useState<DocumentDraft | null>(isNew ? null : initial);
  const [slugEdited, setSlugEdited] = useState(false);
  const [field, setField] = useState("title");
  const [request, setRequest] = useState(isNew ? 1 : 0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState(true);
  const [message, setMessage] = useState("");
  const [view] = useStudioView();
  const [caret, setCaret] = useState<CaretPosition>(null);
  // Notes hang on the paragraph being written; opening the notes panel must not lose it.
  const [anchorField, setAnchorField] = useState("title");
  const dockRef = useRef<HTMLElement>(null);
  const changes=useRef<DocumentDraft[]>([initial]);
  const changeIndex=useRef(0);
  const lastEditAt=useRef(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const handledRequest = useRef(0);
  const initialSeriesId = initial.kind === "article" ? initial.article.seriesId ?? series.find((s) => s.status !== "trashed" && s.articleSlugs.includes(initial.article.slug))?.id ?? null : null;
  const [seriesId, setSeriesId] = useState(initialSeriesId);
  const [savedSeriesId, setSavedSeriesId] = useState(initialSeriesId);
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seriesFormDirty, setSeriesFormDirty] = useState(false);
  const seriesFormRef = useRef<HTMLDivElement>(null);
  // A brand-new article counts as changed only after the author edits its template.
  const dirty = documentFingerprint(draft) !== documentFingerprint(baseline ?? initial) || seriesId !== savedSeriesId || seriesFormDirty;
  const status = draft.kind === "article" ? articleStatus(draft.article) : draft.series.status;
  const canPublish = draft.kind === "article" ? draft.article.paragraphs.some((p) => p.trim()) : hasPublicChapter(draft.series, articles);
  useEffect(() => { if (creatingSeries) seriesFormRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() }); }, [creatingSeries]);
  const valid = parseDocumentDraft(draft);
  const missingBody = (status === "published" || status === "scheduled") && !canPublish;
  const selectedSeries = series.find((item) => item.id === seriesId);
  const seriesPublishNote = draft.kind === "article" && draft.article.visibility !== "private" && selectedSeries?.status === "draft"
    ? `Seri de yayınlanacak: ${selectedSeries.title}.` : "";
  const publishHint = canPublish ? seriesPublishNote : draft.kind === "article"
    ? "Yayına almak için «Metin» aracından en az bir paragraf ekle. Başlık ve özet tek başına yetmez."
    : "Seriyi yayına almak için yayında ve herkese açık en az bir bölüm ekle.";
  const [preview, setPreview] = useState(initial);
  // After a save the server returns a new version; adopt it in place (keeping the selected field).
  const serverVersion = initial.kind === "article" ? `${initial.article.id}:${initial.article.version}` : `${initial.series.id}:${initial.series.version}`;
  useEffect(() => {
    if(isNew) return;
    if(dirty) {
      const local=latest.current;
      if(local.kind==="article" && initial.kind==="article") commit({...local,article:{...local.article,id:initial.article.id,version:initial.article.version}});
      if(local.kind==="series" && initial.kind==="series") commit({...local,series:{...local.series,id:initial.series.id,version:initial.series.version}});
      setBaseline(initial); return;
    }
    commit(structuredClone(initial)); setBaseline(initial); setSeriesId(initialSeriesId); setSavedSeriesId(initialSeriesId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverVersion]);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => { const next = parseDocumentDraft(draft); if (next) setPreview(next); }, [draft]);
  const fields: ReadonlyArray<readonly [string, string]> = draft.kind === "article" ? [...articleFields, ["notes", "Özel notlar"] as const] : seriesFields;
  const title = draft.kind === "article" ? draft.article.title : draft.series.title;
  const label = fields.find(([id]) => id === field)?.[1] ?? "Seçili paragraf";
  // Settings panels close on Escape or a press on empty space (the canvas reports its own presses).
  useDismiss(panelOpen && !creatingSeries, () => setPanelOpen(false), [inspectorRef, dockRef], "empty");
  // A settings panel opened from the canvas or the dock comes in front of every other panel.
  useLayer(panelOpen, inspectorRef);
  // A press on the canvas opens the settings as a card beside the pressed block (not in the side column);
  // the card follows the block while the page scrolls. Phones keep the bottom sheet.
  const lastAnchor = useRef<{ rect: DOMRect; at: number } | null>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const anchored = panelOpen && !!anchor;
  function placeAnchor(rect: DOMRect) {
    lastAnchor.current = { rect, at: performance.now() };
    setAnchor((current) => current ? rect : current);
  }
  function select(id: string, fromCanvas = false) {
    // A canvas press on something this page has no settings for (a series page's header) changes nothing.
    if (!id.startsWith("paragraph-") && !fields.some(([known]) => known === id)) return;
    const fresh = fromCanvas && lastAnchor.current && performance.now() - lastAnchor.current.at < 300 && window.innerWidth >= 700;
    setAnchor(fresh ? lastAnchor.current!.rect : null);
    if (id === "title" || id === "excerpt" || id === "body" || id.startsWith("paragraph-")) setAnchorField(id);
    setField(id); setEditing(true); setRequest((n) => n + 1);
    setPanelOpen(!["title","excerpt","summary","body"].includes(id) && !id.startsWith("paragraph-"));
  }
  // Library actions (cover, publication plan) open the page with that settings panel already showing.
  useEffect(() => {
    if (!fieldRequest || fieldRequest.n === handledRequest.current) return;
    handledRequest.current = fieldRequest.n;
    select(fieldRequest.field);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldRequest]);
  function insert(kind: BlockKind) {
    if (!ready || saving) return;
    const result = insertBlock(latest.current, field, kind);
    if (!result) return;
    change(result.draft);
    select(result.field);
  }
  function change(next: DocumentDraft, structural = false) {
    const draft = latest.current;
    if (!baseline && draft.kind === next.kind) {
      const oldRecord = draft.kind === "article" ? draft.article : draft.series;
      const record = next.kind === "article" ? next.article : next.series;
      if (record.slug !== oldRecord.slug) setSlugEdited(true);
      else if (!slugEdited && record.title !== oldRecord.title) {
        const slug = slugifySeriesTitle(record.title) || oldRecord.slug;
        next = next.kind === "article" ? { kind: "article", article: { ...next.article, slug } } : { kind: "series", series: { ...next.series, slug } };
      }
    }
    const now=Date.now();
    if(structural || now-lastEditAt.current>700 || changeIndex.current===0) {
      changes.current=changes.current.slice(0,changeIndex.current+1);
      changes.current.push(next); if(changes.current.length>80) changes.current.shift();
      changeIndex.current=changes.current.length-1;
    } else changes.current[changeIndex.current]=next;
    lastEditAt.current=structural ? 0 : now;
    commit(next); setMessage("");
    if (next.kind === "article" && field.startsWith("paragraph-") && Number(field.slice(10)) >= next.article.paragraphs.length) setField("body");
  }
  /**
   * The canvas is where the text is written, so its edit wins: when the draft no longer holds the text the
   * canvas started from (an edit it could not see yet), the canvas value is applied over the current text.
   */
  function canvasEdit(patch: InlineEdit) {
    if (!ready) return;
    const current = latest.current;
    const next = editDocumentText(current, patch) ?? editDocumentText(current, { ...patch, previous: documentText(current, patch.field)?.value ?? patch.previous });
    if (next) change(next,!!patch.action);
  }
  async function save(requested: ContentStatus = status) {
    const draft = latest.current;
    if (saving || !parseDocumentDraft(draft) || (draft.kind === "series" && requested === "scheduled")) return;
    // Private writing is never live or planned: saving it takes the article off the site.
    const nextStatus: ContentStatus = draft.kind === "article" && draft.article.visibility === "private" && (requested === "published" || requested === "scheduled") ? "draft" : requested;
    const next: DocumentDraft = draft.kind === "article" ? { kind: "article", article: { ...draft.article, status: nextStatus, scheduledAt: nextStatus === "scheduled" ? draft.article.scheduledAt : undefined } } : { kind: "series", series: { ...draft.series, status: nextStatus as BlogSeries["status"] } };
    const publishedSeriesNote = nextStatus === "published" ? seriesPublishNote : "";
    setSaving(true); setMessage("Kaydediliyor…");
    const saved = await onSave(next, draft.kind === "article" ? seriesId : undefined);
    setSaving(false);
    if (saved) {
      // Writing goes on while the save runs: those newer edits stay and keep the page marked as changed.
      const edited = latest.current !== draft;
      const current = latest.current;
      commit(!edited ? next : current.kind === "article" && next.kind === "article" ? { kind: "article", article: { ...current.article, status: next.article.status, scheduledAt: next.article.scheduledAt } } : current.kind === "series" && next.kind === "series" ? { kind: "series", series: { ...current.series, status: next.series.status } } : current);
      setBaseline(structuredClone(next)); setSavedSeriesId(seriesId); setSavedAt(new Date()); if (!edited) onDirty(false);
      const privateNote = next.kind === "article" && next.article.visibility === "private" ? " Yazı özel: yalnız sen görebilirsin." : "";
      setMessage((nextStatus === "scheduled" ? "Yayın planı kaydedildi. Sunucu yazıyı planlanan zamanda yayımlayacak." : nextStatus === "trashed" ? "Çöp kutusuna taşındı. İçerik işlemlerinden geri yükleyebilirsin." : nextStatus === "archived" ? "Arşivlendi; ziyaretçilerden gizlendi." : nextStatus === "draft" ? "Taslak kaydedildi; ziyaretçilerden gizli." : "Kaydedildi ve yayında.") + privateNote + (publishedSeriesNote ? ` ${selectedSeries?.title} serisi de yayınlandı.` : ""));
    } else setMessage("");
  }
  function closeSeriesForm() {
    setCreatingSeries(false); setSeriesFormDirty(false);
    canvasRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  }
  function revert() {
    if (!baseline) { onDiscard(); return; }
    commit(structuredClone(baseline)); setResetKey((n) => n + 1); setSeriesId(savedSeriesId); setCreatingSeries(false); setSeriesFormDirty(false); setMessage("Düzenlemeler geri alındı.");
  }
  function historyMove(direction:-1|1) {
    const index=changeIndex.current+direction;
    if(index<0 || index>=changes.current.length) return;
    const old=changes.current[index],current=latest.current;
    const next=old.kind==="article" && current.kind==="article" ? {...old,article:{...old.article,id:current.article.id,version:current.article.version}} : old.kind==="series" && current.kind==="series" ? {...old,series:{...old.series,id:current.series.id,version:current.series.version}} : old;
    changeIndex.current=index; commit(structuredClone(next)); setResetKey(n=>n+1); lastEditAt.current=0;
  }
  useEffect(()=>{
    function key(event:KeyboardEvent) {
      if((event.metaKey||event.ctrlKey) && event.key.toLowerCase()==="s") { event.preventDefault(); if(dirty) void save(); }
    }
    window.addEventListener("keydown",key); return ()=>window.removeEventListener("keydown",key);
  });
  const clock = savedAt ? new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(savedAt) : null;
  const showPublish = (view === "marjinalya" || view === "odak") && status !== "published" && !(draft.kind === "article" && draft.article.visibility === "private");
  const actionNodes = <>
      {baseline && (baseline.kind === "article" ? articleStatus(baseline.article) : baseline.series.status) === "published" && <Link className="studio-text-link" href={baseline.kind === "article" ? `/yazilar/${baseline.article.slug}` : `/seriler/${baseline.series.slug}`} target="_blank" aria-label="Kaydedilmiş sayfayı aç ↗" title="Kaydedilmiş sayfayı aç">Site ↗</Link>}
      <button className="studio-secondary" disabled={!dirty} onClick={revert} aria-label="Değişiklikleri geri al" title="Değişiklikleri geri al">↶</button>
      <DocumentActions status={status} disabled={!ready || !valid || creatingSeries || saving} canPublish={canPublish} publishHint={publishHint} onSave={save} onSchedule={draft.kind === "article" ? () => select("publication") : undefined} />
      <button className="studio-primary" disabled={!ready || !dirty || !valid || missingBody || creatingSeries || saving} aria-label="Sayfayı kaydet ↗" onClick={() => save()}>{saving ? "Kaydediliyor…" : "Kaydet"}</button>
      {showPublish && <button className="studio-primary studio-publish" disabled={!ready || !valid || !canPublish || creatingSeries || saving} title={canPublish ? undefined : publishHint} onClick={() => save("published")}>Yayınla</button>}
    </>;
  return <main className={`studio document-studio writing-studio ${panelOpen && !anchored ? "has-inspector" : ""} ${focused ? "studio-focus" : ""}`} data-view={view}>
    <StudioHeader navigation={navigation} status={<><span className={`studio-state status-${status}`} title={dirty ? "Kaydedilmemiş değişiklikler var" : "Kaydedildi"}>{statusLabels[status]}{dirty && <span className="studio-state-suffix"> · düzenleniyor</span>}</span><span className={`studio-saved${dirty ? " is-dirty" : ""}`}>{dirty ? "Kaydedilmedi" : isNew && !baseline ? "Henüz kaydedilmedi" : clock ? `Kayıtlı · ${clock}` : "Kayıtlı"}</span></>} actions={view === "odak" ? null : actionNodes} />

    <div className="studio-workspace">
      <aside ref={dockRef} className="studio-sidebar document-dock writing-dock" data-layer="" aria-label="Sayfa alanları">
        <details className="writing-tools"><summary aria-label="Yazı araçları"><EditorIcon name="meta"/><span>Yazı araçları</span></summary><nav className="document-field-list">{fields.map(([id,name])=><button key={id} data-field={id} aria-label={name} onClick={event=>{select(id);event.currentTarget.closest("details")?.removeAttribute("open");}}><EditorIcon name={id}/><span>{name}</span></button>)}</nav></details>
        {view==="odak" && <div className="dock-actions">{actionNodes}</div>}
      </aside>
      <section ref={canvasRef} className="studio-preview" aria-label="Canlı sayfa tuvali"><CanvasToolbar focused={focused} onFocus={setFocused} title={title} mobile={mobile} editing={editing} onMobile={setMobile} onEditing={setEditing}>{draft.kind === "article" && <ArticleSeriesContext series={series} selectedId={seriesId} creating={creatingSeries} onSelect={(id) => { setSeriesId(id); setCreatingSeries(false); setSeriesFormDirty(false); }} onCreate={() => { setCreatingSeries(true); setPanelOpen(true); }} />}<button className="writing-voice" disabled title="Sesle yazma · Yakında" aria-label="Sesle yazma · Yakında"><EditorIcon name="microphone" size={17}/><span>Sesle yaz</span><small>Yakında</small></button></CanvasToolbar><p role="status" className="studio-status">{missingBody ? "Yazını kaydetmek için en az bir paragraf ekle." : !valid ? "Eksik veya geçersiz alan var. Tuval son geçerli düzenlemeyi gösteriyor." : message}</p>{!creatingSeries && error && <p role="alert" className="studio-error">{error}</p>}<PreviewCanvas onSaveRequest={()=>{void save();}} onHistory={historyMove} onCaret={setCaret} onPointer={() => { if (panelOpen && !creatingSeries) setPanelOpen(false); }} onInlineEdit={canvasEdit} resetKey={resetKey} workspace={workspace} document={preview} mobile={mobile} selection={{ id: field, request, editing }} onSelect={(id) => select(id, true)} onAnchor={placeAnchor} onNavigate={onNavigate} /></section>
      <aside ref={inspectorRef} hidden={!panelOpen} className={`studio-inspector inspector-linked${anchored ? " is-anchored" : ""}`} style={anchored ? cardPlacement(anchor!) : undefined} data-layer="" aria-label="Seçili alanın ayarları"><div className="inspector-heading"><div><span className="studio-eyebrow">DÜZENLE</span><h2>{label}</h2></div><button aria-label="Ayar panelini kapat" onClick={() => setPanelOpen(false)}><EditorIcon name="close"/></button></div>{creatingSeries && <div ref={seriesFormRef} className="inline-series-anchor"><InlineSeriesForm onDirty={setSeriesFormDirty} onCancel={closeSeriesForm} onSave={async (record) => { const created = await onCreateSeries(record); if (!created) return false; setSeriesId(created.id); closeSeriesForm(); setMessage("Seri taslak olarak oluşturuldu ve seçildi. Yazını kaydettiğinde ilk bölümü olacak."); return true; }} />{error && <p role="alert" className="studio-error">{error}</p>}</div>}<fieldset className="inspector-fields" disabled={!ready}>{panelOpen && (draft.kind === "article" && field === "notes" ? <><div className="margin-card"><WordGoal current={draft.article} saved={baseline?.kind === "article" ? baseline.article : draft.article} line /></div><NotesPanel article={draft.article} field={anchorField} /></> : draft.kind === "article" ? <ArticleProperties onSchedule={() => save("scheduled")} onCancelSchedule={() => save("draft")} scheduleDisabled={!ready || !valid || !canPublish || creatingSeries || saving} allowSlugEdit={!baseline} article={draft.article} field={field} onChange={(article) => change({ kind: "article", article })} /> : <SeriesProperties series={draft.series} collection={series} articles={articles} field={field} onChange={(item) => change({ kind: "series", series: item })} />)}</fieldset></aside>
      {view === "odak" && <FocusExtras draft={draft} saved={baseline} field={field} caret={caret} onSelect={(id) => select(id)} />}
    </div>
  </main>;
}
