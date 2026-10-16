"use client";
import { SitePageHeader } from "../SitePageHeader";
import { SeriesCatalog } from "./SeriesCatalog";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
export function SeriesIndexPage() {
  const { workspace } = useWorkspace(); const { series } = useSeriesWorkspace();
  const appearance = themeAppearance(workspace.applied);
  return <main className={`${appearance.className} series-index-page`} style={appearance.style}><SitePageHeader theme={workspace.applied} /><section className="series-index-content" aria-labelledby="series-index-title"><h1 id="series-index-title">Seriler</h1><SeriesCatalog series={series} /></section></main>;
}
