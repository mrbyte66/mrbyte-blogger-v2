import { act, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReadingTools } from "../components/reading/ReadingTools";
import { anchorRange, parseReadingDocument, resolveOffsets, selectionAnchors, type ReadingMark, type TextAnchor } from "../lib/reading/model";
import { readingStorageKey } from "../lib/reading/storage";

const originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
const fragment: TextAnchor = { anchorId: "paragraph-0", start: 0, end: 5, quote: "Hello", before: "", after: " world" };
const mark: ReadingMark = { id: "mark-1", kind: "highlight", fragments: [fragment], note: "", createdAt: "2026-10-01T12:00:00.000Z" };
beforeEach(() => {
  localStorage.clear();
  window.getSelection()?.removeAllRanges();
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.restoreAllMocks(); vi.unstubAllGlobals();
  if (originalScroll) Object.defineProperty(Element.prototype, "scrollIntoView", originalScroll);
  else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});
function renderReader() {
  return render(<><article id="reading-content"><p data-reading-anchor="paragraph-0">Hello <strong>world</strong></p><p data-reading-anchor="paragraph-1">Another paragraph</p></article><ReadingTools articleId="sample" contentRootId="reading-content" /></>);
}
function selectText(start = 0, end = 5) {
  const node = document.querySelector('[data-reading-anchor="paragraph-0"]')!.firstChild!;
  const range = document.createRange(); range.setStart(node, start); range.setEnd(node, end);
  act(() => { window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range); document.dispatchEvent(new Event("selectionchange")); });
}
function saved() { return parseReadingDocument(localStorage.getItem(readingStorageKey("sample"))!, "sample"); }

describe("reading text anchors and validation", () => {
  it("captures actual text offsets across nested markup and paragraphs without changing DOM", () => {
    const { container } = renderReader();
    const root = document.getElementById("reading-content")!;
    const original = root.innerHTML;
    const first = root.querySelector("p")!.firstChild!;
    const last = root.querySelectorAll("p")[1].firstChild!;
    const range = document.createRange(); range.setStart(first, 3); range.setEnd(last, 7);
    window.getSelection()!.addRange(range);
    const anchors = selectionAnchors(root, window.getSelection());
    expect(anchors).toEqual([
      { anchorId: "paragraph-0", start: 3, end: 11, quote: "lo world", before: "Hel", after: "" },
      { anchorId: "paragraph-1", start: 0, end: 7, quote: "Another", before: "", after: " paragraph" },
    ]);
    expect(anchorRange(root, anchors[0])?.toString()).toBe("lo world");
    expect(root.innerHTML).toBe(original);
    expect(container.querySelector("mark")).toBeNull();
  });
  it("ignores collapsed selections and ranges outside article content", () => {
    renderReader(); selectText();
    const root = document.getElementById("reading-content")!;
    window.getSelection()!.collapse(root.querySelector("p")!.firstChild!, 2);
    expect(selectionAnchors(root, window.getSelection())).toEqual([]);
    const range = document.createRange(); range.selectNodeContents(screen.getByRole("complementary", { name: "Okuma araçları" }));
    window.getSelection()!.removeAllRanges(); window.getSelection()!.addRange(range);
    expect(selectionAnchors(root, window.getSelection())).toEqual([]);
  });
  it("recovers shifted text using context and refuses ambiguous or deleted quotations", () => {
    const anchor = { ...fragment, before: "Prefix ", after: " next" };
    expect(resolveOffsets("New Prefix Hello next", anchor)).toEqual({ start: 11, end: 16 });
    expect(resolveOffsets("X Hello and Hello end", { ...fragment, start: 100, end: 105, before: "", after: "" })).toBeNull();
    expect(resolveOffsets("Quote removed", fragment)).toBeNull();
  });
  it("validates version, article isolation, bounded offsets, mark kinds and note content", () => {
    const data = { version: 1, articleId: "sample", marks: [mark] };
    expect(parseReadingDocument(JSON.stringify(data), "sample")?.marks).toEqual([mark]);
    expect(parseReadingDocument(JSON.stringify(data), "other-article")).toBeNull();
    for (const bad of [
      { ...data, version: 2 }, { ...data, marks: [mark, mark] },
      { ...data, marks: [{ ...mark, kind: "script" }] },
      { ...data, marks: [{ ...mark, kind: ["note"], note: "" }] },
      { ...data, marks: [{ ...mark, kind: "note", note: " " }] },
      { ...data, marks: [{ ...mark, fragments: [{ ...fragment, start: -1 }] }] },
      { ...data, marks: [{ ...mark, fragments: [{ ...fragment, end: 100 }] }] },
      { ...data, marks: [{ ...mark, note: "x".repeat(4001) }] },
    ]) expect(parseReadingDocument(JSON.stringify(bad), "sample")).toBeNull();
    expect(parseReadingDocument("not-json", "sample")).toBeNull();
  });
});

