import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithSite as render, MemorySite } from "./support/memory-site";
import { SeriesCatalog } from "../components/series/SeriesCatalog";
import { hasAllTags, seriesTags } from "../lib/series/tags";
import { articleCategories } from "../lib/articles/metadata";
import { articles, type Article } from "../lib/content";
import { initialSeries } from "../lib/series/model";
vi.mock("../components/SlideLink", () => ({ SlideLink: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));

// One tag system (docs/decisions.md · Etiketler): an article's tags filter the Yazılar list and its series page.
const tagged = (tags: string[]) => ({ category: tags[0] ?? "", categories: tags }) as Partial<Article>;

describe("tags", () => {
  it("are optional and filter by every selected tag", () => {
    expect(articleCategories({ ...articles[0], category: "", categories: [] })).toEqual([]);
    const a = { ...articles[0], ...tagged(["Hava-kara", "MK-80 ailesi"]) }, b = { ...articles[1], ...tagged(["Hava-kara"]) };
    expect(seriesTags([a, b])).toEqual(["Hava-kara", "MK-80 ailesi"]);
    expect(hasAllTags(a, ["Hava-kara", "MK-80 ailesi"])).toBe(true);
    expect(hasAllTags(b, ["Hava-kara", "MK-80 ailesi"])).toBe(false);
  });
});

describe("series page tag filter", () => {
  const slugs = ["iyi-kodun-sessizligi", "yapay-zeka-ile-dusunmek", "problemi-once-tanimlamak"];
  const tags: Record<string, string[]> = { "iyi-kodun-sessizligi": ["Hava-kara", "Serbest düşüşlü"], "yapay-zeka-ile-dusunmek": ["Hava-kara"], "problemi-once-tanimlamak": [] };
  const site = () => new MemorySite({ articles: articles.map((a) => a.slug in tags ? { ...a, ...tagged(tags[a.slug]) } : { ...a }) });
  const titles = (container: HTMLElement) => [...container.querySelectorAll(".series-chapters > li .article-card-title")].map((node) => node.textContent);
  const title = (slug: string) => articles.find((a) => a.slug === slug)?.title;

  it("shows only the tags its chapters use and narrows with every selected tag", async () => {
    const user = userEvent.setup();
    const { container } = render(<SeriesCatalog series={[{ ...initialSeries[0], articleSlugs: slugs }]} selectedSeriesSlug={initialSeries[0].slug} />, { site: site() });
    const filter = screen.getByRole("group", { name: "Bölümleri etikete göre süz" });
    expect([...filter.querySelectorAll("button")].map((b) => b.textContent)).toEqual(["Tümü", "#Hava-kara", "#Serbest düşüşlü"]);
    await user.click(screen.getByRole("button", { name: "#Hava-kara" }));
    expect(titles(container)).toEqual([title(slugs[0]), title(slugs[1])]);
    await user.click(screen.getByRole("button", { name: "#Serbest düşüşlü" }));
    expect(titles(container)).toEqual([title(slugs[0])]);
    expect(screen.getByText("01 · Bölüm")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Tümü" }));
    expect(titles(container)).toHaveLength(3);
  });
  it("shows no filter when no chapter is tagged", () => {
    render(<SeriesCatalog series={[{ ...initialSeries[0], articleSlugs: slugs }]} selectedSeriesSlug={initialSeries[0].slug} />, { site: new MemorySite({ articles: articles.map((a) => ({ ...a, ...tagged([]) })) }) });
    expect(screen.queryByRole("group", { name: "Bölümleri etikete göre süz" })).toBeNull();
  });
});
