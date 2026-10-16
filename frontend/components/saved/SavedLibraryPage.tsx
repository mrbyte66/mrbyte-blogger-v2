"use client";
import { useEffect, useId, useRef, useState, type DragEvent, type CSSProperties } from "react";
import { SitePageHeader } from "../SitePageHeader";
import { useAuth } from "../auth/AuthProvider";
import { useArticles } from "../../lib/articles/use-articles";
import { publicArticles } from "../../lib/editorial/store";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { CatalogCover } from "../CatalogCover";
import { articleDraftCover } from "../../lib/catalog-covers";
import { SlideLink } from "../SlideLink";
import { scrollBehavior } from "../../lib/motion";
import { LibraryIcon as Icon } from "../library/LibraryIcon";
import { LibraryPreview } from "./LibraryPreview";
import { useSavedLibrary, type SavedEntry } from "./SavedProvider";

const dragType = "application/x-satir-bookmark";
export function SavedLibraryPage() {
  const { session } = useAuth();
  return <SavedLibraryView key={session ? `member:${session.profile.id}` : "guest"} />;
}
function SavedLibraryView() {
  const saved = useSavedLibrary();
  const { library, defaultId, member, ready, error, create, rename, deleteCategory, remove, move, restore } = saved;
  const auth = useAuth(); const { articles } = useArticles(); const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  const [settings, setSettings] = useState(saved.recallView);
  const { selected, query, sort, view, limit, quickPinned, previewId, previewWidth } = settings;
  const nameErrorId = useId();
  const nameInput = useRef<HTMLInputElement>(null);
  const [nameError, setNameError] = useState("");
  const showNameError = (message: string) => { setNameError(message); nameInput.current?.focus(); };
  const [name, setName] = useState(""); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null); const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [wide, setWide] = useState(false); const [desktopPreview, setDesktopPreview] = useState(false);
  const [previewDrop, setPreviewDrop] = useState(false);
  const showPinned = quickPinned && wide;
  const pinnedRef = useRef(false); pinnedRef.current = showPinned;
  const [quickQuery, setQuickQuery] = useState(""); const [quickOpen, setQuickOpen] = useState(false); const [compact, setCompact] = useState(false); const [jump, setJump] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: () => Promise<boolean> } | null>(null);
  const root = useRef<HTMLDivElement>(null); const quick = useRef<HTMLDetailsElement>(null); const quickInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (nameError && !busy) nameInput.current?.focus(); }, [nameError, busy]);
  const remember = useRef(saved.rememberView); remember.current = saved.rememberView;
  const current = useRef(settings); current.current = settings;
  const restored = useRef(false); const operation = useRef(false);
  const category = library.collections.find(item => item.id === selected);
  const custom = category && !category.isDefault ? category : undefined;
  const articleMap = new Map(publicArticles(articles).filter(a => a.id).map(a => [a.id!, a]));
  const articleFor = (entry: SavedEntry) => entry.available ? articleMap.get(entry.articleId) : undefined;
  const previewEntry = library.entries.find(e => e.articleId === previewId);
  const previewArticle = previewEntry && articleFor(previewEntry);
  const hasPreview = !!previewArticle && member;
  const search = query.trim().toLocaleLowerCase("tr");
  const items = library.entries.filter(entry => {
    const a = articleFor(entry);
    return (selected === "all" || entry.collectionId === selected) && (!search || (a && [a.title, a.excerpt, ...(a.categories ?? [a.category]), library.collections.find(c => c.id === entry.collectionId)?.name].join(" ").toLocaleLowerCase("tr").includes(search)));
  }).sort((a,b) => sort === "title" ? (articleFor(a)?.title ?? "￿").localeCompare(articleFor(b)?.title ?? "￿", "tr") : sort === "date" ? (articleFor(b)?.publishedAt ?? "").localeCompare(articleFor(a)?.publishedAt ?? "") : b.savedAt.localeCompare(a.savedAt));
  const shown = items.slice(0, limit);
  const count = (id: string) => library.entries.filter(entry => entry.collectionId === id).length;
  const quickSearch = quickQuery.trim().toLocaleLowerCase("tr");
  const quickEntries = library.entries.filter(entry => { const a = articleFor(entry); return a && (!quickSearch || a.title.toLocaleLowerCase("tr").includes(quickSearch)); });
  const quickCollections = library.collections.filter(c => !quickSearch || c.name.toLocaleLowerCase("tr").includes(quickSearch));
  function update(patch: Partial<typeof settings>) { setSettings(s => ({ ...s, ...patch, limit: 24, scroll: 0 })); }
  function select(id: string) { update({ selected: id }); setEditing(false); setNameError(""); setDropTarget(null); }
  async function act(task: () => Promise<boolean>, after: () => void) {
    if (operation.current) return;
    operation.current = true; setBusy(true);
    try { if (await task()) after(); } finally { operation.current = false; setBusy(false); }
  }
  function closeMenus() { root.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(d => { d.open = false; }); }
  function goTo(entry: SavedEntry) { setSettings(s => ({ ...s, selected: "all", query: "", limit: library.entries.length, ...(hasPreview ? { previewId:entry.articleId } : {}) })); setJump(entry.articleId); closeMenus(); }
  function openPreview(entry: SavedEntry) {
    if (!articleFor(entry)) return;
    setSettings(s => ({ ...s, previewId: entry.articleId })); closeMenus();
    setDragging(null); setPreviewDrop(false); setDropTarget(null);
  }
  function closePreview() {
    setSettings(s => ({ ...s, previewId: null }));
    requestAnimationFrame(() => document.getElementById(`saved-${previewId}`)?.querySelector<HTMLButtonElement>(".library-peek")?.focus({preventScroll:true}));
  }
  function dropPreview(event: DragEvent) {
    event.preventDefault(); const id = event.dataTransfer.getData(dragType);
    const entry = library.entries.find(e => e.articleId === id);
    if (entry && dragging === id && !busy) openPreview(entry);
    setPreviewDrop(false);
  }
  function removeEntry(entry: SavedEntry) {
    closeMenus();
    void act(() => remove(entry.articleId), () => setToast({ text:"Kitaplıktan kaldırıldı", undo: () => restore(entry) }));
  }
  function moveEntry(entry: SavedEntry, target: string) {
    closeMenus(); setDragging(null); setDropTarget(null);
    if (target === entry.collectionId) return;
    void act(() => move(entry.articleId, target), () => setToast({ text: `${library.collections.find(c => c.id === target)?.name ?? "Koleksiyona"} koleksiyonuna taşındı`, undo: () => move(entry.articleId, entry.collectionId) }));
  }
  function drop(event: DragEvent, target: string) {
    event.preventDefault(); const id = event.dataTransfer.getData(dragType);
    const entry = library.entries.find(e => e.articleId === id);
    if (entry && dragging === id && !busy) moveEntry(entry, target);
  }
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(min-width: 1100px)");
    const previewMedia = window.matchMedia("(min-width: 901px)");
    const sync = () => { setWide(media.matches); setDesktopPreview(previewMedia.matches); }; sync();
    media.addEventListener?.("change", sync); previewMedia.addEventListener?.("change", sync);
    return () => { media.removeEventListener?.("change", sync); previewMedia.removeEventListener?.("change", sync); };
  }, []);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const title = root.current?.querySelector(".library-title"); if (!title) return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), { threshold:0 }); observer.observe(title);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const scroll = () => { if (restored.current) remember.current({ ...current.current, scroll: window.scrollY }); };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => { window.removeEventListener("scroll", scroll); };
  }, []);
  useEffect(() => { if (restored.current) remember.current({ ...settings, scroll: window.scrollY }); }, [settings]);
  useEffect(() => {
    if (!ready || !member || restored.current) return;
    restored.current = true;
    if (selected !== "all" && !library.collections.some(c => c.id === selected)) setSettings(s => ({ ...s, selected: "all" }));
    if (settings.scroll && location.pathname === "/kaydedilenler") { const id = requestAnimationFrame(() => window.scrollTo({ top: settings.scroll, behavior: "instant" })); return () => cancelAnimationFrame(id); }
  }, [ready, member, library.collections, selected, settings.scroll]);
  useEffect(() => {
    if (!jump) return;
    const id = requestAnimationFrame(() => { const target = document.getElementById(`saved-${jump}`); target?.scrollIntoView({ block: "center", behavior: scrollBehavior() }); target?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true }); setJump(null); });
    return () => cancelAnimationFrame(id);
  }, [jump, limit, view]);
  useEffect(() => {
    function dismiss(event: PointerEvent) { root.current?.querySelectorAll<HTMLDetailsElement>("details[open]").forEach(d => { if (!d.contains(event.target as Node)) d.open = false; }); }
    function escape(event: KeyboardEvent) {
      if (document.querySelector("dialog[open]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); if (pinnedRef.current) { quickInput.current?.focus(); return; } if (quick.current) quick.current.open = !quick.current.open; return; }
      if (event.key !== "Escape") return; const open = root.current?.querySelector<HTMLDetailsElement>("details[open]"); if (open) { open.open = false; open.querySelector("summary")?.focus(); event.stopPropagation(); } else setEditing(false); }
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(null), 10000); return () => clearTimeout(id); }, [toast]);
  const quickPanel = <div className="library-quick-panel">
    <div className="library-quick-heading"><span>Hızlı liste</span>{wide && <button type="button" className="library-pin" aria-label={showPinned ? "Hızlı listeyi ayır" : "Hızlı listeyi sola sabitle"} aria-pressed={showPinned} title={showPinned ? "Sabitlemeyi kaldır" : "Sola sabitle"} onClick={() => { setSettings(s => ({ ...s, quickPinned: !showPinned })); closeMenus(); requestAnimationFrame(() => { if (!showPinned) quickInput.current?.focus(); else quick.current?.querySelector("summary")?.focus(); }); }}><Icon kind="pin" /></button>}</div><label className="library-search"><Icon kind="search" /><span className="visually-hidden">Koleksiyon veya yazı ara</span><input ref={quickInput} type="search" value={quickQuery} placeholder="Koleksiyon veya yazı ara" onChange={e => setQuickQuery(e.target.value)} onKeyDown={e => { if (e.key === "ArrowDown") { e.preventDefault(); quickInput.current?.closest(".library-quick-panel")?.querySelector<HTMLButtonElement>(".quick-result")?.focus(); } if (e.key === "Enter") { if (quickEntries[0]) { e.preventDefault(); goTo(quickEntries[0]); } else if (quickCollections[0]) { e.preventDefault(); select(quickCollections[0].id); closeMenus(); } } }} /></label><div className="quick-results" onKeyDown={e => { if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return; const all = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button")); const i = all.indexOf(document.activeElement as HTMLButtonElement); e.preventDefault(); all[(i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus(); }}><p>Koleksiyonlar</p>{quickCollections.map(c => <button type="button" className="quick-result" key={c.id} onClick={() => { select(c.id); closeMenus(); root.current?.scrollIntoView({ behavior: scrollBehavior() }); }}><Icon kind="folder" />{c.name}<span>{count(c.id)}</span></button>)}<p>Yazılar</p>{quickEntries.slice(0,40).map(entry => <button type="button" className={`quick-result${hasPreview && previewId === entry.articleId ? " is-previewed" : ""}`} key={entry.articleId} onClick={() => goTo(entry)}><Icon kind="bookmark" /><span>{articleFor(entry)!.title}</span><Icon kind="arrow" /></button>)}{quickEntries.length > 40 && <small>Diğer başlıklar için aramanı daralt.</small>}{!quickEntries.length && !quickCollections.length && <p>Sonuç bulunamadı.</p>}</div></div>;
  return <main className={`${appearance.className} saved-page library-v11${showPinned ? " has-pinned-quick" : ""}${hasPreview ? " has-library-preview" : ""}${dragging ? " is-preview-dragging" : ""}`} style={{...appearance.style,"--library-preview-width":`${previewWidth}px`} as CSSProperties} aria-busy={busy}>
    <SitePageHeader theme={workspace.applied} />
    <div className="saved-layout" ref={root}>
      <div className="library-title"><h1>Kitaplığım</h1>{member && <><label className="library-search"><Icon kind="search" /><span className="visually-hidden">Kitaplıkta ara</span><input type="search" placeholder="Kitaplıkta ara" value={query} onChange={e => update({ query: e.target.value })} /></label></>}</div>
      {error && <p role="alert" className="saved-error">{error}</p>}
      {!member ? <section className="saved-empty"><Icon kind="bookmark" /><h2>Kendine bir kitaplık kur.</h2><p>{auth.session ? "Kitaplığı kullanmak için e-posta adresini doğrula." : "Sevdiğin yazılar, yalnız sana ait bir yerde."}</p>{!auth.session && <button type="button" onClick={() => auth.openAuth()}>Giriş yap</button>}</section> : !ready ? <p role="status">Kitaplık yükleniyor…</p> : <>
        <div className="library-workspace">{showPinned && <aside className="library-quick-rail" aria-label="Sabit hızlı liste">{quickPanel}</aside>}<div className="library-main">
        <div className={`library-sticky${compact ? " is-compact" : ""}`}>
          <div className="saved-category-tabs" role="group" aria-label="Kaydedilen koleksiyonları">
            <button type="button" className="folder-tab" aria-pressed={selected === "all"} onClick={() => select("all")}>Tümü <span>{library.entries.length}</span></button>
            {library.collections.map((c, i) => <button type="button" title={c.name} key={c.id} className={`folder-tab folder-${i % 3}${dropTarget === c.id ? " is-drop-target" : ""}`} aria-pressed={selected === c.id} disabled={busy} onClick={() => select(c.id)} onDragOver={e => { if (dragging && !busy) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDropTarget(c.id); } }} onDragLeave={() => setDropTarget(null)} onDrop={e => drop(e,c.id)}>{c.name} <span>{count(c.id)}</span>{dropTarget === c.id && <small>Buraya taşı</small>}</button>)}
            <button type="button" className="library-add collection-add" aria-label="Yeni koleksiyon" title="Yeni koleksiyon" aria-expanded={editing && !custom} onClick={() => { select("all"); setName(""); setEditing(true); }}><Icon kind="plus" /></button>
          </div>
          <div className="library-actions">{compact && <label className="library-search sticky-search"><Icon kind="search" /><span className="visually-hidden">Kaydırırken kitaplıkta ara</span><input type="search" placeholder="Ara" value={query} onChange={e => update({ query:e.target.value })} /></label>}<label className="library-sort"><span className="visually-hidden">Sıralama</span><select value={sort} onChange={e => update({ sort: e.target.value })}><option value="saved">Son eklenen</option><option value="date">Yayın tarihi</option><option value="title">Başlık · A–Z</option></select></label>
            <div className="library-view-toggle" role="group" aria-label="Kitaplık görünümü"><button type="button" aria-label="Kart görünümü" aria-pressed={view === "grid"} onClick={() => setSettings(s => ({ ...s, view: "grid" }))}><Icon kind="grid" /></button><button type="button" aria-label="Kompakt liste" aria-pressed={view === "list"} onClick={() => setSettings(s => ({ ...s, view: "list" }))}><Icon kind="list" /></button></div>
            {!showPinned && <details ref={quick} className="library-quick" onToggle={e => { setQuickOpen(e.currentTarget.open); if (e.currentTarget.open) requestAnimationFrame(() => quickInput.current?.focus()); }}><summary title="Hızlı git · ⌘ / Ctrl K"><Icon kind="list" /><span>Hızlı git</span></summary>{quickOpen && quickPanel}</details>}
          </div>
        </div>
        <div className="library-meta"><span role="status">{items.length} kayıt</span>{custom && <button type="button" className="saved-manage" aria-expanded={editing} onClick={() => { setName(custom?.name ?? ""); setNameError(""); setEditing(!editing); }}>Koleksiyonu düzenle</button>}</div>
        {editing && <form className="saved-category-form" onSubmit={e => { e.preventDefault(); if (!name.trim()) { showNameError("Koleksiyonuna bir ad ver."); return; } setNameError(""); void act(() => custom ? rename(custom.id,name,showNameError) : create(name,undefined,showNameError), () => { setName(""); setEditing(false); }); }}><label>Koleksiyon adı<input ref={nameInput} autoFocus value={name} disabled={busy} maxLength={60} aria-label="Koleksiyon adı" aria-invalid={!!nameError} aria-describedby={nameError ? nameErrorId : undefined} onChange={e => { setName(e.target.value); setNameError(""); }} />{nameError && <span id={nameErrorId} className="auth-field-error" role="alert">{nameError}</span>}</label><button type="submit" disabled={busy}>Kaydet</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Vazgeç</button>{custom && <button type="button" disabled={busy} onClick={() => void act(() => deleteCategory(custom.id), () => { select(defaultId || "all"); setToast({ text: "Yazılar Genel koleksiyonuna taşındı" }); })}>Koleksiyonu kaldır</button>}</form>}
        {!items.length ? <section className="saved-empty"><Icon kind="bookmark" /><h2>{search ? "Aradığın satır henüz burada değil." : library.entries.length ? "Bu koleksiyon henüz boş." : "İlk satırını sakla."}</h2>{search ? <button type="button" onClick={() => update({ query: "", selected: "all" })}>Aramayı temizle</button> : <SlideLink href="/" direction="back">Yazıları keşfet ↗</SlideLink>}</section> : <div className={`saved-articles library-${view}`}>{shown.map(entry => {
          const article = articleFor(entry); const collection = library.collections.find(c => c.id === entry.collectionId);
          return <article id={`saved-${entry.articleId}`} className={`saved-item library-entry${hasPreview && previewId === entry.articleId ? " is-previewed" : ""}${dragging === entry.articleId ? " is-dragging" : ""}`} key={entry.articleId} draggable={!busy} onDragStart={e => { if ((e.target as HTMLElement).closest("button,summary,select") || busy) { e.preventDefault(); return; } setDragging(entry.articleId); e.dataTransfer.setData(dragType,entry.articleId); e.dataTransfer.effectAllowed = "copyMove"; const box=e.currentTarget.getBoundingClientRect(); e.dataTransfer.setDragImage?.(e.currentTarget,Math.max(0,e.clientX-box.left),Math.max(0,e.clientY-box.top)); }} onDragEnd={() => { setDragging(null); setDropTarget(null); setPreviewDrop(false); }}>
            {article ? <SlideLink className="library-entry-link" title={article.title} href={`/yazilar/${article.slug}`} draggable={!busy} onClick={() => remember.current({ ...settings, scroll: window.scrollY })}><span className="library-entry-art"><CatalogCover src={article.coverUrl} fallback={articleDraftCover(article)} /></span><Icon kind="bookmark" /><span className="library-entry-text"><span className="library-entry-category">{article.category}</span><span className="article-card-title">{article.title}</span></span><span className="library-entry-collection">{collection?.name}</span><time dateTime={entry.savedAt}>{new Date(entry.savedAt).toLocaleDateString("tr-TR", { day:"numeric",month:"short",year:"numeric" })}</time><span className="library-read-arrow"><Icon kind="arrow" /></span></SlideLink> : <div className="saved-unavailable"><h2>Yazı şu anda erişilemiyor</h2><button type="button" disabled={busy} onClick={() => void act(() => remove(entry.articleId), () => setToast({ text:"Kayıt kaldırıldı" }))}>Kaydı kaldır</button></div>}
            {article && <><button type="button" className="library-peek" aria-label={`Önizle: ${article.title}`} aria-pressed={hasPreview && previewId === entry.articleId} onClick={() => openPreview(entry)}><Icon kind="eye" /><span className="library-tooltip" aria-hidden="true">Kenarda oku</span></button><button type="button" className="library-bookmark" disabled={busy} aria-label={`Kitaplıktan kaldır: ${article.title}`} onClick={() => removeEntry(entry)}><Icon kind="bookmark" /></button><details className="library-entry-menu"><summary aria-label={`Kaydı yönet: ${article.title}`}><span aria-hidden="true">•••</span></summary><div className="library-entry-popover"><label><Icon kind="folder" /><span>Koleksiyona taşı</span><select aria-label={`${article.title} için koleksiyon`} value={entry.collectionId} disabled={busy} onChange={e => moveEntry(entry,e.target.value)}>{library.collections.map(c => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label><button type="button" disabled={busy} onClick={() => removeEntry(entry)}><Icon kind="bookmark" />Kitaplıktan kaldır</button></div></details></>}
          </article>;
        })}</div>}
        {!!items.length && <div className="library-end"><span>{shown.length} / {items.length} kayıt</span>{limit < items.length && <button type="button" onClick={() => setSettings(s => ({ ...s, limit:s.limit+24 }))}>Daha fazla göster <span aria-hidden="true">↓</span></button>}</div>}
        </div>{hasPreview && <LibraryPreview article={previewArticle} desktop={desktopPreview} width={previewWidth} onResize={value=>setSettings(s=>({...s,previewWidth:value}))} onClose={closePreview} onOpen={()=>remember.current({...settings,scroll:window.scrollY})} />}</div>
        {library.entries.some(e=>!!articleFor(e)) && <div className={`library-preview-edge${previewDrop ? " is-over" : ""}${hasPreview ? " has-content" : ""}`} onDragOver={e=>{if(dragging && !busy){e.preventDefault();e.dataTransfer.dropEffect="copy";setPreviewDrop(true);setDropTarget(null);}}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setPreviewDrop(false);}} onDrop={dropPreview}><button type="button" className="library-preview-plus" aria-label="Yazı önizlemesi aç" onClick={()=>{const entry = items.find(e=>articleFor(e)) ?? library.entries.find(e=>articleFor(e));if(entry)openPreview(entry);}}><Icon kind="plus" /><span className="library-tooltip" aria-hidden="true">Kenarda oku</span></button>{dragging && <span className="library-drop-hint">{previewDrop ? "Buraya bırak" : "Kenarda oku"}</span>}</div>}
      </>}
      {toast && <div className="library-toast" role="status"><span aria-hidden="true">✓</span><span>{toast.text}</span>{toast.undo && <button type="button" disabled={busy} onClick={() => void act(toast.undo!, () => setToast({ text:"Geri alındı" }))}>Geri al</button>}<button type="button" aria-label="Bildirimi kapat" onClick={() => setToast(null)}><Icon kind="close" /></button></div>}
    </div>
  </main>;
}
