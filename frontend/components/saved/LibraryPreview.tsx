"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Article } from "../../lib/content";
import { ArticleContent } from "../ArticleContent";
import { CatalogCover } from "../CatalogCover";
import { articleDraftCover } from "../../lib/catalog-covers";
import { SlideLink } from "../SlideLink";
import { LibraryIcon as Icon } from "../library/LibraryIcon";

/** Read-only public content: no engagement, reading history or annotation providers. */
export function LibraryPreview({ article, desktop, width, onResize, onClose, onOpen }: {
  article: Article; desktop: boolean; width: number;
  onResize: (width: number) => void; onClose: () => void; onOpen: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false); const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{x:number;width:number} | null>(null);
  function close() {
    if (closingRef.current) return;
    closingRef.current = true; setClosing(true);
    timer.current = setTimeout(onClose, window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
  }
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    closingRef.current = false; setClosing(false);
  }, [article.id, article.slug]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (desktop) return;
    const node = dialog.current; node?.showModal();
    const before = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = before; };
  }, [desktop]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => {
      if (!desktop || e.key !== "Escape" || e.defaultPrevented || document.querySelector("dialog[open],details[open]")) return;
      close();
    };
    document.addEventListener("keydown", escape); return () => document.removeEventListener("keydown", escape);
  });
  function resize(value: number) {
    const workspace = document.querySelector(".library-workspace")?.getBoundingClientRect();
    const rail = document.querySelector(".library-quick-rail")?.getBoundingClientRect().width ?? 0;
    const max = Math.max(300, Math.min(620, innerWidth * .4, (workspace?.width ?? innerWidth) - rail - 380));
    onResize(Math.round(Math.max(300, Math.min(max, value))));
  }
  function start(e: PointerEvent<HTMLDivElement>) { if (e.button !== 0) return; e.preventDefault(); drag.current = {x:e.clientX,width:e.currentTarget.parentElement!.getBoundingClientRect().width}; e.currentTarget.setPointerCapture(e.pointerId); }
  const content = <>
    {desktop && <div className="library-preview-resize" role="separator" aria-label="Önizleme genişliği" aria-orientation="vertical" aria-valuemin={300} aria-valuemax={620} aria-valuenow={width} tabIndex={0} onPointerDown={start} onPointerMove={e=>{if(drag.current) resize(drag.current.width+drag.current.x-e.clientX);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{if(e.key==="ArrowLeft" || e.key==="ArrowRight") {e.preventDefault();resize((e.currentTarget.parentElement?.getBoundingClientRect().width || width)+(e.key==="ArrowLeft"?24:-24));}}} />}
    <header className="library-preview-toolbar"><span className="library-preview-identity"><CatalogCover src={article.coverUrl} fallback={articleDraftCover(article)} /><span>{article.category}</span></span><SlideLink className="library-preview-icon" href={`/yazilar/${article.slug}`} aria-label={`Yazıda devam et: ${article.title}`} onClick={onOpen}><Icon kind="expand" /><span className="library-tooltip" aria-hidden="true">Yazıda devam et</span></SlideLink><button type="button" className="library-preview-icon" aria-label="Önizlemeyi kapat" onClick={close}><Icon kind="close" /><span className="library-tooltip" aria-hidden="true">Kapat</span></button></header>
    <div className="library-preview-scroll" key={article.id ?? article.slug} tabIndex={0} aria-label={`${article.title} içeriği`}><ArticleContent article={article} fullPage readingPreview /></div>
  </>;
  return desktop ? <aside className={`library-preview${closing ? " is-closing" : ""}`} aria-label="Yazı önizlemesi" aria-labelledby="library-preview-title">{content}</aside> : <dialog ref={dialog} className={`library-preview library-preview-sheet${closing ? " is-closing" : ""}`} aria-label="Yazı önizlemesi" aria-labelledby="library-preview-title" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget)close();}}>{content}</dialog>;
}
