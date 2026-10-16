"use client";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { UtilityIsland } from "../UtilityIsland";
import { AccountMenu } from "../auth/AccountMenu";
import { ThemeToggle } from "../SitePreferences";
import { openStudioLibrary, useStudioShell } from "../../lib/studio/shell";
import { useFocusDimming, useStudioView } from "../../lib/studio/view";
import { useDismiss } from "../../lib/studio/dismiss";
import { useStudioLayers } from "../../lib/studio/layers";
import type { StudioTarget } from "../../lib/builder/document-protocol";
import { EditorIcon } from "./EditorIcon";
import { StudioViewSwitch } from "./StudioViewSwitch";

export type StudioSection = "pages" | "series" | "home" | "insights";
/** Statistics have no entry here: the product decision removed the owner's statistics UI. */
const sections: { id: Exclude<StudioSection, "insights">; label: string; short: string; hint: string; icon: string; rail: boolean }[] = [
  { id: "pages", label: "Yazılar", short: "Yazılar", hint: "Yazılar ve seriler", icon: "pages", rail: true },
  { id: "series", label: "Seriler", short: "Seriler", hint: "Seriler", icon: "series", rail: false },
  { id: "home", label: "Ana sayfa", short: "Site", hint: "Site tasarımı", icon: "homepage", rail: true },
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
      // Rail buttons are named by their tooltip text; pills by their visible text.
      const pressed = labelled ? current === section.id : section.id === "home" && current === "home";
      const props = { className: "studio-nav-item", "aria-current": pressed ? ("page" as const) : undefined, title: section.hint, ...(labelled ? {} : { "aria-label": section.hint }) };
      const body = <><EditorIcon name={section.icon} size={labelled ? 20 : 22} />{labelled ? <span>{section.label}</span> : <small aria-hidden="true">{section.short}</small>}</>;
      if (!shell.active) return <Link key={section.id} href="/studio" {...props}>{body}</Link>;
      return <button key={section.id} type="button" {...props} onClick={() => section.id === "home" ? shell.onNavigate({ kind: "home" }) : openStudioLibrary({ kind: section.id === "series" ? "series" : "article" })}>{body}</button>;
    })}
  </nav>;
}

/** Marjinalya's rail keeps the pages opened lately one press away, so the site design and a page swap quickly. */
function RecentPages() {
  const shell = useStudioShell();
  if (!shell.active) return null;
  const items = shell.recent.slice(0, 4).map((item) => {
    const title = item.kind === "article" ? shell.articles.find((a) => a.slug === item.slug)?.title : item.kind === "series" ? shell.series.find((s) => s.slug === item.slug)?.title : undefined;
    return title ? { item, title } : null;
  }).filter((entry): entry is { item: StudioTarget & { slug: string }; title: string } => !!entry);
  if (!items.length) return null;
  return <nav className="rail-recent" aria-label="Son açılan sayfalar">
    {items.map(({ item, title }) => {
      const current = shell.target.kind === item.kind && shell.target.kind !== "home" && shell.target.slug === item.slug;
      const letters = title.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("tr");
      return <button key={`${item.kind}-${item.slug}`} type="button" className={`rail-recent-item kind-${item.kind}`} aria-current={current ? "page" : undefined} aria-label={`Son açılan ${item.kind === "series" ? "seri" : "yazı"}: ${title}`} title={title} onClick={() => shell.onNavigate(item)}>{letters}</button>;
    })}
  </nav>;
}

/** The Studio arrangement (Marjinalya, Odak, Kontakt, Sahne): its own button, apart from the account. */
function StudioViewMenu() {
  const [open, setOpen] = useState(false);
  const [view] = useStudioView();
  const [dim, setDim] = useFocusDimming();
  const root = useRef<HTMLDivElement>(null);
  useDismiss(open, () => setOpen(false), [root]);
  return <div ref={root} className="studio-view-menu">
    <button type="button" className="studio-icon-button" aria-label="Studio görünümü" title="Studio görünümü" aria-expanded={open} onClick={() => setOpen(!open)}><EditorIcon name="views" size={20} /></button>
    {open && <div className="studio-view-popover" role="dialog" aria-label="Studio görünümü">
      <div className="studio-view-popover-head"><span className="studio-eyebrow">STUDIO GÖRÜNÜMÜ</span><small>Hesabına kaydedilir; site ziyaretçileri görmez.</small></div>
      <StudioViewSwitch variant="cards" onChoose={()=>setOpen(false)} />
      {view === "odak" && <label className="studio-personal-switch"><span>Yazılan bloğun dışını soluklaştır</span><input type="checkbox" role="switch" checked={dim} onChange={(event) => setDim(event.target.checked)} /></label>}
    </div>}
  </div>;
}

/**
 * The Studio command bar. Its arrangement follows the chosen view: Marjinalya puts the section
 * buttons on a left rail, Kontakt turns them into pills; every view keeps the same actions and menu.
 */
export function StudioHeader({ navigation, actions, status, center, section }: { navigation?: ReactNode; actions: ReactNode; status?: ReactNode; center?: ReactNode; section?: StudioSection }) {
  const [view] = useStudioView();
  const current = useSection(section);
  useStudioLayers();
  const brand = <Link href="/" className="studio-brand studio-brand-tile" aria-label="Siteyi aç" title="Siteyi aç"><span aria-hidden="true">s</span></Link>;
  return <>
    {view === "marjinalya" && <div className="studio-rail" data-layer="">{brand}<SectionNav current={current} className="studio-rail-nav" labelled={false} /><RecentPages /></div>}
    <header className="studio-topbar" data-layer="">
      {view !== "marjinalya" && brand}
      {view === "kontakt" && <SectionNav current={current} className="studio-pills" labelled />}
      <div className="studio-location">{navigation}<div className="studio-header-state">{status}</div></div>
      {center}
      {view === "marjinalya" && <time className="studio-dateline" suppressHydrationWarning>{dateline()}</time>}
      <div className="studio-top-actions">{actions}<UtilityIsland className="studio-personal" label="Studio araçları"><ThemeToggle /><StudioViewMenu /><AccountMenu /></UtilityIsland></div>
    </header>
  </>;
}
