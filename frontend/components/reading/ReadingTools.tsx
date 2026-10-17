"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../auth/AuthProvider";
import { marksAtPoint,overlappingMarks } from "../../lib/reading/hit-test";
import { scrollBehavior } from "../../lib/motion";
import { anchorRange, findAnchor, maxMarks, maxNoteLength, noteColors, selectionAnchors, type NoteColor, type ReadingMark, type ReadingMarkKind, type TextAnchor } from "../../lib/reading/model";
import { readReadingDocument, readingStorageKey, writeReadingDocument } from "../../lib/reading/storage";
import { deleteServerMark, importGuestMarks, loadServerMarks, saveServerMark, type ServerArticle } from "../../lib/reading/server";
import { audioInput, readAudio, storeAudio, removeAudio } from "../../lib/reading/audio";
import { stackNotes } from "../../lib/reading/layout";
import { api, describe } from "../../lib/api/http";
import { ReadingIcon as Icon } from "./ReadingIcon";
import { RecordingButton, VoicePlayback } from "./VoiceNote";
import { dissolveNote } from "./dust";

type Props={articleId:string;contentRootId:string;contentRevision?:string;server?:ServerArticle};
type Geometry={width:number;articleRight:number;points:Record<string,{x:number;y:number}>;selection:{x:number;y:number}|null;end:number};
type HighlightEnvironment={CSS?:{highlights?:{set:(name:string,value:unknown)=>void;delete:(name:string)=>void}};Highlight?:new(...ranges:Range[])=>unknown};
const labels:Record<ReadingMarkKind,string>={highlight:"Fosforlu işaret",underline:"Alt çizgi",note:"Metin notu",audio:"Sesli not",bookmark:"Burada kaldım"};
const colorNames:Record<NoteColor,string>={lavender:"Lavanta",mint:"Nane",peach:"Şeftali",blue:"Mavi",yellow:"Sarı"};
const isNote=(m:ReadingMark)=>m.kind==="note"||m.kind==="audio";
const initialGeometry:Geometry={width:0,articleRight:0,points:{},selection:null,end:0};
export function ReadingTools(props:Props){
 const {session}=useAuth();const memberId=session?.profile.id;const account=!!(session?.profile.verified&&props.server);
 const server=useMemo(()=>account?props.server:undefined,[account,props.server?.id,props.server?.revisionId]);
 return <ScopedReadingTools key={`${props.articleId}:${memberId??"guest"}:${account}`} {...props} memberId={memberId} server={server}/>;
}
function ScopedReadingTools({articleId,contentRootId,contentRevision="",memberId,server}:Props&{memberId?:string}){
 const {openAuth}=useAuth();
 const [marks,setMarks]=useState<ReadingMark[]>([]);const marksRef=useRef(marks);marksRef.current=marks;
 const [hitIds,setHitIds]=useState<string[]>([]);const [styleUndo,setStyleUndo]=useState<ReadingMark[]>([]);
 const [fragments,setFragments]=useState<TextAnchor[]>([]);const [open,setOpen]=useState(false);const [pinned,setPinned]=useState(false);const [paletteOpen,setPaletteOpen]=useState(false);const [visible,setVisible]=useState(true);
 const [expanded,setExpanded]=useState<string[]>([]);const [editing,setEditing]=useState<string|null>(null);const [draftKind,setDraftKind]=useState<"note"|"audio"|null>(null);
 const [note,setNote]=useState("");const [color,setColor]=useState<NoteColor>("lavender");const [status,setStatus]=useState("");const [error,setError]=useState<string|null>(null);
 const [ready,setReady]=useState(false);const [pending,setPending]=useState(false);const busy=useRef(false);const alive=useRef(true);const requests=useRef(new AbortController());
 const [guestMarks,setGuestMarks]=useState<ReadingMark[]>([]);const [undo,setUndo]=useState<{mark:ReadingMark;index:number}|null>(null);
 const [supported,setSupported]=useState(false);const [unresolved,setUnresolved]=useState(0);const [query,setQuery]=useState("");
 const [mount,setMount]=useState<HTMLElement|null>(null);const [geometry,setGeometry]=useState<Geometry>(initialGeometry);const [tick,setTick]=useState(0);
 const [hover,setHover]=useState<string|null>(null);const [dictionary,setDictionary]=useState(false);
 const noteInput=useRef<HTMLTextAreaElement>(null);const toggle=useRef<HTMLButtonElement>(null);const cardRefs=useRef(new Map<string,HTMLElement>());
 const undoAudio=useRef<Blob|null>(null);
 const scope=`${memberId??"guest"}:${articleId}`;
 useEffect(()=>{alive.current=true;const controller=new AbortController();requests.current=controller;return()=>{alive.current=false;controller.abort();};},[]);
 useEffect(()=>{
  let cancelled=false;
  if(server){
   const load=()=>{if(busy.current)return;void loadServerMarks(server,requests.current.signal).then(items=>{if(!cancelled){setMarks(items);setReady(true);setError(null);}},cause=>{if(!cancelled){setReady(false);setError(`Notların yüklenemedi: ${describe(cause)}`);}});};
   load();setGuestMarks(readReadingDocument(articleId).document.marks);
   const focus=()=>{if(document.visibilityState==="visible" && !document.activeElement?.closest(".rn-ui"))load();};window.addEventListener("focus",focus);
   return()=>{cancelled=true;window.removeEventListener("focus",focus);};
  }
  function load(){const loaded=readReadingDocument(articleId,memberId);setMarks(loaded.document.marks);setError(loaded.error);setReady(true);}
  load();const sync=(e:StorageEvent)=>{if(e.key===readingStorageKey(articleId,memberId)||e.key===null)load();};window.addEventListener("storage",sync);return()=>window.removeEventListener("storage",sync);
 },[articleId,memberId,server]);
 useEffect(()=>{
  const root=document.getElementById(contentRootId);if(!root)return;root.classList.add("rn-reading-root");
  const layer=document.createElement("div");layer.className="rn-ui rn-host";root.append(layer);setMount(layer);
  return()=>{layer.remove();root.classList.remove("rn-reading-root");};
 },[contentRootId]);
 useEffect(()=>{const root=document.getElementById(contentRootId);if(!root)return;root.dataset.notePinned=String(pinned);setTick(t=>t+1);return()=>{delete root.dataset.notePinned;};},[pinned,contentRootId]);
 useEffect(()=>{try{setPinned(localStorage.getItem("satir:note-index-pinned")==="true");}catch{}},[]);
 function pin(){const next=!pinned;setPinned(next);setOpen(true);try{localStorage.setItem("satir:note-index-pinned",String(next));}catch{}}
 useEffect(()=>{
  const root=document.getElementById(contentRootId);if(!root)return;
  function capture(){if(draftKind)return;const next=selectionAnchors(root!,window.getSelection());if(next.length){setFragments(next);setStatus("");}}
  function finish(e:PointerEvent){if(draftKind)return;const target=e.target;if(!(target instanceof Element)||target.closest(".rn-ui,input,textarea,select,[contenteditable]"))return;
   const next=root!.contains(target)?selectionAnchors(root!,window.getSelection()):[];const hit=!next.length&&root!.contains(target)?marksAtPoint(root!,marksRef.current,e.clientX,e.clientY):[];setHitIds(hit.map(m=>m.id));setFragments(hit.length?hit[0].fragments:next);
   if(!next.length&&!draftKind)setDictionary(false);
  }
  function bookmarkHover(e:PointerEvent){const target=e.target;if(!(target instanceof Element)||target.closest(".rn-ui"))return;const anchor=target.closest<HTMLElement>("[data-reading-anchor]");setHover(anchor?.dataset.readingAnchor??null);}
  document.addEventListener("selectionchange",capture);document.addEventListener("pointerup",finish);root.addEventListener("pointermove",bookmarkHover);
  return()=>{document.removeEventListener("selectionchange",capture);document.removeEventListener("pointerup",finish);root.removeEventListener("pointermove",bookmarkHover);};
 },[contentRootId,draftKind]);
 useEffect(()=>{setFragments([]);setDraftKind(null);setDictionary(false);},[contentRevision]);
 useEffect(()=>{if(!status)return;const timer=setTimeout(()=>setStatus(""),5000);return()=>clearTimeout(timer);},[status]);
 useEffect(()=>{if(editing||draftKind==="note")noteInput.current?.focus({preventScroll:true});},[editing,draftKind]);
 useEffect(()=>{
  const root=document.getElementById(contentRootId);if(!root)return;
  let frame=0;const measure=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
   const box=root.getBoundingClientRect();root.dataset.noteLayout=box.width>=880?"wide":"compact";const article=root.querySelector(".article-view")??root.querySelector("[data-reading-anchor]")?.parentElement??root;const ab=article.getBoundingClientRect();
   const points:Geometry["points"]={};for(const mark of marks){const range=anchorRange(root,mark.fragments[0]);if(!range)continue;const r=typeof range.getBoundingClientRect==="function"?range.getBoundingClientRect():findAnchor(root,mark.fragments[0].anchorId)!.getBoundingClientRect();points[mark.id]={x:Math.min(box.width-28,ab.right-box.left+10),y:r.top-box.top};}
   if(hover){const el=findAnchor(root,hover);if(el){const b=el.getBoundingClientRect();points.hover={x:b.left-box.left-28,y:b.top-box.top};}}
   let selection:Geometry["selection"]=null;if(fragments.length){const range=anchorRange(root,fragments[0]);if(range){const r=typeof range.getBoundingClientRect==="function"?range.getBoundingClientRect():findAnchor(root,fragments[0].anchorId)!.getBoundingClientRect();selection={x:Math.max(8,Math.min(box.width-540,r.left-box.left)),y:Math.max(48,r.top-box.top)};}}
   const next={width:box.width,articleRight:ab.right-box.left,points,selection,end:ab.bottom-box.top};setGeometry(old=>JSON.stringify(old)===JSON.stringify(next)?old:next);
  });};
  measure();window.addEventListener("resize",measure);document.addEventListener("scroll",measure,true);
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(measure):null;observer?.observe(root);const articleElement=root.querySelector(".article-view");if(articleElement)observer?.observe(articleElement);for(const element of cardRefs.current.values())observer?.observe(element);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",measure);document.removeEventListener("scroll",measure,true);observer?.disconnect();};
 },[marks,fragments,contentRootId,contentRevision,expanded,editing,draftKind,hover,tick]);
 useEffect(()=>{
  const root=document.getElementById(contentRootId);const env=window as unknown as HighlightEnvironment;const registry=env.CSS?.highlights;const H=env.Highlight;setSupported(!!(registry&&H));if(!root)return;
  const ranges:Record<string,Range[]>={"mrbyte-reading-underline":[]};for(const c of noteColors)ranges[`satir-reading-${c}`]=[];
  let missing=0;for(const mark of marks){const resolved=mark.fragments.map(f=>anchorRange(root,f));if(resolved.some(r=>!r))missing++;
   if(mark.kind==="bookmark"||mark.emphasized===false||(!visible&&isNote(mark)))continue;
   const key=mark.kind==="underline"?"mrbyte-reading-underline":`satir-reading-${mark.color??"lavender"}`;ranges[key].push(...resolved.filter((r):r is Range=>r!==null));
  }setUnresolved(missing);
  if(registry&&H)for(const [name,items]of Object.entries(ranges))registry.set(name,new H(...items));
  return()=>{for(const name of Object.keys(ranges))registry?.delete(name);};
 },[marks,visible,contentRootId,contentRevision]);
 async function save(mark:ReadingMark,creating:boolean,blob?:Blob){
  if(busy.current)return false;busy.current=true;setPending(true);setError(null);
  try{
   let saved=mark;
   if(server)saved=await saveServerMark(server,mark,creating,blob?await audioInput(blob,mark.audio!.durationMs):undefined,requests.current.signal);
   else if(blob)await storeAudio(scope,mark.id,blob);
   if(!alive.current)return false;
   const base=mark.kind==="bookmark"?marksRef.current.filter(m=>m.kind!=="bookmark"||m.id===mark.id):marksRef.current;
   const next=creating?[...base,saved]:base.map(m=>m.id===mark.id?saved:m);
   if(!server&&!writeReadingDocument({version:1,articleId,marks:next},memberId)){setError("Tarayıcı kaydı başarısız. Bu değişiklikler sayfa kapanınca kaybolabilir.");setStatus("Yalnızca bu oturumda tutuluyor.");}else setStatus(server?"Hesabına kaydedildi.":"Bu tarayıcıya kaydedildi.");
   setMarks(next);return true;
  }catch(cause){if(alive.current)setError(cause instanceof Error && !("code"in cause)?cause.message:`Kaydedilemedi: ${describe(cause)}`);return false;}
  finally{busy.current=false;if(alive.current)setPending(false);}
 }
 async function remove(mark:ReadingMark,index:number){if(busy.current)return;busy.current=true;setPending(true);try{
  let recording:Blob|null=null;
  if(mark.kind==="audio")try{if(server){const response=await fetch(`/api/v1/me/articles/${server.id}/annotations/${mark.id}/audio`,{credentials:"same-origin",cache:"no-store",signal:requests.current.signal});if(response.ok)recording=await response.blob();}else recording=await readAudio(scope,mark.id);}catch{/* Metadata can still be removed if an old recording is unavailable. */}
  if(server)await deleteServerMark(server,mark.id,requests.current.signal);if(!alive.current)return;const next=marksRef.current.filter(m=>m.id!==mark.id);
  if(!server&&!writeReadingDocument({version:1,articleId,marks:next},memberId))throw new Error("Tarayıcı kaydı silinemedi. Tekrar dene.");
  if(!server&&mark.kind==="audio")try{await removeAudio(scope,mark.id);}catch{/* Stale blob is never exposed without its private mark. */}
  await dissolveNote(cardRefs.current.get(mark.id),requests.current.signal);if(!alive.current)return;undoAudio.current=recording;setMarks(next);setUndo(mark.kind!=="audio"||recording?{mark,index}:null);setExpanded(ids=>ids.filter(id=>id!==mark.id));setStatus("Not kaldırıldı.");setError(null);
 }catch(cause){if(alive.current)setError(cause instanceof Error&&!("code"in cause)?cause.message:describe(cause));}finally{busy.current=false;if(alive.current)setPending(false);}}
 const contextual=hitIds.length?marks.filter(m=>hitIds.includes(m.id)):overlappingMarks(marks,fragments);
 async function clearStyle(kind:"highlight"|"underline"){
  if(busy.current)return;const targets=contextual.filter(m=>kind==="underline"?m.kind==="underline":m.kind!=="underline"&&m.kind!=="bookmark"&&m.emphasized!==false);if(!targets.length)return;
  busy.current=true;setPending(true);let next=[...marksRef.current];const restored:ReadingMark[]=[];
  try{for(const m of targets){if(m.kind==="highlight"||m.kind==="underline"){if(server)await deleteServerMark(server,m.id,requests.current.signal);next=next.filter(item=>item.id!==m.id);}else{const changed=server?await saveServerMark(server,{...m,emphasized:false},false,undefined,requests.current.signal):{...m,emphasized:false};next=next.map(item=>item.id===m.id?changed:item);}restored.push(m);}
   if(!server&&!writeReadingDocument({version:1,articleId,marks:next},memberId))throw new Error("Tarayıcı kaydı başarısız. İşaret değişikliği bu oturumda korunuyor.");
   if(alive.current){setMarks(next);setStyleUndo(restored);setHitIds([]);setFragments([]);window.getSelection()?.removeAllRanges();setStatus(kind==="underline"?"Alt çizgi kaldırıldı. Notların korundu.":"Vurgu kaldırıldı. Notların korundu.");setError(null);}
  }catch(e){if(alive.current){setMarks(next);setStyleUndo(restored);if(!server)writeReadingDocument({version:1,articleId,marks:next},memberId);setError(e instanceof Error?e.message:describe(e));}}finally{busy.current=false;if(alive.current)setPending(false);}
 }
 async function restoreStyles(){if(busy.current)return;busy.current=true;setPending(true);let next=[...marksRef.current];try{for(const m of styleUndo){const existing=next.find(n=>n.id===m.id);const saved=server?await saveServerMark(server,{...m,version:existing?.version??m.version},!existing,undefined,requests.current.signal):m;next=[...next.filter(n=>n.id!==m.id),saved];}if(!server&&!writeReadingDocument({version:1,articleId,marks:next},memberId))throw new Error("Tarayıcıya kaydedilemedi.");if(alive.current){setMarks(next);setStyleUndo([]);setStatus("İşaret geri alındı.");}}catch(e){if(alive.current){setMarks(next);setError(describe(e));}}finally{busy.current=false;if(alive.current)setPending(false);}}
 async function importGuest(){if(!server||busy.current)return;busy.current=true;setPending(true);try{
  const stored=readReadingDocument(articleId).document;const plain=stored.marks.filter(m=>m.kind!=="audio");const importId=stored.importId??crypto.randomUUID();writeReadingDocument({...stored,importId});
  const result=plain.length?await importGuestMarks(server,plain,importId,requests.current.signal):{accepted:[],rejected:0};const accepted=new Set(result.accepted);
  for(const m of stored.marks.filter(m=>m.kind==="audio")){const blob=await readAudio(`guest:${articleId}`,m.id);if(!blob)continue;try{await saveServerMark(server,m,true,await audioInput(blob,m.audio!.durationMs),requests.current.signal);accepted.add(m.id);}catch{ /* Leave failed recordings in guest storage. */ }}
  if(!alive.current)return;const remaining=stored.marks.filter(m=>!accepted.has(m.id));const cleared=writeReadingDocument({version:1,articleId,marks:remaining});if(!alive.current)return;if(!cleared)setError("Notların hesabına aktarıldı; tarayıcı kopyaları silinemedi.");setGuestMarks(cleared?remaining:stored.marks);setMarks(await loadServerMarks(server,requests.current.signal));setStatus(`${accepted.size} misafir kaydı hesabına aktarıldı.${remaining.length?" Aktarılamayan kayıtlar bu tarayıcıda korundu.":""}`);
 }catch(cause){if(alive.current)setError(`İçe aktarılamadı: ${describe(cause)}`);}finally{busy.current=false;if(alive.current)setPending(false);}}
 function jump(mark:ReadingMark){const root=document.getElementById(contentRootId);const range=root&&anchorRange(root,mark.fragments[0]);const paragraph=root&&findAnchor(root,mark.fragments[0].anchorId);if(!range||!paragraph){setStatus("Bu alıntının bölümü artık bulunamıyor. Kayıtlı notun listede korunuyor.");return;}if(!pinned)setOpen(false);if(isNote(mark)){setExpanded([mark.id]);setVisible(true);} paragraph.scrollIntoView({behavior:scrollBehavior(),block:"center"});setStatus("Alıntının bulunduğu bölüme gidildi.");}
 const linked=useRef(false);
 useEffect(()=>{if(!ready||linked.current)return;linked.current=true;const id=new URLSearchParams(location.search).get("not");const mark=marks.find(m=>m.id===id);if(mark){requestAnimationFrame(()=>{if(alive.current)jump(mark);});}},[ready,marks]);
 function showDraft(kind:"note"|"audio"){setDraftKind(kind);setEditing(null);setNote("");setVisible(true);setOpen(false);}
 async function add(kind:ReadingMarkKind,blob?:Blob,durationMs?:number){
  if(!ready||!fragments.length||marks.length>=maxMarks||(kind==="note"&&!note.trim()))return;
  const m:ReadingMark={id:crypto.randomUUID(),kind,fragments:[...fragments],note:kind==="note"?note.trim():"",color,createdAt:new Date().toISOString(),...(blob?{audio:{mime:blob.type.split(";")[0],durationMs:durationMs!}}:{})};
  if(await save(m,true,blob)){if(isNote(m))setExpanded([m.id]);setDraftKind(null);setNote("");setUndo(null);setFragments([]);window.getSelection()?.removeAllRanges();}
 }
 function edit(mark:ReadingMark){setEditing(mark.id);setNote(mark.note);setColor(mark.color??"lavender");setExpanded([mark.id]);setVisible(true);}
 async function setBookmark(anchorId?:string){const root=document.getElementById(contentRootId);const id=anchorId??fragments[0]?.anchorId;if(!root||!id)return;const el=findAnchor(root,id);const text=el?.textContent??"";if(!text.length)return;
  const old=marks.find(m=>m.kind==="bookmark");const fragment:TextAnchor={anchorId:id,start:0,end:Math.min(48,text.length),quote:text.slice(0,48),before:"",after:text.slice(Math.min(48,text.length),96)};
  const m:ReadingMark={id:old?.id??crypto.randomUUID(),kind:"bookmark",fragments:[fragment],note:"",createdAt:old?.createdAt??new Date().toISOString(),version:old?.version};if(await save(m,!old))setStatus("Kaldığın satır kaydedildi.");
 }
 const dictionaryWord=fragments.map(f=>f.quote).join(" ").trim();const dictionaryAllowed=/^[a-zA-Z][a-zA-Z' -]{0,59}$/.test(dictionaryWord);
 const disabled=!ready||pending||!fragments.length||marks.length>=maxMarks;const bookmark=marks.find(m=>m.kind==="bookmark");
 const cards=visible?marks.filter(m=>isNote(m)&&expanded.includes(m.id)):[];
 const positions=stackNotes([...cards.map(m=>({id:m.id,y:geometry.points[m.id]?.y??80,height:cardRefs.current.get(m.id)?.offsetHeight??210})),...(visible&&draftKind?[{id:"draft",y:geometry.selection?.y??80,height:cardRefs.current.get("draft")?.offsetHeight??220}]:[])]);
 const pos=(id:string)=>positions.find(p=>p.id===id)?.top??80;
 const rows=marks.filter(m=>m.note.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))||m.fragments.some(f=>f.quote.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))));
 function cycle(mark:ReadingMark,step:number){const group=marks.filter(m=>isNote(m)&&m.fragments[0].anchorId===mark.fragments[0].anchorId);const index=group.findIndex(m=>m.id===mark.id);setExpanded([group[(index+step+group.length)%group.length].id]);cancel();}
 function cancel(){setEditing(null);setDraftKind(null);setNote("");}
 function palette(value:NoteColor,onChange:(c:NoteColor)=>void){return <div className="rn-colors" role="group" aria-label="Not rengi">{noteColors.map(c=><button key={c} type="button" className={`rn-color rn-${c}`} data-tip={colorNames[c]} aria-label={colorNames[c]} aria-pressed={value===c} onClick={()=>onChange(c)}/>)}</div>;}
 function editor(){return <form onSubmit={e=>{e.preventDefault();const mark=marks.find(m=>m.id===editing);if(mark)void save({...mark,note:note.trim(),color},false).then(ok=>{if(ok)cancel();});else void add("note");}}><label className="visually-hidden" htmlFor={`reading-note-input-${articleId}`}>Bu alıntı için notun</label><textarea id={`reading-note-input-${articleId}`} ref={noteInput} rows={4} maxLength={maxNoteLength} value={note} onChange={e=>setNote(e.target.value)} placeholder="Aklında kalan bir düşünce…"/><div className="rn-card-footer">{palette(color,setColor)}<span>{note.length}/{maxNoteLength}</span></div><div className="rn-form-actions"><button type="button" onClick={cancel}>Vazgeç</button><button className="rn-save" disabled={pending||(!note.trim()&&marks.find(m=>m.id===editing)?.kind!=="audio")} type="submit">{pending?"Kaydediliyor…":"Notu kaydet"}</button></div></form>;}
 const layer=<aside className={`reading-tools rn-ui ${visible?"":"rn-hidden"}`} aria-label="Okuma araçları" onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();e.preventDefault();setOpen(false);setPaletteOpen(false);setDictionary(false);cancel();toggle.current?.focus();}}}>
  <div className="rn-controlbar"><button ref={toggle} className="rn-notes-trigger" aria-expanded={open||pinned} aria-controls={`reading-notes-panel-${articleId}`} onClick={()=>{setOpen(!open);if(pinned){setPinned(false);try{localStorage.setItem("satir:note-index-pinned","false");}catch{}}}}><Icon name="note"/>Notlar <small>{marks.length} kayıt</small></button>{bookmark&&<button title="Kaldığın yere dön" aria-label="Kaldığın yere dön" onClick={()=>jump(bookmark)}><Icon name="bookmark"/></button>}</div>
  <div className={`rn-selection-toolbar reading-toolbar ${geometry.selection?"is-active":""}`} role="group" aria-label="Metin işaretleme araçları" style={{left:geometry.selection?.x??0,top:(geometry.selection?.y??0)-50}} onPointerDown={e=>e.preventDefault()}>
   {contextual.some(m=>m.kind!=="underline"&&m.kind!=="bookmark"&&m.emphasized!==false)&&<button className="na-clear-mark" disabled={pending} onClick={()=>void clearStyle("highlight")}><Icon name="highlight"/>Vurguyu kaldır</button>}{contextual.some(m=>m.kind==="underline")&&<button className="na-clear-mark" aria-label="Alt çizgiyi kaldır" disabled={pending} onClick={()=>void clearStyle("underline")}><u>U</u>Alt çizgiyi kaldır</button>}
   <button className={`rn-highlight-action rn-${color}`} data-tip="Seçili metni vurgula" disabled={disabled} aria-label="Seçili metni fosforlu kalemle işaretle" onClick={()=>void add("highlight")}><i/>Vurgula</button><button className="rn-palette-toggle" aria-label="Vurgu rengi seç" aria-expanded={paletteOpen} onClick={()=>setPaletteOpen(!paletteOpen)}><Icon name="down" size={14}/></button>{paletteOpen&&<div className="rn-palette-popover">{palette(color,c=>{setColor(c);setPaletteOpen(false);})}</div>}<button className="rn-underline" disabled={disabled} aria-label="Seçili metnin altını çiz" data-tip="Kırmızı alt çizgi" onClick={()=>void add("underline")}><u>U</u><span>Altını çiz</span></button><button disabled={disabled} aria-label="Seçili metne not ekle" data-tip="Metin notu ekle" onClick={()=>showDraft("note")}><Icon name="note"/><span>Not</span></button><button disabled={disabled} aria-label="Seçili metne sesli not ekle" data-tip="Sesli not ekle" onClick={()=>showDraft("audio")}><Icon name="mic"/><span>Ses</span></button><button disabled={disabled} aria-label="Burada kaldım" data-tip="Burada kaldım" onClick={()=>void setBookmark()}><Icon name="bookmark"/></button><button disabled={disabled||!dictionaryAllowed} aria-label="Seçili kelimenin anlamı" data-tip={dictionaryAllowed?"Kelimenin anlamı":"Kısa bir İngilizce kelime seç"} onClick={()=>setDictionary(!dictionary)}><Icon name="book"/><span>Anlamı</span></button>
  </div>
  {visible&&<div className="rn-markers">{Array.from(new Set(marks.filter(isNote).map(m=>m.fragments[0].anchorId))).map(anchor=>{
   const group=marks.filter(m=>isNote(m)&&m.fragments[0].anchorId===anchor);const first=group[0];const pt=geometry.points[first.id];if(!pt)return null;
   return <div key={anchor} className="rn-marker-group" style={{left:pt.x,top:pt.y}}>{(["note","audio"]as const).map(kind=>{const items=group.filter(m=>m.kind===kind);if(!items.length)return null;const m=items[0];const i=marks.filter(isNote).indexOf(m);return <button key={kind} className={`rn-marker rn-${m.color??"lavender"}`} aria-label={`${i+1}. ${labels[kind]} aç`} title={items.length>1?`${items.length} ${labels[kind].toLowerCase()}`:labels[kind]} aria-expanded={items.some(item=>expanded.includes(item.id))} onClick={()=>{setExpanded(ids=>ids.includes(m.id)?[]:[m.id]);setTick(t=>t+1);}}><Icon name={kind==="audio"?"mic":"note"} size={16}/>{items.length>1&&<small>{items.length}</small>}</button>;})}</div>;
  })}</div>}
  {hover&&!bookmark?.fragments.some(f=>f.anchorId===hover)&&geometry.points.hover&&<button className="rn-place-bookmark" style={{left:geometry.points.hover.x,top:geometry.points.hover.y}} aria-label="Bu paragrafta kaldım" title="Burada kaldım" disabled={pending} onClick={()=>void setBookmark(hover)}><Icon name="bookmark" size={16}/></button>}
  {bookmark&&geometry.points[bookmark.id]&&<button className="rn-bookmark" style={{left:Math.max(0,geometry.articleRight-(document.getElementById(contentRootId)?.querySelector(".article-view")?.clientWidth??geometry.articleRight)-28),top:geometry.points[bookmark.id].y}} title="Burada kaldım · kaldır" aria-label="Burada kaldım ayracını kaldır" disabled={pending} onClick={()=>void remove(bookmark,marks.indexOf(bookmark))}><Icon name="bookmark" size={18}/><span>Burada kaldım</span></button>}
  <div className="rn-card-lane">{cards.map(m=><section key={m.id} ref={el=>{if(el)cardRefs.current.set(m.id,el);else cardRefs.current.delete(m.id);}} className={`rn-card rn-${m.color??"lavender"}`} style={{top:pos(m.id)}} aria-label={`${labels[m.kind]} · ${m.fragments[0].quote.slice(0,30)}`}><header>{marks.filter(n=>isNote(n)&&n.fragments[0].anchorId===m.fragments[0].anchorId).length>1&&<div className="rn-card-pagination"><button aria-label="Önceki not" onClick={()=>cycle(m,-1)}>‹</button><small>{marks.filter(n=>isNote(n)&&n.fragments[0].anchorId===m.fragments[0].anchorId).findIndex(n=>n.id===m.id)+1} / {marks.filter(n=>isNote(n)&&n.fragments[0].anchorId===m.fragments[0].anchorId).length}</small><button aria-label="Sonraki not" onClick={()=>cycle(m,1)}>›</button></div>}<Icon name={m.kind==="audio"?"mic":"note"}/><strong>{labels[m.kind]}</strong><button aria-label="Notu düzenle" data-tip="Düzenle" disabled={pending} onClick={()=>edit(m)}><Icon name="edit" size={16}/></button><button aria-label="Notu sil" data-tip="Notu sil" disabled={pending} onClick={()=>void remove(m,marks.indexOf(m))}><Icon name="trash" size={16}/></button><button aria-label="Notu kapat" data-tip="Notu kapat" onClick={()=>{setExpanded(ids=>ids.filter(id=>id!==m.id));if(editing===m.id)cancel();}}><Icon name="down" size={16}/></button></header>{editing===m.id?editor():m.note&&<p className="rn-note-text">{m.note}</p>}{m.kind==="audio"&&<><VoicePlayback key={`${m.id}:${m.version??0}`} label={`${m.id} sesli not`} load={async()=>{if(!server)return readAudio(scope,m.id);const response=await fetch(`/api/v1/me/articles/${server.id}/annotations/${m.id}/audio`,{credentials:"same-origin",cache:"no-store",signal:requests.current.signal});if(!response.ok)throw new Error();return response.blob();}}/>{editing===m.id&&<RecordingButton disabled={pending} onRecorded={(blob,duration)=>{void save({...m,audio:{mime:blob.type,durationMs:duration},note:note.trim(),color},false,blob).then(ok=>{if(ok)cancel();});}}/>}</>}<footer><button title="Alıntıya git" aria-label="Notun kaynağına git" onClick={()=>jump(m)}><Icon name="arrow" size={14}/>Kaynak</button><small>Yalnızca sen</small></footer></section>)}
  {visible&&draftKind&&<section ref={el=>{if(el)cardRefs.current.set("draft",el);else cardRefs.current.delete("draft");}} className={`rn-card rn-${color} rn-draft`} style={{top:pos("draft")}} aria-label="Yeni not"><header><Icon name={draftKind==="audio"?"mic":"note"}/><strong>{draftKind==="audio"?"Sesli not":"Metin notu"}</strong><button onClick={cancel} aria-label="Yeni notu kapat"><Icon name="close"/></button></header>{draftKind==="note"?editor():<RecordingButton disabled={pending} onRecorded={(blob,duration)=>void add("audio",blob,duration)}/>}</section>}
  </div>
  {visible&&geometry.width>=880&&<svg className="rn-connectors" width="100%" height={Math.max(geometry.end,...positions.map(p=>p.top+300))} aria-hidden="true">{cards.map(m=>{const pt=geometry.points[m.id];if(!pt)return null;const to=geometry.width-(geometry.width>=1200?368:282);return <path key={m.id} className={`rn-${m.color??"lavender"}`} d={`M${pt.x+15},${pt.y+15} C${pt.x+40},${pt.y+15} ${to-20},${pos(m.id)+28} ${to},${pos(m.id)+28}`}/>;})}{draftKind&&geometry.selection&&<path className={`rn-${color}`} d={`M${geometry.articleRight+10},${geometry.selection.y+15} C${geometry.articleRight+35},${geometry.selection.y+15} ${geometry.width-(geometry.width>=1200?388:302)},${pos("draft")+28} ${geometry.width-(geometry.width>=1200?368:282)},${pos("draft")+28}`}/>}</svg>}
  {(open||pinned)&&<section id={`reading-notes-panel-${articleId}`} className={`reading-panel rn-overview ${pinned?"is-pinned":""}`} aria-label="Bu yazıdaki okuma notların"><header><h2>Bu yazı <small>{marks.length}</small></h2><button onClick={pin} aria-label={pinned?"Not dizinini çöz":"Not dizinini sabitle"} aria-pressed={pinned} data-tip={pinned?"Sabitlemeyi kaldır":"Sola sabitle"}><Icon name="pin"/></button><button onClick={()=>{setOpen(false);setPinned(false);try{localStorage.setItem("satir:note-index-pinned","false");}catch{}}} aria-label="Notlar panelini kapat"><Icon name="close"/></button></header>
 <input aria-label="Bu yazıdaki notlarda ara" placeholder="Notlarda ara" value={query} onChange={e=>setQuery(e.target.value)}/><ol>{rows.map(m=><li key={m.id} className={`rn-list-item rn-${m.color??"lavender"} ${expanded.includes(m.id)?"is-selected":""}`}><button className="rn-quote-link" aria-label={`${marks.indexOf(m)+1}. alıntının bulunduğu bölüme git`} onClick={()=>jump(m)}><Icon name={m.kind==="audio"?"mic":m.kind==="bookmark"?"bookmark":"note"}/><span><strong>{m.note||m.fragments[0].quote}</strong><small>{labels[m.kind]} · {m.fragments[0].anchorId==="excerpt"?"Giriş":`${marks.indexOf(m)+1}. kayıt`}</small></span></button><div className="rn-index-actions"><button disabled={pending} aria-label={`${marks.indexOf(m)+1}. kaydı kaldır`} data-tip="Kaydı sil" onClick={()=>void remove(m,marks.indexOf(m))}><Icon name="trash" size={14}/></button>{isNote(m)&&<button className="rn-text-button" aria-label="Düzenle" data-tip="Düzenle" onClick={()=>edit(m)}><Icon name="edit" size={14}/></button>}{!isNote(m)&&m.kind!=="bookmark"&&<details><summary aria-label="İşaret rengi">Renk</summary>{palette(m.color??"lavender",c=>void save({...m,color:c},false))}</details>}</div></li>)}</ol>
 {marks.length===0&&<p>Bir satır seçerek ilk notunu ekle.</p>}{marks.length>0&&rows.length===0&&<p>Bu aramada not bulunamadı.</p>}<footer><small>{rows.length} / {marks.length} kayıt</small><button type="button" role="switch" aria-checked={visible} className="rn-visibility" onClick={()=>{setVisible(!visible);if(visible)cancel();}}><span className="rn-switch"/>Notları göster</button></footer>
 <details className="rn-index-info"><summary>Saklama ve durum</summary><p className="rn-storage-info">{server?"Yalnızca sen · hesabında saklanır.":"Bu tarayıcıda saklanır. Veriler temizlenirse kaybolur."}</p>{!server&&<button onClick={()=>openAuth("register")}>Üye ol, hesabında sakla</button>}{server&&guestMarks.length>0&&<button disabled={pending} onClick={()=>void importGuest()}>Misafir notlarını hesabıma aktar</button>}{!supported&&<p>Bu tarayıcı metnin üzerinde renk göstermeyi desteklemiyor.</p>}{unresolved>0&&<p>{unresolved} işaretin metindeki yeri değişmiş olabilir. Alıntıların korunuyor.</p>}</details></section>}
 {styleUndo.length>0&&<button className="rn-undo-toast na-style-undo" disabled={pending} onClick={()=>void restoreStyles()}>İşareti geri al ↶</button>}
 {undo&&<button className="reading-undo rn-undo-toast" disabled={pending} onClick={()=>void (async()=>{let blob:Blob|undefined;if(undo.mark.kind==="audio"){blob=undoAudio.current??undefined;if(!blob){setError("Ses kaydı geri alınamadı.");return;}}if(await save(undo.mark,true,blob))setUndo(null);})()}>Son kaldırmayı geri al ↶</button>}
  {dictionary&&<DictionaryPreview text={fragments.map(f=>f.quote).join(" ")} onClose={()=>setDictionary(false)}/>}
  {error&&<p role="alert" className="rn-feedback rn-error">{error}</p>}<p role="status" className={`rn-feedback ${status?"has-message":""}`}>{status}</p>
 </aside>;
 return mount?createPortal(<>{layer}<div aria-hidden="true" className="rn-reserve" style={{height:geometry.width>=880?Math.max(0,...positions.map(p=>p.top+(cardRefs.current.get(p.id)?.offsetHeight??220)+20-geometry.end)):0}}/></>,mount):layer;
}
function DictionaryPreview({text,onClose}:{text:string;onClose:()=>void}){
 const [data,setData]=useState<{word:string;definition:string;source:string}|null>(null);const [error,setError]=useState("");
 useEffect(()=>{const controller=new AbortController();setData(null);setError("");void api<{word:string;definition:string;source:string}>("GET",`/dictionary?word=${encodeURIComponent(text.trim())}`,{signal:controller.signal}).then(r=>{if(!controller.signal.aborted)setData(r.data);}).catch(e=>{if(!controller.signal.aborted)setError(describe(e));});return()=>controller.abort();},[text]);
 return <section className="rn-dictionary" aria-label="Kelime anlamı"><header><Icon name="book"/><strong>{data?.word??text}</strong><button aria-label="Sözlüğü kapat" onClick={onClose}><Icon name="close"/></button></header>{error?<p role="alert">{error}</p>:data?<><small>İngilizce sözlük</small><p lang="en" style={{whiteSpace:"pre-line"}}>{data.definition}</p><a href={data.source} target="_blank" rel="noopener noreferrer">Kaynak ↗</a></>:<p role="status">Anlam aranıyor…</p>}</section>;
}
