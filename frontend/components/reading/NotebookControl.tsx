"use client";
import { useEffect, useRef, useState } from "react";
import { SlideLink } from "../SlideLink";
import { GeneralNotebook } from "./GeneralNotebook";
import { ReadingIcon as Icon } from "./ReadingIcon";
export function NotebookControl(){
 const [open,setOpen]=useState(false);const dialog=useRef<HTMLDialogElement>(null);const trigger=useRef<HTMLButtonElement>(null);const dirty=useRef(false);const [warning,setWarning]=useState(false);
 useEffect(()=>{if(open&&!dialog.current?.open){dialog.current?.showModal();dialog.current?.querySelector<HTMLTextAreaElement>(".rn-grow-input")?.focus({preventScroll:true});}if(!open&&dialog.current?.open){dialog.current.close();trigger.current?.focus();}},[open]);
 function close(){if(dirty.current){setWarning(true);return;}setOpen(false);setWarning(false);}
 return <><div className="rn-notebook-control"><SlideLink href="/notlar" aria-label="Defterim · kayıtlı notlar"><Icon name="note"/><span>Defterim</span></SlideLink><button ref={trigger} type="button" aria-label="Serbest Not oluştur" data-tip="Serbest Not oluştur" onClick={()=>{setOpen(true);setWarning(false);}}><Icon name="plus"/></button></div>
 <dialog ref={dialog} className="rn-compose-dialog" aria-label="Serbest Not oluştur" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>{open&&<GeneralNotebook compact onClose={close} onDirtyChange={value=>{dirty.current=value;if(!value)setWarning(false);}}/>}{warning&&<div className="rn-discard" role="alert"><p>Notun henüz kaydedilmedi. Yazdıkların burada kalabilir.</p><button onClick={()=>{setWarning(false);dialog.current?.querySelector("textarea")?.focus();}}>Yazmaya devam et</button><button onClick={()=>{dirty.current=false;setOpen(false);setWarning(false);}}>Kaydetmeden kapat</button></div>}</dialog></>;
}
