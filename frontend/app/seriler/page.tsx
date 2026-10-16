import type { Metadata } from "next";
import { SeriesIndexPage } from "../../components/series/SeriesIndexPage";
export const metadata: Metadata = { title: "Seriler" };
export default function Page() { return <SeriesIndexPage />; }
