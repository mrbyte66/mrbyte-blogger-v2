"use client";
import { useState } from "react";
import type { ReadingMark } from "../../lib/reading/model";
import { resolveSource, type SourceBlock, type AnchorMode, type SourceState } from "../../lib/reading/source-tracking";
import { ReadingIcon as Icon } from "./ReadingIcon";
const titles:Record<SourceState,string>={exact:"Metne bağlı",moved:"Metni takip etti",changed:"Alıntı değişti",review:"Yeri net değil",removed:"Alıntı yazıda yok"};
function Quote({text,other,previous,full}:{text:string;other:string;previous?:boolean;full:boolean}){
 let start=0,end=0;
 while(start<Math.min(text.length,other.length)&&text[start]===other[start])start++;
 while(end<text.length-start&&end<other.length-start&&text.at(-1-end)===other.at(-1-end))end++;
 const limit=full?text.length:96;
 const content=text.slice(0,limit),tail=content.slice(Math.max(start,text.length-end));
 const change=content.slice(start,Math.min(content.length,text.length-end));
 return <q>{content.slice(0,start)}{change&&(previous?<del>{change}</del>:<ins>{change}</ins>)}{tail}{text.length>limit?"…":""}</q>;
}
export function SourceDetails({mark,blocks,readOnly,busy=false,onMode,onReconnect,reconnecting=false,hasSelection=false,onUndo}:{mark:ReadingMark;blocks:SourceBlock[];readOnly?:boolean;busy?:boolean;onMode?:(mode:AnchorMode)=>void;onReconnect?:()=>void;reconnecting?:boolean;hasSelection?:boolean;onUndo?:()=>void}){
 const resolved=mark.fragments.map(f=>resolveSource(f,blocks,mark.anchorMode));
 const state=(["review","removed","changed","moved","exact"] as const).find(s=>resolved.some(r=>r.state===s))??"exact";
 const critical=state==="review"||state==="removed"||state==="changed";
 const [show,setShow]=useState<boolean|null>(null),[full,setFull]=useState(false),[options,setOptions]=useState(false);
 const expanded=reconnecting?true:(show??critical);
 const original=mark.originalQuote??mark.fragments.map(f=>f.quote).join(" ");
 const current=resolved.map(r=>r.current).filter(Boolean).join(" ");
 const missing=state==="removed"||state==="review";
 const title=onUndo?"Bağlandı":state==="removed"&&current?"Alıntının bir kısmı yok":titles[state];
 return <section className={`rn-source-details source-${state}`} aria-label="Notun metinle bağı">
  <div className="rn-source-heading"><button className="rn-source-summary" aria-expanded={expanded} onClick={()=>setShow(!expanded)}><Icon name={onUndo?"check":missing?"unlink":"link"} size={14}/><span>{title}</span><Icon name="down" size={12}/></button>{critical&&!reconnecting&&<span className="rn-source-safe"><Icon name="check" size={12}/>Notun saklı</span>}
   {!readOnly&&!reconnecting&&onMode&&<div className="rn-source-options" data-open={options}><button className="rn-source-options-trigger" aria-label="Takip tercihini değiştir" aria-expanded={options} onClick={()=>setOptions(!options)} data-tip="Takip tercihi"><Icon name="settings" size={14}/></button>{options&&<div><small>Metin değişirse?</small><div role="group" aria-label="Notun takip tercihi"><button disabled={busy} aria-pressed={(mark.anchorMode??"follow")==="follow"} onClick={()=>onMode("follow")}>Takip et</button><button disabled={busy} aria-pressed={mark.anchorMode==="exact"} onClick={()=>onMode("exact")}>Alıntıyı koru</button></div></div>}</div>}
  </div>
  {expanded&&<div className="rn-source-visual">
   <div className="rn-source-quote"><small>{missing||reconnecting?"Alıntı":"Önce"}</small><Quote text={original} other={current||original} previous full={full}/></div>
   {!missing&&!reconnecting&&<span className="rn-source-flow" aria-hidden="true">↓</span>}
   {!missing&&!reconnecting&&current?<div className="rn-source-quote rn-source-now"><small>Şimdi</small><Quote text={current} other={original} full={full}/></div>:null}
   {Math.max(original.length,current.length)>96&&<button className="rn-source-full" onClick={()=>setFull(!full)}>{full?"Alıntıyı kısalt":"Alıntının tamamı"}</button>}
   {state==="changed"&&!reconnecting&&<small className="rn-source-meaning">Anlamı da değişmiş olabilir.</small>}
  </div>}
  {reconnecting&&<span className="rn-source-waiting"><i/>{hasSelection?"Onayını bekliyor":"Yeni yer bekleniyor"}</span>}
  {critical&&!readOnly&&!reconnecting&&onReconnect&&<button className="rn-source-reconnect" disabled={busy} onClick={onReconnect}><Icon name="link" size={14}/>Yeni yer seç<Icon name="arrow" size={13}/></button>}
  {onUndo&&!readOnly&&!reconnecting&&<button className="rn-source-undo" disabled={busy} onClick={onUndo}><Icon name="undo" size={13}/>Geri al</button>}
  {readOnly&&expanded&&<small className="rn-source-readonly">Studio önizlemesi</small>}
 </section>;
}
