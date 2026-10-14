import { writingTool } from "./helpers/canvas";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { insertBlock } from "../components/builder/BlockBar";
import { articles } from "../lib/content";
import type { DocumentDraft } from "../lib/builder/document-protocol";
import { parseCaret, previewEvents } from "../lib/builder/preview-protocol";
import { parseStudioView, studioViewStorageKey } from "../lib/studio/view";
import { MemorySite, renderWithSite } from "./support/memory-site";
import { readCanvas } from "./helpers/canvas";

vi.mock("../components/Experience", () => ({ Experience: () => <div>Scene</div> }));
beforeEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.studioView;
  delete document.documentElement.dataset.studioDim;
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const studio = (site = new MemorySite()) => renderWithSite(<SiteEditor />, { site, mode: "studio" });
function selectPage(title: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
  fireEvent.click(screen.getByRole("button", { name: title }));
}
const root = () => document.querySelector(".studio") as HTMLElement;
const frame = () => screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
function canvasMessage(data: unknown) {
  act(() => { window.dispatchEvent(new MessageEvent("message", { data, source: frame().contentWindow, origin: window.location.origin })); });
}
function chooseView(name: string) {
  fireEvent.click(screen.getByRole("button", { name: "Studio görünümü" }));
  fireEvent.click(within(screen.getByRole("group", { name: "Studio görünümü" })).getByRole("button", { name: new RegExp(`^${name}`) }));
}

