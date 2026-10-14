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
  fireEvent.click(screen.getByLabelText("Görünüm ve hesap"));
  fireEvent.click(within(screen.getByRole("group", { name: "Studio görünümü" })).getByRole("button", { name: new RegExp(`^${name}`) }));
}

describe("Studio views", () => {
  it("starts in Marjinalya: rail, sheet and a margin column with the page's address", () => {
    studio();
    selectPage(articles[0].title);
    expect(root().dataset.view).toBe("marjinalya");
    expect(screen.getByRole("navigation", { name: "Studio bölümleri" })).toBeTruthy();
    const margin = screen.getByRole("complementary", { name: "Kenar notları" });
    expect(within(margin).getByText(`/yazilar/${articles[0].slug}`)).toBeTruthy();
    expect(screen.getByRole("group", { name: "Blok ekle" })).toBeTruthy();
  });

  it("switches the view from the personal menu, remembers it and tells the canvas frame", () => {
    studio();
    selectPage(articles[0].title);
    chooseView("Odak");
    expect(root().dataset.view).toBe("odak");
    expect(localStorage.getItem(studioViewStorageKey)).toBe("odak");
    expect(document.documentElement.dataset.studioView).toBe("odak");
    expect(screen.queryByRole("complementary", { name: "Kenar notları" })).toBeNull();
    expect(screen.getByRole("button", { name: "Blok" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Odak modu" })).toBeTruthy();
  });

  it("takes a stored view on the next visit and ignores unknown values", () => {
    document.documentElement.dataset.studioView = "sahne";
    studio();
    expect(root().dataset.view).toBe("sahne");
    expect(parseStudioView("sahne")).toBe("sahne");
    expect(parseStudioView("klasik")).toBeNull();
  });

  it("closes the personal menu on Escape and on a press outside it", async () => {
    studio();
    const summary = screen.getByLabelText("Görünüm ve hesap");
    const menu = summary.closest("details") as HTMLDetailsElement;
    // <details> reports its state with an asynchronous toggle event.
    const toggled = async () => { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); };
    fireEvent.click(summary); await toggled();
    expect(menu.open).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(menu.open).toBe(false); await toggled();
    fireEvent.click(summary); await toggled();
    expect(menu.open).toBe(true);
    fireEvent.pointerDown(document.body);
    expect(menu.open).toBe(false);
  });

  it("closes the settings panel on Escape, on empty space and on a canvas press, but not on tool buttons", () => {
    studio();
    selectPage(articles[0].title);
    const panel = () => screen.getByLabelText("Seçili alanın ayarları");
    const open = () => fireEvent.click(screen.getByRole("button", { name: "Kapak görseli" }));
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

  it("inserts a heading after the selected paragraph from the block bar", () => {
    studio();
    selectPage(articles[0].title);
    const before = readCanvas();
    const count = before.kind === "article" ? before.article.paragraphs.length : 0;
    fireEvent.click(within(screen.getByRole("group", { name: "Blok ekle" })).getByRole("button", { name: "Başlık" }));
    const after = readCanvas();
    expect(after.kind === "article" && after.article.paragraphs.length).toBe(count + 1);
    expect(after.kind === "article" && after.article.paragraphFormats?.[count]).toMatchObject({ kind: "heading", level: 2 });
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
