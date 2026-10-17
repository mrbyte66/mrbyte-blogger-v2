"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useArticles } from "../../lib/articles/use-articles";
import { readReadingDocument } from "../../lib/reading/storage";
import { loadServerMarks } from "../../lib/reading/server";
import type { ReadingMark } from "../../lib/reading/model";
import { SlideLink } from "../SlideLink";
import { ReadingIcon as Icon } from "./ReadingIcon";
export function SourceNotes(){const {session}=useAuth();return <SourceList key={`${session?.profile.id??"guest"}:${!!session?.profile.verified}`}/>;}
function SourceList(){
 const {session}=useAuth();const {articles}=useArticles();const [items,setItems]=useState<{slug:string;title:string;mark:ReadingMark}[]>([]);const [query,setQuery]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(true);
 useEffect(()=>{const controller=new AbortController();setLoading(true);void (async()=>{const found:typeof items=[];let failed=0;
 // Batch requests to avoid flooding the API for larger libraries.
 for(let offset=0;offset<articles.length&&!controller.signal.aborted;offset+=4){await Promise.all(articles.slice(offset,offset+4).map(async article=>{try{const marks=session?.profile.verified&&article.id?await loadServerMarks({id:article.id},controller.signal):readReadingDocument(article.slug,session?.profile.id).document.marks;found.push(...marks.filter(m=>m.kind!=="bookmark").map(mark=>({slug:article.slug,title:article.title,mark})));}catch{failed++;}}));}
 if(!controller.signal.aborted){setItems(found);setError(failed?`${failed} yazının notu yüklenemedi. Tekrar açarak deneyebilirsin.`:"");setLoading(false);}})();return()=>controller.abort();},[articles,session?.profile.id,session?.profile.verified]);
 const needle=query.toLocaleLowerCase("tr");const filtered=items.filter(n=>`${n.title} ${n.mark.note} ${n.mark.fragments.map(f=>f.quote).join(" ")}`.toLocaleLowerCase("tr").includes(needle));
 return <section className="rn-source-library" aria-label="Yazı notları"><label className="rn-notebook-search"><Icon name="search"/><input aria-label="Yazı notlarında ara" placeholder="Not veya yazı ara" value={query} onChange={e=>setQuery(e.target.value)}/></label>{loading&&<p role="status">Yazı notların yükleniyor…</p>}{error&&<p role="alert">{error}</p>}<div className="rn-source-list">{filtered.map(({slug,title,mark})=><SlideLink key={`${slug}:${mark.id}`} href={`/yazilar/${slug}?not=${encodeURIComponent(mark.id)}`} className={`rn-source-entry rn-${mark.color??"lavender"}`}><Icon name={mark.kind==="audio"?"mic":"note"}/><span><strong>{title}</strong><p>{mark.note||mark.fragments[0].quote}</p></span><Icon name="arrow"/></SlideLink>)}</div>{!loading&&!filtered.length&&<p>Henüz eşleşen yazı notu yok. Okurken bir satır seçerek ekleyebilirsin.</p>}</section>;
}
