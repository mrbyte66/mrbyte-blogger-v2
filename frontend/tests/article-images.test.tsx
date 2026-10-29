import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { articleFromPublic, articleWrite } from "../lib/api/mapping";
import { ArticleContent } from "../components/ArticleContent";
import { validateArticle } from "../lib/articles/model";
import { articles } from "../lib/content";
import type { Article } from "../lib/content";
// A valid sample article carrying the body under test.
const valid = (body: Article) => validateArticle({ ...articles[0], paragraphs: body.paragraphs, paragraphFormats: body.paragraphFormats, paragraphMarks: body.paragraphMarks, figure: body.figure });
import { editDocumentText, documentText } from "../lib/builder/inline-edit";
import { SiteEditor } from "../components/builder/SiteEditor";
import { MemorySite, renderWithSite } from "./support/memory-site";
import { readCanvas, writingTool } from "./helpers/canvas";
vi.mock("../components/SlideLink", () => ({ SlideLink: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const asset = (n: number) => `aaaaaaaa-aaaa-4aaa-8aaa-${String(n).padStart(12, "0")}`;
const blocks: NonNullable<Parameters<typeof articleFromPublic>[0]["document"]>["blocks"] = [
  { id: id(1), type: "paragraph", text: "Giriş." },
  { id: id(2), type: "image", assetId: asset(1), alt: "Baş", caption: "Baş görsel", width: 1600, height: 900 },
  { id: id(3), type: "paragraph", text: "Gövde." },
  { id: id(4), type: "image", assetId: asset(2), alt: "Kesit", caption: "Anatomi", width: 1600, height: 1000 },
  { id: id(5), type: "heading", text: "Düşüş", level: 2 },
  { id: id(6), type: "image", staticPath: "/assets/dusus.gif", alt: "Düşüş", caption: "", width: 960, height: 540 },
  { id: id(7), type: "paragraph", text: "Son." },
];
const dto: Parameters<typeof articleFromPublic>[0] = { id: id(99), slug: "mk-82", url: "/yazilar/mk-82", title: "MK-82", categories: [] as { id: string; slug: string; name: string }[], displayDate: "2026-10-30", readingMinutes: 4, stats: { views: 0, claps: 0, saves: 0 }, document: { schemaVersion: 1, blocks } };

describe("pictures placed in the text", () => {
  it("keeps every picture and the document order through the editor model", () => {
    const article = articleFromPublic(dto);
    expect(article.figure).toMatchObject({ src: `/api/v1/media/${asset(1)}`, caption: "Baş görsel" });
    expect(article.paragraphs).toEqual(["Giriş.", "Gövde.", "", "Düşüş", "", "Son."]);
    expect(article.paragraphFormats?.map((f) => f.kind)).toEqual(["paragraph", "paragraph", "image", "heading", "image", "paragraph"]);
    expect(valid(article)).not.toBeNull();
    const out = articleWrite(article, null, [], []).document!.blocks;
    expect(out.map((b) => b.id)).toEqual(blocks.map((b) => b.id));
    expect(out[3]).toMatchObject({ type: "image", assetId: asset(2), caption: "Anatomi", width: 1600, height: 1000 });
    expect(out[5]).toMatchObject({ type: "image", staticPath: "/assets/dusus.gif" });
  });
  it("keeps a picture that comes before any text in its place", () => {
    const article = articleFromPublic({ ...dto, document: { schemaVersion: 1, blocks: [blocks[3], blocks[0]] } });
    expect(article.figure).toBeUndefined();
    expect(articleWrite(article, null, [], []).document!.blocks.map((b) => b.id)).toEqual([id(4), id(1)]);
  });
  it("renders the pictures where they stand and never as writable text", () => {
    const article = articleFromPublic(dto);
    const { container } = render(<ArticleContent article={article} />);
    expect([...container.querySelectorAll("figure img")].map((img) => img.getAttribute("alt"))).toEqual(["Baş", "Kesit", "Düşüş"]);
    expect(screen.getByText("Anatomi")).toBeTruthy();
    const draft = { kind: "article" as const, article };
    expect(documentText(draft, "paragraph-2")).toBeNull();
    expect(editDocumentText(draft, { scope: "document", id: article.slug, field: "paragraph-3", value: "Düşüş", previous: "Düşüş", action: "join-previous" })).toBeNull();
  });
  it("does not save a picture that is still waiting for its upload", () => {
    const article = { ...articleFromPublic(dto) };
    article.paragraphFormats = article.paragraphFormats!.map((f) => f.kind === "image" ? { ...f, image: { ...f.image!, src: "" } } : f);
    expect(valid(article)).not.toBeNull();
    expect(valid({ ...article, paragraphs: article.paragraphs.map((p, i) => article.paragraphFormats![i].kind === "image" ? "metin" : p) })).toBeNull();
    expect(articleWrite(article, null, [], []).document!.blocks.filter((b) => b.type === "image")).toHaveLength(1);
  });
});

describe("adding pictures in the Studio", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
    vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: 640, height: 360, close() {} })));
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(Element.prototype, "scrollIntoView"); });
  const upload = async (label: RegExp) => {
    const input = screen.getByText(label).closest(".studio-upload")!.querySelector("input[type=file]")!;
    await act(async () => { fireEvent.change(input, { target: { files: [new File([new Uint8Array([71, 73, 70])], "hareket.gif", { type: "image/gif" })] } }); });
  };
  it("uses the first Görsel as the lead picture and places later ones in the text", async () => {
    renderWithSite(<SiteEditor />, { site: new MemorySite(), mode: "studio" });
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    fireEvent.click(writingTool("Görsel ekle"));
    await upload(/^Görsel yükle$/);
    expect(readCanvas()).toMatchObject({ article: { figure: { width: 640, height: 360 } } });
    fireEvent.click(writingTool("Görsel ekle"));
    const before = readCanvas();
    expect(before.kind === "article" && before.article.paragraphFormats?.at(-1)?.kind).toBe("image");
    await upload(/^Görsel yükle$/);
    fireEvent.change(screen.getByLabelText("Görsel açıklaması"), { target: { value: "Bırakılış anı" } });
    const after = readCanvas();
    expect(after.kind === "article" && after.article.paragraphFormats?.at(-1)).toMatchObject({ kind: "image", image: { caption: "Bırakılış anı", width: 640, height: 360 } });
    fireEvent.click(screen.getByRole("button", { name: "Görseli metinden kaldır" }));
    const removed = readCanvas();
    expect(removed.kind === "article" && removed.article.paragraphFormats?.some((f) => f.kind === "image")).toBe(false);
  });
});
