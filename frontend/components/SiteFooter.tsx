"use client";
import { useEffect, useRef, useState } from "react";
import type { PageBlock, Theme } from "../lib/builder/model";
import { SlideLink } from "./SlideLink";
import { AmbientAudioToggle } from "./audio/AmbientAudio";
import { ContactForm } from "./ContactForm";
import { scrollBehavior } from "../lib/motion";

export type FooterEditing = { active: boolean; select: (id: string) => void; attach: (node: HTMLElement | null) => void };
/** One footer for the published site and Studio; previews cannot submit contact messages. */
export function SiteFooter({ theme, block, home = false, scene = false, preview = false, editing }: { theme: Theme; block: Extract<PageBlock, {kind: "footer"}>; home?: boolean; scene?: boolean; preview?: boolean; editing?: FooterEditing }) {
  const [info, setInfo] = useState<"privacy" | "contact" | null>(null); const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (info && !dialog.current?.open) { dialog.current?.showModal(); if (info === "contact") dialog.current?.querySelector<HTMLInputElement>("[name=subject]")?.focus(); } else if (!info && dialog.current?.open) dialog.current.close(); }, [info]);
  return <>
    <footer ref={editing?.attach} className={`public-footer${editing ? ` theme-block ${editing.active ? "is-active" : ""}` : ""}`} aria-label="Site alt bilgisi" data-block-id={block.id} data-block-kind="footer" role={editing ? "group" : undefined} tabIndex={editing ? 0 : undefined} onClickCapture={editing ? event => { event.preventDefault(); event.stopPropagation(); editing.select(block.id); } : undefined} onKeyDown={editing ? event => { if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); editing.select(block.id); } } : undefined}>
      {editing && <span className="canvas-block-label">Footer <span>· İmza metnini düzenle</span></span>}
      <div className="public-footer-main"><SlideLink href="/" direction="back" className="footer-brand"><strong>{theme.siteName}.</strong><span data-inline-field="text">{block.text}</span></SlideLink>
        <nav aria-label="Alt menü">{([{ section:"writing",label:"Yazılar" },{ section:"series",label:"Seriler" },{ section:"about",label:"Hakkımda" }] as const).map(link => <SlideLink href={link.section === "series" ? "/seriler" : `/?bolum=${link.section}`} key={link.section} onClick={event => { if (link.section !== "series" && home && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) { event.preventDefault(); if (scene) window.dispatchEvent(new CustomEvent("satir:open-section", { detail: link.section })); else document.getElementById(link.section === "writing" ? "yazilar" : "hakkimda")?.scrollIntoView({ behavior:scrollBehavior() }); } }}>{link.label}<span aria-hidden="true">↗</span></SlideLink>)}<button type="button" onClick={() => setInfo("contact")}>İletişim <span aria-hidden="true">↗</span></button></nav>
        <div className="footer-listening"><AmbientAudioToggle footer preview={preview} /><a href="#top" className="footer-crt" aria-label="Başa dön" onClick={event => { event.preventDefault(); window.scrollTo({ top:0, behavior:scrollBehavior() }); }}><svg aria-hidden="true" viewBox="0 0 40 48" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="3" width="30" height="27" rx="6"/><path d="M13 33h14M9 38h22v7H9zM15 13h1M25 13h1M15 20q5 4 10 0M14 41h7M26 41h1"/></svg></a></div>
      </div><div className="public-footer-line" aria-hidden="true"><i /></div><div className="public-footer-bottom"><span>© {new Date().getFullYear()} {theme.siteName}.</span><button type="button" onClick={() => setInfo("privacy")}>Gizlilik</button></div>
    </footer>
    <dialog ref={dialog} className="footer-info-dialog" aria-labelledby="footer-info-title" onCancel={() => setInfo(null)} onClose={() => setInfo(null)} onClick={e => { if (e.target === e.currentTarget) setInfo(null); }}><button type="button" className="footer-info-close" aria-label="Pencereyi kapat" onClick={() => setInfo(null)}>×</button><h2 id="footer-info-title">{info === "contact" ? "İletişim" : "Kişisel alanın"}</h2>{info === "contact" ? preview ? <p>İletişim formu yayındaki sitede kullanılabilir.</p> : <ContactForm /> : <><p>Kitaplığın, koleksiyonların ve kişisel notların yalnız hesabına açıktır.</p><p>Profilini ve açık oturumlarını Hesap sayfasından yönetebilirsin. Mozart yalnız sen başlattığında çalar.</p><SlideLink href="/hesap" onClick={() => setInfo(null)}>Hesabıma git ↗</SlideLink></>}</dialog>
  </>;
}
