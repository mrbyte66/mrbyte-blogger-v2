"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Theme } from "../../lib/builder/model";
import type { DocumentDraft } from "../../lib/builder/document-protocol";
import { documentText, inlineEditEvent, themeText, type InlineEdit } from "../../lib/builder/inline-edit";
import type { CanvasSelection } from "../../lib/builder/preview-protocol";
import { EditorIcon } from "./EditorIcon";

type Active = { original: string; allowEmpty: boolean; edit: InlineEdit; max: number; node: HTMLElement; label: string };
export function InlineCanvasEditor({ theme, draft, enabled, selection, children }: { selection?: CanvasSelection; theme: Theme; draft: DocumentDraft | null; enabled: boolean; children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const live = useRef<Active | null>(null);
  live.current = active;
  if(active && draft) active.edit.id=draft.kind==="article" ? draft.article.slug : draft.series.slug;
  const pendingField=useRef<string|null>(null);
  const [position, setPosition] = useState<CSSProperties>({});
  const [value, setValue] = useState("");
  const [selectionText, setSelectionText] = useState(false);
  const history = useRef<string[]>([]);
  const cursor = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const frozen = useRef<ReactNode>(children);
  if (!active) frozen.current=children;
  const toolbar = useRef<HTMLDivElement>(null);
  const identity = draft ? `${draft.kind}:${draft.kind === "article" ? draft.article.id ?? "new" : draft.series.id}` : "home";
  useEffect(() => { setActive(null); }, [identity, enabled]);
  function locate(node: HTMLElement) {
    const field = node.getAttribute(draft ? "data-edit-field" : "data-inline-field")!;
    const block = theme.blocks.find(b => b.id === node.closest("[data-block-id]")?.getAttribute("data-block-id"));
    const text = draft ? documentText(draft, field) : block ? themeText(block, field) : null;
    return text ? { text, field, id: draft ? (draft.kind === "article" ? draft.article.slug : draft.series.slug) : block!.id } : null;
  }
  useEffect(() => {
    if (!enabled) return;
    const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-edit-field], [data-inline-field]") ?? []).filter(node => locate(node));
    const previous = nodes.map(node => ({node, tab:node.getAttribute("tabindex")}));
    previous.forEach(({node})=> { node.setAttribute("tabindex","0"); node.classList.add("canvas-text-target"); node.setAttribute("data-writing-placeholder",node.getAttribute("data-edit-field")==="excerpt" ? "Kısa bir giriş yaz…" : "Yazmaya başla…"); });
    return () => previous.forEach(({node,tab})=> { if(tab === null) node.removeAttribute("tabindex"); else node.setAttribute("tabindex",tab); node.classList.remove("canvas-text-target"); node.removeAttribute("data-writing-placeholder"); });
    // Values are resolved anew on activation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, identity, theme, draft]);
  function reposition() {
    const item = live.current;
    if (!item) return;
    const selection = window.getSelection();
    const selected = !!selection && !selection.isCollapsed && item.node.contains(selection.anchorNode);
    const range = selected ? selection!.getRangeAt(0).getBoundingClientRect() : null;
    const rect = range?.width ? range : item.node.getBoundingClientRect();
    const width = toolbar.current?.offsetWidth ?? 260;
    const css = getComputedStyle(item.node);
    setPosition({left:Math.max(8,Math.min(rect.left + rect.width/2-width/2,window.innerWidth-width-8)),top:rect.top > 58 ? rect.top-48 : Math.max(8,Math.min(rect.bottom+8,window.innerHeight-52)), "--inline-paper":css.getPropertyValue("--panel") || "#fff", "--inline-ink":css.color } as CSSProperties);
    setSelectionText(selected);
  }
  useEffect(() => {
    if (!active) return;
    const node = active.node;
    const oldRole = node.getAttribute("role"), oldLabel = node.getAttribute("aria-label");
    node.contentEditable = "plaintext-only";
    node.setAttribute("role","textbox"); node.setAttribute("aria-label",`${active.label} · tuval`);
    node.classList.add("is-writing"); node.focus({preventScroll:true});
    reposition();
    function input() {
      let next = node.innerText ?? node.textContent ?? "";
      if(next.length > active!.max) { next=next.slice(0,active!.max); node.textContent=next; }
      if(next !== history.current[cursor.current]) { history.current=history.current.slice(0,cursor.current+1); history.current.push(next); if(history.current.length>80) history.current.shift(); cursor.current=history.current.length-1; }
      const item=live.current;
      if(item && (next.trim() || item.allowEmpty) && next!==item.edit.previous) {
        window.parent.postMessage({type:inlineEditEvent,edit:{...item.edit,value:next}},window.location.origin);
        item.edit={...item.edit,value:next,previous:next};
      }
      setValue(next); reposition();
    }
    node.addEventListener("input",input);
    window.addEventListener("scroll",reposition,true);
    window.addEventListener("resize",reposition);

    document.addEventListener("selectionchange",reposition);
    return () => {
      node.removeEventListener("input",input); window.removeEventListener("scroll",reposition,true); window.removeEventListener("resize",reposition); document.removeEventListener("selectionchange",reposition);
      node.removeAttribute("contenteditable"); node.classList.remove("is-writing");
      if(oldRole) node.setAttribute("role",oldRole); else node.removeAttribute("role");
      if(oldLabel) node.setAttribute("aria-label",oldLabel); else node.removeAttribute("aria-label");
    };
    // The active DOM node is stable until confirmation or cancel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  function finish(apply: boolean, action?: InlineEdit["action"], offset?: number) {
    const item=live.current;
    if (!item) return;
    const next = item.node.innerText ?? item.node.textContent ?? "";
    if (apply && (next.trim() || item.allowEmpty) && (next !== item.edit.previous || action)) window.parent.postMessage({type:inlineEditEvent,edit:{...item.edit,value:next,...(action ? {action} : {}),...(offset !== undefined ? {offset} : {})}},window.location.origin);
    else if(!apply) {
      if(item.edit.previous!==item.original) window.parent.postMessage({type:inlineEditEvent,edit:{...item.edit,value:item.original}},window.location.origin);
      item.node.textContent=item.original;
    }
    if(action==="insert-after" || action==="split") pendingField.current=`paragraph-${Number(item.edit.field.slice(10))+1}`;
    setActive(null);
  }
  useEffect(()=>{
    if(!pendingField.current || active) return;
    const node=root.current?.querySelector<HTMLElement>(`[data-edit-field="${pendingField.current}"]`);
    if(node && locate(node)) { pendingField.current=null; node.scrollIntoView({block:"nearest"}); activate(node); }
    // The new paragraph must first arrive from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[draft,active]);
  function activate(node: HTMLElement) {
    if(live.current?.node === node) return;
    const data=locate(node); if(!data) return;
    if(live.current) finish(true);
    const {text,field,id}=data;
    history.current=[text.value]; cursor.current=0; setValue(text.value);
    setActive({original:text.value,allowEmpty:!!draft && (field==="excerpt" || (draft.kind==="article" && field.startsWith("paragraph-") && (!draft.article.paragraphFormats?.[Number(field.slice(10))] || draft.article.paragraphFormats[Number(field.slice(10))].kind==="paragraph"))),max:text.max,node,label:field === "title" ? "Başlık" : "Metin",edit:{scope:draft ? "document" : "theme",id,field,value:text.value,previous:text.value}});
  }
  useEffect(() => {
    if(!enabled || !selection?.request || !selection.id || !draft) return;
    const field=selection.id === "body" ? "paragraph-0" : selection.id;
    const node=root.current?.querySelector<HTMLElement>(`[data-edit-field="${CSS.escape(field)}"]`);
    if(node && locate(node)) {
      node.scrollIntoView({block:"center",behavior:"instant"});
      activate(node);
    }
    // Only an explicit tool request moves the caret, never typing or a server echo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.request,enabled]);
  function travel(delta:number) {
    const next=cursor.current+delta;
    if(!active || next<0 || next>=history.current.length) return;
    cursor.current=next; active.node.textContent=history.current[next]; setValue(history.current[next]); active.node.focus(); active.node.dispatchEvent(new Event("input",{bubbles:true})); reposition();
  }
  function changeCase(upper:boolean) {
    const selection=window.getSelection();
    if(!active || !selection?.rangeCount || !active.node.contains(selection.anchorNode) || selection.isCollapsed) return;
    const range=selection.getRangeAt(0); const text=range.toString();
    range.deleteContents(); const node=document.createTextNode(upper ? text.toLocaleUpperCase("tr") : text.toLocaleLowerCase("tr")); range.insertNode(node); range.selectNodeContents(node); selection.removeAllRanges(); selection.addRange(range);
    active.node.dispatchEvent(new Event("input",{bubbles:true}));
  }
  const index=active?.edit.field.startsWith("paragraph-") ? Number(active.edit.field.slice(10)) : -1;
  return <div ref={root} className="inline-canvas-root" onKeyDownCapture={event=>{
    if(!enabled) return;
    if(active && (active.node.contains(event.target as Node) || toolbar.current?.contains(event.target as Node))) {
      if(event.key==="Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && active.edit.field.startsWith("paragraph-") && active.node.contains(event.target as Node)) {
        event.preventDefault();
        const selection=window.getSelection(); let offset=(active.node.innerText ?? active.node.textContent ?? "").length;
        if(selection?.rangeCount && active.node.contains(selection.anchorNode)) { const range=selection.getRangeAt(0).cloneRange(); range.selectNodeContents(active.node); range.setEnd(selection.anchorNode!,selection.anchorOffset); offset=range.toString().length; }
        finish(true,"split",offset); return;
      }
      if(event.key==="Escape") { event.preventDefault(); event.stopPropagation(); finish(false); }
      if(event.key==="Enter" && (event.metaKey||event.ctrlKey)) { event.preventDefault(); finish(true); }
      if(event.key.toLowerCase()==="z" && (event.metaKey||event.ctrlKey)) { event.preventDefault(); travel(event.shiftKey ? 1 : -1); }
      return;
    }
    if(event.key==="Enter" && (event.target as HTMLElement).matches(".canvas-text-target")) { event.preventDefault(); event.stopPropagation(); activate(event.target as HTMLElement); }
  }} onClickCapture={event=>{
    if(!enabled || (event.target as HTMLElement).closest(".inline-edit-toolbar")) return;
    const node=(event.target as HTMLElement).closest<HTMLElement>(draft ? "[data-edit-field]" : "[data-inline-field]");
    if(node && locate(node)) { event.stopPropagation(); activate(node); }
    else if(active) finish(true);
  }} onBlurCapture={event=>{
    if(!active || !active.node.contains(event.target as Node)) return;
    const target=event.relatedTarget as Node|null;
    if(target && !toolbar.current?.contains(target) && !active.node.contains(target)) finish(true);
  }}>
    {active ? frozen.current : children}
    {active && <div ref={toolbar} role="toolbar" aria-label="Metin araçları" className="inline-edit-toolbar" style={position} onMouseDown={event=>event.preventDefault()}>
      <button aria-label="Metni geri al" title="Geri al · ⌘Z" disabled={cursor.current===0} onClick={()=>travel(-1)}><EditorIcon name="undo" size={16}/></button>
      <button aria-label="Metni yinele" title="Yinele · ⇧⌘Z" disabled={cursor.current>=history.current.length-1} onClick={()=>travel(1)}><EditorIcon name="redo" size={16}/></button>
      {selectionText && <><i/><button aria-label="Seçimi büyük harfe çevir" title="Büyük harf" onClick={()=>changeCase(true)}>AA</button><button aria-label="Seçimi küçük harfe çevir" title="Küçük harf" onClick={()=>changeCase(false)}>aa</button></>}
      {index>=0 && draft?.kind==="article" && <><i/><select aria-label="Metin biçimi" value={draft.article.paragraphFormats?.[index]?.kind==="heading" ? `heading${draft.article.paragraphFormats[index].level ?? 2}` : draft.article.paragraphFormats?.[index]?.kind ?? "paragraph"} onMouseDown={event=>event.stopPropagation()} onChange={event=>finish(true,event.target.value as InlineEdit["action"])}><option value="paragraph">Metin</option><option value="heading2" disabled={value.length>300}>Başlık</option><option value="heading3" disabled={value.length>300}>Alt başlık</option><option value="quote" disabled={value.length>4000}>Alıntı</option></select><i/><button title="Paragrafı yukarı taşı" aria-label="Paragrafı yukarı taşı" disabled={index===0} onClick={()=>finish(true,"move-up")}><EditorIcon name="up" size={16}/></button><button title="Paragrafı aşağı taşı" aria-label="Paragrafı aşağı taşı" disabled={index===draft.article.paragraphs.length-1} onClick={()=>finish(true,"move-down")}><EditorIcon name="down" size={16}/></button><button title="Altına paragraf ekle" aria-label="Altına paragraf ekle" onClick={()=>finish(true,"insert-after")}><EditorIcon name="plus" size={16}/></button></>}
      <i/><button title="Vazgeç · Esc" aria-label="Vazgeç" onClick={()=>finish(false)}><EditorIcon name="close" size={16}/></button><button className="inline-done" title="Tamam · ⌘/Ctrl Enter" aria-label="Tamam" disabled={!value.trim() && !active.allowEmpty} onClick={()=>finish(true)}><EditorIcon name="check" size={16}/></button>
    </div>}
  </div>;
}
