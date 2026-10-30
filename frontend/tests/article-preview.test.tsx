import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { ArticlePreview, articleImages } from "../components/ArticlePreview";
import type { Article } from "../lib/content";

const image = (name: string) => ({ src: `/media/${name}.png`, alt: name, width: 800, height: 450, caption: "" });
const article: Article = {
  slug: "mk-82", title: "MK-82", category: "", categories: [], createdAt: "2026-10-29T00:00:00Z", publishedAt: "2026-10-29",
  eyebrow: "GÜDÜMSÜZ MÜHİMMAT · 01", excerpt: "Kısa özet.", minutes: 6, coverUrl: "/media/kapak.png",
  paragraphs: ["Giriş", "", "Ara", ""], figure: image("kesit"),
  paragraphFormats: [{ kind: "paragraph" }, { kind: "image", image: image("dusus") }, { kind: "paragraph" }, { kind: "image", image: image("snakeye") }],
};

it("lists the article's images in reading order, lead figure after the first paragraph", () => {
  expect(articleImages(article).map((item) => item.alt)).toEqual(["kesit", "dusus", "snakeye"]);
  expect(articleImages({ ...article, figure: undefined, paragraphFormats: undefined })).toEqual([]);
});

it("shows the summary, the cover and the first two pictures, then links to the full article", () => {
  const { container, getByRole } = render(<ArticlePreview article={article} />);
  expect(getByRole("heading", { name: "MK-82" })).toBeTruthy();
  expect(container.querySelector(".article-lead")?.textContent).toBe("Kısa özet.");
  const gallery = container.querySelector(".article-preview-gallery")!;
  expect(gallery.className).toContain("has-2");
  expect([...gallery.querySelectorAll("img")].map((img) => img.getAttribute("src"))).toEqual(["/media/kapak.png", "/media/kesit.png", "/media/dusus.png"]);
  expect(getByRole("link", { name: /Yazının tamamını oku/ }).getAttribute("href")).toBe("/yazilar/mk-82");
  expect(container.textContent).not.toContain("Giriş");
});
