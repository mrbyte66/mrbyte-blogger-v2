import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SeriesPage } from "../../../components/series/SeriesPage";
import { loadPublicContent, loadSeries, siteOrigin } from "../../../lib/api/server";
import { JsonLd } from "../../../components/JsonLd";
import { DEFAULT_SHARE_IMAGE, absoluteUrl, breadcrumbJsonLd, robotsFor } from "../../../lib/seo";

type Props = { params: Promise<{ slug: string }> };
const valid = (slug: string) => slug.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!valid(slug)) return {};
  const result = await loadSeries(slug);
  if (result.kind !== "found") return {};
  const series = result.value;
  const { site } = await loadPublicContent();
  const url = `${siteOrigin()}/seriler/${series.slug}`;
  const description = series.seo?.description ?? (series.summary || undefined);
  return {
    title: series.seo?.title ?? series.title, description, alternates: { canonical: url },
    robots: robotsFor(site.indexingEnabled && series.seo?.indexable !== false),
    openGraph: {
      type: "website", url, title: series.title, description, siteName: `${site.siteName}.`, locale: "tr_TR",
      images: [series.cover ? { url: series.cover.url, width: series.cover.width, height: series.cover.height, alt: series.title } : DEFAULT_SHARE_IMAGE],
    },
  };
}

export default async function SeriesRoute({ params }: Props) {
  const { slug } = await params;
  if (!valid(slug)) notFound();
  const result = await loadSeries(slug);
  if (result.kind === "redirect") permanentRedirect(result.path);
  if (result.kind === "missing") notFound();
  const series = result.value;
  const origin = siteOrigin();
  return <>
    <JsonLd data={{
      "@context": "https://schema.org", "@type": "CollectionPage", name: series.title, description: series.summary || undefined,
      url: `${origin}/seriler/${series.slug}`, inLanguage: "tr",
      ...(series.cover ? { image: absoluteUrl(origin, series.cover.url) } : {}),
      mainEntity: { "@type": "ItemList", itemListElement: (series.chapters ?? []).map((chapter, index) => ({ "@type": "ListItem", position: index + 1, url: `${siteOrigin()}/yazilar/${chapter.slug}`, name: chapter.title })) },
    }} />
    <JsonLd data={breadcrumbJsonLd(origin, [{ name: "Ana sayfa", path: "/" }, { name: "Seriler", path: "/seriler" }, { name: series.title, path: `/seriler/${series.slug}` }])} />
    <SeriesPage slug={series.slug} />
  </>;
}
