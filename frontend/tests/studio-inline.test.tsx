import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { createWorkspace } from "../lib/builder/model";
import { articles } from "../lib/content";
import { editThemeText, editDocumentText, inlineEditEvent, parseInlineEdit, type InlineEdit } from "../lib/builder/inline-edit";
import { InlineCanvasEditor } from "../components/builder/InlineCanvasEditor";
import { PreviewCanvas } from "../components/builder/PreviewCanvas";
const workspace = createWorkspace();
const block = workspace.draft.blocks[0];
const patch: InlineEdit = { scope:"theme", id:block.id, field:"title", value:"Yeni başlık", previous:"Kod yazarım." };
beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("inline canvas editing", () => {
  it("only changes allowed text, refuses stale edits and never changes identity or publication state", () => {
    expect(editThemeText(block, patch)).toMatchObject({ title:"Yeni başlık" });
    expect(editThemeText(block, {...patch,previous:"stale"})).toBeNull();
    expect(editThemeText(block, {...patch,field:"kind",previous:"scene",value:"header"})).toBeNull();
    const draft = {kind:"article" as const, article:articles[0]};
    const articlePatch: InlineEdit = {...patch,scope:"document",id:articles[0].slug,previous:articles[0].title};
    expect(editDocumentText(draft, articlePatch)).toMatchObject({ article:{title:"Yeni başlık",slug:articles[0].slug} });
    expect(editDocumentText(draft,{...articlePatch,field:"slug",previous:articles[0].slug})).toBeNull();
    expect(editDocumentText(draft,{...articlePatch,value:" "})).toBeNull();
    expect(parseInlineEdit({...patch,value:{danger:true}})).toBeNull();
  });
  it("streams edits from the canvas and does not revert the streamed edit on Escape", () => {
    const post = vi.spyOn(window.parent,"postMessage");
    render(<InlineCanvasEditor theme={workspace.draft} draft={null} enabled><div data-block-id={block.id}><h1 data-inline-field="title">Kod yazarım.</h1></div></InlineCanvasEditor>);
    expect(screen.getByRole("heading").getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(screen.getByRole("heading"), {key:"Enter"});
    screen.getByLabelText("Başlık · tuval").textContent="İlk taslak";
    fireEvent.input(screen.getByLabelText("Başlık · tuval"));
    expect(post).toHaveBeenLastCalledWith({type:inlineEditEvent,edit:{...patch,value:"İlk taslak"}},window.location.origin);
    fireEvent.keyDown(screen.getByLabelText("Başlık · tuval"),{key:"Escape"});
    expect(post).toHaveBeenLastCalledWith({type:inlineEditEvent,edit:{...patch,value:"İlk taslak"}},window.location.origin);
    fireEvent.click(screen.getByRole("heading"));
    screen.getByLabelText("Başlık · tuval").textContent=patch.value;
    fireEvent.input(screen.getByLabelText("Başlık · tuval"));
    fireEvent.keyDown(screen.getByLabelText("Başlık · tuval"),{key:"Enter",ctrlKey:true});
    expect(post).toHaveBeenCalledWith({type:inlineEditEvent,edit:patch},window.location.origin);
  });
  it("accepts patches only from its own same-origin frame while in editing mode", () => {
    const onInlineEdit = vi.fn();
    const selection = {id:null,request:0,editing:true};
    const props = {workspace,mobile:false,selection,onSelect:vi.fn(),onInlineEdit};
    const {rerender} = render(<PreviewCanvas {...props} />);
    const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
    function send(origin:string,source:MessageEventSource|null) { act(()=> window.dispatchEvent(new MessageEvent("message",{data:{type:inlineEditEvent,edit:patch},origin,source}))); }
    send("https://foreign.example",frame.contentWindow); send(window.location.origin,window);
    expect(onInlineEdit).not.toHaveBeenCalled();
    send(window.location.origin,frame.contentWindow); expect(onInlineEdit).toHaveBeenCalledOnce();
    rerender(<PreviewCanvas {...props} selection={{...selection,editing:false}} />);
    send(window.location.origin,frame.contentWindow); expect(onInlineEdit).toHaveBeenCalledOnce();
  });
});

describe("paragraph structure and stable anchors", () => {
  const draft = {kind:"article" as const, article:{...articles[0],paragraphs:["Birinci","İkinci"],blockIds:{paragraphs:["id-one","id-two"]},paragraphFormats:[{kind:"heading" as const,level:2 as const},{kind:"paragraph" as const}]}};
  const edit: InlineEdit={scope:"document",id:articles[0].slug,field:"paragraph-0",previous:"Birinci",value:"Düzenlenen"};
  it("moves text, formatting and annotation identity together",()=>{
    const next=editDocumentText(draft,{...edit,action:"move-down"});
    expect(next?.kind==="article" && next.article.paragraphs).toEqual(["İkinci","Düzenlenen"]);
    expect(next?.kind==="article" && next.article.blockIds?.paragraphs).toEqual(["id-two","id-one"]);
    expect(next?.kind==="article" && next.article.paragraphFormats?.[1]).toEqual({kind:"heading",level:2});
    expect(editDocumentText(draft,{...edit,action:"move-up"})).toBeNull();
  });
  it("inserts a separate anchor and enforces heading length",()=>{
    const next=editDocumentText(draft,{...edit,action:"insert-after"});
    expect(next?.kind==="article" && next.article.paragraphs).toHaveLength(3);
    expect(next?.kind==="article" && next.article.blockIds?.paragraphs[1]).not.toBe("id-one");
    expect(editDocumentText(draft,{...edit,value:"x".repeat(301),action:"heading2"})).toBeNull();
    expect(editDocumentText(draft,{...edit,action:"quote"})).toMatchObject({article:{paragraphFormats:[{kind:"quote"},{kind:"paragraph"}]}});
  });
});
