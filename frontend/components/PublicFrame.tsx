"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "../lib/builder/use-workspace";
import { themeAppearance } from "../lib/builder/appearance";
import { SlideLink } from "./SlideLink";
import { AmbientAudioToggle } from "./audio/AmbientAudio";
import { ContactForm } from "./ContactForm";
import { scrollBehavior } from "../lib/motion";

export function PublicFrame({ children, includeStudioFooter = false }: { children: ReactNode; includeStudioFooter?: boolean }) {
  const path = usePathname(); const { workspace } = useWorkspace(); const theme = workspace.applied;
  const appearance = themeAppearance(theme);
  const privateRoute = path.startsWith("/studio") || path.startsWith("/preview");
  const scene = path === "/" && theme.blocks.some(b => b.kind === "scene") && theme.blocks.every(b => ["header","scene","footer"].includes(b.kind));
  const [info, setInfo] = useState<"privacy" | "contact" | null>(null); const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (info && !dialog.current?.open) { dialog.current?.showModal(); if (info === "contact") dialog.current?.querySelector<HTMLInputElement>("[name=subject]")?.focus(); } else if (!info && dialog.current?.open) dialog.current.close(); }, [info]);
  useEffect(() => {
    if (path !== "/" || scene) return;
    const section = new URLSearchParams(location.search).get("bolum");
    const target = section === "writing" ? "yazilar" : section === "about" ? "hakkimda" : "";
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: scrollBehavior() });
  }, [path, scene]);
  if (privateRoute && !includeStudioFooter) return <>{children}</>;
  return <div className={`${appearance.className} public-frame${scene ? " public-home-scene" : ""}`} style={appearance.style}>
    <div className="public-content">{children}</div>
    <footer className="public-footer" aria-label="Site alt bilgisi">
      <div className="public-footer-main"><SlideLink href="/" direction="back" className="footer-brand"><strong>{theme.siteName}.</strong><span>{theme.blocks.find(b => b.kind === "footer")?.text || "Kod, kelime ve aradakiler."}</span></SlideLink>
        <nav aria-label="Alt menü">{([{ section:"writing",label:"Yazılar" },{ section:"series",label:"Seriler" },{ section:"about",label:"Hakkımda" }] as const).map(link => <SlideLink href={link.section === "series" ? "/seriler" : `/?bolum=${link.section}`} key={link.section} onClick={event => { if (link.section !== "series" && path === "/" && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); if (scene) window.dispatchEvent(new CustomEvent("satir:open-section", { detail: link.section })); else document.getElementById(link.section === "writing" ? "yazilar" : "hakkimda")?.scrollIntoView({ behavior:scrollBehavior() }); } }}>{link.label}<span aria-hidden="true">↗</span></SlideLink>)}<button type="button" onClick={() => setInfo("contact")}>İletişim <span aria-hidden="true">↗</span></button></nav>
        <div className="footer-listening"><AmbientAudioToggle footer /><a href="#top" className="footer-crt" aria-label="Başa dön" onClick={event => { event.preventDefault(); window.scrollTo({ top:0, behavior:scrollBehavior() }); }}><svg aria-hidden="true" viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="3" width="30" height="27" rx="6"/><path d="M13 33h14M9 38h22v7H9zM15 13h1M25 13h1M15 20q5 4 10 0M14 41h7M26 41h1"/></svg></a></div>
      </div><div className="public-footer-line" aria-hidden="true"><i /></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} {theme.siteName}.</span><button type="button" onClick={() => setInfo("privacy")}>Gizlilik</button></div>
    </footer>
    <dialog ref={dialog} className="footer-info-dialog" aria-labelledby="footer-info-title" onCancel={() => setInfo(null)} onClose={() => setInfo(null)} onClick={e => { if (e.target === e.currentTarget) setInfo(null); }}><button type="button" className="footer-info-close" aria-label="Pencereyi kapat" onClick={() => setInfo(null)}>×</button><h2 id="footer-info-title">{info === "contact" ? "İletişim" : "Kişisel alanın"}</h2>{info === "contact" ? <ContactForm /> : <><p>Kitaplığın, koleksiyonların ve kişisel notların yalnız hesabına açıktır.</p><p>Profilini ve açık oturumlarını Hesap sayfasından yönetebilirsin. Mozart yalnız sen başlattığında çalar.</p><SlideLink href="/hesap" onClick={() => setInfo(null)}>Hesabıma git ↗</SlideLink></>}</dialog>
  </div>;
}
