import type { Schema,Input,Output } from "../api/contract";
import { api } from "../api/http";
import type { AudioInput,NoteColor } from "./model";
export type PersonalNote=Schema<"PersonalNote">;
export type PersonalRecording=Schema<"PersonalRecording">;
export type RecordingWrite=Schema<"PersonalRecordingWrite">;
export const notebookKey=(scope?:string)=>`satir:notebook:v1:${scope??"guest"}`;
export function recordings(note:PersonalNote):PersonalRecording[]{return note.recordings??(note.audio?[{id:note.id,...note.audio}]:[]);}
export function titleOf(note:PersonalNote){return note.title?.trim()||note.body.split("\n")[0].slice(0,80)||"Sesli not";}
export function normalizeTag(raw:string){const value=raw.trim().replace(/^#/,"").toLocaleLowerCase("tr");return /^[\p{L}\p{N}_-]{1,32}$/u.test(value)?value:null;}
export function noteTags(note:PersonalNote){return [...new Set([...(note.tags??[]),...hashtags(note.body).map(t=>t.slice(1))])].slice(0,12);}
export function guestNotebook(scope?:string):PersonalNote[]{
 const raw=localStorage.getItem(notebookKey(scope));if(!raw)return[];const value:unknown=JSON.parse(raw);
 if(!Array.isArray(value)||value.length>500||!value.every(n=>n&&typeof n.id==="string"&&typeof n.body==="string"&&n.body.length<=12000&&typeof n.createdAt==="string"&&typeof n.updatedAt==="string"&&(!n.tags||Array.isArray(n.tags)&&n.tags.length<=12&&n.tags.every((t:unknown)=>typeof t==="string"&&normalizeTag(t)!==null))&&(!n.recordings||Array.isArray(n.recordings)&&n.recordings.length<=10&&n.recordings.every((r:unknown)=>!!r&&typeof r==="object"&&"id"in r&&typeof r.id==="string"&&"durationMs"in r&&typeof r.durationMs==="number"&&r.durationMs>0&&r.durationMs<=120000))))throw new Error("Tarayıcıdaki defter okunamadı; eski kayıt korunuyor.");return value;
}
export function storeNotebook(notes:PersonalNote[],scope?:string){localStorage.setItem(notebookKey(scope),JSON.stringify(notes));window.dispatchEvent(new Event("satir:notebook-changed"));}
export async function loadNotebook(signal?:AbortSignal){return(await api<Output<"listPersonalNotes">>("GET","/me/notes",{signal})).data.items;}
export async function saveNotebookNote(note:PersonalNote,creating:boolean,signal?:AbortSignal,audio?:AudioInput,clips?:RecordingWrite[]){return(await api<Output<"putPersonalNote">>("PUT",`/me/notes/${note.id}`,{signal,body:({body:note.body,color:note.color,title:note.title??"",tags:note.tags??[],...(audio?{audio}:{recordings:clips??recordings(note).map(c=>({id:c.id}))})} satisfies Input<"putPersonalNote">),...(creating?{ifNoneMatch:"*"}:{ifMatch:note.version})})).data;}
export async function deleteNotebookNote(id:string,signal?:AbortSignal){await api("DELETE",`/me/notes/${id}`,{signal});}
export function hashtags(body:string){return [...new Set((body.match(/#[\p{L}\p{N}_-]+/gu)??[]).map(t=>t.toLocaleLowerCase("tr")))];}
export function newPersonalNote(body:string,color:NoteColor):PersonalNote{const now=new Date().toISOString();return{id:crypto.randomUUID(),body,color,title:"",tags:[],recordings:[],version:0,createdAt:now,updatedAt:now};}

/** A retry may clear a guest copy only when all notebook content already matches. */
export function sameNotebookContent(a:PersonalNote,b:PersonalNote){const content=(n:PersonalNote)=>({body:n.body,title:n.title??"",color:n.color??"lavender",tags:noteTags(n).sort(),recordings:recordings(n).map(c=>({id:c.id,mime:c.mime,durationMs:c.durationMs}))});return JSON.stringify(content(a))===JSON.stringify(content(b));}
