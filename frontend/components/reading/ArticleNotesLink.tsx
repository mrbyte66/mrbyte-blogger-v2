"use client";
import {useEffect,useMemo,useState} from "react";
import type {Article} from "../../lib/content";
import {useAuth} from "../auth/AuthProvider";
import {SlideLink} from "../SlideLink";
import {readReadingDocument,readingStorageKey} from "../../lib/reading/storage";
import {loadServerMarks,type ServerArticle} from "../../lib/reading/server";
import {ReadingIcon as Icon} from "./ReadingIcon";
/** Home previews show a private note count; all annotation actions live at the permalink. */
export function ArticleNotesLink({article}:{article:Article}){
 const {session}=useAuth();const memberId=session?.profile.id;
 const server=useMemo<Pick<ServerArticle,"id">|undefined>(()=>session?.profile.verified&&article.id?{id:article.id}:undefined,[session?.profile.verified,article.id]);
 const [state,setState]=useState<{scope:string;count:number|null;error:boolean}|null>(null);const scope=`${memberId??"guest"}:${server?.id??article.slug}:${!!server}`;
 useEffect(()=>{const controller=new AbortController();let request=0;
  async function load(){const revision=++request;try{const local=server?null:readReadingDocument(article.slug,memberId);if(local?.error)throw new Error();const marks=server?await loadServerMarks(server,controller.signal):local!.document.marks;if(!controller.signal.aborted&&revision===request)setState({scope,count:marks.length,error:false});}catch{if(!controller.signal.aborted&&revision===request)setState({scope,count:null,error:true});}}
  void load();const storage=(event:StorageEvent)=>{if(event.key===readingStorageKey(article.slug,memberId)||event.key===null)void load();};const focus=()=>void load();window.addEventListener("storage",storage);window.addEventListener("focus",focus);return()=>{controller.abort();window.removeEventListener("storage",storage);window.removeEventListener("focus",focus);};
 },[scope,article.slug,memberId,server]);
 const current=state?.scope===scope?state:null;const count=current?.count;
 const content=<><Icon name="note"/><span>Notlar</span><small>{count??(current?.error?"—":"…")}</small>{count!=null&&count>0&&<Icon name="arrow" size={12}/>}</>;
 if(count==null||count===0)return <button type="button" className="panel-notes-link" disabled aria-label={count===0?"0 not":current?.error?"Not sayısı yüklenemedi":"Notlar yükleniyor"} title={current?.error?"Not sayısı yüklenemedi.":count===0?"Bu yazıda henüz notun yok.":"Notlar yükleniyor…"}>{content}</button>;
 return <SlideLink className="panel-notes-link" href={`/yazilar/${article.slug}`} aria-label={`${count} not · Yazının kalıcı bağlantısını aç`} title="Notların için kalıcı yazıyı aç">{content}</SlideLink>;
}
