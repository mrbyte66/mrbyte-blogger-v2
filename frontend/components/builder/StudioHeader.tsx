"use client";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { AccountMenu } from "../auth/AccountMenu";
import { useAuth } from "../auth/AuthProvider";
import { ProfileAvatar } from "../auth/ProfileAvatar";
import { ThemeToggle } from "../SitePreferences";
import { openStudioLibrary, useStudioShell } from "../../lib/studio/shell";
import { useFocusDimming, useStudioView } from "../../lib/studio/view";
import { useDismiss } from "../../lib/studio/dismiss";
import { EditorIcon } from "./EditorIcon";
import { StudioViewSwitch } from "./StudioViewSwitch";

export type StudioSection = "pages" | "series" | "home" | "insights";
/** Statistics have no entry here: the product decision removed the owner's statistics UI. */
const sections: { id: Exclude<StudioSection, "insights">; label: string; hint: string; icon: string; rail: boolean }[] = [
  { id: "pages", label: "Yazılar", hint: "Yazılar ve seriler", icon: "pages", rail: true },
  { id: "series", label: "Seriler", hint: "Seriler", icon: "series", rail: false },
  { id: "home", label: "Ana sayfa", hint: "Site tasarımı", icon: "homepage", rail: true },
];

const datelineFormat = { weekday: new Intl.DateTimeFormat("tr-TR", { weekday: "long" }), rest: new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric" }) };
/** "ÇARŞAMBA · 14 EKİM 2026": the day's date as a quiet line in the top bar. */
function dateline(now = new Date()) {
  return `${datelineFormat.weekday.format(now)} · ${datelineFormat.rest.format(now)}`.toLocaleUpperCase("tr");
}

/** Where the author is: the editor's target, or an explicit section (the statistics page). */
function useSection(explicit?: StudioSection): StudioSection {
  const shell = useStudioShell();
  return explicit ?? (shell.target.kind === "home" ? "home" : "pages");
}

/** Section buttons shared by the Marjinalya rail and the Kontakt pill navigation. */
function SectionNav({ current, className, labelled }: { current: StudioSection; className: string; labelled: boolean }) {
  const shell = useStudioShell();
  return <nav className={className} aria-label="Studio bölümleri">
    {sections.filter((section) => labelled || section.rail).map((section) => {
      // Icon-only buttons need a name; labelled pills are named by their visible text.
      const props = { className: "studio-nav-item", "aria-current": current === section.id ? ("page" as const) : undefined, title: section.hint, ...(labelled ? {} : { "aria-label": section.hint }) };
      const body = <><EditorIcon name={section.icon} size={22} />{labelled && <span>{section.label}</span>}</>;
      if (!shell.active) return <Link key={section.id} href="/studio" {...props}>{body}</Link>;
      return <button key={section.id} type="button" {...props} onClick={() => section.id === "home" ? shell.onNavigate({ kind: "home" }) : openStudioLibrary({ kind: section.id === "series" ? "series" : "article" })}>{body}</button>;
    })}
  </nav>;
}

function RailAccount() {
  const { session } = useAuth();
  if (!session) return null;
  return <Link className="rail-account" href="/hesap" aria-label={`${session.profile.name} · Hesabım`} title="Hesabım"><ProfileAvatar name={session.profile.name} avatar={session.profile.avatar} /></Link>;
}

/** •••: view, colour mode, account. Closes on Escape and on any press outside it. */
function PersonalMenu() {
  const [open, setOpen] = useState(false);
  const [view] = useStudioView();
  const [dim, setDim] = useFocusDimming();
  const root = useRef<HTMLDetailsElement>(null);
  useDismiss(open, () => { setOpen(false); }, [root]);
  return <details ref={root} className="studio-personal-menu" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary aria-label="Görünüm ve hesap"><EditorIcon name="user" size={18} /></summary>
    <div>
      <div className="studio-personal-section"><span className="studio-eyebrow">GÖRÜNÜM</span><StudioViewSwitch /></div>
      {view === "odak" && <label className="studio-personal-switch"><span>Yazılan bloğun dışını soluklaştır</span><input type="checkbox" role="switch" checked={dim} onChange={(event) => setDim(event.target.checked)} /></label>}
      <div className="studio-personal-row"><ThemeToggle /><AccountMenu /></div>
      <div className="studio-personal-links"><Link className="studio-personal-link" href="/">Siteye dön</Link></div>
    </div>
  </details>;
}

/**
 * The Studio command bar. Its arrangement follows the chosen view: Marjinalya puts the section
 * buttons on a left rail, Kontakt turns them into pills; every view keeps the same actions and menu.
 */
export function StudioHeader({ navigation, actions, status, center, section }: { navigation?: ReactNode; actions: ReactNode; status?: ReactNode; center?: ReactNode; section?: StudioSection }) {
  const [view] = useStudioView();
  const current = useSection(section);
  const brand = <Link href="/" className="studio-brand studio-brand-tile" aria-label="Ana sayfaya dön" title="Siteye dön"><span aria-hidden="true">s</span></Link>;
  return <>
    {view === "marjinalya" && <div className="studio-rail">{brand}<SectionNav current={current} className="studio-rail-nav" labelled={false} /><RailAccount /></div>}
    <header className="studio-topbar">
      {view !== "marjinalya" && brand}
      {view === "kontakt" && <SectionNav current={current} className="studio-pills" labelled />}
      <div className="studio-location">{navigation}<div className="studio-header-state">{status}</div></div>
      {center}
      {view === "marjinalya" && <time className="studio-dateline" suppressHydrationWarning>{dateline()}</time>}
      <div className="studio-top-actions">{actions}<PersonalMenu /></div>
    </header>
  </>;
}
