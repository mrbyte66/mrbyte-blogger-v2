/** Stable, source-ordered stacking: measured cards never cover each other, even at the same anchor. */
export function stackNotes(items:{id:string; y:number; height:number}[],gap=12):{id:string;top:number}[]{
 let bottom=0;return [...items].sort((a,b)=>a.y-b.y || a.id.localeCompare(b.id)).map(item=>{const top=Math.max(0,item.y,bottom);bottom=top+item.height+gap;return{id:item.id,top};});
}
