import Link from "next/link";
import { AccountMenu } from "../auth/AccountMenu";
import type { ReactNode } from "react";
import { ThemeToggle } from "../SitePreferences";
import { EditorIcon } from "./EditorIcon";

/** A quiet command line; navigation is the centre, the document is the stage. */
export function StudioHeader({ navigation, actions, status }: { navigation?: ReactNode; actions: ReactNode; status?: ReactNode }) {
  return <header className="studio-topbar">
    <Link href="/" className="studio-brand" aria-label="Ana sayfaya dön" title="Siteye dön"><EditorIcon name="back" size={16}/><span>studio</span></Link>
    <div className="studio-location">{navigation}<div className="studio-header-state">{status}</div></div>
    <div className="studio-top-actions">{actions}<details className="studio-personal-menu"><summary aria-label="Görünüm ve hesap">•••</summary><div><ThemeToggle/><AccountMenu/></div></details></div>
  </header>;
}
