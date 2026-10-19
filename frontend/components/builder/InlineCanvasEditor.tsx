"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Theme } from "../../lib/builder/model";
import type { DocumentDraft } from "../../lib/builder/document-protocol";
import { editDocumentText, documentText, inlineEditEvent, themeText, type InlineEdit } from "../../lib/builder/inline-edit";
import { previewEvents, rectOf, type CanvasSelection } from "../../lib/builder/preview-protocol";
import { adjustMarks, clearMark, covers, isSafeHref, markAt, safeMarks, toggleMark, type MarkType, type TextMark } from "../../lib/articles/marks";
import { markedHtml } from "../../lib/articles/marked-html";
import { readMarked, selectOffsets, selectionOffsets } from "../../lib/builder/rich-text";
import { editRowSelector } from "../../lib/builder/rows";
import { WritingGlyph } from "./WritingGlyph";
import { EditorIcon } from "./EditorIcon";

type Active = { original: string; originalMarks: TextMark[]; allowEmpty: boolean; edit: InlineEdit; max: number; node: HTMLElement; label: string; rich: boolean };
type Snapshot = { text: string; marks: TextMark[] };
type Formats = Record<MarkType, boolean>;
const noFormats: Formats = { bold: false, italic: false, strike: false, highlight: false, code: false, link: false };
/** The marks the toolbar toggles (links have their own editor). */
const toggles: { type: Exclude<MarkType, "link">; label: string; keys: string; icon: string }[] = [
  { type: "bold", label: "Kalın", keys: "⌘B", icon: "bold" },
  { type: "italic", label: "İtalik", keys: "⌘I", icon: "italic" },
  { type: "strike", label: "Üstü çizili", keys: "⇧⌘X", icon: "strike" },
  { type: "highlight", label: "Vurgula", keys: "⇧⌘H", icon: "highlight" },
  { type: "code", label: "Satır içi kod", keys: "⌘E", icon: "code" },
];
/** What the ＋ button and the "/" menu offer. Text kinds turn the line into that block; the rest open their settings. */
type BlockChoice = { id: "paragraph" | "heading2" | "heading3" | "quote" | "figure" | "code" | "table"; label: string; hint: string; glyph: string; keys?: string; words: string };
const blockChoices: BlockChoice[] = [
  { id: "paragraph", label: "Metin", hint: "Düz paragraf", glyph: "¶", words: "metin paragraf yazı text" },
  { id: "heading2", label: "Başlık", hint: "Bölüm başlığı", glyph: "H2", keys: "##", words: "başlık baslik heading h2" },
  { id: "heading3", label: "Alt başlık", hint: "Küçük başlık", glyph: "H3", keys: "###", words: "alt başlık altbaslik h3 subheading" },
  { id: "quote", label: "Alıntı", hint: "Öne çıkan söz", glyph: "“", keys: ">", words: "alıntı alinti quote söz" },
  { id: "figure", label: "Görsel", hint: "Fotoğraf ve açıklama", glyph: "▣", words: "görsel gorsel resim fotoğraf image" },
  { id: "code", label: "Kod", hint: "Kod örneği", glyph: "{ }", words: "kod code" },
  { id: "table", label: "Tablo", hint: "Satır ve sütun", glyph: "▦", words: "tablo table" },
];
const starterText: Partial<Record<BlockChoice["id"], string>> = { heading2: "Başlık", heading3: "Alt başlık", quote: "Alıntı" };
const blockTypes: { action: "paragraph" | "heading2" | "heading3" | "quote"; label: string; glyph: string }[] = [
  { action: "paragraph", label: "Metin", glyph: "¶" },
  { action: "heading2", label: "Başlık", glyph: "H2" },
  { action: "heading3", label: "Alt başlık", glyph: "H3" },
  { action: "quote", label: "Alıntı", glyph: "“" },
];

/** The selection, or with only a caret the word under it; null when there is nothing to format. */
function wordAt(text: string, at: { start: number; end: number } | null) {
  if (!at) return null;
  if (at.start === at.end) {
    const before = text.slice(0, at.start).search(/\S+$/u);
    const after = text.slice(at.start).search(/\s|$/u);
    if (before < 0 && after <= 0) return null;
    at = { start: before < 0 ? at.start : before, end: at.start + after };
  }
  return at.end > at.start ? at : null;
}

/**
 * In-place writing inside the preview frame. Plain fields use a plaintext-only editable; paragraphs are
 * "rich": their DOM is only a view of text + marks (see lib/builder/rich-text) and every change is posted
 * to the Studio as one inline-edit message carrying the full mark list.
 */
