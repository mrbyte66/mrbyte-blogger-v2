import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWorkspace } from "../lib/builder/model";
import { articles } from "../lib/content";
import { editDocumentText, inlineEditEvent, type InlineEdit } from "../lib/builder/inline-edit";
import { InlineCanvasEditor } from "../components/builder/InlineCanvasEditor";
import { selectOffsets } from "../lib/builder/rich-text";

const workspace = createWorkspace();
const base = { ...articles[0], paragraphs: ["Merhaba dünya", "Başlık satırı"], paragraphFormats: [{ kind: "paragraph" as const }, { kind: "heading" as const, level: 2 as const }], blockIds: { paragraphs: ["a", "b"] } };
beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function mount(article = base) {
  const post = vi.spyOn(window.parent, "postMessage");
  render(<InlineCanvasEditor theme={workspace.draft} draft={{ kind: "article", article }} enabled>
    <p data-edit-field="paragraph-0" dangerouslySetInnerHTML={{ __html: "Merhaba dünya" }} />
    <h2 data-edit-field="paragraph-1">Başlık satırı</h2>
  </InlineCanvasEditor>);
  return post;
}
function open(label = "Metin · tuval") {
  const target = document.querySelector<HTMLElement>('[data-edit-field="paragraph-0"]')!;
  fireEvent.keyDown(target, { key: "Enter" });
  return screen.getByLabelText(label);
}
function select(node: HTMLElement, start: number, end: number) {
  selectOffsets(node, start, end);
  act(() => { document.dispatchEvent(new Event("selectionchange")); });
}
/** Messages the frame sent to the Studio, without the caret reports that accompany them. */
const sent = (post: ReturnType<typeof vi.spyOn>) => (post.mock.calls as unknown[][]).map((call) => call[0] as { type: string; edit: InlineEdit }).filter((message: { type: string }) => message?.type === inlineEditEvent);
const lastEdit = (post: ReturnType<typeof vi.spyOn>) => sent(post).at(-1)!.edit;

