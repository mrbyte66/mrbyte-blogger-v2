import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe,it,expect,vi,afterEach,beforeEach } from "vitest";
import { InlineCanvasEditor } from "../components/builder/InlineCanvasEditor";
import { createWorkspace } from "../lib/builder/model";
import { articles } from "../lib/content";
import { editDocumentText,inlineEditEvent,type InlineEdit } from "../lib/builder/inline-edit";
import { selectOffsets } from "../lib/builder/rich-text";
import { previewEvents } from "../lib/builder/preview-protocol";
const workspace=createWorkspace();
const article={...articles[0],paragraphs:["Birinci","İkinci"],blockIds:{paragraphs:["one","two"]},paragraphFormats:[{kind:"paragraph" as const},{kind:"paragraph" as const}]};
const draft={kind:"article" as const,article};
const patch:InlineEdit={scope:"document",id:article.slug,field:"paragraph-1",previous:"İkinci",value:"İkinci"};
beforeEach(()=>{Element.prototype.scrollIntoView=vi.fn();});
afterEach(()=>vi.restoreAllMocks());
function mount() {
 const post=vi.spyOn(window.parent,"postMessage");
 render(<InlineCanvasEditor theme={workspace.draft} draft={draft} enabled><h1 data-edit-field="title">{article.title}</h1><p data-edit-field="excerpt">{article.excerpt}</p><p data-edit-field="paragraph-0">Birinci</p><p data-edit-field="paragraph-1">İkinci</p></InlineCanvasEditor>);
 return post;
}
function open(field:string) {const node=document.querySelector<HTMLElement>(`[data-edit-field="${field}"]`)!;fireEvent.keyDown(node,{key:"Enter"});return node;}
function caret(node:HTMLElement,start:number,end=start) {selectOffsets(node,start,end);act(()=>document.dispatchEvent(new Event("selectionchange")));}
it("shows tools only for selected text and leaves composing Enter alone",()=>{
 const post=mount(),node=open("paragraph-0");
 expect(screen.queryByRole("toolbar")).toBeNull();
 caret(node,0,3);expect(screen.getByRole("toolbar")).toBeTruthy();
 caret(node,2);expect(screen.queryByRole("toolbar")).toBeNull();
 const count=post.mock.calls.length;fireEvent.keyDown(node,{key:"Enter",isComposing:true});
 expect(post.mock.calls.length).toBe(count);
});
it("Enter replaces the selected text when splitting, without duplicating it",()=>{
 const post=mount(),node=open("paragraph-0");caret(node,2,5);fireEvent.keyDown(node,{key:"Enter"});
 const message=post.mock.calls.map(call=>call[0]).findLast(data=>data.type===inlineEditEvent);
 expect(message.edit).toMatchObject({action:"split",offset:2,end:5});
 const next=editDocumentText(draft,message.edit);
 expect(next?.kind==="article" && next.article.paragraphs).toEqual(["Bi","ci","İkinci"]);
});
it("Backspace joins paragraphs while keeping the first stable anchor and both mark ranges",()=>{
 const withMarks={...draft,article:{...article,paragraphMarks:[[{type:"bold" as const,start:0,end:3}],[{type:"italic" as const,start:0,end:2}]]}};
 const next=editDocumentText(withMarks,{...patch,action:"join-previous"});
 expect(next?.kind==="article" && next.article.paragraphs).toEqual(["Birinciİkinci"]);
 expect(next?.kind==="article" && next.article.blockIds?.paragraphs).toEqual(["one"]);
 expect(next?.kind==="article" && next.article.paragraphMarks?.[0]).toEqual([{type:"bold",start:0,end:3},{type:"italic",start:7,end:9}]);
 const post=mount(),node=open("paragraph-1");caret(node,0);fireEvent.keyDown(node,{key:"Backspace"});
 expect(post.mock.calls.map(call=>call[0]).findLast(data=>data.type===inlineEditEvent).edit.action).toBe("join-previous");
});
it("pastes paragraphs as plain text with separate anchors and a valid caret destination",()=>{
 const next=editDocumentText(draft,{...patch,action:"paste",offset:1,end:3,pasteText:"A\nB"});
 expect(next?.kind==="article" && next.article.paragraphs).toEqual(["Birinci","İA","Bnci"]);
 expect(next?.kind==="article" && new Set(next.article.blockIds?.paragraphs).size).toBe(3);
 const post=mount(),node=open("paragraph-1");caret(node,1,3);
 fireEvent.paste(node,{clipboardData:{getData:()=>"<b>A</b>\nB"}});
 expect(post.mock.calls.map(call=>call[0]).findLast(data=>data.type===inlineEditEvent).edit).toMatchObject({action:"paste",offset:1,end:3,pasteText:"<b>A</b>\nB"});
});
it("sends Save as a request instead of opening the browser's save dialog",()=>{
 const post=mount(),node=open("paragraph-0");fireEvent.keyDown(node,{key:"s",ctrlKey:true});
 expect(post).toHaveBeenCalledWith({type:previewEvents.save},window.location.origin);
});
it("waits for the joined draft before restoring the caret to an existing paragraph",()=>{
 const post=vi.spyOn(window.parent,"postMessage");
 function content(value:typeof draft) {return <><p data-edit-field="paragraph-0">{value.article.paragraphs[0]}</p>{value.article.paragraphs.length>1 && <p data-edit-field="paragraph-1">{value.article.paragraphs[1]}</p>}</>;}
 const {rerender}=render(<InlineCanvasEditor theme={workspace.draft} draft={draft} enabled>{content(draft)}</InlineCanvasEditor>);
 const node=open("paragraph-1");caret(node,0);fireEvent.keyDown(node,{key:"Backspace"});
 expect(screen.queryByRole("textbox")).toBeNull();
 const edit=post.mock.calls.map(call=>call[0]).findLast(data=>data.type===inlineEditEvent).edit;
 const next=editDocumentText(draft,edit) as typeof draft;
 rerender(<InlineCanvasEditor theme={workspace.draft} draft={next} enabled>{content(next)}</InlineCanvasEditor>);
 expect(screen.getByRole("textbox").textContent).toBe("Birinciİkinci");
});
