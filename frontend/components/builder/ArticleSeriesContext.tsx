"use client";
import { useRef, useState } from "react";
import type { BlogSeries } from "../../lib/series/model";
import { statusLabels } from "../../lib/editorial/store";
import { EditorIcon } from "./EditorIcon";

export function ArticleSeriesContext({ series, selectedId, creating, onSelect, onCreate }: { series: readonly BlogSeries[]; selectedId: string | null; creating: boolean; onSelect: (id: string | null) => void; onCreate: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const selected = series.find(s => s.id === selectedId);
  function close() { dialog.current?.close(); trigger.current?.focus(); }
  function choose(id: string | null) { onSelect(id); close(); }
  const matches = series.filter(s => s.status !== "trashed" && s.title.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));
  return <div className="article-series-context">
    <button ref={trigger} className="series-context-trigger" aria-label="Yazının serisi" aria-haspopup="dialog" onClick={() => { setQuery(""); dialog.current?.showModal(); }}><EditorIcon name="series"/><span>{creating ? "Yeni seri" : selected?.title ?? "Bağımsız yazı"}</span><span aria-hidden="true">⌄</span></button>
    <dialog ref={dialog} className="studio-series-dialog" aria-labelledby="series-picker-title" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="inspector-heading"><div><span className="studio-eyebrow">YAZININ YERİ</span><h2 id="series-picker-title">Bir seriye bağla.</h2></div><button aria-label="Seri seçimini kapat" onClick={close}><EditorIcon name="close"/></button></div>
      <input className="series-search" aria-label="Seri ara" placeholder="Serilerinde ara…" value={query} onChange={e=>setQuery(e.target.value)}/>
      <div className="series-picker-options"><button className={!selectedId ? "is-current" : ""} aria-pressed={!selectedId} onClick={()=>choose(null)}><EditorIcon name="body"/><span><strong>Bağımsız yazı</strong><small>Yazılar arasında yer alsın.</small></span>{!selectedId && <EditorIcon name="check"/>}</button>
      {matches.map(s=><button key={s.id} className={selectedId === s.id ? "is-current" : ""} aria-pressed={selectedId === s.id} onClick={()=>choose(s.id)}><EditorIcon name="series"/><span><strong>{s.title}</strong><small>{s.articleSlugs.length} bölüm · {statusLabels[s.status]}</small></span>{selectedId === s.id && <EditorIcon name="check"/>}</button>)}
      {!matches.length && <p className="series-search-empty">Bu aramayla eşleşen seri yok.</p>}</div>
      <button className="series-create" onClick={()=>{close();onCreate();}}><EditorIcon name="plus"/>Yeni seri oluştur</button>
    </dialog>
  </div>;
}
