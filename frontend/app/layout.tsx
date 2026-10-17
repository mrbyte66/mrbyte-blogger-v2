import type { Metadata } from "next";
import "./globals.css";
import "./themes.css";
import "./reading-tools.css";
import "./preferences.css";
import "./transitions.css";
import "./engagement.css";
import "./saved.css";
import "./audio.css";
import "./editorial-metadata.css";
import "./scene-featured.css";
import "./auth.css";
import "./appearance.css";
import "./personal-space.css";
import "./floating-surfaces.css";
import "./reading-notes.css";
import "./note-atlas.css";
import { PublicFrame } from "../components/PublicFrame";
import { AuthProvider } from "../components/auth/AuthProvider";
import { AuthNavigation } from "../components/auth/AuthNavigation";
import { AppearanceSync } from "../components/auth/AppearanceSync";
import { AmbientAudioProvider, AmbientAudioToggle } from "../components/audio/AmbientAudio";
import { SavedProvider } from "../components/saved/SavedProvider";
import { EngagementProvider } from "../components/engagement/EngagementProvider";
import { RouteMotion } from "../components/SlideLink";
import { SitePreferences } from "../components/SitePreferences";
import { SiteDataProvider } from "../components/data/SiteData";
import { PublicContentRefresh } from "../components/data/PublicContentRefresh";
import { BackendUnavailable, loadPublicContent, siteOrigin, type PublicContent } from "../lib/api/server";

// Content comes from the API on every request; nothing published is baked in at build time.
export const dynamic = "force-dynamic";

async function publicContent(): Promise<PublicContent | null> {
  try { return await loadPublicContent(); }
  catch (error) { if (error instanceof BackendUnavailable) return null; throw error; }
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await publicContent();
  const site = content?.site;
  const name = site?.siteName ?? "SATIR";
  return {
    metadataBase: new URL(siteOrigin()),
    title: { default: site?.seo?.title ?? `${name}. — Kod, kelime ve aradakiler`, template: `%s — ${name}.` },
    description: site?.seo?.description ?? "Yazılım, yapay zekâ, edebiyat ve kültür üzerine kişisel bir evren.",
    // Indexing needs both the owner's site setting and the deployment gate (backend decides).
    robots: site?.indexingEnabled ? { index: true, follow: true } : { index: false, follow: false },
    icons: { icon: "/favicon.svg" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const content = await publicContent();
  return <html lang="tr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('satir:theme');if(t==='light'||t==='dark'||t==='reading'){document.documentElement.dataset.theme=t==='dark'?'dark':'light';if(t==='reading')document.documentElement.dataset.tone='reading'}var v=localStorage.getItem('satir:studio-view');if(v==='marjinalya'||v==='odak'||v==='kontakt'||v==='sahne'){document.documentElement.dataset.studioView=v;if(location.pathname.indexOf('/studio')===0||location.pathname.indexOf('/preview')===0){var F={marjinalya:'family=DM+Mono:wght@400;500&family=Instrument+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400',odak:'family=JetBrains+Mono:wght@400;500&family=Manrope:wght@500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400',kontakt:'family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700',sahne:'family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;1,6..72,300;1,6..72,400'};var k=document.createElement('link');k.id='studio-fonts-'+v;k.rel='stylesheet';k.href='https://fonts.googleapis.com/css2?'+F[v]+'&display=swap';document.head.appendChild(k)}}if(localStorage.getItem('satir:studio-dim')==='off')document.documentElement.dataset.studioDim='off';document.documentElement.dataset.motion=localStorage.getItem('satir:motion')==='off'||matchMedia('(prefers-reduced-motion: reduce)').matches?'off':'on'}catch(e){}" }} /></head><body>
    {!content && <p className="site-unavailable" role="alert">Sunucuya şu anda ulaşılamıyor. İçerikler geçici olarak gösterilemiyor; biraz sonra tekrar dene.</p>}
    <SiteDataProvider site={content?.site ?? { indexingEnabled: false, canonicalOrigin: siteOrigin() }} articles={content?.articles ?? []} series={content?.series ?? []}>
      <PublicContentRefresh /><SitePreferences><AuthProvider><AuthNavigation /><AppearanceSync /><EngagementProvider><SavedProvider><AmbientAudioProvider><RouteMotion><PublicFrame>{children}</PublicFrame></RouteMotion><AmbientAudioToggle /></AmbientAudioProvider></SavedProvider></EngagementProvider></AuthProvider></SitePreferences>
    </SiteDataProvider>
  </body></html>;
}
