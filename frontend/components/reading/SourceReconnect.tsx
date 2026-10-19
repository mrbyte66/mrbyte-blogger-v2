"use client";
import type { ReadingMark, TextAnchor } from "../../lib/reading/model";
import { ReadingIcon as Icon } from "./ReadingIcon";

/** The island stays next to the chosen paragraph; selection alone never changes a note. */
export function SourceReconnect({mark,fragments,pending,error,onConfirm,onCancel}:{mark:ReadingMark;fragments:TextAnchor[];pending:boolean;error:string|null;onConfirm:()=>void;onCancel:()=>void}){
 const selected=fragments.map(f=>f.quote).join(" ");
 const original=mark.fragments.map(f=>f.quote).join(" ");
 return <div className={`rn-ui rn-reconnect-guide rn-${mark.color??"lavender"}`} role="region" aria-label="Notu yeni metne bağla" aria-busy={pending}>
  <span className="rn-reconnect-step">{selected?2:1}<small>/2</small></span>
  <div className="rn-reconnect-content" aria-live="polite"><strong>{selected?"Yeni yer seçildi":"Yazıda yeni yeri seç"}</strong>
   {selected?<div className="rn-reconnect-quotes"><q title={original}>{original}</q><Icon name="arrow" size={14}/><q title={selected}>{selected}</q></div>:<small>Bağlamadan önce birlikte bakalım.</small>}
   {error&&<small role="alert">{error}</small>}
  </div>
  {selected&&<button className="rn-save" disabled={pending} onPointerDown={e=>e.preventDefault()} onClick={onConfirm}>{pending?"Bağlanıyor…":"Bağla"}<Icon name="link" size={14}/></button>}
  <button className="rn-reconnect-cancel" disabled={pending} aria-label="Bağlamaktan vazgeç" onClick={onCancel}><Icon name="close" size={16}/></button>
 </div>;
}
