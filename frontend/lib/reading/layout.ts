type NoteBox = {id:string; y:number; height:number};
/** Source order is stable. With a start, pack the column instead of leaving gaps up to each source. */
export function stackNotes(items:NoteBox[],gap=12,start?:number):{id:string;top:number}[]{
 let bottom=Math.max(0,start??0);
 return [...items].sort((a,b)=>a.y-b.y || a.id.localeCompare(b.id)).map(item=>{
  const top=start===undefined?Math.max(0,item.y,bottom):bottom;
  bottom=top+item.height+gap;
  return{id:item.id,top};
 });
}
