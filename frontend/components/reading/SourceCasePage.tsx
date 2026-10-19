"use client";
import { useState } from "react";
import Link from "next/link";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { ThemeToggle } from "../SitePreferences";
import { UtilityIsland } from "../UtilityIsland";
import { sourceCases, type SourceCase } from "../../lib/reading/source-cases";
import { resolveSource, sourceLabels, type AnchorMode } from "../../lib/reading/source-tracking";
import { SourceDetails } from "./SourceDetails";
import type { ReadingMark, TextAnchor } from "../../lib/reading/model";
function Case({ example }: { example: SourceCase }) {
 const [blocks,setBlocks]=useState(example.blocks),[mode,setMode]=useState<AnchorMode>("follow"),[secondMode,setSecondMode]=useState<AnchorMode>("follow"),[visible,setVisible]=useState(true);
 const start=example.original.indexOf(example.quote);
 const source: TextAnchor={anchorId:"source",start,end:start+example.quote.length,quote:example.quote,before:example.original.slice(Math.max(0,start-48),start),after:example.original.slice(start+example.quote.length,start+example.quote.length+48),sourceText:example.original};
 const resolution=resolveSource(source,blocks,mode);
 const mark:ReadingMark={id:example.id,kind:"note",fragments:[source],note:"Bu satırdaki düşüncemi daha sonra tekrar değerlendireceğim.",createdAt:"2026-10-19T00:00:00Z",anchorMode:mode};
 return <section className="source-case" id={example.id} aria-label={example.title}>
  <header><div><h2>{example.title}</h2><p>{example.description}</p></div><span className={`source-state source-${resolution.state}`}>{sourceLabels[resolution.state]}</span></header>
  <div className="source-case-controls"><button aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?"Notlar açık":"Notlar gizli"}</button><button onClick={()=>setBlocks([{id:"source",text:example.original}])}>Özgün sürüme dön</button><button onClick={()=>{setBlocks(example.blocks);setMode("follow");setSecondMode("follow");}}>Örneği sıfırla</button><label>Kaynak takibi<select value={mode} onChange={e=>setMode(e.target.value as AnchorMode)}><option value="follow">Metni takip et</option><option value="exact">Özgün alıntıya bağlı kal</option></select></label></div>
  <div className="source-case-workspace"><div><small>ÖZGÜN SÜRÜM</small><p className="source-case-original">{example.original.slice(0,start)}<mark>{example.quote}</mark>{example.original.slice(start+example.quote.length)}</p><small>GÜNCEL METİN · DÜZENLEYEBİLİRSİN</small>{blocks.map((b,i)=><label className="source-case-input" key={b.id}>Paragraf {i+1}<textarea aria-label={`${example.title} güncel paragraf ${i+1}`} value={b.text} maxLength={20000} onChange={e=>setBlocks(blocks.map((p,n)=>n===i?{...p,text:e.target.value}:p))}/></label>)}
   <div className="source-case-reading" aria-label="Notun güncel konumu">{blocks.map(b=>{const parts=visible?(resolution.parts.length?resolution.parts:example.multiple?resolveSource(source,blocks,secondMode).parts:[]).filter(p=>p.anchorId===b.id).sort((a,c)=>a.start-c.start):[];let cursor=0;return <p key={b.id}>{parts.flatMap((p,i)=>{const before=b.text.slice(cursor,p.start);cursor=p.end;return [before,<mark key={i} className={`source-${resolution.state}`}>{b.text.slice(p.start,p.end)}</mark>];})}{b.text.slice(cursor)}</p>;})}</div>
  </div>{visible&&<aside className="source-case-notes"><article><small>METİN NOTU · LAVANTA</small><p>{mark.note}</p><SourceDetails mark={mark} blocks={blocks} onMode={setMode}/></article>{example.multiple&&<article className="source-note-mint"><small>İKİNCİ NOT · NANE</small><p>Aynı alıntıya bağlı bağımsız ikinci düşüncem.</p><SourceDetails mark={{...mark,id:mark.id+"-second",anchorMode:secondMode}} blocks={blocks} onMode={setSecondMode}/></article>}<p className="source-case-decision">{resolution.parts.length?"Gösterilen vurgu, uygulamanın gerçek kaynak eşleştirme motorundan geliyor.":"Bu durumda metne vurgu uygulanmıyor. Not ve özgün alıntı saklı kalıyor."}</p></aside>}</div>
 </section>;
}
export function SourceCasePage(){
 const {workspace}=useWorkspace();const appearance=themeAppearance(workspace.applied);
 return <main className={`${appearance.className} source-cases-page`} style={appearance.style}>
  <header className="source-cases-header"><Link href="/studio">← Studio</Link><strong>SATIR. / Not Senaryoları</strong><UtilityIsland label="Senaryo sayfası görünümü"><ThemeToggle/></UtilityIsland></header>
  <div className="source-cases-intro"><small>NOT ATLASI · KAYNAK DAVRANIŞLARI</small><h1>Metin değişir.<br/>Düşüncen kaybolmaz.</h1><p>{sourceCases.length} canlı örnek. Her örnekte metni değiştirebilir, notları gizleyebilir ve takip tercihini karşılaştırabilirsin. Bu sayfa gerçek notlarına, yazılarına veya tarayıcı not kayıtlarına yazmaz.</p></div>
  <nav className="source-cases-nav" aria-label="Not senaryoları">{sourceCases.map(c=><a key={c.id} href={`#${c.id}`}>{c.title}</a>)}</nav>
  <div className="source-cases-list">{sourceCases.map(c=><Case key={c.id} example={c}/>)}</div>
 </main>;
}
