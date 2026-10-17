import {anchorRange,type ReadingMark,type TextAnchor} from "./model";
export function overlappingMarks(marks:ReadingMark[],fragments:TextAnchor[]){return marks.filter(m=>m.kind!=="bookmark"&&m.fragments.some(f=>fragments.some(p=>p.anchorId===f.anchorId&&p.start<f.end&&p.end>f.start)));}
/** CSS Highlights do not wrap prose; hit testing therefore uses the text caret's DOM range. */
export function marksAtPoint(root:HTMLElement,marks:ReadingMark[],x:number,y:number){
 const doc=root.ownerDocument as Document&{caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null;caretRangeFromPoint?:(x:number,y:number)=>Range|null};
 const caret=doc.caretPositionFromPoint?.(x,y);const legacy=caret?null:doc.caretRangeFromPoint?.(x,y);const node=caret?.offsetNode??legacy?.startContainer;const offset=caret?.offset??legacy?.startOffset;if(!node||offset===undefined||!root.contains(node))return[];
 return marks.filter(m=>m.kind!=="bookmark"&&m.fragments.some(f=>{const range=anchorRange(root,f);try{return range?.comparePoint(node,offset)===0;}catch{return false;}}));
}