describe("Studio views", () => {
  it("starts in Marjinalya with a quiet sheet and optional writing tools", () => {
    studio();
    selectPage(articles[0].title);
    expect(root().dataset.view).toBe("marjinalya");
    expect(screen.getByRole("navigation", { name: "Studio bölümleri" })).toBeTruthy();
    expect(screen.queryByRole("complementary",{name:"Kenar notları"})).toBeNull();
    expect(screen.getByLabelText("Yazı araçları")).toBeTruthy();
    expect(document.querySelector(".block-bar")).toBeNull();
  });

  it("switches the view from its own menu, remembers it and tells the canvas frame", () => {
    studio();
    selectPage(articles[0].title);
    chooseView("Odak");
    expect(root().dataset.view).toBe("odak");
    expect(localStorage.getItem(studioViewStorageKey)).toBe("odak");
    expect(document.documentElement.dataset.studioView).toBe("odak");
    expect(screen.queryByRole("complementary", { name: "Kenar notları" })).toBeNull();
    expect(screen.getByLabelText("Yazı araçları")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Odak modu" })).toBeTruthy();
  });

  it("takes a stored view on the next visit and ignores unknown values", () => {
    document.documentElement.dataset.studioView = "sahne";
    studio();
    expect(root().dataset.view).toBe("sahne");
    expect(parseStudioView("sahne")).toBe("sahne");
    expect(parseStudioView("klasik")).toBeNull();
  });

  it("keeps the view menu apart from the account and closes it on Escape and on a press outside it", () => {
    studio();
    const trigger = screen.getByRole("button", { name: "Studio görünümü" });
    const menu = () => screen.queryByRole("dialog", { name: "Studio görünümü" });
    fireEvent.click(trigger);
    expect(menu()).toBeTruthy();
    expect(within(menu()!).queryByRole("button", { name: /Hesap menüsü/ })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menu()).toBeNull();
    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(menu()).toBeNull();
    // Colour mode is one press away, outside any menu.
    expect(screen.getByRole("group", { name: "Renk modu" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Siteye dön" })).toBeNull();
  });

  it("brings the last opened panel to the front", () => {
    document.documentElement.dataset.studioView = "sahne";
    studio();
    const panel = screen.getByLabelText("Düzenleme özellikleri");
    const strip = screen.getByLabelText("Sayfa yapısını düzenle");
    fireEvent.click(screen.getByRole("button", { name: /Tasarım/ }));
    expect(panel.hidden).toBe(false);
    const front = () => Number(panel.style.zIndex) > Number(strip.style.zIndex || 0) ? "panel" : "strip";
    expect(front()).toBe("panel");
    fireEvent.pointerDown(screen.getByRole("button", { name: /Blok ekle/ }));
    fireEvent.click(screen.getByRole("button", { name: /Blok ekle/ }));
    expect(front()).toBe("strip");
    fireEvent.click(screen.getByRole("button", { name: /Tasarım/ }));
    expect(panel.hidden).toBe(false);
    expect(front()).toBe("panel");
  });

  it("switches back to a recently opened page from the Marjinalya rail in one press", () => {
    studio();
    selectPage(articles[0].title);
    fireEvent.click(screen.getByRole("button", { name: "Site tasarımı" }));
    expect(screen.queryByLabelText("Kenar notları")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: `Son açılan yazı: ${articles[0].title}` }));
    expect(screen.queryByRole("complementary", { name: "Kenar notları" })).toBeNull();
  });

  it("closes the settings panel on Escape, on empty space and on a canvas press, but not on tool buttons", () => {
    studio();
    selectPage(articles[0].title);
    const panel = () => screen.getByLabelText("Seçili alanın ayarları");
    const open = () => fireEvent.click(writingTool("Kapak görseli"));
    open();
    expect(panel().hidden).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(panel().hidden).toBe(true);
    open();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Önizle" }));
    expect(panel().hidden).toBe(false);
    fireEvent.pointerDown(screen.getByLabelText("Canlı sayfa tuvali"));
    expect(panel().hidden).toBe(true);
    open();
    canvasMessage({ type: previewEvents.pointer });
    expect(panel().hidden).toBe(true);
  });

  it("opens settings pressed on the canvas as a card beside the block, and from the dock in the column", () => {
    studio();
    selectPage(articles[0].title);
    const panel = () => screen.getByLabelText("Seçili alanın ayarları");
    canvasMessage({ type: previewEvents.select, id: "meta", rect: { x: 40, y: 200, width: 300, height: 24 } });
    expect(panel().hidden).toBe(false);
    expect(panel().classList.contains("is-anchored")).toBe(true);
    expect(panel().style.position).toBe("fixed");
    expect(root().classList.contains("has-inspector")).toBe(false);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(writingTool("Kapak görseli"));
    expect(panel().classList.contains("is-anchored")).toBe(false);
  });

  it("offers the library as cover cards with a detail drawer in Kontakt", async () => {
    document.documentElement.dataset.studioView = "kontakt";
    const site = new MemorySite();
    site.article(articles[1].slug)!.status = "draft";
    studio(site);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    expect(screen.getByRole("heading", { name: "Yazılar" })).toBeTruthy();
    const draftChip = screen.getByRole("button", { name: /^Taslak/ });
    fireEvent.click(draftChip);
    const cards = document.querySelectorAll(".library-card");
    expect(cards.length).toBe(1);
    fireEvent.click(cards[0]);
    const drawer = screen.getByLabelText("Seçili yazı");
    expect(within(drawer).getByText(articles[1].title)).toBeTruthy();
    await act(async () => { fireEvent.click(within(drawer).getByRole("button", { name: "Düzenle" })); });
    const shown = readCanvas();
    expect(shown.kind === "article" && shown.article.slug).toBe(articles[1].slug);
  });
});

describe("block insertion", () => {
  const draft: DocumentDraft = { kind: "article", article: { ...articles[0], paragraphs: ["Bir.", "İki.", "Üç."], paragraphFormats: undefined, blockIds: { paragraphs: ["a", "b", "c"].map((id) => `${id}0000000-0000-4000-8000-000000000000`) } } };
  it("puts a new paragraph, heading or quote right after the selected one with its own block id", () => {
    const inserted = insertBlock(draft, "paragraph-0", "heading")!;
    expect(inserted.field).toBe("paragraph-1");
    const article = inserted.draft.kind === "article" ? inserted.draft.article : null;
    expect(article?.paragraphs).toEqual(["Bir.", "Yeni başlık", "İki.", "Üç."]);
    expect(article?.paragraphFormats?.[1]).toMatchObject({ kind: "heading" });
    expect(new Set(article?.blockIds?.paragraphs).size).toBe(4);
    const quote = insertBlock(draft, "paragraph-1", "quote")!;
    expect(quote.draft.kind === "article" && quote.draft.article.paragraphFormats?.[2]).toMatchObject({ kind: "quote" });
  });
  it("appends when no paragraph is selected and refuses series", () => {
    const appended = insertBlock(draft, "title", "paragraph")!;
    expect(appended.field).toBe("paragraph-3");
    expect(insertBlock({ kind: "series", series: { id: "s", slug: "s", title: "S", summary: "", status: "draft", ongoing: true, articleSlugs: [] } }, "title", "paragraph")).toBeNull();
  });
});

describe("caret reports", () => {
  it("accepts a row and column, a cleared caret and nothing else", () => {
    expect(parseCaret({ type: previewEvents.caret, row: 5, column: 41 })).toEqual({ row: 5, column: 41 });
    expect(parseCaret({ type: previewEvents.caret, row: null })).toBeNull();
    expect(parseCaret({ type: previewEvents.caret, row: 0, column: 1 })).toBeUndefined();
    expect(parseCaret({ type: previewEvents.caret, row: 1.5, column: 1 })).toBeUndefined();
    expect(parseCaret({ type: "other", row: 1, column: 1 })).toBeUndefined();
  });
});
it("applies the default view to html even before a preference has ever been saved",()=>{
 delete document.documentElement.dataset.studioView;
 localStorage.removeItem(studioViewStorageKey);
 studio();
 expect(document.documentElement.dataset.studioView).toBe("marjinalya");
});
