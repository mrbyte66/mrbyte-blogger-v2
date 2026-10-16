import type { AudioInput } from "./model";
/** Private blobs, separated by account. No recording is put into public media or localStorage. */
function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{ const request=indexedDB.open("satir-reading-audio",1); request.onupgradeneeded=()=>request.result.createObjectStore("recordings"); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(new Error("Ses kaydı alanına erişilemiyor.")); });
}
const key=(scope:string,id:string)=>`${scope}:${id}`;
export async function storeAudio(scope:string,id:string,blob:Blob):Promise<void> {
 const db=await database(); try { await new Promise<void>((resolve,reject)=>{const tx=db.transaction("recordings","readwrite");tx.objectStore("recordings").put(blob,key(scope,id));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error("Ses kaydedilemedi. Tarayıcı depolama alanını kontrol et."));tx.onabort=tx.onerror;}); } finally {db.close();}
}
export async function readAudio(scope:string,id:string):Promise<Blob|null> {
 const db=await database(); try {return await new Promise<Blob|null>((resolve,reject)=>{const request=db.transaction("recordings").objectStore("recordings").get(key(scope,id));request.onsuccess=()=>resolve(request.result ?? null);request.onerror=()=>reject(new Error("Ses kaydı okunamadı."));});}finally{db.close();}
}
export async function removeAudio(scope:string,id:string):Promise<void>{const db=await database();try{await new Promise<void>((resolve,reject)=>{const tx=db.transaction("recordings","readwrite");tx.objectStore("recordings").delete(key(scope,id));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(new Error("Ses silinemedi."));});}finally{db.close();}}
export async function audioInput(blob:Blob,durationMs:number):Promise<AudioInput>{
 if(blob.size>1_000_000)throw new Error("Ses kaydı çok büyük; daha kısa bir kayıt dene.");
 const mime=blob.type.split(";")[0];if(mime!=="audio/webm"&&mime!=="audio/ogg"&&mime!=="audio/mp4")throw new Error("Bu ses biçimi desteklenmiyor.");
 const bytes=new Uint8Array(await blob.arrayBuffer());let raw="";for(let i=0;i<bytes.length;i+=8192)raw+=String.fromCharCode(...bytes.subarray(i,i+8192));
 return {data:btoa(raw),mime,durationMs};
}
