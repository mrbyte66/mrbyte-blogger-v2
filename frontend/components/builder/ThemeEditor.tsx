"use client";
import { editThemeText, themeText, type InlineEdit } from "../../lib/builder/inline-edit";
import type { SceneField } from "../../lib/builder/preview-protocol";

import { scrollBehavior } from "../../lib/motion";

import Link from "next/link";
import { StudioHeader } from "./StudioHeader";
import type { ReactNode } from "react";
import type { StudioTarget } from "../../lib/builder/document-protocol";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyDraft, blockDescriptions, blockLabels, blockPlacementNote,
  cloneTheme, createTheme, inferStarter, removeBlock,
  replaceBlock, restoreApplied, themeErrors, type Starter, type Theme,
} from "../../lib/builder/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { BlockProperties } from "./BlockProperties";
import { EditorIcon } from "./EditorIcon";
import { CanvasToolbar } from "./CanvasToolbar";
import { PreviewCanvas } from "./PreviewCanvas";
import { ThemeSettings } from "./ThemeSettings";
import { SiteIndexing } from "./SiteIndexing";
import { ThemeStructure, starters } from "./ThemeStructure";
import { StudioViewSwitch } from "./StudioViewSwitch";
import { useStudioView } from "../../lib/studio/view";
import { useDismiss } from "../../lib/studio/dismiss";
import { isTopLayer, raiseLayer, useLayer } from "../../lib/studio/layers";


