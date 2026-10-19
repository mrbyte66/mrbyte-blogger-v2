"use client";
import { useState } from "react";
import Link from "next/link";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { ThemeToggle } from "../SitePreferences";
import { UtilityIsland } from "../UtilityIsland";
import { sourceCases, type SourceCase } from "../../lib/reading/source-cases";
import { resolveSource, sourceLabels, type AnchorMode, type SourceBlock, type SourceState } from "../../lib/reading/source-tracking";
import type { TextAnchor } from "../../lib/reading/model";

const feedback: Record<SourceState,string> = {
 exact:"Notun ilk işaretlediğin ifadeye bağlı.", moved:"Notun metnin yeni yerini buldu.",
 changed:"Notun değişen ifadeyi takip ediyor. Anlamı da değişmiş olabilir; önceki alıntıyla karşılaştır.",
 review:"Kesin bir eşleşme yok. Notun saklı; yanlış bir metin işaretlenmiyor.",
 removed:"Kaynak silindi. Notun ve önceki alıntın saklı kaldı.",
};
function ReadingText({blocks, parts, visible}: {blocks:SourceBlock[];parts:TextAnchor[];visible:boolean}) {
 return <>{blocks.length ? blocks.map(block=>{
  const ranges = (visible ? parts.filter(p=>p.anchorId===block.id) : []).sort((a,b)=>a.start-b.start);
  const merged: {start:number;end:number}[]=[];
  for(const range of ranges){const last=merged.at(-1);if(last&&range.start<=last.end)last.end=Math.max(last.end,range.end);else merged.push({start:range.start,end:range.end});}
  let cursor=0;
  return <p key={block.id}>{merged.flatMap((range,i)=>{const before=block.text.slice(cursor,range.start);cursor=range.end;return [before,<mark key={i}>{block.text.slice(range.start,range.end)}</mark>];})}{block.text.slice(cursor)}</p>;
 }) : <p className="mirror-empty">Bu paragraf kaldırıldı.<br/><span>Notun aşağıda, önceki alıntısıyla duruyor.</span></p>}</>;
}
function MirrorCase({example,index}: {example:SourceCase;index:number}) {
 const original=[{id:"source",text:example.original}];
 const [blocks,setBlocks]=useState(original),[applied,setApplied]=useState(false),[mode,setMode]=useState<AnchorMode>("follow"),[secondMode,setSecondMode]=useState<AnchorMode>("follow"),[visible,setVisible]=useState(true);
 const start=example.original.indexOf(example.quote);
 const source:TextAnchor={anchorId:"source",start,end:start+example.quote.length,quote:example.quote,before:example.original.slice(Math.max(0,start-48),start),after:example.original.slice(start+example.quote.length,start+example.quote.length+48),sourceText:example.original};
 const result=resolveSource(source,blocks,mode),second=resolveSource(source,blocks,secondMode);
 const message=applied ? (example.multiple&&result.state!==second.state ? "İki notun takip tercihi farklı. Her notun sonucu kendi kartında gösteriliyor." : result.state===example.expected ? example.result : feedback[result.state]) : example.description;
 function undo(){setBlocks(original);setApplied(false);}
 return <section className="source-mirror" aria-label={example.title}>
  <header className="mirror-case-heading"><div><small>{String(index+1).padStart(2,"0")} / {sourceCases.length}</small><h2>{example.title}</h2></div><span className={`mirror-state source-${result.state}`}>{applied?sourceLabels[result.state]:"Denemeye hazır"}</span></header>
  <div className="mirror-comparison">
   <section aria-label="Önce" className="mirror-version"><small>ÖNCE</small><h3>Okuma kulübü</h3><ReadingText blocks={original} parts={[source]} visible={visible}/></section>
   <section aria-label="Sonra" className={`mirror-version mirror-after ${applied?"is-applied":""}`} key={applied?"applied":"original"}><small>SONRA</small><h3>Okuma kulübü</h3><ReadingText blocks={blocks} parts={[...result.parts,...(example.multiple?second.parts:[])]} visible={visible}/></section>
  </div>
  {visible&&<div className={`mirror-notes ${example.multiple?"has-two":""}`} aria-label="Örnekteki notlar">
   <article className="mirror-note"><header><span>▤ &nbsp; Kişisel notum</span><small>{applied?sourceLabels[result.state]:"Metne bağlı"}</small></header><p>{example.note}</p><details><summary>Önceki alıntı</summary><blockquote>{example.quote}</blockquote></details></article>
   {example.multiple&&<article className="mirror-note mirror-note-mint"><header><span>▤ &nbsp; İkinci notum</span><small>{sourceLabels[second.state]}</small></header><p>Buluşma saatini kulüpteki arkadaşlarıma da hatırlatmalıyım.</p><details><summary>Bu notun tercihi</summary><label>İkinci notun davranışı<select value={secondMode} onChange={e=>setSecondMode(e.target.value as AnchorMode)}><option value="follow">Metni takip et</option><option value="exact">Özgün alıntıya bağlı kal</option></select></label></details></article>}
  </div>}
  <div className="mirror-feedback" role="status"><span aria-hidden="true">{applied?"✓":"↳"}</span><p>{message}</p></div>
  <div className="mirror-actions"><div className="mirror-primary-actions"><button className="mirror-apply" disabled={applied} onClick={()=>{setBlocks(example.blocks);setApplied(true);}}>{applied?"✓ Uygulandı":example.action}</button><button className="mirror-undo" disabled={!applied} onClick={undo}>↶ &nbsp; Geri al</button></div><div className="mirror-preferences"><button role="switch" aria-checked={visible} onClick={()=>setVisible(!visible)} className="mirror-toggle"><span aria-hidden="true"/>Notları göster</button><details className="mirror-settings"><summary>Takip tercihi</summary><label>Notun davranışı<select value={mode} onChange={e=>setMode(e.target.value as AnchorMode)}><option value="follow">Metni takip et</option><option value="exact">Özgün alıntıya bağlı kal</option></select></label></details></div></div>
  <details className="mirror-free-edit"><summary>Kendim düzenleyeyim</summary><p>Sağdaki metni değiştir; notun nasıl etkilendiğini hemen gör.</p>{blocks.map((block,i)=><label key={block.id}>Paragraf {i+1}<textarea value={block.text} maxLength={20000} onChange={e=>{setBlocks(blocks.map((b,n)=>n===i?{...b,text:e.target.value}:b));setApplied(true);}}/></label>)}{!blocks.length&&<button onClick={undo}>Metni geri getir</button>}</details>
 </section>;
}
export function SourceCasePage(){
 const {workspace}=useWorkspace();const appearance=themeAppearance(workspace.applied);
 const [selected,setSelected]=useState(2);
 const shortcuts=["suffix","reorder","deleted"];
 return <main className={`${appearance.className} source-cases-page`} style={appearance.style}>
  <header className="source-cases-header"><Link href="/studio">← Studio</Link><strong>SATIR. / Not Senaryoları</strong><UtilityIsland label="Senaryo sayfası görünümü"><ThemeToggle/></UtilityIsland></header>
  <div className="mirror-intro"><small>SATIR AYNASI</small><h1>Metin değişsin. Notun ne yapsın?</h1><p>Bir değişiklik dene, önceki hâliyle karşılaştır.</p></div>
  <div className="mirror-selector"><nav aria-label="Hızlı örnekler">{shortcuts.map(id=>{const index=sourceCases.findIndex(c=>c.id===id);return <button key={id} aria-pressed={selected===index} onClick={()=>setSelected(index)}>{sourceCases[index].title}</button>;})}</nav><label>Tüm örnekler <span>{sourceCases.length}</span><select aria-label="Tüm örnekler" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{sourceCases.map((c,i)=><option key={c.id} value={i}>{String(i+1).padStart(2,"0")} · {c.title}</option>)}</select></label></div>
  <MirrorCase key={selected} example={sourceCases[selected]} index={selected}/>
  <div className="mirror-pagination"><nav aria-label="Örnekler arasında geçiş"><button aria-label="Önceki örnek" disabled={selected===0} onClick={()=>setSelected(selected-1)}>←</button><span>{selected+1} / {sourceCases.length}</span><button aria-label="Sonraki örnek" disabled={selected===sourceCases.length-1} onClick={()=>setSelected(selected+1)}>→</button></nav><p>Pratik alanı · Gerçek yazıların ve notların değişmez.</p></div>
 </main>;
}