export function InlineCanvasEditor({ theme, draft, enabled, selection, reset = 0, children }: { selection?: CanvasSelection; theme: Theme; draft: DocumentDraft | null; enabled: boolean; reset?: number; children: ReactNode }) {
  const [active, setActive] = useState<Active | null>(null);
  const live = useRef<Active | null>(null);
  live.current = active;
  if (active && draft) active.edit.id = draft.kind === "article" ? draft.article.slug : draft.series.slug;
  const pendingField = useRef<string | null>(null);
  const pendingExpected=useRef<{value:string;length:number}|null>(null);
  const pendingUntil = useRef(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const [value, setValue] = useState("");
  const [selectionText, setSelectionText] = useState(false);
  // Medium-like insertion: a ＋ beside an empty line and a "/" menu, both keyboard friendly.
  const [menu, setMenu] = useState<{ query: string } | null>(null);
  const [menuIndex, setMenuIndex] = useState(0);
  const menuInserts = useRef(false);
  const [hoverBox, setHoverBox] = useState<{left:number;top:number;bottom:number;height:number}|null>(null);
  const hoverNode = useRef<HTMLElement|null>(null);
  const surface = useRef({paper:"#fcfcf8",ink:"#243329",line:"#dce2d9"});
  function readSurface(node: HTMLElement) { const css=getComputedStyle(node); surface.current={paper:css.getPropertyValue("--panel").trim() || "#fcfcf8",ink:css.color || "#243329",line:css.getPropertyValue("--line").trim() || "#dce2d9"}; }
  function clearHover() { hoverNode.current?.classList.remove("canvas-block-hover"); hoverNode.current=null; setHoverBox(null); }
  useEffect(() => {
    const clear = () => clearHover();
    window.addEventListener("scroll", clear, true); window.addEventListener("resize", clear);
    return () => {window.removeEventListener("scroll",clear,true);window.removeEventListener("resize",clear);hoverNode.current?.classList.remove("canvas-block-hover");};
  }, []);
  const [lineBox, setLineBox] = useState<{ left: number; top: number; bottom: number; height: number } | null>(null);
  const menuRef = useRef(menu); menuRef.current = menu;
  const kindRef = useRef<string | null>(null);
  const clickPoint=useRef<{x:number;y:number}|null>(null);
  const selectAllNext = useRef(false);
  // A block turned into a heading or quote is reopened only once the Studio's draft has the new kind.
  const pendingKind = useRef<string | null>(null);
  useEffect(() => { if (!active) { setMenu(null); setMoreFormats(false); } }, [active]);
  const [moreFormats, setMoreFormats] = useState(false);
  const pendingOffset = useRef<number | null>(null);
  const [formats, setFormats] = useState<Formats>(noFormats);
  const [linkEditor, setLinkEditor] = useState<{ href: string; error: string } | null>(null);
  const history = useRef<Snapshot[]>([]);
  const cursor = useRef(0);
  const marks = useRef<TextMark[]>([]);
  const saved = useRef<{ start: number; end: number } | null>(null);
  const lastCaret = useRef("none");
  const root = useRef<HTMLDivElement>(null);
  const frozen = useRef<ReactNode>(children);
  if (!active) frozen.current = children;
  const toolbar = useRef<HTMLDivElement>(null);
  const identity = draft ? `${draft.kind}:${draft.kind === "article" ? draft.article.id ?? "new" : draft.series.id}` : "home";
  const previousIdentity=useRef(identity);
  useEffect(() => {
    const firstSave=previousIdentity.current==="article:new" && identity.startsWith("article:") && identity!=="article:new";
    if(!firstSave || !enabled) setActive(null);
    previousIdentity.current=identity;
  },[identity,enabled]);
  // The Studio replaced the text (undo, a server copy): stop writing without sending anything back.
  useEffect(() => { if (reset) { pendingField.current=null; pendingExpected.current=null; pendingKind.current=null; setLinkEditor(null); setActive(null); } }, [reset]);
  useEffect(() => { if (!active) reportCaret(null); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function locate(node: HTMLElement) {
    const field = node.getAttribute(draft ? "data-edit-field" : "data-inline-field")!;
    const block = theme.blocks.find((b) => b.id === node.closest("[data-block-id]")?.getAttribute("data-block-id"));
    const text: { value: string; max: number; marks?: readonly TextMark[] } | null = draft ? documentText(draft, field) : block ? themeText(block, field) : null;
    return text ? { text, field, id: draft ? (draft.kind === "article" ? draft.article.slug : draft.series.slug) : block!.id } : null;
  }
  const textOf = (item: Active) => item.rich ? readMarked(item.node).text : item.node.innerText ?? item.node.textContent ?? "";

  useEffect(() => {
    if (!enabled) return;
    const nodes = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-edit-field], [data-inline-field]") ?? []).filter((node) => locate(node));
    const previous = nodes.map((node) => ({ node, tab: node.getAttribute("tabindex") }));
    previous.forEach(({ node }) => { node.setAttribute("tabindex", "0"); node.classList.add("canvas-text-target"); node.setAttribute("data-writing-placeholder", node.getAttribute("data-edit-field") === "excerpt" ? "Kısa bir giriş yaz…" : "Yazmaya başla…"); });
    return () => previous.forEach(({ node, tab }) => { if (tab === null) node.removeAttribute("tabindex"); else node.setAttribute("tabindex", tab); node.classList.remove("canvas-text-target"); node.removeAttribute("data-writing-placeholder"); });
    // Values are resolved anew on activation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, identity, theme, draft]);

  // While a field is written the browser owns its DOM, which React no longer sees. Once writing ends, every
  // writable field shows the draft again (an edit the Studio refused, an undo, a server echo).
  useEffect(() => {
    if (active || !draft) return;
    root.current?.querySelectorAll<HTMLElement>("[data-edit-field]").forEach((node) => {
      const text = documentText(draft, node.getAttribute("data-edit-field")!);
      if (!text) return;
      if (text.marks !== undefined) {
        const wanted = safeMarks(text.value, text.marks);
        const shown = readMarked(node);
        if (shown.text !== text.value || JSON.stringify(shown.marks) !== JSON.stringify(wanted)) node.innerHTML = markedHtml(text.value, wanted);
      } else if (node.childElementCount === 0 && node.textContent !== text.value) node.textContent = text.value;
    });
  }, [draft, active]);

  /** Which formats apply to the caret or selection; also remembers the selection for toolbar clicks. */
  function readFormats(item: Active) {
    if (!item.rich) return noFormats;
    const offsets = selectionOffsets(item.node);
    if (offsets) saved.current = offsets;
    const at = saved.current;
    if (!at) return noFormats;
    const text = marks.current;
    const pressed = (type: MarkType) => at.start === at.end ? !!markAt(text, type, at.start, at.end) : covers(text, type, at.start, at.end);
    return { bold: pressed("bold"), italic: pressed("italic"), strike: pressed("strike"), highlight: pressed("highlight"), code: pressed("code"), link: !!markAt(text, "link", at.start, at.end) };
  }
  function reposition() {
    const item = live.current;
    if (!item) return;
    const selection = window.getSelection();
    const selected = !!selection && !selection.isCollapsed && item.node.contains(selection.anchorNode);
    const selectedRange = selected ? selection!.getRangeAt(0) : null;
    const range = selectedRange && typeof selectedRange.getBoundingClientRect === "function" ? selectedRange.getBoundingClientRect() : null;
    const rect = range?.width ? range : item.node.getBoundingClientRect();
    const width = toolbar.current?.offsetWidth ?? 260;
    const height = toolbar.current?.offsetHeight ?? 48;
    const css = getComputedStyle(item.node); readSurface(item.node);
    // Above the text when there is room, otherwise just below it; never over the line being written.
    setPosition({ left: Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8)), top: rect.top > height + 18 ? rect.top - height - 10 : Math.max(8, Math.min(rect.bottom + 10, window.innerHeight - height - 8)), "--inline-paper": css.getPropertyValue("--panel") || "#fff", "--inline-ink": css.color } as CSSProperties);
    setSelectionText(selected);
    const line = item.node.getBoundingClientRect();
    setLineBox({ left: line.left, top: line.top, bottom: line.bottom, height: Math.min(line.height, 40) });
    setFormats(readFormats(item));
    reportCaret(item);
  }
  /** Tells the Studio which numbered block row and column the caret is in (shown by some views). */
  function reportCaret(item: Active | null) {
    if (!draft) return;
    let caret: { row: number; column: number } | null = null;
    if (item) {
      const nodes = Array.from(root.current?.querySelectorAll(editRowSelector) ?? []);
      const row = nodes.indexOf(item.node) + 1;
      let column = 0;
      if (item.rich) { const at = selectionOffsets(item.node); if (at) column = at.start + 1; }
      else {
        const selection = window.getSelection();
        if (selection?.rangeCount && item.node.contains(selection.anchorNode)) { const range = selection.getRangeAt(0).cloneRange(); range.selectNodeContents(item.node); range.setEnd(selection.anchorNode!, selection.anchorOffset); column = range.toString().length + 1; }
      }
      if (row > 0 && column > 0) caret = { row, column };
    }
    const key = caret ? `${caret.row}:${caret.column}` : "none";
    if (lastCaret.current === key) return;
    lastCaret.current = key;
    window.parent.postMessage(caret ? { type: previewEvents.caret, ...caret } : { type: previewEvents.caret, row: null }, window.location.origin);
  }

  /** Posts the current text (and marks for rich fields) to the Studio and remembers it as the latest value. */
  function post(item: Active, next: string, nextMarks: TextMark[], extra: Partial<InlineEdit> = {}) {
    window.parent.postMessage({ type: inlineEditEvent, edit: { ...item.edit, value: next, ...(item.rich ? { marks: nextMarks } : {}), ...extra } }, window.location.origin);
  }
  /** Rebuilds a rich node from text + marks and keeps the caret/selection on the same characters. */
  function paint(item: Active, text: string, nextMarks: TextMark[], select?: { start: number; end: number }) {
    item.node.innerHTML = markedHtml(text, nextMarks);
    if (select) selectOffsets(item.node, Math.min(select.start, text.length), Math.min(select.end, text.length));
  }
  function remember(next: Snapshot) {
    const last = history.current[cursor.current];
    if (last && last.text === next.text && JSON.stringify(last.marks) === JSON.stringify(next.marks)) return;
    history.current = history.current.slice(0, cursor.current + 1);
    history.current.push(next);
    if (history.current.length > 80) history.current.shift();
    cursor.current = history.current.length - 1;
  }

  useEffect(() => {
    if (!active) return;
    const node = active.node;
    const oldRole = node.getAttribute("role"), oldLabel = node.getAttribute("aria-label");
    node.setAttribute("contenteditable", active.rich ? "true" : "plaintext-only");
    node.setAttribute("role", "textbox"); node.setAttribute("aria-label", `${active.label} · tuval`);
    if (active.rich) node.setAttribute("aria-multiline", "true");
    node.classList.add("is-writing"); node.focus({ preventScroll: true });
    if(clickPoint.current) {
      const point=clickPoint.current; clickPoint.current=null;
      const doc=document as Document & {caretRangeFromPoint?: (x:number,y:number)=>Range|null};
      const range=doc.caretRangeFromPoint?.(point.x,point.y);
      if(range && node.contains(range.startContainer)) { const sel=window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range); }
    }
    if(draft?.kind==="article" && !draft.article.id && active.edit.field==="title" && active.original==="Yeni yazı") window.getSelection()?.selectAllChildren(node);
    reposition();
    function input(event: Event) {
      const item = live.current;
      if (!item) return;
      let next: string; let nextMarks: TextMark[] = [];
      if (item.rich) {
        const read = readMarked(node);
        next = read.text; nextMarks = read.marks;
        if (next.length > item.max) {
          const cut = next.slice(0, item.max);
          nextMarks = safeMarks(cut, adjustMarks(next, cut, nextMarks));
          next = cut; paint(item, cut, nextMarks, { start: cut.length, end: cut.length });
        }
        marks.current = nextMarks;
      } else {
        next = node.innerText ?? node.textContent ?? "";
        if (next.length > item.max) { next = next.slice(0, item.max); node.textContent = next; }
      }
      remember({ text: next, marks: nextMarks });
      if ((next.trim() || item.allowEmpty) && (next !== item.edit.previous || (item.rich && JSON.stringify(nextMarks) !== JSON.stringify(item.edit.marks ?? [])))) {
        post(item, next, nextMarks);
        item.edit = { ...item.edit, value: next, previous: next, ...(item.rich ? { marks: nextMarks } : {}) };
      }
      setValue(next); reposition();
      if(!next && draft?.kind==="article" && item.edit.field.startsWith("paragraph-") && kindRef.current!=="paragraph") { finish(true,"paragraph"); return; }
      if(!(event as InputEvent).isComposing) shortcuts(item, next);
    }
    function paste(event: ClipboardEvent) {
      // Rich content is never pasted: only the text, so marks always come from the toolbar.
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      const item=live.current;
      if(!text || !item) return;
      const clean=item.edit.field==="title" ? text.replace(/\s*\r?\n\s*/g," ") : text.replace(/\r\n?/g,"\n"), at=selectionOffsets(node) ?? {start:textOf(item).length,end:textOf(item).length};
      if(clean.includes("\n") && draft?.kind==="article" && item.edit.field.startsWith("paragraph-")) {
        const lines=clean.split(/\n(?:[ \t]*\n)*/);
        const last=Number(item.edit.field.slice(10))+lines.length-1;
        const current=textOf(item);
        if(draft.article.paragraphs.length+lines.length-1>200 || current.length+clean.length>20000) return;
        pendingField.current=`paragraph-${last}`; pendingUntil.current=Date.now()+2000;
        pendingOffset.current=lines.length===1 ? at.start+clean.length : lines[lines.length-1].length;
        const predicted=editDocumentText(draft,{...item.edit,value:current,previous:documentText(draft,item.edit.field)?.value ?? item.edit.previous,marks:marks.current,action:"paste",offset:at.start,end:at.end,pasteText:clean});
        if(predicted?.kind!=="article") {pendingField.current=null;return;}
        pendingExpected.current={value:documentText(predicted,pendingField.current!)?.value ?? "",length:predicted.article.paragraphs.length};
        post(item,current,marks.current,{action:"paste",offset:at.start,end:at.end,pasteText:clean});
        setActive(null); return;
      }
      const current=textOf(item), next=current.slice(0,at.start)+clean+current.slice(at.end);
      if(next.length>item.max) return;
      apply(item,next,safeMarks(next,adjustMarks(current,next,marks.current)),{start:at.start+clean.length,end:at.start+clean.length});
    }
    function drop(event: DragEvent) { event.preventDefault(); }
    node.addEventListener("input", input);
    node.addEventListener("paste", paste); node.addEventListener("drop", drop);
    const leaveFrame = () => finish(true);
    window.addEventListener("blur", leaveFrame);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("selectionchange", reposition);
    return () => {
      node.removeEventListener("input", input); node.removeEventListener("paste", paste); node.removeEventListener("drop", drop);
      window.removeEventListener("blur", leaveFrame);
      window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); document.removeEventListener("selectionchange", reposition);
      node.removeAttribute("contenteditable"); node.classList.remove("is-writing"); node.removeAttribute("aria-multiline");
      if (oldRole) node.setAttribute("role", oldRole); else node.removeAttribute("role");
      if (oldLabel) node.setAttribute("aria-label", oldLabel); else node.removeAttribute("aria-label");
    };
    // The active DOM node is stable until confirmation or cancel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function finish(apply: boolean, action?: InlineEdit["action"], offset?: number, end?: number, insertKind?: InlineEdit["insertKind"]) {
    const item = live.current;
    if (!item) return;
    const read = item.rich ? readMarked(item.node) : null;
    const next = read ? read.text : item.node.innerText ?? item.node.textContent ?? "";
    const nextMarks = read?.marks ?? [];
    if (apply && (next.trim() || item.allowEmpty || action==="paragraph" || action==="remove") && (next !== item.edit.previous || action || (item.rich && JSON.stringify(nextMarks) !== JSON.stringify(item.edit.marks ?? [])))) post(item, next, nextMarks, { ...(action ? { action } : {}), ...(insertKind ? {insertKind} : {}), ...(offset !== undefined ? { offset } : {}), ...(end !== undefined ? {end} : {}) });
    else if (!apply) {
      if (item.edit.previous !== item.original || (item.rich && JSON.stringify(item.edit.marks ?? []) !== JSON.stringify(item.originalMarks))) post(item, item.original, item.originalMarks);
      if (item.rich) paint(item, item.original, item.originalMarks); else item.node.textContent = item.original;
    }
    if (action === "insert-after" || action === "split") { pendingField.current = `paragraph-${Number(item.edit.field.slice(10)) + 1}`; pendingUntil.current = Date.now() + 2000; }
    if(action==="split") pendingOffset.current=0;
    if(action==="join-previous" && draft?.kind==="article") {
      const i=Number(item.edit.field.slice(10)); pendingField.current=`paragraph-${i-1}`; pendingUntil.current=Date.now()+2000; pendingOffset.current=draft.article.paragraphs[i-1].length;
    }
    if(action==="join-next") { pendingField.current=item.edit.field; pendingUntil.current=Date.now()+2000; pendingOffset.current=next.length; }
    if(action==="remove" && draft?.kind==="article") { pendingField.current=`paragraph-${Math.min(Number(item.edit.field.slice(10)),Math.max(0,draft.article.paragraphs.length-2))}`; pendingUntil.current=Date.now()+2000; pendingOffset.current=0; }
    if(action && pendingField.current && draft?.kind==="article") {
      const predicted=editDocumentText(draft,{...item.edit,value:next,previous:documentText(draft,item.edit.field)?.value ?? item.edit.previous,marks:nextMarks,action,...(insertKind ? {insertKind} : {}),...(offset!==undefined ? {offset}:{}),...(end!==undefined ? {end}: {})});
      if(predicted?.kind==="article") pendingExpected.current={value:documentText(predicted,pendingField.current)?.value ?? "",length:predicted.article.paragraphs.length};
    }
    setLinkEditor(null);
    setActive(null);
  }
  useEffect(() => {
    if (!pendingField.current || active) return;
    if (Date.now() > pendingUntil.current) { pendingField.current = null; pendingExpected.current=null; return; }
    if(pendingExpected.current && draft?.kind==="article" && (draft.article.paragraphs.length!==pendingExpected.current.length || documentText(draft,pendingField.current)?.value!==pendingExpected.current.value)) return;
    const node = root.current?.querySelector<HTMLElement>(`[data-edit-field="${pendingField.current}"]`);
    if (pendingKind.current && draft?.kind === "article") {
      const at = Number(pendingField.current.slice(10)), format = draft.article.paragraphFormats?.[at];
      const now = format?.kind === "heading" ? `heading${format.level ?? 2}` : format?.kind ?? "paragraph";
      if (now !== pendingKind.current) return;
    }
    if (node && locate(node)) {
      pendingField.current = null; pendingExpected.current=null; pendingKind.current = null; node.scrollIntoView({ block: "nearest" }); activate(node);
      // A block made from the menu arrives with its starter text selected, so typing replaces it.
      if(pendingOffset.current!==null) { const at=pendingOffset.current; pendingOffset.current=null; requestAnimationFrame(()=>selectOffsets(node,at,at)); }
      if (selectAllNext.current) { selectAllNext.current = false; requestAnimationFrame(() => { window.getSelection()?.selectAllChildren(node); }); }
    }
    // The new paragraph must first arrive from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, active]);
  function activate(node: HTMLElement) {
    if (live.current?.node === node) return;
    const data = locate(node); if (!data) return;
    if (live.current) finish(true);
    const { text, field, id } = data;
    const rich = text.marks !== undefined;
    const initialMarks = rich ? safeMarks(text.value, text.marks!) : [];
    history.current = [{ text: text.value, marks: initialMarks }]; cursor.current = 0; marks.current = initialMarks; saved.current = null;
    setValue(text.value); setLinkEditor(null); setMoreFormats(false);
    const paragraph = draft?.kind === "article" && field.startsWith("paragraph-") ? Number(field.slice(10)) : -1;
    const allowEmpty = !!draft && (field === "excerpt" || (draft.kind === "article" && paragraph >= 0 && (!draft.article.paragraphFormats?.[paragraph] || draft.article.paragraphFormats[paragraph].kind === "paragraph")));
    setActive({ original: text.value, originalMarks: initialMarks, allowEmpty, max: text.max, node, rich, label: field === "title" ? "Başlık" : "Metin", edit: { scope: draft ? "document" : "theme", id, field, value: text.value, previous: text.value, ...(rich ? { marks: initialMarks } : {}) } });
  }
  useEffect(() => {
    if (!enabled || !selection?.request || !selection.id || !draft) return;
    const field = selection.id === "body" ? "paragraph-0" : selection.id;
    const node = root.current?.querySelector<HTMLElement>(`[data-edit-field="${CSS.escape(field)}"]`);
    if (node && locate(node)) {
      node.scrollIntoView({ block: "center", behavior: "instant" });
      activate(node);
    } else { pendingField.current = field; pendingUntil.current = Date.now() + 2000; } // the block may still be on its way from the Studio
    // Only an explicit tool request moves the caret, never typing or a server echo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.request, enabled]);

  /** Applies a new text+marks state to the active rich node and tells the Studio. */
  function apply(item: Active, text: string, nextMarks: TextMark[], select?: { start: number; end: number }) {
    marks.current = nextMarks;
    if (item.rich) paint(item, text, nextMarks, select); else { item.node.textContent = text; item.node.focus(); if(select) selectOffsets(item.node,select.start,select.end); }
    remember({ text, marks: nextMarks });
    post(item, text, nextMarks);
    item.edit = { ...item.edit, value: text, previous: text, ...(item.rich ? { marks: nextMarks } : {}) };
    setValue(text); setFormats(readFormats(item));
  }
  function travel(delta: number) {
    const next = cursor.current + delta;
    const item = live.current;
    if (!item || next < 0 || next >= history.current.length) return;
    cursor.current = next;
    const target = history.current[next];
    if (item.rich) paint(item, target.text, target.marks, { start: target.text.length, end: target.text.length }); else item.node.textContent = target.text;
    marks.current = target.marks;
    item.node.focus();
    post(item, target.text, target.marks);
    item.edit = { ...item.edit, value: target.text, previous: target.text, ...(item.rich ? { marks: target.marks } : {}) };
    setValue(target.text); reposition();
  }
  function changeCase(upper: boolean) {
    const item = live.current;
    if (!item) return;
    const offsets = item.rich ? selectionOffsets(item.node) : null;
    if (item.rich && offsets && offsets.end > offsets.start) {
      const text = readMarked(item.node).text;
      const piece = text.slice(offsets.start, offsets.end);
      const changed = upper ? piece.toLocaleUpperCase("tr") : piece.toLocaleLowerCase("tr");
      const nextText = text.slice(0, offsets.start) + changed + text.slice(offsets.end);
      if (nextText.length <= item.max) apply(item, nextText, safeMarks(nextText, adjustMarks(text, nextText, marks.current)), { start: offsets.start, end: offsets.start + changed.length });
      return;
    }
    const selection = window.getSelection();
    if (!selection?.rangeCount || !item.node.contains(selection.anchorNode) || selection.isCollapsed) return;
    const range = selection.getRangeAt(0); const piece = range.toString();
    range.deleteContents(); const node = document.createTextNode(upper ? piece.toLocaleUpperCase("tr") : piece.toLocaleLowerCase("tr")); range.insertNode(node); range.selectNodeContents(node); selection.removeAllRanges(); selection.addRange(range);
    item.node.dispatchEvent(new Event("input", { bubbles: true }));
  }
  /** Markdown-like starts ("## ", "### ", "> ") and the "/" menu, read after every keystroke in a paragraph. */
  function shortcuts(item: Active, text: string) {
    if (!item.edit.field.startsWith("paragraph-") || kindRef.current !== "paragraph") { if (menuRef.current) setMenu(null); return; }
    const mark = /^(#{2,3}|>) /.exec(text);
    if (mark) {
      const action = mark[1] === "##" ? "heading2" : mark[1] === "###" ? "heading3" : "quote";
      turnInto(item, action, text.slice(mark[0].length));
      return;
    }
    if (text.startsWith("/") && !/\s/.test(text)) { if (!menuRef.current) setMenuIndex(0); menuInserts.current=false; setMenu({ query: text.slice(1) }); }
    else if (menuRef.current) setMenu(null);
  }
  /** Turns the paragraph being written into another text block; an empty one gets a selected starter text. */
  function turnInto(item: Active, action: "heading2" | "heading3" | "quote", text: string) {
    const value = text.trim() ? text : starterText[action] ?? "";
    paint(item, value, safeMarks(value, adjustMarks(textOf(item), value, marks.current)));
    if (!text.trim()) selectAllNext.current = true;
    pendingField.current = item.edit.field; pendingUntil.current = Date.now() + 2000; pendingKind.current = action;
    setMenu(null);
    finish(true, action);
  }
  function choose(choice: BlockChoice) {
    const item = live.current;
    if (!item) return;
    if (menuInserts.current && ["paragraph","heading2","heading3","quote"].includes(choice.id)) {
      menuInserts.current=false; setMenu(null);
      pendingKind.current=choice.id === "paragraph" ? null : choice.id;
      selectAllNext.current=choice.id !== "paragraph";
      finish(true,"insert-after",undefined,undefined,choice.id as InlineEdit["insertKind"]);
      return;
    }
    const clearSlash = () => { if (menuRef.current && readMarked(item.node).text.startsWith("/")) { item.node.textContent = ""; item.node.dispatchEvent(new Event("input", { bubbles: true })); } };
    if (choice.id === "paragraph") { clearSlash(); setMenu(null); if(kindRef.current!=="paragraph") finish(true,"paragraph"); else item.node.focus(); return; }
    if (choice.id === "heading2" || choice.id === "heading3" || choice.id === "quote") { turnInto(item, choice.id, menuRef.current && textOf(item).startsWith("/") ? "" : textOf(item)); return; }
    // Figure, code and table have their own settings: the Studio opens them as a card beside this line.
    const rect = rectOf(item.node);
    clearSlash(); setMenu(null);
    finish(true);
    window.parent.postMessage({ type: previewEvents.select, id: choice.id, rect }, window.location.origin);
  }

  /** Removes every mark (links too) from the selection; with only a caret, from the word under it. */
  function clearFormatting() {
    const item = live.current;
    if (!item?.rich) return;
    const text = readMarked(item.node).text;
    const at = wordAt(text, selectionOffsets(item.node) ?? saved.current);
    if (!at) return;
    let next = marks.current;
    for (const type of ["bold", "italic", "strike", "highlight", "code", "link"] as MarkType[]) next = clearMark(next, type, at.start, at.end, text.length);
    apply(item, text, next, at);
    saved.current = at;
  }
  /** Bold / italic / strike / highlight / code over the selection; with only a caret the word under it is used. */
  function format(type: Exclude<MarkType, "link">) {
    const item = live.current;
    if (!item?.rich) return;
    const text = readMarked(item.node).text;
    const at = wordAt(text, selectionOffsets(item.node) ?? saved.current);
    if (!at) return;
    apply(item, text, toggleMark(marks.current, type, at.start, at.end, text.length), at);
    saved.current = at;
  }
  function openLink() {
    const item = live.current;
    if (!item?.rich) return;
    const at = selectionOffsets(item.node) ?? saved.current;
    if (!at || at.end <= at.start) { setLinkEditor({ href: "", error: "Önce bağlantı olacak metni seç." }); return; }
    saved.current = at;
    const existing = markAt(marks.current, "link", at.start, at.end);
    setLinkEditor({ href: existing?.href ?? "", error: "" });
  }
  function applyLink(href: string) {
    const item = live.current;
    const at = saved.current;
    if (!item?.rich || !at) return;
    const address = href.trim();
    if (!isSafeHref(address)) { setLinkEditor({ href, error: "Adres https:// ile başlamalı; site içi bağlantı için / ile başla, e-posta için mailto: kullan." }); return; }
    const text = readMarked(item.node).text;
    apply(item, text, toggleMark(marks.current, "link", at.start, at.end, text.length, address), at);
    setLinkEditor(null);
    item.node.focus();
    selectOffsets(item.node, at.start, at.end);
  }
  function removeLink() {
    const item = live.current;
    const at = saved.current;
    if (!item?.rich || !at) return;
    const text = readMarked(item.node).text;
    apply(item, text, clearMark(marks.current, "link", at.start, at.end, text.length), at);
    setLinkEditor(null);
    item.node.focus();
    selectOffsets(item.node, at.start, at.end);
  }

  const index = active?.edit.field.startsWith("paragraph-") ? Number(active.edit.field.slice(10)) : -1;
  // The case button offers the other case: lower when the selection is already all upper case.
  const selected = selectionText && typeof window !== "undefined" ? window.getSelection()?.toString() ?? "" : "";
  const upperSelection = !!selected && selected === selected.toLocaleUpperCase("tr") && selected !== selected.toLocaleLowerCase("tr");
  const query = (menu?.query ?? "").toLocaleLowerCase("tr");
  const matches = blockChoices.filter((choice) => !query || choice.words.split(" ").some((word) => word.startsWith(query)) || choice.label.toLocaleLowerCase("tr").startsWith(query));
  const kind = draft?.kind === "article" && index >= 0 ? (draft.article.paragraphFormats?.[index]?.kind === "heading" ? `heading${draft.article.paragraphFormats[index].level ?? 2}` : draft.article.paragraphFormats?.[index]?.kind ?? "paragraph") : null;
  kindRef.current = kind;
  const plusBox = hoverBox ?? (index >= 0 ? lineBox : null);
  const showPlus = enabled && draft?.kind === "article" && !menu && !selectionText && !!plusBox;
  const menuStyle: CSSProperties | undefined = lineBox ? { left: Math.max(8, Math.min(lineBox.left, window.innerWidth - Math.min(360,window.innerWidth-16)-8)), top: Math.max(8, Math.min(lineBox.bottom+8,window.innerHeight-260)) } : undefined;
  return <div ref={root} className="inline-canvas-root" style={{"--inline-paper":surface.current.paper,"--inline-ink":surface.current.ink,"--panel":surface.current.paper,"--ink":surface.current.ink,"--line":surface.current.line} as CSSProperties} onPointerMove={event => {
    if (!enabled || draft?.kind !== "article" || menu || selectionText || event.pointerType === "touch") return;
    const target=event.target as HTMLElement;
    if(target.closest(".inline-plus,.inline-block-menu,.inline-edit-toolbar")) return;
    const node=target.closest<HTMLElement>('[data-edit-field^="paragraph-"]');
    if(node && locate(node)) {
      if(hoverNode.current === node) return;
      hoverNode.current?.classList.remove("canvas-block-hover"); hoverNode.current=node; readSurface(node); node.classList.add("canvas-block-hover");
      const rect=node.getBoundingClientRect();setHoverBox({left:rect.left,top:rect.top,bottom:rect.bottom,height:Math.min(rect.height,40)});
    } else if (!target.closest("article")) clearHover();
  }} onPointerLeave={() => {if(!menu) clearHover();}} onKeyDownCapture={(event) => {
    if (!enabled || event.nativeEvent.isComposing || event.keyCode===229) return;
    if((event.metaKey||event.ctrlKey) && event.key.toLowerCase()==="s" && draft) { event.preventDefault(); window.parent.postMessage({type:previewEvents.save},window.location.origin); return; }
    if (active && menu && active.node.contains(event.target as Node)) {
      const count = Math.max(1, matches.length);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setMenuIndex((i) => (i + (event.key === "ArrowDown" ? 1 : -1) + count) % count); return; }
      if (event.key === "Enter" && matches.length) { event.preventDefault(); event.stopPropagation(); choose(matches[Math.min(menuIndex, matches.length - 1)]); return; }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setMenu(null); return; }
    }
    if(active && active.node.contains(event.target as Node)) {
      const at=selectionOffsets(active.node);
      const text=textOf(active);
      if(event.key==="Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && ["title","excerpt"].includes(active.edit.field) && draft?.kind==="article") {
        event.preventDefault(); const target=active.edit.field==="title" ? "excerpt" : "paragraph-0"; finish(true); pendingField.current=target; pendingUntil.current=Date.now()+2000; pendingOffset.current=0; return;
      }
      if(at && at.start===at.end && active.edit.field.startsWith("paragraph-") && draft?.kind==="article") {
        const i=Number(active.edit.field.slice(10));
        if(event.key==="Backspace" && at.start===0) { event.preventDefault(); if(kindRef.current!=="paragraph") { pendingField.current=active.edit.field; pendingUntil.current=Date.now()+2000; pendingOffset.current=0; finish(true,"paragraph"); } else if(i>0) finish(true,"join-previous"); return; }
        if(event.key==="Delete" && at.end===text.length && i<draft.article.paragraphs.length-1) { event.preventDefault(); finish(true,"join-next"); return; }
        if((event.key==="ArrowUp" && at.start===0 && i>0) || (event.key==="ArrowDown" && at.end===text.length && i<draft.article.paragraphs.length-1)) {
          event.preventDefault(); const next=i+(event.key==="ArrowUp" ? -1 : 1); finish(true); pendingField.current=`paragraph-${next}`; pendingUntil.current=Date.now()+2000; pendingOffset.current=event.key==="ArrowUp" ? draft.article.paragraphs[next].length : 0; return;
        }
      }
    }
    if (active && (active.node.contains(event.target as Node) || toolbar.current?.contains(event.target as Node))) {
      const insideNode = active.node.contains(event.target as Node);
      if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && active.edit.field.startsWith("paragraph-") && insideNode) {
        event.preventDefault();
        let offset = textOf(active).length, end=offset;
        if (active.rich) { const at = selectionOffsets(active.node); if (at) {offset = at.start; end=at.end;} }
        else {
          const selection = window.getSelection();
          if (selection?.rangeCount && active.node.contains(selection.anchorNode)) { const range = selection.getRangeAt(0).cloneRange(); range.selectNodeContents(active.node); range.setEnd(selection.anchorNode!, selection.anchorOffset); offset = range.toString().length; }
        }
        finish(true, "split", offset,end); return;
      }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (linkEditor) { setLinkEditor(null); active.node.focus(); } else finish(true); return; }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); finish(true); return; }
      const key = event.key.toLowerCase();
      if (key === "z" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); if((!event.shiftKey && cursor.current===0) || (event.shiftKey && cursor.current>=history.current.length-1)) { finish(true); window.parent.postMessage({type:event.shiftKey ? previewEvents.redo : previewEvents.undo},window.location.origin); } else travel(event.shiftKey ? 1 : -1); return; }
      if (active.rich && insideNode && (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey && (key === "x" || key === "h")) { event.preventDefault(); format(key === "x" ? "strike" : "highlight"); return; }
      if (active.rich && insideNode && (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        if (key === "b") { event.preventDefault(); format("bold"); return; }
        if (key === "i") { event.preventDefault(); format("italic"); return; }
        if (key === "e") { event.preventDefault(); format("code"); return; }
        if (key === "k") { event.preventDefault(); openLink(); return; }
      }
      return;
    }
    if (event.key === "Enter" && (event.target as HTMLElement).matches(".canvas-text-target")) { event.preventDefault(); event.stopPropagation(); activate(event.target as HTMLElement); }
  }} onClickCapture={(event) => {
    if (!enabled || (event.target as HTMLElement).closest(".inline-edit-toolbar, .inline-plus, .inline-block-menu, .rn-ui")) return;
    const node = (event.target as HTMLElement).closest<HTMLElement>(draft ? "[data-edit-field]" : "[data-inline-field]");
    // A link inside the paragraph being written must not navigate.
    if (active && node === active.node) { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); return; }
    if (node && locate(node)) { event.preventDefault(); event.stopPropagation(); clickPoint.current={x:event.clientX,y:event.clientY}; activate(node); }
    else if (active) finish(true);
  }} onBlurCapture={(event) => {
    if (!active || !active.node.contains(event.target as Node)) return;
    const target = event.relatedTarget as Node | null;
    if (target && !toolbar.current?.contains(target) && !active.node.contains(target)) finish(true);
  }}>
    {active ? frozen.current : children}
    {showPlus && <button type="button" className="inline-plus" aria-label="Blok ekle" title="Blok ekle · ya da / yaz" style={{ left: Math.max(4, plusBox!.left - 40), top: plusBox!.top + (plusBox!.height - 32) / 2 }} onMouseDown={(event) => event.preventDefault()} onClick={() => {
      const node=hoverNode.current;
      if(node && node!==live.current?.node) {clickPoint.current=null;activate(node);const r=node.getBoundingClientRect();setLineBox({left:r.left,top:r.top,bottom:r.bottom,height:Math.min(r.height,40)});}
      setLinkEditor(null);setSelectionText(false);menuInserts.current=true;setMenuIndex(0);setMenu({query:""});
    }}><EditorIcon name="plus" size={18} /></button>}
    {active && menu && <div className="inline-block-menu" role="listbox" aria-label="Blok ekle" style={menuStyle} onMouseDown={(event) => event.preventDefault()}>
      <span className="inline-block-menu-title">{menu.query ? `“${menu.query}”` : "BLOK EKLE"}</span>
      {matches.map((choice, i) => <button key={choice.id} type="button" role="option" aria-label={choice.label} aria-selected={i === Math.min(menuIndex, matches.length - 1)} onMouseEnter={() => setMenuIndex(i)} onClick={() => choose(choice)}><span className="inline-block-glyph" aria-hidden="true"><WritingGlyph kind={choice.id} size={28}/></span><span className="inline-block-text"><strong>{choice.label}</strong><small>{choice.hint}</small></span></button>)}
      {!menu.query && <button disabled aria-label="Sesle yazma · Yakında"><span className="inline-block-glyph"><EditorIcon name="microphone" size={22}/></span><span className="inline-block-text"><strong>Ses</strong><small>Yakında</small></span></button>}
      {index>=0 && draft?.kind==="article" && !menu.query && <div className="writing-block-actions" role="group" aria-label="Paragraf işlemleri"><button aria-label="Paragrafı yukarı taşı" disabled={index===0} onClick={()=>finish(true,"move-up")}><EditorIcon name="up" size={16}/></button><button aria-label="Paragrafı aşağı taşı" disabled={index===draft.article.paragraphs.length-1} onClick={()=>finish(true,"move-down")}><EditorIcon name="down" size={16}/></button><button aria-label="Altına paragraf ekle" onClick={()=>finish(true,"insert-after")}><EditorIcon name="plus" size={16}/></button><button aria-label="Bloğu sil" onClick={()=>finish(true,"remove")}><EditorIcon name="trash" size={16}/></button></div>}
      {!matches.length && <p className="inline-block-empty">Eşleşen blok yok · Esc</p>}
    </div>}
    {active && (selectionText || linkEditor) && !menu && <div ref={toolbar} role="toolbar" aria-label="Metin araçları" className="inline-edit-toolbar writing-selection-toolbar" style={{ ...position, ...(position.left === undefined ? { visibility: "hidden" } : {}) }} onMouseDown={event=>event.preventDefault()}>
      {active.rich && <><div className="inline-group" role="group" aria-label="Biçim">{toggles.filter(item=>["bold","italic","highlight"].includes(item.type)).map(item=><button key={item.type} type="button" aria-label={item.label} title={item.label} aria-pressed={formats[item.type]} onClick={()=>format(item.type)}><EditorIcon name={item.icon} size={17}/></button>)}<button type="button" aria-label="Bağlantı" title="Bağlantı" aria-pressed={formats.link} onClick={openLink}><EditorIcon name="link" size={17}/></button></div><i/></>}
      {active.rich && index >= 0 && <><div className="inline-group" role="group" aria-label="Paragraf biçimi">{(["heading2", "quote"] as const).map(kind => <button key={kind} type="button" aria-label={kind === "heading2" ? "Ara başlık" : "Alıntı"} title={kind === "heading2" ? "Ara başlık" : "Alıntı"} aria-pressed={kindRef.current === kind} onClick={() => {
        if (kindRef.current === kind) { pendingField.current = active.edit.field; pendingUntil.current = Date.now() + 2000; pendingKind.current = "paragraph"; finish(true, "paragraph"); }
        else turnInto(active, kind, textOf(active));
      }}><EditorIcon name={kind === "heading2" ? "heading" : "quote"} size={17}/></button>)}</div><i/></>}
      <button type="button" aria-label="Diğer metin araçları" title="Diğer araçlar" aria-expanded={moreFormats} onClick={()=>setMoreFormats(!moreFormats)}>•••</button>
      {moreFormats && <div className="writing-format-more" role="group" aria-label="Diğer metin araçları">
        {active.rich && <>{toggles.filter(item=>["strike","code"].includes(item.type)).map(item=><button key={item.type} aria-label={item.label} onClick={()=>format(item.type)}><EditorIcon name={item.icon} size={16}/>{item.label}</button>)}<button aria-label="Biçimi temizle" onClick={clearFormatting}><EditorIcon name="clear" size={16}/>Biçimi temizle</button></>}
        <button aria-label={upperSelection ? "Seçimi küçük harfe çevir" : "Seçimi büyük harfe çevir"} onClick={()=>changeCase(!upperSelection)}>{upperSelection ? "Küçük harf" : "Büyük harf"}</button>
      </div>}
      {linkEditor && <form className="inline-link-editor" onSubmit={(event) => { event.preventDefault(); applyLink(linkEditor.href); }} onMouseDown={(event) => event.stopPropagation()}>
        <label><span>Bağlantı adresi</span><input autoFocus aria-label="Bağlantı adresi" aria-invalid={!!linkEditor.error} aria-describedby="inline-link-error" placeholder="https://…" value={linkEditor.href} onChange={(event) => setLinkEditor({ href: event.target.value, error: "" })} /></label>
        <button type="submit" className="inline-done">Uygula</button>
        {markAt(marks.current, "link", saved.current?.start ?? 0, saved.current?.end ?? 0) && <button type="button" onClick={removeLink}><EditorIcon name="unlink" size={16} />Kaldır</button>}
        <p id="inline-link-error" role="alert">{linkEditor.error}</p>
      </form>}
    </div>}
  </div>;
}
