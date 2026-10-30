import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { catalogArticles } from "../lib/editorial/store";
import { ArticleCard } from "../components/ArticleCard";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
vi.mock("../components/SlideLink", () => ({ SlideLink: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));

describe("Yazılar catalog", () => {
  it("leaves series chapters to their series", () => {
    const chapter = initialSeries[0].articleSlugs[0];
    const listed = catalogArticles(articles, initialSeries).map((a) => a.slug);
    expect(listed).not.toContain(chapter);
    expect(listed.every((slug) => !initialSeries.some((s) => s.articleSlugs.includes(slug)))).toBe(true);
    expect(catalogArticles([{ ...articles[0], slug: "yeni-bolum", seriesId: "seri" }], [])).toEqual([]);
  });
  it("shows the article's own cover on its card", () => {
    const { container } = render(<ArticleCard article={{ ...articles[0], coverUrl: "/api/v1/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }} />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/api/v1/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });
});
