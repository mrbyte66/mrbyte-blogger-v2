import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithSite as render, MemorySite } from "./support/memory-site";
import { SeriesCatalog } from "../components/series/SeriesCatalog";
import { ArticleTagField } from "../components/builder/ArticleTagField";
import { addTag, hasAllTags, normalizeTag, removeTag, seriesTags } from "../lib/series/tags";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
import { articleFromPublic, articleWrite } from "../lib/api/mapping";
vi.mock("../components/SlideLink", () => ({ SlideLink: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));

describe("series tag rules", () => {
  it("normalizes like the API and ignores duplicates in Turkish case", () => {
    expect(normalizeTag("  #İHA  mühimmatı ")).toBe("İHA mühimmatı");
    let tags = addTag([], "#İHA");
    tags = addTag(tags, "iha");
    tags = addTag(tags, "Güdüm kiti");
    expect(tags).toEqual(["İHA", "Güdüm kiti"]);
    expect(addTag(tags, "x".repeat(41))).toBe(tags);
    expect(addTag(Array.from({ length: 10 }, (_, i) => `t${i}`), "fazla")).toHaveLength(10);
    expect(removeTag(tags, "İha")).toEqual(["Güdüm kiti"]);
    expect(seriesTags([{ tags: ["Lazer", "İHA"] }, { tags: ["iha", "GPS"] }])).toEqual(["Lazer", "İHA", "GPS"]);
    expect(hasAllTags({ tags: ["İHA", "Lazer"] }, ["iha", "lazer"])).toBe(true);
    expect(hasAllTags({ tags: ["İHA"] }, ["İHA", "Lazer"])).toBe(false);
  });
  it("sends and reads tags through the API mapping", () => {
    const article = { ...articles[0], categoryIds: ["7f1c2a6e-1b6f-4f0e-9a51-0c3e8d2b1a01"], tags: ["İHA"] };
    expect(articleWrite(article, null, []).tags).toEqual(["İHA"]);
    expect(articleFromPublic({ id: "00000000-0000-0000-0000-000000000001", slug: "a", url: "/yazilar/a", title: "A", categories: [], displayDate: "2026-10-29", readingMinutes: 1, stats: { views: 0, claps: 0, saves: 0 }, tags: ["Lazer"] }).tags).toEqual(["Lazer"]);
  });
});

describe("series page tag filter", () => {
  const slugs = ["iyi-kodun-sessizligi", "yapay-zeka-ile-dusunmek", "problemi-once-tanimlamak"];
  const tagged = { "iyi-kodun-sessizligi": ["İHA", "Lazer"], "yapay-zeka-ile-dusunmek": ["İHA"], "problemi-once-tanimlamak": ["Güdüm kiti"] } as Record<string, string[]>;
  const site = () => new MemorySite({ articles: articles.map((a) => tagged[a.slug] ? { ...a, tags: tagged[a.slug] } : { ...a }) });
  const titles = (container: HTMLElement) => [...container.querySelectorAll(".series-chapters > li .article-card-title")].map((node) => node.textContent);
  const title = (slug: string) => articles.find((a) => a.slug === slug)?.title;

  it("narrows chapters with every selected tag and keeps series chapter numbers", async () => {
    const user = userEvent.setup();
    const { container } = render(<SeriesCatalog series={[{ ...initialSeries[0], articleSlugs: slugs }]} selectedSeriesSlug={initialSeries[0].slug} />, { site: site() });
    const filter = screen.getByRole("group", { name: "Bölümleri etikete göre süz" });
    expect([...filter.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Tümü", "#İHA", "#Lazer", "#Güdüm kiti"]);
    await user.click(screen.getByRole("button", { name: "#İHA" }));
    expect(titles(container)).toEqual([title(slugs[0]), title(slugs[1])]);
    await user.click(screen.getByRole("button", { name: "#Lazer" }));
    expect(titles(container)).toEqual([title(slugs[0])]);
    await user.click(screen.getByRole("button", { name: "#Güdüm kiti" }));
    expect(titles(container)).toEqual([]);
    expect(screen.getByText(/hepsini taşıyan bölüm yok/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Tümü" }));
    expect(titles(container)).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "#Güdüm kiti" }));
    expect(screen.getByText("03 · Bölüm")).toBeTruthy();
    expect(screen.getByRole("button", { name: "#Güdüm kiti" }).getAttribute("aria-pressed")).toBe("true");
  });
  it("shows no filter when no chapter has tags", () => {
    render(<SeriesCatalog series={[{ ...initialSeries[0], articleSlugs: slugs }]} selectedSeriesSlug={initialSeries[0].slug} />);
    expect(screen.queryByRole("group", { name: "Bölümleri etikete göre süz" })).toBeNull();
  });
});

describe("Studio tag field", () => {
  it("adds typed tags on Enter, suggests tags of the same series and removes chips", async () => {
    const user = userEvent.setup(); const onChange = vi.fn();
    const [first, second] = initialSeries[0].articleSlugs;
    const s = new MemorySite({ articles: articles.map((a) => a.slug === second ? { ...a, tags: ["Lazer"] } : { ...a }) });
    const article = { ...s.articles.find((a) => a.slug === first)!, tags: ["İHA"] };
    render(<ArticleTagField article={article} onChange={onChange} />, { site: s, mode: "studio" });
    await user.type(screen.getByPlaceholderText("Etiket yaz, Enter'a bas"), "#Güdüm kiti{Enter}");
    expect(onChange).toHaveBeenLastCalledWith({ tags: ["İHA", "Güdüm kiti"] });
    await user.click(screen.getByRole("button", { name: "+ Lazer" }));
    expect(onChange).toHaveBeenLastCalledWith({ tags: ["İHA", "Lazer"] });
    await user.click(screen.getByRole("button", { name: "Etiketi kaldır: İHA" }));
    expect(onChange).toHaveBeenLastCalledWith({ tags: [] });
  });
});
