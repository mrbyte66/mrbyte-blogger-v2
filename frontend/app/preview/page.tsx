import "../studio-canvas.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CanvasSessionNotice } from "../../components/builder/CanvasSessionNotice";
import { DraftPreview } from "../../components/builder/ThemeRenderer";
import { StudioDataProvider } from "../../components/data/SiteData";
import { loadSession } from "../../lib/api/server";

export const metadata: Metadata = { title: "Taslak önizleme", robots: { index: false, follow: false } };

export default async function Preview({ searchParams }: { searchParams: Promise<{ embedded?: string }> }) {
  const session = await loadSession((await headers()).get("cookie"));
  const { embedded } = await searchParams;
  if (!session.authenticated || session.profile?.role !== "owner") { if(embedded==="1") return <CanvasSessionNotice/>; redirect("/studio"); }
  return <StudioDataProvider><DraftPreview embedded={embedded === "1"} /></StudioDataProvider>;
}
