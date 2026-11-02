import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useState } from "react";
import { ArticleContent } from "../components/ArticleContent";
import { ArticleProperties } from "../components/builder/ArticleProperties";
import { InlineCanvasEditor } from "../components/builder/InlineCanvasEditor";
import { articleFromPublic, toDocument, type ArticleDetailDto } from "../lib/api/mapping";
import { listHtml, listLines } from "../lib/articles/blocks";
import { editDocumentText, inlineEditEvent } from "../lib/builder/inline-edit";
import { readMarked, selectOffsets, selectionOffsets } from "../lib/builder/rich-text";
import { articles, type Article } from "../lib/content";
import { createWorkspace } from "../lib/builder/model";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const document = {
  schemaVersion: 1 as const,
  blocks: [
    { id: id(1), type: "paragraph" as const, text: "Giriş" },
    { id: id(2), type: "list" as const, style: "ordered" as const, items: [{ text: "Denetimli öğrenme", marks: [{ type: "bold" as const, start: 0, end: 9 }] }, { text: "Pekiştirmeli" }] },
    { id: id(3), type: "callout" as const, tone: "tip" as const, text: "Her soruna derin öğrenme gerekmez.", marks: [{ type: "italic" as const, start: 4, end: 10 }] },
  ],
  sources: [{ title: "AI vs ML vs DL", publisher: "All Things Open", year: "2025", url: "https://allthingsopen.org/x" }, { title: "Başlık yalnız" }],
};
const detail = { id: id(9), slug: "yz", url: "/yazilar/yz", title: "YZ", eyebrow: null, abstract: "Özet", bodyPreview: "", categories: [], displayDate: "2026-11-02", readingMinutes: 3, cover: null, document } as unknown as ArticleDetailDto;

beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); Element.prototype.scrollIntoView = vi.fn(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("keeps lists, callouts and sources through the editor model and back", () => {
  const article = articleFromPublic(detail);
  expect(article.paragraphs).toEqual(["Giriş", "Denetimli öğrenme\nPekiştirmeli", "Her soruna derin öğrenme gerekmez."]);
  expect(article.paragraphFormats?.[1]).toEqual({ kind: "list", style: "ordered" });
  expect(article.paragraphFormats?.[2]).toEqual({ kind: "callout", tone: "tip" });
  expect(article.paragraphMarks?.[1]).toEqual([{ type: "bold", start: 0, end: 9 }]);
  expect(toDocument(article)).toEqual(document);
});

it("saves only written list items and titled sources", () => {
  const article = { ...articleFromPublic(detail), sources: [{ title: "  " }, { title: " Başlık ", url: " https://a.test/x " }] };
  article.paragraphs = ["Giriş", "Bir\n\nİki\n", "Not"];
  const saved = toDocument(article);
  expect(saved.blocks[1]).toMatchObject({ type: "list", items: [{ text: "Bir" }, { text: "İki" }] });
  expect(saved.sources).toEqual([{ title: "Başlık", url: "https://a.test/x" }]);
});

it("reads and places the caret in a list as one text with line breaks", () => {
  const list = window.document.createElement("ul");
  list.innerHTML = listHtml("Bir\n\nÜç", [{ type: "bold", start: 5, end: 7 }]);
  window.document.body.append(list);
  expect(list.querySelectorAll("li")).toHaveLength(3);
  expect(readMarked(list)).toEqual({ text: "Bir\n\nÜç", marks: [{ type: "bold", start: 5, end: 7 }] });
  for (const offset of [0, 3, 4, 5, 6, 7]) { selectOffsets(list, offset, offset); expect(selectionOffsets(list)).toEqual({ start: offset, end: offset }); }
  expect(listLines("A\nB", [{ type: "italic", start: 0, end: 3 }])).toEqual([{ text: "A", marks: [{ type: "italic", start: 0, end: 1 }] }, { text: "B", marks: [{ type: "italic", start: 0, end: 1 }] }]);
  list.remove();
});

it("turns text into lists and callouts, changes tones and joins a line into the list above", () => {
  const article: Article = { ...articles[0], slug: "yz", paragraphs: ["Bir\nİki", "Üç", "Not"], paragraphFormats: [{ kind: "list", style: "bullet" }, { kind: "paragraph" }, { kind: "paragraph" }] };
  const draft = { kind: "article" as const, article };
  const edit = (field: string, action: NonNullable<Parameters<typeof editDocumentText>[1]["action"]>) => editDocumentText(draft, { scope: "document", id: "yz", field, value: article.paragraphs[Number(field.slice(10))], previous: article.paragraphs[Number(field.slice(10))], action });
  const joined = edit("paragraph-1", "join-previous");
  expect(joined?.kind === "article" && joined.article.paragraphs).toEqual(["Bir\nİki\nÜç", "Not"]);
  const callout = edit("paragraph-2", "callout");
  expect(callout?.kind === "article" && callout.article.paragraphFormats?.[2]).toEqual({ kind: "callout", tone: "summary" });
  const toned = callout && editDocumentText(callout, { scope: "document", id: "yz", field: "paragraph-2", value: "Not", previous: "Not", action: "tone-warning" });
  expect(toned?.kind === "article" && toned.article.paragraphFormats?.[2]).toEqual({ kind: "callout", tone: "warning" });
  const quoted = edit("paragraph-0", "quote");
  expect(quoted?.kind === "article" && quoted.article.paragraphs[0]).toBe("Bir İki");
  const ordered = edit("paragraph-1", "ordered");
  expect(ordered?.kind === "article" && ordered.article.paragraphFormats?.[1]).toEqual({ kind: "list", style: "ordered" });
});

it("shows lists, callouts and a numbered bibliography with italic titles", () => {
  const { container } = render(<ArticleContent article={{ ...articleFromPublic(detail), sources: [...document.sources, { title: "Kötü", url: "javascript:alert(1)" }] }} fullPage />);
  expect(container.querySelector("ol.article-items")?.textContent).toBe("Denetimli öğrenmePekiştirmeli");
  expect(container.querySelector("ol.article-items strong")?.textContent).toBe("Denetimli");
  expect(container.querySelector(".article-callout.tone-tip .article-callout-title")?.textContent).toBe("İpucu");
  const sources = container.querySelector(".article-sources")!;
  expect(sources.querySelector("h2")?.textContent).toBe("Kaynaklar");
  expect([...sources.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["All Things Open (2025). AI vs ML vs DL. ↗", "Başlık yalnız.", "Kötü."]);
  expect(sources.querySelector("cite")?.textContent).toBe("AI vs ML vs DL");
  expect([...sources.querySelectorAll("a")].map((a) => a.getAttribute("href"))).toEqual(["https://allthingsopen.org/x"]);
});

it("edits the bibliography from the Sources panel", () => {
  function Panel() { const [article, set] = useState<Article>({ ...articles[0], sources: [] }); return <><ArticleProperties article={article} field="sources" onChange={set} /><output>{JSON.stringify(article.sources)}</output></>; }
  render(<Panel />);
  fireEvent.click(screen.getByRole("button", { name: "Kaynak ekle" }));
  fireEvent.change(screen.getByLabelText("Başlık"), { target: { value: "Xebia" } });
  fireEvent.change(screen.getByLabelText("Bağlantı"), { target: { value: "http://x" } });
  expect(screen.getByRole("alert").textContent).toContain("https://");
  fireEvent.change(screen.getByLabelText("Bağlantı"), { target: { value: "https://xebia.com/blog" } });
  expect(JSON.parse(window.document.querySelector("output")!.textContent!)).toEqual([{ title: "Xebia", url: "https://xebia.com/blog" }]);
  fireEvent.click(screen.getByRole("button", { name: "Kaynağı kaldır" }));
  expect(window.document.querySelector("output")!.textContent).toBe("[]");
});

type Message = { type?: string; edit?: Record<string, unknown> };
function edits(post: { mock: { calls: unknown[][] } }) {
  return post.mock.calls.map((call) => call[0] as Message).filter((data) => data.type === inlineEditEvent).map((data) => data.edit!);
}

it("writes lists on the canvas: '- ' starts one, Enter adds an item, Enter on an empty last item leaves it", () => {
  const workspace = createWorkspace();
  const post = vi.spyOn(window.parent, "postMessage");
  const article: Article = { ...articles[0], slug: "yz", paragraphs: ["", "Bir"], paragraphFormats: [{ kind: "paragraph" }, { kind: "list", style: "bullet" }], blockIds: { paragraphs: ["a", "b"] } };
  render(<InlineCanvasEditor theme={workspace.draft} draft={{ kind: "article", article }} enabled>
    <p data-edit-field="paragraph-0" />
    <ul className="article-items" data-edit-field="paragraph-1" dangerouslySetInnerHTML={{ __html: listHtml("Bir") }} />
  </InlineCanvasEditor>);

  const paragraph = window.document.querySelector<HTMLElement>('[data-edit-field="paragraph-0"]')!;
  fireEvent.keyDown(paragraph, { key: "Enter" });
  paragraph.textContent = "- Madde";
  act(() => { paragraph.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(edits(post).at(-1)).toMatchObject({ field: "paragraph-0", value: "Madde", action: "list" });

  const list = window.document.querySelector<HTMLElement>('[data-edit-field="paragraph-1"]')!;
  fireEvent.keyDown(list, { key: "Enter" });
  selectOffsets(list, 3, 3);
  fireEvent.keyDown(list, { key: "Enter" });
  expect(list.querySelectorAll("li")).toHaveLength(2);
  expect(edits(post).at(-1)).toMatchObject({ field: "paragraph-1", value: "Bir\n" });
  fireEvent.keyDown(list, { key: "Enter" });
  expect(edits(post).at(-1)).toMatchObject({ field: "paragraph-1", value: "Bir", action: "split", offset: 3 });
});

it("lets the canvas open the Sources panel and shows a place for sources while writing", async () => {
  const { isDocumentField } = await import("../lib/builder/document-protocol");
  expect(isDocumentField("sources")).toBe(true);
  const empty = { ...articleFromPublic(detail), sources: [] };
  const studio = render(<ArticleContent article={empty} preview />);
  expect(studio.container.querySelector('.article-sources.is-empty[data-edit-field="sources"]')?.textContent).toContain("Kaynak ekle");
  studio.unmount();
  const reader = render(<ArticleContent article={empty} fullPage />);
  expect(reader.container.querySelector(".article-sources")).toBeNull();
  expect(reader.container.textContent).not.toMatch(/^0|\b0\b(?=Şimdilik)/);
});
