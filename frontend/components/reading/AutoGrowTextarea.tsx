"use client";
import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";
/** Measure a separate, identically styled field so the visible editor never snaps through height:auto. */
export function AutoGrowTextarea({value,minHeight=240,...props}:TextareaHTMLAttributes<HTMLTextAreaElement>&{minHeight?:number}){
 const field=useRef<HTMLTextAreaElement>(null);const measure=useRef<HTMLTextAreaElement>(null);
 useLayoutEffect(()=>{const el=field.current;const shadow=measure.current;if(!el||!shadow)return;
  const resize=()=>{shadow.style.width=`${el.getBoundingClientRect().width}px`;const ceiling=Math.max(minHeight,Math.min(620,window.innerHeight*.56));const height=Math.min(ceiling,Math.max(minHeight,shadow.scrollHeight+2));el.style.height=`${height}px`;el.style.overflowY=shadow.scrollHeight>ceiling?"auto":"hidden";};
  resize();const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(resize):null;observer?.observe(el);window.addEventListener("resize",resize);return()=>{observer?.disconnect();window.removeEventListener("resize",resize);};
 },[value,minHeight]);
 return <div className="rn-grow-field"><textarea {...props} value={value} ref={field} className="rn-grow-input"/><textarea className="rn-grow-measure" ref={measure} value={value} readOnly tabIndex={-1} aria-hidden="true"/></div>;
}
