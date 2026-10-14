import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { SeriesArticleNav } from "../components/series/SeriesArticleNav";
import { SiteDesignControls } from "../components/builder/SiteDesignControls";
import { MemorySite, renderWithSite } from "./support/memory-site";
import { readCanvas } from "./helpers/canvas";

beforeEach(() => {
  localStorage.clear(); document.documentElement.dataset.studioView = "odak";
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches:false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function articlePage(site:MemorySite) {
  renderWithSite(<SiteEditor />, { site, mode:"studio" });
  fireEvent.click(screen.getByRole("button", {name:/^Sayfalar:/}));
  fireEvent.click(screen.getByRole("button", {name:site.articles[0].title}));
}
it("keeps save, content actions and live design on the article in Odak, including after focusing", () => {
  const site=new MemorySite(); articlePage(site);
  const header=document.querySelector(".studio-topbar") as HTMLElement;
  expect(within(header).getByRole("button",{name:"Sayfayı kaydet ↗"})).toBeTruthy();
  expect(within(header).getByText("•••")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Tuvale odaklan"}));
  expect(document.querySelector(".studio-focus")).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Tasarım"}));
  expect(document.querySelector(".studio-focus")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"Yazı boyutu: Büyük"}));
  expect(site.workspace.draft.textSize).toBe("large");
  expect(site.workspace.applied.textSize).toBe("medium");
  expect(site.calls).not.toContain("apply theme");
});
it("sends the current unsaved series choice into the canvas, including explicit independence", () => {
  const site=new MemorySite(); articlePage(site);
  const initial=readCanvas(); expect(initial.kind==="article" && initial.article.seriesId).toBe(site.series[0].id);
  fireEvent.click(screen.getByRole("button",{name:"Yazının serisi"}));
  fireEvent.click(screen.getByRole("button",{name:/^Bağımsız yazı/}));
  const independent=readCanvas(); expect(independent.kind==="article" && independent.article.seriesId).toBeNull();
  expect(site.articles[0].seriesId).toBe(site.series[0].id);
});
it("does not leak saved series navigation into an independent preview", () => {
  const site=new MemorySite(), article=site.articles[0];
  const {rerender}=renderWithSite(<SeriesArticleNav articleSlug={article.slug} previewSeriesId={null} />, {site,mode:"studio"});
  expect(screen.queryByRole("navigation",{name:"Seri bölümleri"})).toBeNull();
  const next=site.series[1]; next.status="draft";
  rerender(<SeriesArticleNav articleSlug={article.slug} previewSeriesId={next.id}/>);
  expect(screen.getByRole("link",{name:`${next.title} ↗`})).toBeTruthy();
  expect(screen.queryByRole("link",{name:`${site.series[0].title} ↗`})).toBeNull();
  expect(next.articleSlugs).not.toContain(article.slug);
  rerender(<SeriesArticleNav articleSlug={article.slug}/>);
  expect(screen.getByRole("link",{name:`${site.series[0].title} ↗`})).toBeTruthy();
});
it("does not report success when applying the site design fails; retries the preserved draft", async () => {
  const site=new MemorySite(); renderWithSite(<SiteDesignControls/>,{site,mode:"studio"});
  fireEvent.click(screen.getByRole("button",{name:"Tipografi: Editoryal"}));
  const original=site.workspace.applied;
  site.failNext={} as never;
  await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Temayı uygula"}));});
  expect(screen.getByRole("status").textContent).toContain("uygulanamadı");
  expect(site.workspace.applied).toEqual(original);
  expect(site.workspace.draft.typography).toBe("editorial");
  await act(async()=>{fireEvent.click(screen.getByRole("button",{name:"Temayı uygula"}));});
  expect(site.workspace.applied.typography).toBe("editorial");
});
