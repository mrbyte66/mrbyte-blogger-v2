import { discardWriting, readCanvas, writeCanvas, writingTool } from "./helpers/canvas";
import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleRoute } from "../components/builder/ArticlePage";
import { navigateArticles, initialNavigation } from "../lib/navigation";
import { SiteEditor } from "../components/builder/SiteEditor";
import { validateArticle, parseArticles } from "../lib/articles/model";
import { articles } from "../lib/content";
import { studioNotesEvent, documentEvent, navigateEvent, parseDocumentDraft, parseStudioTarget } from "../lib/builder/document-protocol";
import { previewEvents } from "../lib/builder/preview-protocol";
import { initialSeries } from "../lib/series/model";
import { ApiError } from "../lib/api/http";
import { MemorySite, renderWithSite } from "./support/memory-site";
vi.mock("../components/Experience", () => ({ Experience: () => <div>Scene</div> }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function message(data: unknown, origin = window.location.origin) {
  const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
  act(() => { window.dispatchEvent(new MessageEvent("message", { data, source: frame.contentWindow, origin })); });
}
async function click(element: HTMLElement) { await act(async () => { fireEvent.click(element); }); }
const studio = (site = new MemorySite()) => renderWithSite(<SiteEditor />, { site, mode: "studio" });

describe("page editing and visitor content", () => {
  it("previews an article draft, blocks navigation until saved, and saves through the Studio API", async () => {
    const { site } = studio();
    selectPage(articles[0].title);
    const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    writeCanvas("title", "Yeni başlık");
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: documentEvent, document: expect.objectContaining({ article: expect.objectContaining({ title: "Yeni başlık" }) }) }), window.location.origin);
    expect(site.article(articles[0].slug)!.title).toBe(articles[0].title);
    selectPage(/Ana sayfa/);
    expect(screen.getByText(/Sayfa değiştirmeden önce/)).toBeTruthy();
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(site.article(articles[0].slug)!.title).toBe("Yeni başlık");
    expect(site.article(articles[0].slug)!.version).toBe(1);
    expect(localStorage.length).toBe(0);
    message({ type: previewEvents.select, id: "excerpt" }, "https://foreign.example");
    expect(screen.queryByRole("textbox", {name:"Özet / abstract"})).toBeNull();
    message({ type: previewEvents.select, id: "excerpt" });
    expect(screen.queryByRole("textbox", {name:"Özet / abstract"})).toBeNull();
    expect(post).toHaveBeenCalledWith(expect.objectContaining({type:previewEvents.selection,id:"excerpt"}),window.location.origin);
    fireEvent.click(screen.getByRole("button", { name: "Önizle" }));
    message({ type: navigateEvent, target: { kind: "series", slug: initialSeries[0].slug } });
    expect(readCanvas().kind).toBe("series");
  });
  it("creates an independent article, publishes it and renders it without series membership", async () => {
    const { site, unmount } = studio();
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    writeCanvas("title", "Özgür düşünce");
    expect(screen.getByRole("button", { name: /Sayfayı kaydet/ }).hasAttribute("disabled")).toBe(false);
    message({ type: previewEvents.select, id: "body" });
    writeCanvas("paragraph-0", "Bir seriye bağlı olmayan yazım.");
    expect(site.article("ozgur-dusunce")).toBeUndefined();
    fireEvent.click(screen.getByLabelText("İçerik işlemleri"));
    await click(screen.getByText("Yayına al"));
    const created = site.article("ozgur-dusunce")!;
    expect(created).toMatchObject({ title: "Özgür düşünce", status: "published", authored: true, seriesId: null });
    expect(site.calls).toContain("save article ozgur-dusunce");
    expect(navigateArticles(initialNavigation, { type: "article", slug: created.slug }, site.published()).articleSlug).toBe(created.slug);
    unmount();
    renderWithSite(<ArticleRoute article={created} />, { site });
    expect(screen.getByRole("heading", { name: "Özgür düşünce" })).toBeTruthy();
    expect(screen.getByText("Bir seriye bağlı olmayan yazım.")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Seri bölümleri" })).toBeNull();
    expect(screen.queryByText(/hazırlanmış bir örnektir/)).toBeNull();
  });
  it("reports server permalink collisions and discards unsaved writing", async () => {
    const { site } = studio();
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    writeCanvas("title", articles[0].title);
    message({ type: previewEvents.select, id: "body" });
    writeCanvas("paragraph-0", "Çakışan bağlantı.");
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(screen.getByRole("alert").textContent).toContain("kalıcı bağlantı kullanılıyor");
    expect(site.articles.filter((a) => a.slug === articles[0].slug)).toHaveLength(1);
    discardWriting();
    expect(screen.queryByLabelText("Yazı başlığı")).toBeNull();
  });
  it("adds an article to a series from the series editor with the server keeping membership", async () => {
    const site = new MemorySite({ articles: [...articles, { ...articles[0], slug: "bagimsiz-yazi", title: "Bağımsız yazı", authored: true }] });
    const draft = site.article("bagimsiz-yazi")!;
    expect(draft.seriesId).toBeUndefined();
    studio(site);
    selectPage(initialSeries[1].title);
    message({ type: previewEvents.select, id: "chapters" });
    fireEvent.change(screen.getByLabelText("Bölüm ekle"), { target: { value: draft.slug } });
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(site.series.find((s) => s.slug === initialSeries[1].slug)!.articleSlugs).toContain(draft.slug);
    expect(site.article(draft.slug)!.seriesId).toBe(site.series.find((s) => s.slug === initialSeries[1].slug)!.id);
  });
  it("searches the unified page menu and dismisses it with Escape", () => {
    studio();
    const trigger = screen.getByRole("button", { name: /^Sayfalar:/ });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText("Sayfa ara"), { target: { value: "sessizliği" } });
    expect(screen.getByRole("button", { name: "İyi kodun sessizliği" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: articles[0].title })).toBeNull();
    fireEvent(screen.getByRole("dialog", { name: "Sayfalar" }), new Event("cancel", { bubbles: false, cancelable: true }));
    expect(screen.queryByRole("navigation", { name: "Sayfalar" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("returns to the saved article on revert and reports a failed save without changing server content", async () => {
    const site = new MemorySite();
    studio(site);
    selectPage(articles[0].title);
    writeCanvas("title", "Not saved");
    site.failNext = new ApiError(503, "SERVICE_UNAVAILABLE", "Sunucu şu anda yanıt veremiyor.");
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(screen.getByRole("alert").textContent).toContain("Kaydedilemedi");
    expect(site.article(articles[0].slug)!.title).toBe(articles[0].title);
    discardWriting();
    expect((readCanvas() as Extract<ReturnType<typeof readCanvas>, {kind:"article"}>).article.title).toBe(articles[0].title);
    selectPage(/Ana sayfa/);
    expect(screen.queryByLabelText("Yazı başlığı")).toBeNull();
  });
  it("edits series beside its canvas and preserves saved links during slug edits", async () => {
    const { site } = studio();
    selectPage(initialSeries[0].title);
    message({ type: previewEvents.select, id: "meta" });
    fireEvent.change(screen.getByLabelText("Kalıcı bağlantı adı"), { target: { value: "henuz-kaydedilmedi" } });
    expect(screen.getByRole("link", { name: /Kaydedilmiş sayfayı aç/ }).getAttribute("href")).toBe(`/seriler/${initialSeries[0].slug}`);
    discardWriting();
    message({ type: previewEvents.select, id: "summary" });
    writeCanvas("summary", "Yeni seri açıklaması");
    expect(site.series[0].summary).toBe(initialSeries[0].summary);
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(site.series[0].summary).toBe("Yeni seri açıklaması");
    expect(screen.getByRole("button", { name: /^Sayfalar:/ })).toBeTruthy();
  });
});
describe("document validation", () => {
  it("rejects corrupt records, unknown routes and unsafe image protocols", () => {
    expect(validateArticle({ ...articles[0], slug: "unsafe/slug" })).toBeNull();
    expect(validateArticle({ ...articles[0], figure: { ...articles[0].figure, src: "javascript:alert(1)" } })).toBeNull();
    expect(validateArticle({ ...articles[0], table: { caption: "", columns: ["a"], rows: [["a", "b"]] } })).toBeNull();
    expect(validateArticle({ ...articles[0], id: "not-a-uuid" })).toBeNull();
    expect(parseArticles(JSON.stringify([articles[0], articles[0]]))).toBeNull();
    expect(parseStudioTarget({ kind: "article", slug: "invalid slug" })).toBeNull();
    expect(parseDocumentDraft({ kind: "series", series: { ...initialSeries[0], presentation: { heading: "invalid", chapterStyle: "cards" } } })).toBeNull();
  });
  it("keeps server identity fields when validating an article", () => {
    const record = { ...articles[0], id: "00000000-0000-4000-8000-000000000001", version: 3, visibility: "private" as const, blockIds: { paragraphs: ["a"] } };
    expect(validateArticle(record)).toMatchObject({ id: record.id, version: 3, visibility: "private", blockIds: { paragraphs: ["a"] } });
  });
});

function selectPage(title: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
  fireEvent.click(screen.getByRole("button", { name: title }));
}

it("keeps writing done during a first save and uses the returned version for the next save", async()=>{
 const {site}=studio();
 fireEvent.click(screen.getByRole("button",{name:/^Sayfalar:/}));
 fireEvent.click(screen.getByRole("button",{name:/Yeni yazı/}));
 writeCanvas("title","Kesintisiz yazmak");
 writeCanvas("paragraph-0","İlk metin.");
 const save=site.studio.saveArticle;
 let release!:()=>void;
 site.studio.saveArticle=async(...args)=>{await new Promise<void>(resolve=>{release=resolve;});return save(...args);};
 fireEvent.click(screen.getByRole("button",{name:/Sayfayı kaydet/}));
 writeCanvas("paragraph-0","Kaydetme sürerken eklenen metin.");
 await act(async()=>{release();});
 expect(readCanvas()).toMatchObject({article:{paragraphs:["Kaydetme sürerken eklenen metin."]}});
 expect(site.article("kesintisiz-yazmak")?.paragraphs).toEqual(["İlk metin."]);
 site.studio.saveArticle=save;
 await click(screen.getByRole("button",{name:/Sayfayı kaydet/}));
 expect(site.article("kesintisiz-yazmak")?.paragraphs).toEqual(["Kaydetme sürerken eklenen metin."]);
 expect(site.calls.filter(call=>call.startsWith("save article"))).toHaveLength(2);
});

it("toggles Studio reading-note preview without dirtying the writing or changing its draft", async()=>{
 const {site}=studio();selectPage(articles[0].title);
 const frame=screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
 const post=vi.spyOn(frame.contentWindow!,"postMessage");
 const original=JSON.stringify(site.article(articles[0].slug));
 await click(screen.getByRole("button",{name:"Notları göster"}));
 expect(post).toHaveBeenCalledWith({type:studioNotesEvent,visible:true},window.location.origin);
 expect(screen.getByRole("button",{name:"Notları göster"}).getAttribute("aria-pressed")).toBe("true");
 expect(screen.getByRole("link",{name:"Not senaryoları ↗"}).getAttribute("href")).toBe("/studio/not-senaryolari");
 await click(screen.getByRole("button",{name:"Notları göster"}));
 expect(post).toHaveBeenCalledWith({type:studioNotesEvent,visible:false},window.location.origin);
 expect(JSON.stringify(site.article(articles[0].slug))).toBe(original);
 expect(site.calls.some(c=>c.includes("update article"))).toBe(false);
});
