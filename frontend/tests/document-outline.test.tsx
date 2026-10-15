import {act,fireEvent,render,screen,within} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
import {documentOutline} from "../lib/builder/document-outline";
import {editDocumentText,inlineEditEvent,parseInlineEdit} from "../lib/builder/inline-edit";
import {previewEvents} from "../lib/builder/preview-protocol";
import {DocumentPreview} from "../components/builder/DocumentPreview";
import {InlineCanvasEditor} from "../components/builder/InlineCanvasEditor";
import {SiteEditor} from "../components/builder/SiteEditor";
import {createWorkspace} from "../lib/builder/model";
import {articles} from "../lib/content";
import {MemorySite,renderWithSite} from "./support/memory-site";
import {readCanvas,writeCanvas} from "./helpers/canvas";
const workspace=createWorkspace();
beforeEach(()=>{
 localStorage.clear();
 vi.stubGlobal("ResizeObserver",class{observe(){}disconnect(){}});
 vi.stubGlobal("matchMedia",vi.fn(()=>({matches:true,addEventListener(){},removeEventListener(){}})));
 Element.prototype.scrollIntoView=vi.fn();
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function page(){const site=new MemorySite();renderWithSite(<SiteEditor/>,{site,mode:"studio"});fireEvent.click(screen.getByRole("button",{name:/^Sayfalar:/}));fireEvent.click(screen.getByRole("button",{name:site.articles[0].title}));return site;}
it("derives only headings, preserving stable anchors and nested hierarchy",()=>{
 const article={...articles[0],paragraphs:["Metin","Ana bölüm","Alt bölüm","Alıntı"],paragraphFormats:[{kind:"paragraph" as const},{kind:"heading" as const,level:2 as const},{kind:"heading" as const,level:3 as const},{kind:"quote" as const}],blockIds:{paragraphs:["a","b","c","d"]}};
 expect(documentOutline({kind:"article",article}).map(({key,field,level})=>({key,field,level}))).toEqual([{key:"title",field:"title",level:1},{key:"b",field:"paragraph-1",level:2},{key:"c",field:"paragraph-2",level:3}]);
});
it("keeps tools directly accessible and shares a single panel without losing heading edits",()=>{
 page();
 expect(screen.queryByText("Yazı araçları",{selector:"summary"})).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Başlık ekle"}));
 const draft=readCanvas(); expect(draft.kind==="article" && draft.article.paragraphFormats?.at(-1)?.kind).toBe("heading");
 const field=`paragraph-${draft.kind==="article" ? draft.article.paragraphs.length-1 : 0}`;
 writeCanvas(field,"Yeni alt bölüm");
 const outline=screen.getByRole("navigation",{name:"Yazının içindekileri"});
 expect(within(outline).getByRole("button",{name:"Yeni alt bölüm"})).toBeTruthy();
 fireEvent.click(screen.getByRole("button",{name:"Tasarım"}));
 expect(screen.getAllByRole("complementary",{name:"Seçili alanın ayarları"})).toHaveLength(1);
 expect(screen.getByRole("tab",{name:"Ayarlar"}).getAttribute("aria-selected")).toBe("true");
 fireEvent.click(screen.getByRole("tab",{name:"İçindekiler"}));
 expect(screen.getByRole("button",{name:"Yeni alt bölüm"})).toBeTruthy();
});
it("sends heading navigation to its own frame without changing document text",()=>{
 page();const before=readCanvas();
 const frame=screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
 const post=vi.spyOn(frame.contentWindow!,"postMessage");
 fireEvent.click(within(screen.getByRole("navigation",{name:"Yazının içindekileri"})).getByRole("button",{name:before.kind==="article"?before.article.title:""}));
 expect(post).toHaveBeenCalledWith({type:previewEvents.outlineJump,field:"title"},window.location.origin);
 expect(readCanvas()).toEqual(before);
});
it("shows insertion affordance on hover before editing, and offers the matching compact menu",()=>{
 const draft={kind:"article" as const,article:articles[0]};
 render(<InlineCanvasEditor theme={workspace.draft} draft={draft} enabled><p data-edit-field="paragraph-0">{draft.article.paragraphs[0]}</p></InlineCanvasEditor>);
 const node=document.querySelector('[data-edit-field="paragraph-0"]')!;
 fireEvent.pointerMove(node,{pointerType:"mouse"});
 expect(screen.queryByRole("textbox")).toBeNull();
 fireEvent.click(screen.getByRole("button",{name:"Blok ekle"}));
 expect(screen.getByRole("listbox",{name:"Blok ekle"})).toBeTruthy();
 expect(screen.getByRole("option",{name:"Görsel"})).toBeTruthy();
 expect(screen.getByRole("button",{name:"Sesle yazma · Yakında"}).hasAttribute("disabled")).toBe(true);
});
it("does not scroll the live page again when a selected field merely changes",()=>{
 const draft={kind:"article" as const,article:articles[0]};
 const {rerender}=renderWithSite(<DocumentPreview draft={draft} theme={workspace.draft} selection={{id:"title",request:0,editing:true}} onSelect={()=>{}}/>,{mode:"studio"});
 vi.mocked(Element.prototype.scrollIntoView).mockClear();
 rerender(<DocumentPreview draft={draft} theme={workspace.draft} selection={{id:"paragraph-0",request:0,editing:true}} onSelect={()=>{}}/>);
 expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
 act(()=>window.dispatchEvent(new MessageEvent("message",{source:window,origin:"https://other.test",data:{type:previewEvents.outlineJump,field:"title"}})));
 expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
 act(()=>window.dispatchEvent(new MessageEvent("message",{source:window,origin:window.location.origin,data:{type:previewEvents.outlineJump,field:"title"}})));
 expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
});

it("inserts below a hovered paragraph without converting or losing its original text",()=>{
 const draft={kind:"article" as const,article:articles[0]};
 const post=vi.spyOn(window.parent,"postMessage");
 render(<InlineCanvasEditor theme={workspace.draft} draft={draft} enabled><p data-edit-field="paragraph-0">{draft.article.paragraphs[0]}</p></InlineCanvasEditor>);
 fireEvent.pointerMove(document.querySelector('[data-edit-field="paragraph-0"]')!,{pointerType:"mouse"});
 fireEvent.click(screen.getByRole("button",{name:"Blok ekle"}));
 fireEvent.click(screen.getByRole("option",{name:"Başlık"}));
 const edit=post.mock.calls.map(call=>call[0]).findLast(data=>data.type===inlineEditEvent)?.edit;
 expect(parseInlineEdit(edit)).toBeTruthy();
 const next=editDocumentText(draft,edit);
 expect(next?.kind==="article" && next.article.paragraphs[0]).toBe(draft.article.paragraphs[0]);
 expect(next?.kind==="article" && next.article.paragraphFormats?.[1]).toMatchObject({kind:"heading",level:2});
 expect(next?.kind==="article" && next.article.paragraphs.length).toBe(draft.article.paragraphs.length+1);
 expect(parseInlineEdit({...edit,insertKind:"script"})).toBeNull();
});
