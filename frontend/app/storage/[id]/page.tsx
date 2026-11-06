import type { Metadata } from "next";
import { SharedFilePage } from "../../../components/storage/SharedFilePage";
export const metadata: Metadata = { title: "Dosya indir", robots: { index: false, follow: false } };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SharedFilePage id={id} />;
}
