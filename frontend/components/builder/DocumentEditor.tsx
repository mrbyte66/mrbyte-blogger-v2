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
import type { ReactNode } from "react";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { parseDocumentDraft, type DocumentDraft, type StudioTarget } from "../../lib/builder/document-protocol";
import type { Article } from "../../lib/content";
import { slugifySeriesTitle, type BlogSeries } from "../../lib/series/model";
import { scrollBehavior } from "../../lib/motion";
import { CanvasToolbar } from "./CanvasToolbar";
import { insertBlock, type BlockKind } from "./BlockBar";
import { DocumentOutline } from "./DocumentOutline";
import { WritingTools } from "./WritingTools";

import { WordGoal } from "./WordGoal";
import { NotesPanel } from "./NotesPanel";

import { useDismiss } from "../../lib/studio/dismiss";
import { useStudioView } from "../../lib/studio/view";
import { SiteDesignControls } from "./SiteDesignControls";
import { PreviewCanvas } from "./PreviewCanvas";
import { ArticleProperties, articleFields } from "./ArticleProperties";
import { SeriesProperties, hasPublicChapter, seriesFields } from "./SeriesProperties";
function documentFingerprint(draft:DocumentDraft) {
  const record=draft.kind==="article" ? draft.article : draft.series;
  const {id,version,revisionId,publishedRevisionId,hasUnpublishedChanges,firstPublishedAt,...content}=record as Article;
  return JSON.stringify(content);
}
export function DocumentEditor({ navigation, initial, fieldRequest = null, articles, series, isNew = false, onDirty, onNavigate, onSave, onDiscard, onCreateSeries, error }: { navigation?: ReactNode; initial: DocumentDraft; fieldRequest?: { field: string; n: number } | null; articles: readonly Article[]; series: readonly BlogSeries[]; isNew?: boolean; onDirty: (dirty: boolean) => void; onNavigate: (target: StudioTarget) => void; onSave: (draft: DocumentDraft, seriesId?: string | null) => Promise<boolean>; onCreateSeries: (series: BlogSeries) => Promise<BlogSeries | null>; onDiscard: () => void; error: string | null }) {
  const { workspace, ready } = useWorkspace();
  const inspectorRef = useRef<HTMLElement>(null);
  const outlineToggle = useRef<HTMLButtonElement>(null);
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
  const [showNotes, setShowNotes] = useState(false);
  const [field, setField] = useState("title");
  const [request, setRequest] = useState(isNew ? 1 : 0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelKind, setPanelKind] = useState<"outline" | "document" | "design">("outline");
  const [settingsKind, setSettingsKind] = useState<"document" | "design">("document");
  const [settingsField, setSettingsField] = useState("meta");
  const [outlineCurrent, setOutlineCurrent] = useState("title");
  const [outlineJump, setOutlineJump] = useState<{field:string;request:number}|null>(null);
  useEffect(() => { if (window.matchMedia("(min-width:1100px)").matches) setPanelOpen(true); }, []);
  const [focused, setFocused] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState(true);
  const [message, setMessage] = useState("");
  const [view] = useStudioView();
  // Notes hang on the paragraph being written; opening the notes panel must not lose it.
  const [anchorField, setAnchorField] = useState("title");
  const changes=useRef<DocumentDraft[]>([initial]);
  const changeIndex=useRef(0);
  const lastEditAt=useRef(0);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const handledRequest = useRef(0);
  const initialSeriesId = initial.kind === "article" ? (initial.article.seriesId !== undefined ? initial.article.seriesId : series.find((s) => s.status !== "trashed" && s.articleSlugs.includes(initial.article.slug))?.id ?? null) : null;
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
  const missingBody = status === "scheduled" && !canPublish;
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
    if(isNew || saving) return;
    if(dirty) {
      const local=latest.current;
      if(local.kind==="article" && initial.kind==="article") commit({...local,article:{...local.article,id:initial.article.id,version:initial.article.version,revisionId:initial.article.revisionId,publishedRevisionId:initial.article.publishedRevisionId,hasUnpublishedChanges:initial.article.hasUnpublishedChanges,firstPublishedAt:initial.article.firstPublishedAt}});
      if(local.kind==="series" && initial.kind==="series") commit({...local,series:{...local.series,id:initial.series.id,version:initial.series.version}});
      setBaseline(initial); return;
    }
    commit(structuredClone(initial)); setBaseline(initial); setSeriesId(initialSeriesId); setSavedSeriesId(initialSeriesId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverVersion,saving]);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    const next = parseDocumentDraft(draft.kind === "article" ? { ...draft, article: { ...draft.article, seriesId } } : draft);
    if (next) setPreview(next);
  }, [draft, seriesId]);
  const fields: ReadonlyArray<readonly [string, string]> = draft.kind === "article" ? [...articleFields, ["notes", "Özel notlar"] as const] : seriesFields;
  const title = draft.kind === "article" ? draft.article.title : draft.series.title;
  const label = fields.find(([id]) => id === settingsField)?.[1] ?? "Seçili paragraf";
  useDismiss(panelOpen && !creatingSeries, () => setPanelOpen(false), [inspectorRef], "explicit");
  function openSettings(id: string) {
    setSettingsField(id); setSettingsKind("document"); setPanelKind("document"); setPanelOpen(true); setFocused(false);
  }
  function select(id: string, _fromCanvas = false) {
    if (!id.startsWith("paragraph-") && !fields.some(([known]) => known === id)) return;
    if (["title","excerpt","summary","body"].includes(id) || id.startsWith("paragraph-")) {
      setField(id); setAnchorField(id); setEditing(true); setRequest(n => n + 1);
    } else openSettings(id);
  }
  function openDesign() { setSettingsKind("design"); setPanelKind("design"); setPanelOpen(true); setFocused(false); }
  function navigateHeading(field: string) {
    setOutlineJump(current => ({field, request:(current?.request ?? 0)+1}));
    setOutlineCurrent(field);
    if (!window.matchMedia("(min-width:1100px)").matches) setPanelOpen(false);
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
    if (next) { change(next,!!patch.action); if (patch.field.startsWith("paragraph-")) { setField(patch.field); setAnchorField(patch.field); } }
  }
  async function save(requested: ContentStatus = draft.kind === "article" && status === "published" ? "draft" : status) {
    const draft = latest.current;
    if (saving || !parseDocumentDraft(draft) || (draft.kind === "series" && requested === "scheduled")) return;
    // Private writing is never live or planned: saving it takes the article off the site.
    const nextStatus: ContentStatus = draft.kind === "article" && draft.article.visibility === "private" && (requested === "published" || requested === "scheduled") ? "draft" : requested;
    const next: DocumentDraft = draft.kind === "article" ? { kind: "article", article: { ...draft.article, hasUnpublishedChanges: nextStatus === "published" ? false : !!draft.article.publishedRevisionId, status: nextStatus, scheduledAt: nextStatus === "scheduled" ? draft.article.scheduledAt : undefined } } : { kind: "series", series: { ...draft.series, status: nextStatus as BlogSeries["status"] } };
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
      setMessage((nextStatus === "scheduled" ? "Yayın planı kaydedildi. Sunucu yazıyı planlanan zamanda yayımlayacak." : nextStatus === "trashed" ? "Çöp kutusuna taşındı. İçerik işlemlerinden geri yükleyebilirsin." : nextStatus === "archived" ? "Arşivlendi; ziyaretçilerden gizlendi." : nextStatus === "draft" ? (draft.kind === "article" && (draft.article.publishedRevisionId || status === "published") ? "Taslak kaydedildi. Okuyucular önceki yayını görmeye devam ediyor." : "Taslak kaydedildi; ziyaretçilerden gizli.") : "Kaydedildi ve yayında.") + privateNote + (publishedSeriesNote ? ` ${selectedSeries?.title} serisi de yayınlandı.` : ""));
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
  const showPublish = (draft.kind === "article" || status !== "published") && !(draft.kind === "article" && draft.article.visibility === "private");
  const actionNodes = <>
      {baseline && (baseline.kind === "article" ? (baseline.article.publishedRevisionId ? "published" : articleStatus(baseline.article)) : baseline.series.status) === "published" && <Link className="studio-text-link" href={baseline.kind === "article" ? `/yazilar/${baseline.article.slug}` : `/seriler/${baseline.series.slug}`} target="_blank" aria-label="Kaydedilmiş sayfayı aç ↗" title="Kaydedilmiş sayfayı aç">Site ↗</Link>}
      <DocumentActions onRevert={revert} canRevert={dirty} status={status} disabled={!ready || !valid || creatingSeries || saving} canPublish={canPublish} publishHint={publishHint} onSave={save} onSchedule={draft.kind === "article" ? () => select("publication") : undefined} />
      <button className="studio-primary" disabled={!ready || !dirty || !valid || missingBody || creatingSeries || saving} aria-label="Sayfayı kaydet ↗" onClick={() => save()}>{saving ? "Kaydediliyor…" : draft.kind === "article" && (draft.article.publishedRevisionId || status === "published") ? "Taslağı kaydet" : "Kaydet"}</button>
      {showPublish && <button className="studio-primary studio-publish" disabled={!ready || !valid || !canPublish || creatingSeries || saving || (draft.kind === "article" && !dirty && !!draft.article.publishedRevisionId && !draft.article.hasUnpublishedChanges)} title={canPublish ? undefined : publishHint} onClick={() => save("published")}>{draft.kind === "article" && (draft.article.publishedRevisionId || draft.article.firstPublishedAt) ? "Değişiklikleri yayımla" : "Yayınla"}</button>}
    </>;
  const settingsContent = creatingSeries ? <div ref={seriesFormRef} className="inline-series-anchor"><InlineSeriesForm onDirty={setSeriesFormDirty} onCancel={closeSeriesForm} onSave={async record => {
    const created = await onCreateSeries(record); if (!created) return false;
    setSeriesId(created.id); closeSeriesForm(); setMessage("Seri taslak olarak oluşturuldu ve seçildi. Yazını kaydettiğinde ilk bölümü olacak."); return true;
  }}/>{error && <p role="alert" className="studio-error">{error}</p>}</div> : <>
    <div className="writing-setting-choices" role="group" aria-label="Sayfa ayarları">
      <button aria-pressed={settingsKind === "design"} onClick={openDesign}><EditorIcon name="design" size={16}/>Site tasarımı</button>
      {fields.filter(([id]) => !["title","excerpt","summary","body","figure","code","table","publication"].includes(id)).map(([id,name]) => <button key={id} aria-pressed={settingsKind === "document" && settingsField === id} onClick={() => openSettings(id)}><EditorIcon name={id} size={16}/>{name}</button>)}
    </div>
    <h2 className="writing-setting-title">{settingsKind === "design" ? "Site tasarımı" : label}</h2>
    <fieldset className="inspector-fields" disabled={!ready}>{settingsKind === "design" ? <SiteDesignControls/> : draft.kind === "article" && settingsField === "notes" ? <><div className="margin-card"><WordGoal current={draft.article} saved={baseline?.kind === "article" ? baseline.article : draft.article} line/></div><NotesPanel article={draft.article} field={anchorField}/></> : draft.kind === "article" ? <ArticleProperties onSchedule={() => save("scheduled")} onCancelSchedule={() => save("draft")} scheduleDisabled={!ready || !valid || !canPublish || saving} allowSlugEdit={draft.kind === "article" && !draft.article.firstPublishedAt} article={draft.article} field={settingsField} onChange={article => change({kind:"article",article})}/> : <SeriesProperties series={draft.series} collection={series} articles={articles} field={settingsField} onChange={series => change({kind:"series",series})}/>}</fieldset>
  </>;
  return <main className={`studio document-studio writing-studio ${panelOpen ? "has-writing-panel has-inspector" : ""} ${focused ? "studio-focus" : ""}`} data-view={view}>
    <StudioHeader navigation={navigation} status={<><span className={`studio-state status-${status}`} title={dirty ? "Kaydedilmemiş değişiklikler var" : "Kaydedildi"}>{draft.kind === "article" && draft.article.publishedRevisionId && status !== "archived" && status !== "trashed" ? (status === "scheduled" ? "Yayında · güncelleme planlandı" : dirty || draft.article.hasUnpublishedChanges ? "Yayında · çalışma taslağı" : "Yayında") : statusLabels[status]}{dirty && <span className="studio-state-suffix"> · düzenleniyor</span>}</span><span className={`studio-saved${dirty ? " is-dirty" : ""}`}>{dirty ? "Kaydedilmedi" : isNew && !baseline ? "Henüz kaydedilmedi" : clock ? `Kayıtlı · ${clock}` : "Kayıtlı"}</span></>} actions={actionNodes}/>
    <div className="studio-workspace">
      <section ref={canvasRef} className="studio-preview" aria-label="Canlı sayfa tuvali">
        <CanvasToolbar focused={focused} onFocus={panelOpen || focused ? setFocused : undefined} title={title} mobile={mobile} editing={editing} onMobile={setMobile} onEditing={setEditing}>
          {draft.kind === "article" && <ArticleSeriesContext series={series} selectedId={seriesId} creating={creatingSeries} onSelect={id => {setSeriesId(id); setCreatingSeries(false); setSeriesFormDirty(false);}} onCreate={() => {setCreatingSeries(true); setPanelKind("document"); setSettingsKind("document"); setFocused(false); setPanelOpen(true);}}/>}
          {draft.kind === "article" && <><button className="canvas-settings" aria-label="Notları göster" disabled={!draft.article.id} title={draft.article.id?"Kendi okuma notlarını taslağın üzerinde göster":"Notları görmek için önce yazıyı kaydet"} aria-pressed={showNotes} onClick={() => setShowNotes(!showNotes)}><EditorIcon name="notes" size={18}/><span>{showNotes ? "Notlar açık" : "Notları göster"}</span></button><Link className="canvas-settings" href="/studio/not-senaryolari">Not senaryoları ↗</Link></>}
          <button ref={outlineToggle} className="canvas-settings outline-toggle" aria-label="İçindekiler" aria-expanded={panelOpen && !focused} onClick={() => {setPanelKind("outline"); setFocused(false); setPanelOpen(!(panelOpen && panelKind === "outline" && !focused));}}><EditorIcon name="list" size={18}/><span>İçindekiler</span></button>
        </CanvasToolbar>
        <p role="status" className="studio-status">{missingBody ? "Yazını kaydetmek için en az bir paragraf ekle." : !valid ? "Eksik veya geçersiz alan var. Tuval son geçerli düzenlemeyi gösteriyor." : message}</p>
        {!creatingSeries && error && <p role="alert" className="studio-error">{error}</p>}
        <PreviewCanvas showNotes={showNotes} onSaveRequest={() => {void save();}} onHistory={historyMove} onOutlineCurrent={setOutlineCurrent} outlineJump={outlineJump} onInlineEdit={canvasEdit} resetKey={resetKey} workspace={workspace} document={preview} mobile={mobile} selection={{id:field,request,editing}} onSelect={id => select(id,true)} onNavigate={onNavigate}/>
        <WritingTools article={draft.kind === "article"} disabled={!ready || saving || creatingSeries || !editing} full={draft.kind === "article" && draft.article.paragraphs.length >= 200} onInsert={insert} onSelect={openSettings} onDesign={openDesign}/>
      </section>
      <aside ref={inspectorRef} hidden={!panelOpen} className="studio-inspector writing-companion" aria-label="Seçili alanın ayarları">
        <div className="writing-panel-tabs" role="tablist" aria-label="Yazı paneli" onKeyDown={event => {
          if ((event.target as HTMLElement).getAttribute("role") !== "tab" || !["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
          event.preventDefault(); const outline = event.key === "Home" || event.key === "ArrowLeft" && panelKind !== "outline" || event.key === "ArrowRight" && panelKind !== "outline";
          setPanelKind(outline ? "outline" : settingsKind);
          inspectorRef.current?.querySelector<HTMLButtonElement>(outline ? "#writing-outline-tab" : "#writing-settings-tab")?.focus();
        }}>
          <button id="writing-outline-tab" role="tab" aria-selected={panelKind === "outline"} aria-controls="writing-outline-content" onClick={() => setPanelKind("outline")}>İçindekiler</button>
          <button id="writing-settings-tab" role="tab" aria-selected={panelKind !== "outline"} aria-controls="writing-settings-content" onClick={() => setPanelKind(settingsKind)}>Ayarlar</button>
          <button className="writing-panel-close" aria-label="Ayar panelini kapat" onClick={() => {setPanelOpen(false);outlineToggle.current?.focus();}}><EditorIcon name="close" size={18}/></button>
        </div>
        <div id="writing-outline-content" role="tabpanel" hidden={panelKind !== "outline"} aria-labelledby="writing-outline-tab"><DocumentOutline draft={draft} current={outlineCurrent} canAddHeading={ready && !saving && !creatingSeries && draft.kind === "article" && draft.article.paragraphs.length < 200} onNavigate={navigateHeading} onAddHeading={() => insert("heading")}/></div>
        <div id="writing-settings-content" role="tabpanel" hidden={panelKind === "outline"} aria-labelledby="writing-settings-tab">{settingsContent}</div>
      </aside>
    </div>
  </main>;
}
