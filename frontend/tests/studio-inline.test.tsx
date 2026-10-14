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
  it("keeps typing local until confirmation and allows Escape to cancel", () => {
    const post = vi.spyOn(window.parent,"postMessage");
    render(<InlineCanvasEditor theme={workspace.draft} draft={null} enabled><div data-block-id={block.id}><h1 data-inline-field="title">Kod yazarım.</h1></div></InlineCanvasEditor>);
    expect(screen.getByRole("heading").getAttribute("tabindex")).toBe("0");
    fireEvent.keyDown(screen.getByRole("heading"), {key:"Enter"});
    fireEvent.change(screen.getByLabelText("Başlık · tuval"),{target:{value:"İlk taslak"}});
    expect(post).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByLabelText("Başlık · tuval"),{key:"Escape"});
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("heading"));
    fireEvent.change(screen.getByLabelText("Başlık · tuval"),{target:{value:patch.value}});
    fireEvent.click(screen.getByRole("button",{name:/Tamam/}));
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
