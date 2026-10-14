import Link from "next/link";
import { AccountMenu } from "../auth/AccountMenu";
import type { ReactNode } from "react";
import { ThemeToggle } from "../SitePreferences";

/** A single desktop command row for identity, page selection, state and actions. */
export function StudioHeader({ navigation, actions, status }: { navigation?: ReactNode; actions: ReactNode; status?: ReactNode }) {
  return <header className="studio-topbar">
    <Link href="/" className="studio-brand" aria-label="Ana sayfaya dön"><span className="studio-brand-orbit" aria-hidden="true" /><strong>studio<span>.</span></strong></Link>
    {navigation}
    <div className="studio-header-state">{status}</div>
    <div className="studio-top-actions">{actions}<div className="studio-personal-actions"><ThemeToggle /><AccountMenu /></div></div>
  </header>;
}
