import {anchorRange,findAnchor,resolvedAnchors,type ReadingMark,type TextAnchor} from "./model";
/** Selection actions must use the same recovered locations as the visible highlights. */
export function overlappingMarks(root:HTMLElement|null,marks:ReadingMark[],fragments:TextAnchor[]){
 if(!root||!fragments.length)return[];
 const locate=(fragment:TextAnchor,mode:"follow"|"exact"="follow")=>resolvedAnchors(root,fragment,mode).map(p=>({...p,element:findAnchor(root,p.anchorId)}));
 const selected=fragments.flatMap(p=>locate(p));
 return marks.filter(m=>m.kind!=="bookmark"&&m.fragments.some(f=>locate(f,m.anchorMode).some(source=>selected.some(p=>p.element===source.element&&p.start<source.end&&p.end>source.start))));
}
/** CSS Highlights do not wrap prose; hit testing therefore uses the text caret's DOM range. */
export function marksAtPoint(root:HTMLElement,marks:ReadingMark[],x:number,y:number){
 const doc=root.ownerDocument as Document&{caretPositionFromPoint?:(x:number,y:number)=>{offsetNode:Node;offset:number}|null;caretRangeFromPoint?:(x:number,y:number)=>Range|null};
 const caret=doc.caretPositionFromPoint?.(x,y);const legacy=caret?null:doc.caretRangeFromPoint?.(x,y);const node=caret?.offsetNode??legacy?.startContainer;const offset=caret?.offset??legacy?.startOffset;if(!node||offset===undefined||!root.contains(node))return[];
 return marks.filter(m=>m.kind!=="bookmark"&&m.fragments.some(f=>{const range=anchorRange(root,f,m.anchorMode);try{return range?.comparePoint(node,offset)===0;}catch{return false;}}));
}
