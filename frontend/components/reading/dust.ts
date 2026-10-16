/** Decorative, local-only removal. Persistence must succeed before this effect starts. */
export async function dissolveNote(element:HTMLElement|undefined,signal:AbortSignal){
 if(!element||signal.aborted||typeof element.animate!=="function"||document.documentElement.dataset.motion==="off"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
 const layer=document.createElement("div");layer.className="rn-dust";layer.setAttribute("aria-hidden","true");layer.style.cssText=`left:${element.offsetLeft}px;top:${element.offsetTop}px;right:auto;bottom:auto;width:${element.offsetWidth}px;height:${element.offsetHeight}px;--note-color:${getComputedStyle(element).getPropertyValue("--note-color")};z-index:50`;element.parentElement?.append(layer);
 const particles:Animation[]=[];for(let i=0;i<32;i++){const dot=document.createElement("i");dot.style.left=`${30+(i*37)%70}%`;dot.style.top=`${(i*29)%100}%`;layer.append(dot);particles.push(dot.animate([{opacity:0,transform:"translate(0,0) scale(1)"},{opacity:.8,offset:.25},{opacity:0,transform:`translate(${25+(i*13)%65}px,${(i*17)%65-32}px) scale(.2)`}],{duration:420,delay:(i%4)*15,easing:"ease-out",fill:"forwards"}));}
 const animation=element.animate([{opacity:1,clipPath:"inset(0 0 0 0)"},{opacity:0,clipPath:"inset(0 100% 0 0)"}],{duration:420,easing:"cubic-bezier(.3,0,.6,1)",fill:"forwards"});
 const stop=()=>{animation.cancel();particles.forEach(p=>p.cancel());layer.remove();};signal.addEventListener("abort",stop,{once:true});
 try{await animation.finished;}catch{/* Component/account closed. */}finally{stop();signal.removeEventListener("abort",stop);}
}
