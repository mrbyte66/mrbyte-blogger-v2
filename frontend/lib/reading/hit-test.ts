import {anchorRange,findAnchor,resolveOffsets,type ReadingMark,type TextAnchor} from "./model";
/** Selection actions must use the same recovered locations as the visible highlights. */
export function overlappingMarks(root:HTMLElement|null,marks:ReadingMark[],fragments:TextAnchor[]){
 if(!root||!fragments.length)return[];
 const locate=(fragment:TextAnchor)=>{const element=findAnchor(root,fragment.anchorId);const offsets=element&&resolveOffsets(element.textContent??"",fragment);return element&&offsets?{element,...offsets}:null;};
 const selected=fragments.map(locate).filter(p=>p!==null);
 return marks.filter(m=>m.kind!=="bookmark"&&m.fragments.some(f=>{const source=locate(f);return source&&selected.some(p=>p.element===source.element&&p.start<source.end&&p.end>source.start);}));
}
/** CSS Highlights do not wrap prose; hit testing therefore uses the text caret's DOM range. */
export function marksAtPoint(root:HTMLElement,marks:ReadingMark[],x:number,y:number){
 const doc=root.ownerDocument as Document&{caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null;caretRangeFromPoint?:(x:number,y:number)=>Range|null};
 const caret=doc.caretPositionFromPoint?.(x,y);const legacy=caret?null:doc.caretRangeFromPoint?.(x,y);const node=caret?.offsetNode??legacy?.startContainer;const offset=caret?.offset??legacy?.startOffset;if(!node||offset===undefined||!root.contains(node))return[];
 return marks.filter(m=>m.kind!=="bookmark"&&m.fragments.some(f=>{const range=anchorRange(root,f);try{return range?.comparePoint(node,offset)===0;}catch{return false;}}));
}
