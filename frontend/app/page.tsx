import type { Metadata } from "next";
import { PublishedSite } from "../components/builder/ThemeRenderer";
import { JsonLd } from "../components/JsonLd";
import { BackendUnavailable, loadPublicContent, siteOrigin } from "../lib/api/server";
import { DEFAULT_SITE_NAME } from "../lib/builder/model";
import { DEFAULT_SHARE_IMAGE, DEFAULT_SITE_DESCRIPTION, websiteJsonLd } from "../lib/seo";

async function site() {
  try { return (await loadPublicContent()).site; }
  catch (error) { if (error instanceof BackendUnavailable) return null; throw error; }
}

export async function generateMetadata(): Promise<Metadata> {
  const current = await site();
  const name = current?.siteName ?? DEFAULT_SITE_NAME;
  const url = `${siteOrigin()}/`;
  return {
    alternates: { canonical: url },
    openGraph: { type: "website", url, siteName: `${name}.`, locale: "tr_TR", title: current?.seo?.title ?? `${name}.`, description: current?.seo?.description ?? DEFAULT_SITE_DESCRIPTION, images: [DEFAULT_SHARE_IMAGE] },
  };
}

export default async function Home() {
  const current = await site();
  return <>
    {current?.indexingEnabled && <JsonLd data={websiteJsonLd(siteOrigin(), { siteName: current.siteName ?? DEFAULT_SITE_NAME, authorPublicName: current.authorPublicName }, current.seo?.description ?? DEFAULT_SITE_DESCRIPTION)} />}
    <PublishedSite />
  </>;
}
