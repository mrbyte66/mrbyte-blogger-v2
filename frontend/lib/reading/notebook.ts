import type { Schema,Input,Output } from "../api/contract";
import { api } from "../api/http";
import type { AudioInput } from "./model";
import type { NoteColor } from "./model";
export type PersonalNote=Schema<"PersonalNote">;
export const notebookKey=(scope?:string)=>`satir:notebook:v1:${scope??"guest"}`;
export function guestNotebook(scope?:string):PersonalNote[]{const raw=localStorage.getItem(notebookKey(scope));if(!raw)return[];const value:unknown=JSON.parse(raw);if(!Array.isArray(value)||value.length>500||!value.every(n=>n&&typeof n.id==="string"&&typeof n.body==="string"&&n.body.length<=12000&&typeof n.createdAt==="string"&&typeof n.updatedAt==="string"))throw new Error("Tarayıcıdaki defter okunamadı; eski kayıt korunuyor.");return value;}
export function storeNotebook(notes:PersonalNote[],scope?:string){localStorage.setItem(notebookKey(scope),JSON.stringify(notes));window.dispatchEvent(new Event("satir:notebook-changed"));}
export async function loadNotebook(signal?:AbortSignal){return(await api<Output<"listPersonalNotes">>("GET","/me/notes",{signal})).data.items;}
export async function saveNotebookNote(note:PersonalNote,creating:boolean,signal?:AbortSignal,audio?:AudioInput){return(await api<Output<"putPersonalNote">>("PUT",`/me/notes/${note.id}`,{signal,body:({body:note.body,color:note.color,...(audio?{audio}:{})} satisfies Input<"putPersonalNote">),...(creating?{ifNoneMatch:"*"}:{ifMatch:note.version})})).data;}
export async function deleteNotebookNote(id:string,signal?:AbortSignal){await api("DELETE",`/me/notes/${id}`,{signal});}
export function hashtags(body:string){return [...new Set((body.match(/#[\p{L}\p{N}_-]+/gu)??[]).map(t=>t.toLocaleLowerCase("tr")))];}
export function newPersonalNote(body:string,color:NoteColor):PersonalNote{const now=new Date().toISOString();return{id:crypto.randomUUID(),body,color,version:0,createdAt:now,updatedAt:now};}
