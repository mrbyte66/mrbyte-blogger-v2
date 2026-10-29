import type { Metadata } from "next";
import { PrivacyPage } from "../../components/PrivacyPage";
export const metadata: Metadata = { title: "Gizlilik", alternates: { canonical: "/gizlilik" } };
export default function Page() { return <PrivacyPage />; }
