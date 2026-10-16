"use client";
import { useEffect, useRef, useState } from "react";
import { ReadingIcon as Icon } from "./ReadingIcon";

export function RecordingButton({onRecorded,disabled=false}:{onRecorded:(blob:Blob,durationMs:number)=>void;disabled?:boolean}){
 const [state,setState]=useState<"idle"|"asking"|"recording">("idle");const [seconds,setSeconds]=useState(0);const [error,setError]=useState("");
 const recorder=useRef<MediaRecorder|null>(null);const stream=useRef<MediaStream|null>(null);const alive=useRef(true);const timer=useRef<ReturnType<typeof setInterval>|null>(null);
 const callback=useRef(onRecorded);callback.current=onRecorded;
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;if(timer.current)clearInterval(timer.current);if(recorder.current?.state==="recording")recorder.current.stop();stream.current?.getTracks().forEach(t=>t.stop());};},[]);
 async function start(){
  if(state!=="idle")return;
  if(!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder==="undefined"){setError("Tarayıcın ses kaydını desteklemiyor. Metin notu ekleyebilirsin.");return;}
  setState("asking");setError("");
  try{
   const media=await navigator.mediaDevices.getUserMedia({audio:true});if(!alive.current){media.getTracks().forEach(t=>t.stop());return;}stream.current=media;
   const mime=["audio/webm;codecs=opus","audio/ogg;codecs=opus","audio/mp4"].find(m=>MediaRecorder.isTypeSupported(m));
   if(!mime)throw new Error("FORMAT");
   const rec=new MediaRecorder(media,{mimeType:mime,audioBitsPerSecond:32000});recorder.current=rec;const chunks:Blob[]=[];let bytes=0;const started=Date.now();let invalid=false;
   rec.ondataavailable=e=>{if(e.data.size){bytes+=e.data.size;chunks.push(e.data);if(bytes>1_000_000){invalid=true;rec.stop();}}};
   rec.onerror=()=>{invalid=true;if(alive.current)setError("Ses kaydı kesildi. Tekrar deneyebilirsin.");};
   rec.onstop=()=>{if(timer.current)clearInterval(timer.current);media.getTracks().forEach(t=>t.stop());if(!alive.current)return;setState("idle");const duration=Math.min(120000,Math.max(1,Date.now()-started));if(invalid){setError("Ses kaydı tamamlanamadı veya boyut sınırını aştı. Daha kısa bir kayıt dene.");return;}const blob=new Blob(chunks,{type:mime.split(";")[0]});if(blob.size<12){setError("Ses alınamadı. Mikrofonunu kontrol et.");return;}callback.current(blob,duration);};
   rec.start(1000);setSeconds(0);setState("recording");timer.current=setInterval(()=>{const elapsed=Math.floor((Date.now()-started)/1000);setSeconds(elapsed);if(elapsed>=120 && rec.state==="recording")rec.stop();},250);
  }catch{stream.current?.getTracks().forEach(t=>t.stop());if(alive.current){setState("idle");setError("Mikrofona erişilemedi. Tarayıcıdaki mikrofon iznini kontrol et.");}}
 }
 return <div className="rn-voice"><button type="button" className={`rn-voice-button ${state==="recording"?"is-recording":""}`} disabled={disabled || state==="asking"} onClick={()=>state==="recording"?recorder.current?.stop():void start()}><Icon name={state==="recording"?"stop":"mic"}/>{state==="recording"?`Kaydı bitir · ${seconds} sn`:state==="asking"?"Mikrofon izni bekleniyor…":"Sesli not kaydet"}</button>{error&&<p role="alert">{error}</p>}<small>{state==="recording"?"Kayıt sürüyor · en fazla 2 dakika":"Kayıt yalnız senin notlarına eklenir."}</small></div>;
}
export function VoicePlayback({load,label}:{load:()=>Promise<Blob|null>;label:string}){
 const [src,setSrc]=useState("");const [error,setError]=useState("");const loader=useRef(load);loader.current=load;
 useEffect(()=>{let cancelled=false;let url="";void loader.current().then(blob=>{if(cancelled)return;if(!blob)throw new Error();url=URL.createObjectURL(blob);setSrc(url);},()=>{if(!cancelled)setError("Ses kaydı yüklenemedi.");}).catch(()=>{if(!cancelled)setError("Ses kaydı bulunamadı.");});return()=>{cancelled=true;if(url)URL.revokeObjectURL(url);};},[label]);
 return error?<p role="alert">{error}</p>:src?<audio controls preload="metadata" src={src} aria-label={label}/>:<p role="status">Ses yükleniyor…</p>;
}
