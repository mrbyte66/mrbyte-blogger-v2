import type { Metadata } from "next";
import { DEFAULT_SITE_NAME } from "./builder/model";

/** Shared search-engine signals for public pages: robots directives, absolute URLs and Schema.org data. */

/** Indexable pages also allow large image previews (Search, Discover) and full-length snippets. */
export function robotsFor(indexable: boolean): Metadata["robots"] {
  return indexable
    ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 }
    : { index: false, follow: false };
}

export const absoluteUrl = (origin: string, path: string) => /^https?:\/\//.test(path) ? path : `${origin}${path.startsWith("/") ? "" : "/"}${path}`;

/** Used until the owner writes a site description in Studio. */
export const DEFAULT_SITE_DESCRIPTION = "Yazılım, yapay zekâ, savunma teknolojileri ve edebiyat üzerine kişisel bir evren: görsellerle anlatılan yazılar ve seriler.";

/** Shown when a page has no picture of its own (home page, series without a cover). */
export const DEFAULT_SHARE_IMAGE = { url: "/assets/og-default.png", width: 1200, height: 630 };

type Crumb = { name: string; path: string };
export function breadcrumbJsonLd(origin: string, crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: absoluteUrl(origin, crumb.path) })),
  };
}

type Site = { siteName?: string | null; authorPublicName?: string | null };
/** The public site payload may omit the name; pages then use the product name, as the header does. */
export const siteNameOf = (site: Site) => site.siteName || DEFAULT_SITE_NAME;
/** The author is the named person when the owner set one, otherwise the site itself. */
export function authorJsonLd(origin: string, site: Site) {
  return site.authorPublicName
    ? { "@type": "Person", name: site.authorPublicName, url: `${origin}/` }
    : { "@type": "Organization", name: siteNameOf(site), url: `${origin}/` };
}

export function publisherJsonLd(origin: string, site: Site) {
  return { "@type": "Organization", name: siteNameOf(site), url: `${origin}/`, logo: { "@type": "ImageObject", url: `${origin}/apple-touch-icon.png` } };
}

type Article = {
  slug: string; title: string; abstract?: string | null; firstPublishedAt?: string | null; publicModifiedAt?: string | null;
  cover?: { url: string; width?: number; height?: number } | null; categories?: { name: string }[];
  series?: { slug: string; title: string; position: number } | null;
};
export function articleJsonLd(origin: string, site: Site, article: Article) {
  const url = `${origin}/yazilar/${article.slug}`;
  return {
    "@context": "https://schema.org", "@type": "BlogPosting", headline: article.title, description: article.abstract || undefined,
    inLanguage: "tr", datePublished: article.firstPublishedAt, dateModified: article.publicModifiedAt ?? article.firstPublishedAt,
    mainEntityOfPage: url, url,
    ...(article.cover ? { image: { "@type": "ImageObject", url: absoluteUrl(origin, article.cover.url), width: article.cover.width, height: article.cover.height } } : {}),
    ...(article.categories?.length ? { keywords: article.categories.map((category) => category.name).join(", ") } : {}),
    author: authorJsonLd(origin, site), publisher: publisherJsonLd(origin, site),
    ...(article.series ? { isPartOf: { "@type": "CreativeWorkSeries", name: article.series.title, url: `${origin}/seriler/${article.series.slug}` }, position: article.series.position } : {}),
  };
}

/** Home › (series ›) article: the path search results show under the title. */
export function articleCrumbs(article: Pick<Article, "slug" | "title" | "series">): Crumb[] {
  return [
    { name: "Ana sayfa", path: "/" },
    ...(article.series ? [{ name: article.series.title, path: `/seriler/${article.series.slug}` }] : []),
    { name: article.title, path: `/yazilar/${article.slug}` },
  ];
}

export function websiteJsonLd(origin: string, site: Site, description: string) {
  return {
    "@context": "https://schema.org", "@type": "WebSite", name: siteNameOf(site), url: `${origin}/`, description, inLanguage: "tr",
    publisher: publisherJsonLd(origin, site),
  };
}
