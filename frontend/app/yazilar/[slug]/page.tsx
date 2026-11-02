import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { isArticleSlug } from "../../../lib/articles/model";
import { ArticleRoute } from "../../../components/builder/ArticlePage";
import { articleFromPublic } from "../../../lib/api/mapping";
import { loadArticle, loadPublicContent, siteOrigin } from "../../../lib/api/server";
import { JsonLd } from "../../../components/JsonLd";
import { DEFAULT_SHARE_IMAGE, articleCrumbs, articleJsonLd, breadcrumbJsonLd, robotsFor } from "../../../lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isArticleSlug(slug)) return {};
  const result = await loadArticle(slug);
  if (result.kind !== "found") return {};
  const article = result.value;
  const { site } = await loadPublicContent();
  const indexable = site.indexingEnabled && article.seo?.indexable !== false;
  const description = article.seo?.description ?? (article.abstract || undefined);
  const url = `${siteOrigin()}/yazilar/${article.slug}`;
  return {
    title: article.seo?.title ?? article.title,
    description,
    alternates: { canonical: url },
    robots: robotsFor(indexable),
    openGraph: {
      type: "article", url, title: article.title, description, siteName: `${site.siteName}.`, locale: "tr_TR",
      publishedTime: article.firstPublishedAt ?? undefined, modifiedTime: article.publicModifiedAt ?? undefined,
      ...(article.categories.length ? { tags: article.categories.map((category) => category.name) } : {}),
      images: [article.cover ? { url: article.cover.url, width: article.cover.width, height: article.cover.height, alt: article.title } : DEFAULT_SHARE_IMAGE],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  if (!isArticleSlug(slug)) notFound();
  const result = await loadArticle(slug);
  if (result.kind === "redirect") permanentRedirect(result.path);
  if (result.kind === "missing") notFound();
  const dto = result.value;
  const { site } = await loadPublicContent();
  return <>
    <JsonLd data={articleJsonLd(siteOrigin(), site, dto)} />
    <JsonLd data={breadcrumbJsonLd(siteOrigin(), articleCrumbs(dto))} />
    <ArticleRoute article={articleFromPublic(dto)} />
  </>;
}