describe("browser-local reading tools", () => {
  it("offers visible controls, saves a highlight, removes/undoes it and restores saved records", async () => {
    const user = userEvent.setup();
    const first = renderReader();
    expect(screen.getByRole("button", { name: "Seçili metni fosforlu kalemle işaretle" }).hasAttribute("disabled")).toBe(true);
    selectText();
    await user.click(screen.getByRole("button", { name: "Seçili metni fosforlu kalemle işaretle" }));
    expect(saved()?.marks[0]).toMatchObject({ kind: "highlight", fragments: [fragment] });
    await user.click(screen.getByRole("button", { name: /Notlar/ }));
    expect(screen.getByText(/Bu tarayıcı metnin üzerinde renk/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "1. kaydı kaldır" }));
    expect(saved()?.marks).toEqual([]);
    await user.click(screen.getByRole("button", { name: /Son kaldırmayı geri al/ }));
    expect(saved()?.marks).toHaveLength(1);
    first.unmount(); renderReader();
    await user.click(screen.getByRole("button", { name: /Notlar/ }));
    expect(screen.getByRole("button", { name: "1. alıntının bulunduğu bölüme git" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "1. alıntının bulunduğu bölüme git" }));
    await waitFor(()=>expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" }));
  });
  it("adds a selected-text note safely without interpreting user markup", async () => {
    const user = userEvent.setup(); renderReader(); selectText();
    await user.click(screen.getByRole("button", { name: "Seçili metne not ekle" }));
    const input = screen.getByLabelText("Bu alıntı için notun");
    await user.type(input, "<script>Keep thinking</script>");
    await user.click(screen.getByRole("button", { name: "Notu kaydet" }));
    expect(saved()?.marks[0]).toMatchObject({ kind: "note", note: "<script>Keep thinking</script>" });
    await user.click(screen.getByRole("button", { name: /Notlar/ }));
    const panel = screen.getByRole("region", { name: "Bu yazıdaki okuma notların" });
    expect(within(panel).getByText("<script>Keep thinking</script>")).toBeTruthy();
    expect(panel.querySelector("script")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("Bu tarayıcıya kaydedildi");
  });
  it("reports storage failures while retaining the new mark in the current session", async () => {
    const user = userEvent.setup(); renderReader(); selectText();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Unavailable"); });
    await user.click(screen.getByRole("button", { name: "Seçili metnin altını çiz" }));
    expect(screen.getByRole("alert").textContent).toContain("sayfa kapanınca kaybolabilir");
    expect(screen.getByRole("status").textContent).toContain("Yalnızca bu oturumda");
    await user.click(screen.getByRole("button", { name: /Notlar/ }));
    expect(screen.getByRole("button", { name: "1. kaydı kaldır" })).toBeTruthy();
    expect(localStorage.getItem(readingStorageKey("sample"))).toBeNull();
  });
  it("applies native CSS highlights and clears them on unmount without wrapping article text", async () => {
    const registry = { set: vi.fn(), delete: vi.fn() };
    vi.stubGlobal("CSS", { highlights: registry });
    vi.stubGlobal("Highlight", class { constructor(..._ranges: Range[]) {} });
    const user = userEvent.setup(); const { unmount } = renderReader(); selectText();
    await user.click(screen.getByRole("button", { name: "Seçili metnin altını çiz" }));
    expect(registry.set).toHaveBeenCalledWith("mrbyte-reading-underline", expect.anything());
    expect(document.querySelector('#reading-content mark')).toBeNull();
    unmount();
    expect(registry.delete).toHaveBeenCalledWith("mrbyte-reading-underline");
  });
  it("clears a stale selection when the reader releases or collapses it, while keeping it for the toolbar action", async () => {
    const user = userEvent.setup();
    const { container } = renderReader();
    const highlight = screen.getByRole("button", { name: "Seçili metni fosforlu kalemle işaretle" });
    selectText();
    expect(highlight.hasAttribute("disabled")).toBe(false);
    await user.click(highlight);
    expect(saved()?.marks).toHaveLength(1);
    expect(window.getSelection()?.isCollapsed).toBe(true);

    const paragraph = container.querySelector('[data-reading-anchor="paragraph-0"]')!;
    selectText(0, 5);
    act(() => { window.getSelection()!.removeAllRanges(); document.dispatchEvent(new Event("selectionchange")); });
    fireEvent.pointerUp(paragraph, { pointerType: "mouse", button: 0 });
    expect(screen.getByRole("button", { name: "Seçili metnin altını çiz" }).hasAttribute("disabled")).toBe(true);
    expect(screen.queryByText("Seçilen alıntı")).toBeNull();
  });
  it("keeps the caret of a form field outside the article, such as the login dialog (#38)", () => {
    render(<><article id="reading-content"><p data-reading-anchor="paragraph-0">Hello <strong>world</strong></p></article><ReadingTools articleId="sample" contentRootId="reading-content" /><dialog open><input aria-label="E-posta" /></dialog></>);
    const field = screen.getByLabelText("E-posta");
    const clear = vi.spyOn(window.getSelection()!, "removeAllRanges");
    act(() => field.focus());
    fireEvent.pointerUp(field, { pointerType: "mouse", button: 0 });
    expect(clear).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field);
  });

  it("rechecks saved marks when edited article content changes without removing the saved quote", async () => {
    localStorage.setItem(readingStorageKey("sample"), JSON.stringify({ version: 1, articleId: "sample", marks: [mark] }));
    const page = (text: string) => <><article id="reading-content"><p data-reading-anchor="paragraph-0">{text}</p></article><ReadingTools articleId="sample" contentRootId="reading-content" contentRevision={text} /></>;
    const { rerender } = render(page("Hello world"));
    await userEvent.setup().click(screen.getByRole("button", { name: /Notlar/ }));
    expect(screen.queryByText(/işaretin metindeki yeri değişmiş/)).toBeNull();
    rerender(page("Completely rewritten content"));
    expect(screen.getByText(/1 işaretin metindeki yeri değişmiş/)).toBeTruthy();
    expect(saved()?.marks[0].fragments[0].quote).toBe("Hello");
  });
  it("closes the panel with Escape and exposes the paragraph after a mobile jump", async () => {
    localStorage.setItem(readingStorageKey("sample"), JSON.stringify({ version: 1, articleId: "sample", marks: [mark] }));
    const user = userEvent.setup(); renderReader();
    await user.click(screen.getByRole("button", { name: /Notlar/ }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Bu yazıdaki okuma notların" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Notlar/ }));
    await user.click(screen.getByRole("button", { name: /Notlar/ }));
    vi.stubGlobal("matchMedia", vi.fn((query: string) => ({ matches: query.includes("max-width") })));
    await user.click(screen.getByRole("button", { name: "1. alıntının bulunduğu bölüme git" }));
    expect(screen.queryByRole("region", { name: "Bu yazıdaki okuma notların" })).toBeNull();
    await waitFor(()=>expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" }));
  });
});

it("edits an existing note without changing its ID and keeps it after closing the card", async()=>{
 localStorage.setItem(readingStorageKey("sample"),JSON.stringify({version:1,articleId:"sample",marks:[{...mark,kind:"note",note:"İlk düşünce",color:"mint"}]}));
 const user=userEvent.setup();renderReader();await user.click(screen.getByRole("button",{name:/Notlar/}));await user.click(screen.getByRole("button",{name:"Düzenle"}));
 const field=screen.getByLabelText("Bu alıntı için notun");await user.clear(field);await user.type(field,"Düzeltilen düşünce");await user.click(screen.getByRole("button",{name:"Notu kaydet"}));
 expect(saved()?.marks).toHaveLength(1);expect(saved()?.marks[0]).toMatchObject({id:"mark-1",note:"Düzeltilen düşünce",color:"mint"});
 await user.click(screen.getByRole("button",{name:"Notu kapat"}));expect(saved()?.marks).toHaveLength(1);
});
it("hides note UI without deleting personal data and preserves resume position", async()=>{
 const bookmark={...mark,id:"resume",kind:"bookmark",note:""};
 localStorage.setItem(readingStorageKey("sample"),JSON.stringify({version:1,articleId:"sample",marks:[{...mark,kind:"note",note:"Düşünce"},bookmark]}));
 const user=userEvent.setup();renderReader();await user.click(screen.getByRole("button",{name:/Notlar/}));await user.click(screen.getByRole("button",{name:"Düzenle"}));
 const toggle=screen.getByRole("switch",{name:"Notları göster"});await user.click(toggle);
 expect(toggle.getAttribute("aria-checked")).toBe("false");expect(screen.queryByLabelText("Notu kapat")).toBeNull();expect(saved()?.marks).toHaveLength(2);
 expect(screen.getByRole("button",{name:"Kaldığın yere dön"})).toBeTruthy();
 await user.click(toggle);expect(toggle.getAttribute("aria-checked")).toBe("true");
});
it("updates the single saved reading position rather than accumulating bookmarks", async()=>{
 const user=userEvent.setup();renderReader();selectText();await user.click(screen.getByRole("button",{name:"Burada kaldım"}));const first=saved()?.marks[0].id;
 const second=document.querySelector('[data-reading-anchor="paragraph-1"]')!.firstChild!;const range=document.createRange();range.setStart(second,0);range.setEnd(second,7);
 act(()=>{window.getSelection()!.removeAllRanges();window.getSelection()!.addRange(range);document.dispatchEvent(new Event("selectionchange"));});
 await user.click(screen.getByRole("button",{name:"Burada kaldım"}));expect(saved()?.marks).toHaveLength(1);expect(saved()?.marks[0]).toMatchObject({id:first,kind:"bookmark",fragments:[expect.objectContaining({anchorId:"paragraph-1"})]});
});
it("represents closed text and audio notes with distinct labelled buttons", async()=>{
 localStorage.setItem(readingStorageKey("sample"),JSON.stringify({version:1,articleId:"sample",marks:[{...mark,kind:"note",note:"Metin"},{...mark,id:"audio",kind:"audio",note:"",audio:{mime:"audio/webm",durationMs:1000}}]}));
 renderReader();await act(async()=>{await new Promise(r=>setTimeout(r,40));});
 expect(screen.getByRole("button",{name:"1. Metin notu aç"})).toBeTruthy();expect(screen.getByRole("button",{name:"2. Sesli not aç"})).toBeTruthy();
});

it("opens same-source notes together and keeps other cards open, with a fifteen-note index",async()=>{
 const marks=Array.from({length:15},(_,i)=>({...mark,id:`many-${i}`,kind:"note",note:`Düşünce ${i+1}`,color:"lavender"}));
 localStorage.setItem(readingStorageKey("sample"),JSON.stringify({version:1,articleId:"sample",marks}));
 const user=userEvent.setup();renderReader();await user.click(screen.getByRole("button",{name:/Notlar/}));
 await user.click(screen.getByRole("button",{name:"Not dizinini sabitle"}));expect(localStorage.getItem("satir:note-index-pinned")).toBe("true");
 await user.type(screen.getByLabelText("Bu yazıdaki notlarda ara"),"Düşünce 15");
 const panel=screen.getByRole("region",{name:"Bu yazıdaki okuma notların"});expect(within(panel).getAllByRole("listitem")).toHaveLength(1);
 await user.click(screen.getByRole("button",{name:"15. alıntının bulunduğu bölüme git"}));expect(screen.getAllByRole("button",{name:"Notu kapat"})).toHaveLength(15);
 await user.click(screen.getAllByRole("button",{name:"Notu kapat"})[0]);expect(screen.getAllByRole("button",{name:"Notu kapat"})).toHaveLength(14);
 await user.click(screen.getByRole("button",{name:"Tümünü aç"}));expect(screen.getAllByRole("button",{name:"Notu kapat"})).toHaveLength(15);
 await user.click(screen.getByRole("button",{name:"Tümünü kapat"}));expect(screen.queryByRole("button",{name:"Notu kapat"})).toBeNull();expect(saved()?.marks).toHaveLength(15);
});

it("adds independent marker groups without closing previous notes and signals the exact source",async()=>{
 const other={anchorId:"paragraph-1",start:0,end:7,quote:"Another",before:"",after:" paragraph"};
 localStorage.setItem(readingStorageKey("sample"),JSON.stringify({version:1,articleId:"sample",marks:[{...mark,kind:"note",note:"İlk"},{...mark,id:"second",kind:"note",note:"İkinci"},{...mark,id:"third",kind:"note",note:"Üçüncü",fragments:[other]}]}));
 const user=userEvent.setup();const {container}=renderReader();await waitFor(()=>expect(screen.getByRole("button",{name:"1. Metin notu aç"})).toBeTruthy());
 await user.click(screen.getByRole("button",{name:"1. Metin notu aç"}));expect(screen.getAllByRole("button",{name:"Notu kapat"})).toHaveLength(2);
 await user.click(screen.getByRole("button",{name:"3. Metin notu aç"}));expect(screen.getAllByRole("button",{name:"Notu kapat"})).toHaveLength(3);
 await user.click(screen.getAllByRole("button",{name:"Notun kaynağına git"})[0]);await waitFor(()=>expect(container.querySelector(".rn-source-focus>span")).toBeTruthy());
 await waitFor(()=>expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({behavior:"smooth",block:"center"}));expect(container.querySelector('[data-reading-anchor="paragraph-0"]')?.innerHTML).toBe("Hello <strong>world</strong>");
});

it("assigns a random new-note color while preserving a manual choice and saved colors",async()=>{
 vi.spyOn(Math,"random").mockReturnValue(.9);const user=userEvent.setup();renderReader();selectText();await user.click(screen.getByRole("button",{name:"Seçili metne not ekle"}));expect(screen.getByRole("button",{name:"Sarı",pressed:true})).toBeTruthy();
 await user.click(screen.getByRole("button",{name:"Mavi"}));await user.type(screen.getByLabelText("Bu alıntı için notun"),"Rengim korunsun");await user.click(screen.getByRole("button",{name:"Notu kaydet"}));expect(saved()?.marks[0].color).toBe("blue");
 await user.click(screen.getByRole("button",{name:"Notu düzenle"}));expect(screen.getByRole("button",{name:"Mavi",pressed:true})).toBeTruthy();
});

it("removes visual emphasis through selected text while retaining and undoing the linked note",async()=>{
 localStorage.setItem(readingStorageKey("sample"),JSON.stringify({version:1,articleId:"sample",marks:[{...mark,kind:"note",note:"Bu düşünce korunmalı",color:"mint"},{...mark,id:"line",kind:"underline",note:""}]}));
 const user=userEvent.setup();renderReader();selectText();await user.click(screen.getByRole("button",{name:"Vurguyu kaldır"}));
 expect(saved()?.marks.find(m=>m.id===mark.id)).toMatchObject({kind:"note",note:"Bu düşünce korunmalı",emphasized:false});expect(saved()?.marks.some(m=>m.id==="line")).toBe(true);
 await user.click(screen.getByRole("button",{name:"İşareti geri al ↶"}));expect(saved()?.marks.find(m=>m.id===mark.id)?.emphasized).not.toBe(false);
 selectText();await user.click(screen.getByRole("button",{name:"Alt çizgiyi kaldır"}));expect(saved()?.marks.map(m=>m.id)).toEqual([mark.id]);expect(saved()?.marks[0].note).toBe("Bu düşünce korunmalı");
});

it("scrolls to the newly requested source when switching between different note cards",async()=>{
 const other={anchorId:"paragraph-1",start:0,end:7,quote:"Another",before:"",after:" paragraph"};
 localStorage.setItem(readingStorageKey("sample"),JSON.stringify({version:1,articleId:"sample",marks:[{...mark,kind:"note",note:"İlk"},{...mark,id:"other",kind:"note",note:"Son",fragments:[other]}]}));
 const destinations:string[]=[];vi.spyOn(Element.prototype,"scrollIntoView").mockImplementation(function(this:HTMLElement){destinations.push(this.style.top);});
 const user=userEvent.setup();const {container}=renderReader();
 for(const [index,element]of container.querySelectorAll('[data-reading-anchor]').entries())vi.spyOn(element,"getBoundingClientRect").mockReturnValue({top:100+index*400,bottom:120+index*400,left:0,right:200,width:200,height:20,x:0,y:100+index*400,toJSON:()=>({})});
 await user.click(screen.getByRole("button",{name:/Notlar/}));await user.click(screen.getByRole("button",{name:"Tümünü aç"}));
 await user.click(screen.getAllByRole("button",{name:"Notun kaynağına git"})[0]);await waitFor(()=>expect(destinations).toEqual(["97px"]));
 await user.click(screen.getAllByRole("button",{name:"Notun kaynağına git"})[1]);await waitFor(()=>expect(destinations).toEqual(["97px","497px"]));
});
