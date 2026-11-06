import type { Metadata } from "next";
import { StoragePage } from "../../components/storage/StoragePage";
export const metadata: Metadata = { title: "Dosya alanı", robots: { index: false, follow: false } };
export default function Page() { return <StoragePage />; }
