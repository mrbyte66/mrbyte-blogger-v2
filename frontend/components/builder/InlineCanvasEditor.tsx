"use client";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Theme } from "../../lib/builder/model";
import type { DocumentDraft } from "../../lib/builder/document-protocol";
import { documentText, inlineEditEvent, themeText, type InlineEdit } from "../../lib/builder/inline-edit";
import { previewEvents, type CanvasSelection } from "../../lib/builder/preview-protocol";
import { adjustMarks, clearMark, covers, isSafeHref, markAt, safeMarks, toggleMark, type MarkType, type TextMark } from "../../lib/articles/marks";
import { markedHtml } from "../../lib/articles/marked-html";
import { readMarked, selectOffsets, selectionOffsets } from "../../lib/builder/rich-text";
import { editRowSelector } from "../../lib/builder/rows";
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
  const pendingUntil = useRef(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const [value, setValue] = useState("");
  const [selectionText, setSelectionText] = useState(false);
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
  useEffect(() => { setActive(null); }, [identity, enabled]);
  // The Studio replaced the text (undo, a server copy): stop writing without sending anything back.
  useEffect(() => { if (reset) { setLinkEditor(null); setActive(null); } }, [reset]);
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
    const css = getComputedStyle(item.node);
    // Above the text when there is room, otherwise just below it; never over the line being written.
    setPosition({ left: Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 8)), top: rect.top > height + 18 ? rect.top - height - 10 : Math.max(8, Math.min(rect.bottom + 10, window.innerHeight - height - 8)), "--inline-paper": css.getPropertyValue("--panel") || "#fff", "--inline-ink": css.color } as CSSProperties);
    setSelectionText(selected);
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
    reposition();
    function input() {
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
    }
    function paste(event: ClipboardEvent) {
      // Rich content is never pasted: only the text, so marks always come from the toolbar.
      event.preventDefault();
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text) document.execCommand("insertText", false, text.replace(/\r\n?/g, "\n"));
    }
    function drop(event: DragEvent) { event.preventDefault(); }
    node.addEventListener("input", input);
    if (active.rich) { node.addEventListener("paste", paste); node.addEventListener("drop", drop); }
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("selectionchange", reposition);
    return () => {
      node.removeEventListener("input", input); node.removeEventListener("paste", paste); node.removeEventListener("drop", drop);
      window.removeEventListener("scroll", reposition, true); window.removeEventListener("resize", reposition); document.removeEventListener("selectionchange", reposition);
      node.removeAttribute("contenteditable"); node.classList.remove("is-writing"); node.removeAttribute("aria-multiline");
      if (oldRole) node.setAttribute("role", oldRole); else node.removeAttribute("role");
      if (oldLabel) node.setAttribute("aria-label", oldLabel); else node.removeAttribute("aria-label");
    };
    // The active DOM node is stable until confirmation or cancel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function finish(apply: boolean, action?: InlineEdit["action"], offset?: number) {
    const item = live.current;
    if (!item) return;
    const read = item.rich ? readMarked(item.node) : null;
    const next = read ? read.text : item.node.innerText ?? item.node.textContent ?? "";
    const nextMarks = read?.marks ?? [];
    if (apply && (next.trim() || item.allowEmpty) && (next !== item.edit.previous || action || (item.rich && JSON.stringify(nextMarks) !== JSON.stringify(item.edit.marks ?? [])))) post(item, next, nextMarks, { ...(action ? { action } : {}), ...(offset !== undefined ? { offset } : {}) });
    else if (!apply) {
      if (item.edit.previous !== item.original || (item.rich && JSON.stringify(item.edit.marks ?? []) !== JSON.stringify(item.originalMarks))) post(item, item.original, item.originalMarks);
      if (item.rich) paint(item, item.original, item.originalMarks); else item.node.textContent = item.original;
    }
    if (action === "insert-after" || action === "split") { pendingField.current = `paragraph-${Number(item.edit.field.slice(10)) + 1}`; pendingUntil.current = Date.now() + 2000; }
    setLinkEditor(null);
    setActive(null);
  }
  useEffect(() => {
    if (!pendingField.current || active) return;
    if (Date.now() > pendingUntil.current) { pendingField.current = null; return; }
    const node = root.current?.querySelector<HTMLElement>(`[data-edit-field="${pendingField.current}"]`);
    if (node && locate(node)) { pendingField.current = null; node.scrollIntoView({ block: "nearest" }); activate(node); }
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
    setValue(text.value); setLinkEditor(null);
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
    if (item.rich) paint(item, text, nextMarks, select); else item.node.textContent = text;
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
  const kind = draft?.kind === "article" && index >= 0 ? (draft.article.paragraphFormats?.[index]?.kind === "heading" ? `heading${draft.article.paragraphFormats[index].level ?? 2}` : draft.article.paragraphFormats?.[index]?.kind ?? "paragraph") : null;
  return <div ref={root} className="inline-canvas-root" onKeyDownCapture={(event) => {
    if (!enabled) return;
    if (active && (active.node.contains(event.target as Node) || toolbar.current?.contains(event.target as Node))) {
      const insideNode = active.node.contains(event.target as Node);
      if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey && active.edit.field.startsWith("paragraph-") && insideNode) {
        event.preventDefault();
        let offset = textOf(active).length;
        if (active.rich) { const at = selectionOffsets(active.node); if (at) offset = at.start; }
        else {
          const selection = window.getSelection();
          if (selection?.rangeCount && active.node.contains(selection.anchorNode)) { const range = selection.getRangeAt(0).cloneRange(); range.selectNodeContents(active.node); range.setEnd(selection.anchorNode!, selection.anchorOffset); offset = range.toString().length; }
        }
        finish(true, "split", offset); return;
      }
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (linkEditor) { setLinkEditor(null); active.node.focus(); } else finish(false); return; }
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); finish(true); return; }
      const key = event.key.toLowerCase();
      if (key === "z" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); travel(event.shiftKey ? 1 : -1); return; }
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
    if (!enabled || (event.target as HTMLElement).closest(".inline-edit-toolbar")) return;
    const node = (event.target as HTMLElement).closest<HTMLElement>(draft ? "[data-edit-field]" : "[data-inline-field]");
    // A link inside the paragraph being written must not navigate.
    if (active && node === active.node) { if ((event.target as HTMLElement).closest("a")) event.preventDefault(); return; }
    if (node && locate(node)) { event.preventDefault(); event.stopPropagation(); activate(node); }
    else if (active) finish(true);
  }} onBlurCapture={(event) => {
    if (!active || !active.node.contains(event.target as Node)) return;
    const target = event.relatedTarget as Node | null;
    if (target && !toolbar.current?.contains(target) && !active.node.contains(target)) finish(true);
  }}>
    {active ? frozen.current : children}
    {active && <div ref={toolbar} role="toolbar" aria-label="Metin araçları" className="inline-edit-toolbar" data-rich={active.rich ? "" : undefined} style={{ ...position, ...(position.left === undefined ? { visibility: "hidden" } : {}) }} onMouseDown={(event) => event.preventDefault()}>
      {index >= 0 && draft?.kind === "article" && <><div className="inline-group inline-kinds" role="group" aria-label="Blok türü">{blockTypes.map((item) => <button key={item.action} type="button" className="inline-kind" aria-label={item.label} title={item.label} aria-pressed={kind === item.action} disabled={kind !== item.action && ((item.action !== "paragraph" && !value.trim()) || (item.action.startsWith("heading") && value.length > 300) || (item.action === "quote" && value.length > 4000))} onClick={() => { if (kind !== item.action) finish(true, item.action); }}>{item.glyph}</button>)}</div><i /></>}
      {active.rich && <><div className="inline-group" role="group" aria-label="Biçim">{toggles.map((item) => <button key={item.type} type="button" aria-label={item.label} title={`${item.label} · ${item.keys}`} aria-pressed={formats[item.type]} disabled={kind?.startsWith("heading")} onClick={() => format(item.type)}><EditorIcon name={item.icon} size={17} /></button>)}<button type="button" aria-label="Bağlantı" title="Bağlantı · ⌘K" aria-pressed={formats.link} disabled={kind?.startsWith("heading")} onClick={openLink}><EditorIcon name="link" size={17} /></button><button type="button" aria-label="Biçimi temizle" title="Biçimi temizle" disabled={!Object.values(formats).some(Boolean)} onClick={clearFormatting}><EditorIcon name="clear" size={17} /></button></div><i /></>}
      {selectionText && <><button type="button" className="inline-text" aria-label={upperSelection ? "Seçimi küçük harfe çevir" : "Seçimi büyük harfe çevir"} title={upperSelection ? "Küçük harf" : "Büyük harf"} onClick={() => changeCase(!upperSelection)}>{upperSelection ? "ab" : "AB"}</button><i /></>}
      {index >= 0 && draft?.kind === "article" && <><div className="inline-group" role="group" aria-label="Blok"><button type="button" title="Yukarı taşı" aria-label="Paragrafı yukarı taşı" disabled={index === 0} onClick={() => finish(true, "move-up")}><EditorIcon name="up" size={17} /></button><button type="button" title="Aşağı taşı" aria-label="Paragrafı aşağı taşı" disabled={index === draft.article.paragraphs.length - 1} onClick={() => finish(true, "move-down")}><EditorIcon name="down" size={17} /></button><button type="button" title="Altına paragraf ekle · ↵" aria-label="Altına paragraf ekle" onClick={() => finish(true, "insert-after")}><EditorIcon name="plus" size={17} /></button><button type="button" className="inline-danger" title="Bloğu sil" aria-label="Bloğu sil" onClick={() => finish(true, "remove")}><EditorIcon name="trash" size={17} /></button></div><i /></>}
      <div className="inline-group" role="group" aria-label="Geçmiş"><button type="button" aria-label="Metni geri al" title="Geri al · ⌘Z" disabled={cursor.current === 0} onClick={() => travel(-1)}><EditorIcon name="undo" size={17} /></button><button type="button" aria-label="Metni yinele" title="Yinele · ⇧⌘Z" disabled={cursor.current >= history.current.length - 1} onClick={() => travel(1)}><EditorIcon name="redo" size={17} /></button></div>
      <i /><button type="button" className="inline-done" title="Tamam · ⌘↵ (Esc vazgeçer)" aria-label="Tamam" disabled={!value.trim() && !active.allowEmpty} onClick={() => finish(true)}><EditorIcon name="check" size={17} /></button>
      {linkEditor && <form className="inline-link-editor" onSubmit={(event) => { event.preventDefault(); applyLink(linkEditor.href); }} onMouseDown={(event) => event.stopPropagation()}>
        <label><span>Bağlantı adresi</span><input autoFocus aria-label="Bağlantı adresi" aria-invalid={!!linkEditor.error} aria-describedby="inline-link-error" placeholder="https://…" value={linkEditor.href} onChange={(event) => setLinkEditor({ href: event.target.value, error: "" })} /></label>
        <button type="submit" className="inline-done">Uygula</button>
        {markAt(marks.current, "link", saved.current?.start ?? 0, saved.current?.end ?? 0) && <button type="button" onClick={removeLink}><EditorIcon name="unlink" size={16} />Kaldır</button>}
        <p id="inline-link-error" role="alert">{linkEditor.error}</p>
      </form>}
    </div>}
  </div>;
}