export function ThemeEditor({ onNavigate, navigation }: { navigation?: ReactNode; onNavigate?: (target: StudioTarget) => void }) {
  const { series } = useSeriesWorkspace();
  const { workspace, save, ready, storageError } = useWorkspace();
  // Canvas edits can arrive faster than React renders: each one builds on the newest workspace.
  const live = useRef(workspace);
  live.current = workspace;
  const [sceneField, setSceneField] = useState<SceneField | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspector, setInspector] = useState<"block" | "theme">("block");
  const [panelOpen, setPanelOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [editingCanvas, setEditingCanvas] = useState(true);
  const [spotlight, setSpotlight] = useState(true);
  const [focusRequest, setFocusRequest] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [undoKind, setUndoKind] = useState<"remove" | "layout">("remove");
  const [undo, setUndo] = useState<Theme | null>(null);
  const [confirmation, setConfirmation] = useState<"restore" | null>(null);
  // Bumped when the draft is replaced from outside the canvas (undo, restore, a starter layout).
  const [resetKey, setResetKey] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const preferences = useRef<HTMLDialogElement>(null);
  const [preferenceTab, setPreferenceTab] = useState<"appearance" | "discovery" | "view">("appearance");
  const [view] = useStudioView();
  const [structureOpen, setStructureOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const properties = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLElement>(null);
  const selected = workspace.draft.blocks.find((block) => block.id === selectedId) ?? workspace.draft.blocks[0];
  const dirty = JSON.stringify(workspace.draft) !== JSON.stringify(workspace.applied);
  const errors = themeErrors(workspace.draft);

  useEffect(() => {
    if (confirmation && !dialog.current?.open) dialog.current?.showModal();
    else if (!confirmation && dialog.current?.open) dialog.current.close();
  }, [confirmation]);
  // The settings panel closes on Escape or a press on empty space (the canvas reports its own presses).
  useDismiss(panelOpen, () => setPanelOpen(false), [properties, sidebarRef], "empty");
  // Odak's structure list is a panel on request; it goes away like the settings panel does.
  useDismiss(structureOpen, () => setStructureOpen(false), [sidebarRef], "empty");
  // The block palette is a popover in some views: it closes the same way.
  useDismiss(paletteOpen, () => setPaletteOpen(false), [sidebarRef], "outside");
  // Whatever opened last is drawn in front: the settings panel, the structure list or the block palette.
  useLayer(panelOpen, properties);
  useLayer(structureOpen, sidebarRef);
  useLayer(paletteOpen, sidebarRef);
  const selectFromCanvas = useCallback((id: string, field?: SceneField) => {
    setPanelOpen(true); setFocused(false);
    setSceneField(field);
    setSelectedId(id);
    setSpotlight(true);
    setInspector("block");
    setFocusRequest((request) => request + 1);
    setMessage("Tuvalde seçtiğin bölümün ayarları açıldı. Değişiklikler burada anında görünür.");
    if (window.innerWidth <= 860) properties.current?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
  }, []);
  function selectFromList(id: string) {
    setPanelOpen(true); setFocused(false);
    setSelectedId(id); setSpotlight(true); setInspector("block"); setEditingCanvas(true);
    setFocusRequest((request) => request + 1);
    if (window.innerWidth <= 1100) canvas.current?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
    setMessage("Seçilen bölüm tuvalde aydınlatıldı. Ayarlarını özellikler panelinden değiştirebilirsin.");
  }
  function edit(theme: Theme) { const next = { ...live.current, draft: theme }; live.current = next; save(next); setMessage(""); setUndo(null); }
  /** The canvas wins over a draft that has not caught up with it yet (see DocumentEditor). */
  function canvasEdit(patch: InlineEdit) {
    if (!ready) return;
    const block = live.current.draft.blocks.find((b) => b.id === patch.id);
    if (!block) return;
    const next = editThemeText(block, patch) ?? editThemeText(block, { ...patch, previous: themeText(block, patch.field)?.value ?? patch.previous });
    if (next) edit(replaceBlock(live.current.draft, next));
  }
  function useStarter(starter: Starter) {
    const previous = cloneTheme(workspace.draft);
    edit({ ...createTheme(starter), siteName: workspace.draft.siteName, accent: workspace.draft.accent }); setResetKey((n) => n + 1);
    setUndo(previous); setUndoKind("layout");
    setSelectedId(null); setInspector("theme"); setPanelOpen(true);
  }
  function confirm() {
    if (confirmation === "restore") {
      save(restoreApplied(workspace)); setResetKey((n) => n + 1); setUndo(null); setSelectedId(null);
      setMessage("Yalnızca taslak geri alındı. Ana sayfada uygulanan tema korunuyor.");
    }
    setConfirmation(null);
  }
  async function apply() {
    if (errors.length || !ready) return;
    setMessage("Tema uygulanıyor…");
    const persisted = await save(applyDraft(workspace), true);
    setUndo(null);
    setMessage(persisted ? "Tema uygulandı. Ziyaretçiler ana sayfada yeni temayı görür." : "Tema uygulanamadı. Taslağın korunuyor; ayrıntı aşağıda.");
  }
  function removeSelected() {
    if (!selected) return;
    const previous = cloneTheme(workspace.draft);
    const next = removeBlock(workspace.draft, selected.id);
    save({ ...workspace, draft: next }); setUndo(previous); setUndoKind("remove");
    setSelectedId(null); setMessage(`${blockLabels[selected.kind]} taslaktan kaldırıldı. İstersen son kaldırmayı geri alabilirsin.`);
    if (!next.blocks.length) setPaletteOpen(true);
  }

  const selectedStarter = inferStarter(workspace.draft);
  const actionNodes = <><button className="studio-site-preferences" title="Site tercihleri" aria-label="Site tercihleri" onClick={() => preferences.current?.showModal()}><EditorIcon name="settings"/></button><Link className="studio-text-link" href="/" target="_blank" aria-label="Siteyi aç ↗" title="Siteyi aç">Site ↗</Link><Link className="studio-secondary" href="/preview" target="_blank" aria-label="Taslağı tam ekran gör ↗" title="Taslağı tam ekran gör">Önizle ↗</Link><button className="studio-primary" onClick={apply} disabled={!ready || !dirty || errors.length > 0}>Temayı uygula <span aria-hidden="true">↗</span></button></>;
  return <main className={`studio ${panelOpen ? "has-inspector" : ""} ${focused ? "studio-focus" : ""} ${structureOpen ? "has-structure" : ""}`} data-view={view}>
    <StudioHeader navigation={navigation} status={<span className="studio-state" title="Taslak otomatik kaydedilir; Uygula ziyaretçilerin gördüğü ana sayfayı değiştirir.">{dirty ? "Tema taslağı" : "Yayınla aynı"}</span>}
      center={view === "sahne" ? <div className="studio-starters" role="group" aria-label="Başlangıç düzeni">{starters.map((item) => <button key={item.id} type="button" aria-label={item.label} title={item.detail} aria-pressed={selectedStarter === item.id} disabled={!ready} onClick={() => useStarter(item.id)}>{item.label}</button>)}</div> : undefined}
      actions={actionNodes} />

    <div className="studio-workspace">

      <aside ref={sidebarRef} className={`studio-sidebar ${structureOpen ? "is-open" : ""}`} data-layer="" aria-label="Sayfa yapısını düzenle"><ThemeStructure sections="structure" theme={workspace.draft} ready={ready} selectedId={selected?.id} paletteOpen={paletteOpen} onPaletteChange={setPaletteOpen} onChooseStarter={useStarter} onChange={edit} onSelect={selectFromList} /></aside>
      <section className="studio-preview" aria-label="Canlı önizleme" ref={canvas}>
        <CanvasToolbar focused={focused} onFocus={panelOpen || structureOpen || focused || view === "marjinalya" || view === "sahne" ? setFocused : undefined} title={workspace.draft.name || "Adsız tema"} mobile={mobile} editing={editingCanvas} onMobile={setMobile} onEditing={setEditingCanvas}><button className="canvas-settings" aria-expanded={panelOpen} onClick={() => { setFocused(false); setInspector("theme"); if (panelOpen && !isTopLayer(properties.current)) raiseLayer(properties.current); else setPanelOpen(!panelOpen); }}><EditorIcon name="design"/>Tasarım</button>{selectedId && inspector === "block" && editingCanvas && spotlight && <button className="canvas-clear" onClick={() => setSpotlight(false)}>Seçimi gizle</button>}</CanvasToolbar>
        <p role="status" className="studio-status canvas-feedback">{message}</p>
        <PreviewCanvas onPointer={() => { setPanelOpen(false); setStructureOpen(false); }} onInlineEdit={canvasEdit} resetKey={resetKey} mobile={mobile} workspace={workspace} selection={{ id: inspector === "block" && spotlight ? selectedId : null, request: focusRequest, editing: editingCanvas }} onSelect={selectFromCanvas} onNavigate={onNavigate} />
        <div className="canvas-bottom"><span>{editingCanvas ? "METNE TIKLA, YERİNDE DÜZENLE." : "ZİYARETÇİ ÖNİZLEMESİ"}</span><span>İçerikler tema değişince korunur.</span></div>
      </section>
      <aside hidden={!panelOpen} className={`studio-inspector ${selectedId && inspector === "block" ? "inspector-linked" : ""}`} data-layer="" aria-label="Düzenleme özellikleri" ref={properties}>
        <div className="inspector-heading"><span className="studio-eyebrow">TASARIM ARAÇLARI</span><button aria-label="Ayar panelini kapat" onClick={() => setPanelOpen(false)}><EditorIcon name="close"/></button></div>
        <div className="inspector-switch" role="group" aria-label="Özellik türü"><button aria-pressed={inspector === "block"} onClick={() => setInspector("block")}>Blok ayarları</button><button aria-pressed={inspector === "theme"} onClick={() => setInspector("theme")}>Tema tasarımı</button></div>
        <fieldset disabled={!ready} className="inspector-fields">{inspector === "block" ? selected ? <><span className="studio-eyebrow">{selectedId ? "SEÇİLİ BLOK" : "BLOK ÖZELLİKLERİ"}</span><h2>{blockLabels[selected.kind]}</h2><details className="studio-help"><summary>Bu bölüm hakkında</summary><p>{blockDescriptions[selected.kind]} {blockPlacementNote(selected.kind)}</p></details><BlockProperties block={selected} activeSceneField={sceneField} focusRequest={focusRequest} onChange={(block) => edit(replaceBlock(workspace.draft, block))} onManageSeries={() => { if (series[0]) onNavigate?.({ kind: "series", slug: series[0].slug }); }} /><button className="studio-remove" onClick={removeSelected}>Bloğu kaldır −</button></> : <div className="inspector-empty"><span aria-hidden="true">＋</span><h2>Yeni bir bölüm ekle.</h2><p>Son bloğu da kaldırdın. “Blok ekle” ile yeniden başlayabilirsin; ana sayfadaki teman korunuyor.</p><button className="studio-secondary" onClick={() => setPaletteOpen(true)}>Blok paletini aç</button></div> : <><span className="studio-eyebrow">TEMA</span><h2>Görsel kimlik</h2><p className="property-summary">Yalnızca renk değil: yazı karakteri, atmosfer, genişlik ve ritim.</p><ThemeSettings theme={workspace.draft} onChange={edit} /></>}</fieldset>
        <div className="studio-save-state"><span className="studio-eyebrow">TASLAK & ANA SAYFA</span><p>{!ready ? "Kayıt yükleniyor…" : dirty ? "Şu an taslağı düzenliyorsun; taslak otomatik kaydedilir. Ana sayfa henüz değişmedi." : "Taslak, yayındaki ana sayfayla aynı."}</p><button disabled={!ready || !dirty} onClick={() => setConfirmation("restore")}>Taslağı uygulanan temaya döndür ↶</button>{undo && <button className="undo-removal" onClick={() => { save({ ...workspace, draft: undo }); setResetKey((n) => n + 1); setUndo(null); setMessage("Önceki taslak geri geldi."); }}>{undoKind === "remove" ? "Son kaldırmayı geri al" : "Önceki düzene dön"} ↶</button>}{storageError && <p role="alert" className="studio-error">{storageError}</p>}{errors.length > 0 && <ul className="studio-error">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}</div>
      </aside>
      {view === "odak" && <div className="studio-dock" data-layer="" role="toolbar" aria-label="Tasarım araçları">
        <button type="button" aria-pressed={structureOpen} onClick={() => { setFocused(false); setStructureOpen(!structureOpen); }}><EditorIcon name="structure" size={20} /><span>Yapı</span></button>
        <button type="button" aria-pressed={panelOpen && inspector === "theme"} onClick={() => {setFocused(false);setInspector("theme");setPanelOpen(true);}}><EditorIcon name="design" size={20}/><span>Tasarım</span></button>
        <a href="/preview" target="_blank" rel="noreferrer"><EditorIcon name="desktop" size={20}/><span>Önizle</span></a>
        <button type="button" disabled={!ready || !dirty || errors.length > 0} onClick={apply}><EditorIcon name="check" size={20}/><span>Uygula</span></button>
      </div>}
    </div>
    <dialog ref={preferences} className="studio-preferences-dialog" aria-labelledby="site-preferences-title" onClick={event => { if(event.target === event.currentTarget) preferences.current?.close(); }}>
      <div className="inspector-heading"><div><span className="studio-eyebrow">SİTENİN BÜTÜNÜ</span><h2 id="site-preferences-title">Site tercihleri</h2></div><button aria-label="Site tercihlerini kapat" onClick={() => preferences.current?.close()}><EditorIcon name="close"/></button></div>
      <div className="preference-tabs" role="tablist" aria-label="Site tercihleri"><button role="tab" aria-selected={preferenceTab==="appearance"} onClick={()=>setPreferenceTab("appearance")}>Başlangıç düzeni</button><button role="tab" aria-selected={preferenceTab==="discovery"} onClick={()=>setPreferenceTab("discovery")}>Keşfedilebilirlik</button><button role="tab" aria-selected={preferenceTab==="view"} onClick={()=>setPreferenceTab("view")}>Studio görünümü</button></div>
      <section role="tabpanel">{preferenceTab==="appearance" ? <><p className="preference-intro">Sitenin başlangıç noktasını seç.<br/><span>İçeriklerin korunur. Düzen önce taslağa alınır.</span></p><ThemeStructure sections="starters" theme={workspace.draft} ready={ready} paletteOpen={false} onPaletteChange={()=>{}} onChooseStarter={starter=>{useStarter(starter);preferences.current?.close();}} onChange={edit} onSelect={selectFromList}/></> : preferenceTab==="view" ? <><p className="preference-intro">Studio’yu nasıl görmek istersin?<br/><span>Yalnız bu tarayıcıda geçerli; içeriklerin ve sitenin görünümü değişmez.</span></p><StudioViewSwitch variant="cards"/></> : <SiteIndexing/>}</section>
    </dialog>
    <dialog className="studio-confirm" ref={dialog} aria-labelledby="confirm-title" onCancel={() => setConfirmation(null)}><div><span className="studio-eyebrow">MEVCUT TASLAK DEĞİŞECEK</span><h2 id="confirm-title">Taslağı geri al?</h2><p>Mevcut taslak düzenin ve ayarların, ana sayfada uygulanan temayla değiştirilecek. İçeriklerin ve ana sayfa değişmez; bunun için ayrıca “Temayı uygula” gerekir.</p><div className="confirm-actions"><button className="studio-secondary" onClick={() => setConfirmation(null)}>Vazgeç</button><button className="studio-primary" onClick={confirm}>Taslağı değiştir</button></div></div></dialog>
  </main>;
}
