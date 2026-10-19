"use client";
import { useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { SitePageHeader } from "../SitePageHeader";
import { PublicFrame } from "../PublicFrame";
import { sourceCases, type SourceCase } from "../../lib/reading/source-cases";
import { resolveSource, type SourceBlock } from "../../lib/reading/source-tracking";
import type { TextAnchor } from "../../lib/reading/model";

// Begin with the useful everyday edit; keep all fourteen behaviours in a single guided route.
const lessonOrder = ["suffix", "prefix", "reorder", "split", "merge", "meaning", "rewrite", "duplicate", "remaining-copy", "deleted", "block-removed", "undo", "overlap", "unchanged"];
const lessons = lessonOrder.map(id => sourceCases.find(c => c.id === id)!);
function ReadingText({ blocks, parts }: { blocks: SourceBlock[]; parts: TextAnchor[] }) {
 return <>{blocks.length ? blocks.map(block => {
  const ranges = parts.filter(p => p.anchorId === block.id).sort((a,b) => a.start-b.start);
  let cursor = 0;
  return <p key={block.id}>{ranges.flatMap((range,i) => { const before=block.text.slice(cursor,range.start); cursor=range.end; return [before,<mark key={i}>{block.text.slice(range.start,range.end)}</mark>]; })}{block.text.slice(cursor)}</p>;
 }) : <p className="mirror-empty">Paragraf kaldırıldı.<br/><span>Notun hâlâ burada.</span></p>}</>;
}
function Lesson({ example, index, onNext, onPrevious, focusAction }: { example: SourceCase; index: number; onNext: () => void; onPrevious: () => void; focusAction: boolean }) {
 const [applied,setApplied]=useState(false);
 const root=useRef<HTMLDivElement>(null), before=useRef<HTMLElement>(null), after=useRef<HTMLElement>(null), notes=useRef<HTMLDivElement>(null), action=useRef<HTMLButtonElement>(null);
 const [paths,setPaths]=useState<{d:string;x:number;y:number}[]>([]);
 const arrow=useId();
 const start=example.original.indexOf(example.quote);
 const source:TextAnchor={anchorId:"source",start,end:start+example.quote.length,quote:example.quote,before:example.original.slice(Math.max(0,start-48),start),after:example.original.slice(start+example.quote.length,start+example.quote.length+48),sourceText:example.original};
 const original=[{id:"source",text:example.original}];
 const blocks=applied?example.blocks:original;
 const result=resolveSource(source,blocks);
 const attached=result.parts.length>0;
 const message=applied?example.result:example.description;
 // Follow the actual highlighted line and card after wrapping, resizing, font loading and undo.
 // Missing/ambiguous sources connect only to the old quotation, never to unrelated current text.
 useLayoutEffect(()=>{
  const host=root.current;if(!host)return;
  function measure(){
   if(!root.current||!notes.current)return;
   const box=root.current.getBoundingClientRect();
   const mark=(attached?after.current:before.current)?.querySelector("mark");
   const rect=mark?.getClientRects()[0];
   if(!rect||!box.width){setPaths([]);return;}
   const x=rect.right-box.left+4,y=rect.top-box.top+rect.height/2;
   setPaths(Array.from(notes.current.children).map(card=>{
    const to=card.getBoundingClientRect(),tx=to.left-box.left-4,ty=to.top-box.top+22;
    // On a narrow screen the note is underneath the comparison, so the line travels down.
    const below=to.top>=rect.bottom+30 && to.left<=rect.right;
    const d=below?`M${x},${y} C${x+18},${y+32} ${tx+20},${ty-26} ${tx+20},${ty-2}`:`M${x},${y} C${x+28},${y} ${tx-28},${ty} ${tx},${ty}`;
    return {d,x,y};
   }));
  }
  measure();
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;observer?.observe(host);
  if(before.current)observer?.observe(before.current);if(after.current)observer?.observe(after.current);if(notes.current)observer?.observe(notes.current);
  window.addEventListener("resize",measure);host.addEventListener("animationend",measure);
  let active=true;void document.fonts?.ready.then(()=>{if(active)measure();});
  return ()=>{active=false;observer?.disconnect();window.removeEventListener("resize",measure);host.removeEventListener("animationend",measure);};
 },[applied,attached,example]);
 useLayoutEffect(()=>{if(focusAction)action.current?.focus({preventScroll:true});},[focusAction]);
 return <section className={`source-mirror${applied?" mirror-applied":""}${!attached?" mirror-detached":""}`} aria-label={example.title}>
  <div className="mirror-step"><button onClick={onPrevious} disabled={index===0} aria-label="Önceki örnek">←</button><span>{String(index+1).padStart(2,"0")} / {lessons.length}</span><span className="mirror-progress" aria-hidden="true"><i style={{"--progress":`${(index+1)/lessons.length*100}%` } as CSSProperties}/></span><small>Okuma kulübü · Not provası</small></div>
  <h2>{example.title}</h2>
  <div className="mirror-reader" ref={root}>
   <div className="mirror-comparison">
    <section ref={before} aria-label="Önce" className="mirror-version mirror-before"><small>ÖNCE</small><ReadingText blocks={original} parts={[source]}/></section>
    <section ref={after} aria-label="Sonra" className="mirror-version mirror-after"><small>{applied?"ŞİMDİ":"DEĞİŞTİRİNCE"}</small><div className="mirror-text" key={applied?"changed":"original"}><ReadingText blocks={blocks} parts={result.parts}/></div></section>
   </div>
   <svg className="mirror-connections" aria-hidden="true" key={`${example.id}-${applied}`}>
    <defs><marker id={arrow} viewBox="0 0 8 8" refX="6" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1 L6 4 L1 7" fill="none" stroke="currentColor" strokeWidth="1.1"/></marker></defs>
    {paths.map((path,i)=><g key={i} className={i?"mirror-line-mint":""}><path className="mirror-wire" pathLength={1} d={path.d} markerEnd={`url(#${arrow})`}/><circle cx={path.x} cy={path.y} r="3"/></g>)}
   </svg>
   <div className="mirror-notes" ref={notes} aria-label="Örnekteki notlar">
    <article className="mirror-note" aria-label="İşaretli metne bağlı not"><header><svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M5 2h7l3 3v13H5zM11 2v4h4M8 10h4M8 13h4"/></svg><span>Notun</span><span className="mirror-note-link" aria-label={attached?"Metne bağlı":"Önceki alıntıda saklı"}>{attached?"↗":"↶"}</span></header><p>{example.note}</p>{applied&&!attached&&<small>“{example.quote}” · önceki alıntın saklı</small>}</article>
    {example.multiple&&<article className="mirror-note mirror-note-mint" aria-label="Aynı metne bağlı ikinci not"><header><span>İkinci notun</span><span aria-hidden="true">↗</span></header><p>Buluşma saatini arkadaşlarıma hatırlatmalıyım.</p></article>}
   </div>
  </div>
  <div className="mirror-lesson-end">
   <p className="mirror-feedback" role="status" key={applied?"result":"task"}><span aria-hidden="true">{applied?(!attached?"↶":"✓"):"↳"}</span>{message}</p>
   <div className="mirror-actions"><button ref={action} className="mirror-apply" onClick={()=>applied?onNext():setApplied(true)}>{applied?(index===lessons.length-1?"Baştan dene ↺":"Devam et →"):example.action}</button>{applied&&<button className="mirror-undo" onClick={()=>setApplied(false)}>↶ Geri al</button>}</div>
  </div>
 </section>;
}
export function SourceCasePage(){
 const {workspace}=useWorkspace();const appearance=themeAppearance(workspace.applied);
 const [selected,setSelected]=useState(0),[focusAction,setFocusAction]=useState(false);
 function move(index:number){setSelected(index);setFocusAction(true);}
 return <PublicFrame includeStudioFooter><main id="top" className={`${appearance.className} source-cases-page`} style={appearance.style}>
  <SitePageHeader theme={workspace.applied}/>
  <div className="mirror-content">
   <header className="mirror-intro"><div><small>SATIR AYNASI</small><h1>Bir dokunuşta anla.</h1></div><Link href="/studio">← Studio</Link></header>
   <Lesson key={selected} example={lessons[selected]} index={selected} focusAction={focusAction} onPrevious={()=>move(Math.max(0,selected-1))} onNext={()=>move((selected+1)%lessons.length)}/>
   <p className="mirror-reassurance">Dilediğin gibi dene. Gerçek yazıların ve notların değişmez.</p>
  </div>
 </main></PublicFrame>;
}
