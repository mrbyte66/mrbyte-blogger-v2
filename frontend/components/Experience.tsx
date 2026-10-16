"use client";
import { SlideLink } from "./SlideLink";
import { NotebookControl } from "./reading/NotebookControl";
import { SavedLibraryLink } from "./saved/SaveArticleButton";
import { UtilityIsland } from "./UtilityIsland";
import { AccountMenu } from "./auth/AccountMenu";

import { publicArticles } from "../lib/editorial/store";
import { useArticles } from "../lib/articles/use-articles";
import { SceneFeatured } from "./SceneFeatured";
import { useSeriesWorkspace } from "../lib/series/use-series-workspace";
import { publishedSeries } from "../lib/series/model";
import { useEffect, useReducer } from "react";
import { ThemeToggle, useSitePreferences } from "./SitePreferences";
import { AmbientAudioToggle } from "./audio/AmbientAudio";
import { Character } from "./Character";
import { ContentPanel } from "./ContentPanel";
import { initialNavigation, navigateArticles, type Section, type Navigation, type NavigationAction } from "../lib/navigation";

const destinations: { section: Section; number: string; label: string; detail: string }[] = [
  { section: "writing", number: "01", label: "Yazılar", detail: "DÜŞÜNCELER & NOTLAR" },
  { section: "projects", number: "02", label: "Projeler", detail: "KOD & DENEYLER" },
  { section: "about", number: "03", label: "Hakkımda", detail: "EKRANIN ARKASINDAKİ" },
];

export function Experience({ editing = false, siteName = "SATIR", title = "Kod yazarım.", emphasis = "Bazen de satır.", description = "Yazılım, edebiyat ve\nikisinin arasında bir insan.", headingLevel = "h1", colorMode = "remember", featuredArticleSlug = "yapay-zeka-ile-dusunmek", showFeaturedArticle = true, featuredSeriesSlug = "yapay-zeka-ile-yazilim", showFeaturedSeries = true }: { editing?: boolean; siteName?: string; title?: string; emphasis?: string; description?: string; headingLevel?: "h1" | "h2"; colorMode?: "light" | "dark" | "remember"; featuredArticleSlug?: string; showFeaturedArticle?: boolean; featuredSeriesSlug?: string; showFeaturedSeries?: boolean }) {
  const Heading = headingLevel;
  const { articles: storedArticles } = useArticles();
  const articles = publicArticles(storedArticles);
  const featured = articles.find((article) => article.slug === featuredArticleSlug);
  const { series: storedSeries } = useSeriesWorkspace();
  const featuredSeries = publishedSeries(storedSeries).find((entry) => entry.slug === featuredSeriesSlug && entry.articleSlugs.some((slug) => articles.some((article) => article.slug === slug)));
  const [navigation, dispatch] = useReducer((state: Navigation, action: NavigationAction) => navigateArticles(state, action, articles), initialNavigation);
  useEffect(() => {
    const open = (section: unknown) => { if (section === "writing" || section === "about" || section === "projects") dispatch({ type: "open", section }); };
    open(new URLSearchParams(window.location.search).get("bolum"));
    const receive = (event: Event) => { if (!editing) open((event as CustomEvent).detail); };
    window.addEventListener("satir:open-section", receive);
    return () => window.removeEventListener("satir:open-section", receive);
  }, [editing]);
  const { colorMode: preference, motionEnabled, setMotionEnabled } = useSitePreferences();
  const dark = preference ? preference === "dark" : colorMode === "dark";


  return <section aria-label="Karakterli evren" className={`experience ${dark ? "theme-dark" : "theme-light"} ${motionEnabled ? "motion-on" : "motion-off"} ${navigation.section ? "panel-open" : ""}`}>
    <a tabIndex={editing ? -1 : undefined} aria-disabled={editing || undefined} className="skip-link" href="#scene-navigation">İçeriklere geç</a>
    <div className="stage-texture" aria-hidden="true" />
    <header className="site-header"><button disabled={editing} className="wordmark" aria-label={`${siteName} ana sahne`} onClick={() => dispatch({ type: "close" })}>{siteName}<span>.</span></button><span className="header-description">KİŞİSEL BİR EVREN</span><UtilityIsland className="scene-header-island" label="Sahne araçları" inert={editing}>
      <ThemeToggle defaultDark={colorMode === "dark"} />
      <span className="island-divider" aria-hidden="true" />
      <button type="button" className="island-motion" aria-label="Sahne hareketi" title={motionEnabled ? "Sahne hareketini kapat" : "Sahne hareketini aç"} aria-pressed={motionEnabled} onClick={() => setMotionEnabled(!motionEnabled)}><span className={`motion-icon ${motionEnabled ? "playing" : ""}`} aria-hidden="true"><i /><i /><i /></span></button>
      <span className="island-divider" aria-hidden="true" />
      {!editing && <><SavedLibraryLink /><NotebookControl /><AccountMenu appearance="island" /></>}
    </UtilityIsland></header>

    <div className="scene">
      <span className="scene-coordinate" aria-hidden="true">FIG. 001 — İNSAN / MAKİNE</span>
      <div className="scene-halo" aria-hidden="true" />
      <div className="scene-word" aria-hidden="true">merak.</div>
      <Character motionEnabled={motionEnabled} />

      <div className="introduction"><p className="eyebrow"><span className="tiny-cross" aria-hidden="true">+</span> MERHABA, DÜNYA.</p><Heading className="scene-heading"><span data-inline-field="title">{title}</span><br /><em data-inline-field="emphasis">{emphasis}</em></Heading><p data-inline-field="description" className="intro-description" style={{ whiteSpace: "pre-line" }}>{description}</p><div className="intro-line" aria-hidden="true" /></div>

      <nav id="scene-navigation" className="scene-navigation" aria-label="Ana içerikler"><p className="navigation-label">NEREYE GİDELİM?</p>{destinations.map((destination) => <button key={destination.section} className="destination" disabled={editing} onClick={() => dispatch({ type: "open", section: destination.section })}><span className="destination-number">{destination.number}</span><span className="destination-copy"><span className="destination-label">{destination.label}</span><span className="destination-detail">{destination.detail}</span></span><span className="destination-plus" aria-hidden="true">+</span></button>)}</nav>

      <SceneFeatured article={showFeaturedArticle ? featured : undefined} series={showFeaturedSeries ? featuredSeries : undefined} onArticle={(slug) => dispatch({ type: "article", slug })} onSeries={(slug) => dispatch({ type: "series", slug })} />
      <div className={`character-caption ${showFeaturedSeries && featuredSeries ? "caption-with-featured-series" : ""}`} aria-hidden="true"><span className="caption-line" /><span>Kıvırcık düşünceler.<br />Düzenli satırlar.</span></div>
    </div>

    <footer className="site-footer"><span className="footer-signature">HER ŞEY BİR MERAKLA BAŞLAR.</span><span className="scene-indicator"><span aria-hidden="true">✳</span> BURADASIN</span><div className="scene-controls" inert={editing}><AmbientAudioToggle scene /></div></footer>
    <ContentPanel navigation={navigation} dispatch={dispatch} siteName={siteName} defaultDark={colorMode === "dark"} />
  </section>;
}
