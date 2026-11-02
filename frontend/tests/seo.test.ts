import { expect, it } from "vitest";
import robots from "../app/robots";
import { articleCrumbs, articleJsonLd, breadcrumbJsonLd, robotsFor } from "../lib/seo";

const origin = "https://example.test";
const site = { siteName: "MrByte Studio", authorPublicName: null };
const article = {
  slug: "neb-84", title: "NEB-84", abstract: "Özet", firstPublishedAt: "2026-10-31T10:00:00Z", publicModifiedAt: null,
  cover: { url: "/api/v1/media/kapak", width: 1600, height: 900 }, categories: [{ name: "Hava-kara" }, { name: "Sığınak delici" }],
  series: { slug: "gudumsuz-muhimmat", title: "Güdümsüz Mühimmat", position: 2 },
};

it("lets indexable pages show large image previews and keeps private pages out", () => {
  expect(robotsFor(true)).toMatchObject({ index: true, follow: true, "max-image-preview": "large" });
  expect(robotsFor(false)).toEqual({ index: false, follow: false });
});

it("describes an article with its author, picture, tags and series", () => {
  const data = articleJsonLd(origin, site, article);
  expect(data).toMatchObject({
    "@type": "BlogPosting", url: `${origin}/yazilar/neb-84`, inLanguage: "tr", dateModified: "2026-10-31T10:00:00Z",
    image: { url: `${origin}/api/v1/media/kapak`, width: 1600 }, keywords: "Hava-kara, Sığınak delici",
    author: { "@type": "Organization", name: "MrByte Studio" }, publisher: { logo: { url: `${origin}/apple-touch-icon.png` } },
    isPartOf: { "@type": "CreativeWorkSeries", url: `${origin}/seriler/gudumsuz-muhimmat` }, position: 2,
  });
  expect(articleJsonLd(origin, { ...site, authorPublicName: "Bey" }, { ...article, series: null }).author).toEqual({ "@type": "Person", name: "Bey", url: `${origin}/` });
});

it("builds the home › series › article breadcrumb", () => {
  const data = breadcrumbJsonLd(origin, articleCrumbs(article));
  expect(data.itemListElement.map((item) => [item.position, item.name, item.item])).toEqual([
    [1, "Ana sayfa", `${origin}/`], [2, "Güdümsüz Mühimmat", `${origin}/seriler/gudumsuz-muhimmat`], [3, "NEB-84", `${origin}/yazilar/neb-84`],
  ]);
  expect(articleCrumbs({ ...article, series: null }).map((crumb) => crumb.name)).toEqual(["Ana sayfa", "NEB-84"]);
});

it("keeps the API closed to crawlers except published media", async () => {
  const rules = (await robots()).rules;
  expect(rules).toEqual([{ userAgent: "*", allow: ["/", "/api/v1/media/"], disallow: ["/api/"] }]);
});