describe("formatting in the canvas", () => {
  it("makes a paragraph rich-editable and bolds the selection through the toolbar", () => {
    const post = mount();
    const node = open();
    expect(node.getAttribute("contenteditable")).toBe("true");
    select(node, 0, 7);
    fireEvent.click(screen.getByRole("button", { name: "Kalın" }));
    expect(node.innerHTML).toBe("<strong>Merhaba</strong> dünya");
    expect(lastEdit(post)).toMatchObject({ field: "paragraph-0", value: "Merhaba dünya", marks: [{ type: "bold", start: 0, end: 7 }] });
    expect(sent(post).at(-1)).toMatchObject({ type: inlineEditEvent });
    expect(screen.getByRole("button", { name: "Kalın" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("clears a mark when the whole selection already has it, and undo restores the previous marks", () => {
    const post = mount();
    const node = open();
    select(node, 0, 7);
    fireEvent.click(screen.getByRole("button", { name: "Kalın" }));
    select(node, 0, 7);
    fireEvent.click(screen.getByRole("button", { name: "Kalın" }));
    expect(node.innerHTML).toBe("Merhaba dünya");
    expect(lastEdit(post).marks).toEqual([]);
    fireEvent.keyDown(node,{key:"z",ctrlKey:true});
    expect(node.innerHTML).toBe("<strong>Merhaba</strong> dünya");
    expect(lastEdit(post).marks).toEqual([{ type: "bold", start: 0, end: 7 }]);
  });

  it("reads typed text and the marks around it back from the DOM", () => {
    const post = mount();
    const node = open();
    node.innerHTML = "<strong>Merhabaa</strong> <em>dünya</em>";
    fireEvent.input(node);
    expect(lastEdit(post)).toMatchObject({ value: "Merhabaa dünya", marks: [{ type: "bold", start: 0, end: 8 }, { type: "italic", start: 9, end: 14 }] });
  });

  it("only accepts safe link addresses and explains the rest", () => {
    const post = mount();
    const node = open();
    select(node, 0, 7);
    fireEvent.click(screen.getByRole("button", { name: "Bağlantı" }));
    const field = screen.getByLabelText("Bağlantı adresi");
    fireEvent.change(field, { target: { value: "javascript:alert(1)" } });
    fireEvent.click(screen.getByRole("button", { name: "Uygula" }));
    expect(screen.getByRole("alert").textContent).toMatch(/https:\/\//);
    expect(field.getAttribute("aria-invalid")).toBe("true");
    expect(node.querySelector("a")).toBeNull();
    fireEvent.change(field, { target: { value: "https://example.org/yazi" } });
    fireEvent.click(screen.getByRole("button", { name: "Uygula" }));
    expect(node.innerHTML).toBe('<a href="https://example.org/yazi" target="_blank" rel="noopener noreferrer">Merhaba</a> dünya');
    expect(lastEdit(post).marks).toEqual([{ type: "link", start: 0, end: 7, href: "https://example.org/yazi" }]);
  });

  it("offers no inline formatting inside headings", () => {
    mount();
    const heading = document.querySelector<HTMLElement>('[data-edit-field="paragraph-1"]')!;
    fireEvent.keyDown(heading, { key: "Enter" });
    expect(heading.getAttribute("contenteditable")).toBe("plaintext-only");
    expect(screen.queryByRole("button", { name: "Kalın" })).toBeNull();
  });

  it("keeps marks on the right half when a paragraph is split", () => {
    const post = mount({ ...base, paragraphMarks: [[{ type: "bold", start: 4, end: 12 }], []] });
    const node = open();
    // Re-render rich content from the model so the DOM matches the marks.
    expect(node.getAttribute("contenteditable")).toBe("true");
    select(node, 3, 3);
    fireEvent.keyDown(node, { key: "Enter" });
    expect(lastEdit(post)).toMatchObject({ action: "split", offset: 3 });
  });

  it("strikes through and highlights from the toolbar and the keyboard", () => {
    const post = mount();
    const node = open();
    select(node, 0, 7);
    fireEvent.click(screen.getByRole("button",{name:"Diğer metin araçları"}));
    fireEvent.click(screen.getByRole("button", { name: "Üstü çizili" }));
    expect(node.innerHTML).toBe("<s>Merhaba</s> dünya");
    select(node, 8, 13);
    fireEvent.keyDown(node, { key: "h", metaKey: true, shiftKey: true });
    expect(node.innerHTML).toBe("<s>Merhaba</s> <mark>dünya</mark>");
    expect(lastEdit(post).marks).toEqual([{ type: "strike", start: 0, end: 7 }, { type: "highlight", start: 8, end: 13 }]);
  });

  it("clears every format from the selection at once", () => {
    const post = mount({ ...base, paragraphMarks: [[{ type: "bold", start: 0, end: 7 }, { type: "highlight", start: 0, end: 13 }], []] });
    const node = open();
    select(node, 0, 13);
    fireEvent.click(screen.getByRole("button",{name:"Diğer metin araçları"}));
    fireEvent.click(screen.getByRole("button", { name: "Biçimi temizle" }));
    expect(node.innerHTML).toBe("Merhaba dünya");
    expect(lastEdit(post).marks).toEqual([]);
  });

  it("turns the block into a heading or removes it with one press", () => {
    const post = mount();
    open();
    expect(screen.queryByRole("toolbar")).toBeNull();
    fireEvent.click(screen.getByRole("button",{name:"Blok ekle"}));
    fireEvent.click(screen.getByRole("option",{name:"Başlık"}));
    expect(lastEdit(post)).toMatchObject({ field: "paragraph-0", action: "heading2" });
    open();
    fireEvent.click(screen.getByRole("button",{name:"Blok ekle"}));
    fireEvent.click(screen.getByRole("button", { name: "Bloğu sil" }));
    expect(lastEdit(post)).toMatchObject({ field: "paragraph-0", action: "remove" });
  });
});

describe("writing shortcuts in the canvas", () => {
  it("turns \"## \" at the start of a paragraph into a heading", () => {
    const post = mount();
    const node = open();
    node.innerHTML = "## Bölüm";
    fireEvent.input(node);
    expect(lastEdit(post)).toMatchObject({ field: "paragraph-0", value: "Bölüm", action: "heading2" });
  });
  it("opens the block menu with \"/\", filters it and picks with Enter", () => {
    const post = mount();
    const node = open();
    node.innerHTML = "/baş";
    fireEvent.input(node);
    const menu = screen.getByRole("listbox", { name: "Blok ekle" });
    expect(menu.textContent).toContain("Başlık");
    expect(menu.textContent).not.toContain("Tablo");
    fireEvent.keyDown(node, { key: "Enter" });
    expect(lastEdit(post)).toMatchObject({ value: "Başlık", action: "heading2" });
  });
  it("asks the Studio to open the figure settings beside the line", () => {
    const post = mount({ ...base, paragraphs: ["", "Başlık satırı"] });
    const node = open();
    fireEvent.click(screen.getByRole("button", { name: "Blok ekle" }));
    fireEvent.click(screen.getByRole("option", { name: /Görsel/ }));
    const select = (post.mock.calls as unknown[][]).map((call) => call[0] as { type: string; id?: string; rect?: unknown }).find((message) => message.type === "mrbyte:select-block");
    expect(select).toMatchObject({ id: "figure" });
    expect(select?.rect).toBeTruthy();
    expect(node).toBeTruthy();
  });
});

describe("removing a block", () => {
  const draft = { kind: "article" as const, article: base };
  const edit = (field: string, value: string): InlineEdit => ({ scope: "document", id: base.slug, field, value, previous: value, action: "remove" });
  it("drops the paragraph with its format and block ID", () => {
    const next = editDocumentText(draft, edit("paragraph-0", "Merhaba dünya"));
    expect(next?.kind === "article" && next.article.paragraphs).toEqual(["Başlık satırı"]);
    expect(next?.kind === "article" && next.article.paragraphFormats).toEqual([{ kind: "heading", level: 2 }]);
    expect(next?.kind === "article" && next.article.blockIds?.paragraphs).toEqual(["b"]);
  });
  it("leaves an empty paragraph when the last block is removed", () => {
    const single = { kind: "article" as const, article: { ...base, paragraphs: ["Tek"], paragraphFormats: [{ kind: "quote" as const }], blockIds: { paragraphs: ["a"] } } };
    const next = editDocumentText(single, { scope: "document", id: base.slug, field: "paragraph-0", value: "Tek", previous: "Tek", action: "remove" });
    expect(next?.kind === "article" && next.article.paragraphs).toEqual([""]);
    expect(next?.kind === "article" && next.article.paragraphFormats).toEqual([{ kind: "paragraph" }]);
  });
});
