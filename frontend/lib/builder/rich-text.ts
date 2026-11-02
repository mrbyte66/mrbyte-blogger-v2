import { isSafeHref, normalizeMarks, safeMarks, type TextMark } from "../articles/marks";

/**
 * Reading and restoring a rich paragraph that the canvas edits in place. The DOM is only a view of
 * `text` plus `marks`: <strong>/<b>, <em>/<i>, <code> and <a href> map to marks, <br> to a line break.
 * In a list every <li> after the first starts a new line ("\n"); an empty item's <br data-empty> counts nothing.
 */
const isEmptyMarker = (node: Node) => node instanceof HTMLElement && node.tagName === "BR" && node.hasAttribute("data-empty");
/** An item boundary: a list item that follows another one stands for one "\n" before it. */
const startsLine = (node: Node) => node instanceof HTMLElement && node.tagName === "LI" && node.previousElementSibling?.tagName === "LI";
export function readMarked(root: HTMLElement): { text: string; marks: TextMark[] } {
  let text = "";
  const marks: TextMark[] = [];
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) { text += node.nodeValue ?? ""; return; }
    if (!(node instanceof HTMLElement)) return;
    if (isEmptyMarker(node)) return;
    if (node.tagName === "BR") { text += "\n"; return; }
    if (startsLine(node)) text += "\n";
    const start = text.length;
    node.childNodes.forEach(walk);
    const end = text.length;
    if (end <= start) return;
    const tag = node.tagName;
    if (tag === "STRONG" || tag === "B") marks.push({ type: "bold", start, end });
    else if (tag === "EM" || tag === "I") marks.push({ type: "italic", start, end });
    else if (tag === "S" || tag === "DEL" || tag === "STRIKE") marks.push({ type: "strike", start, end });
    else if (tag === "MARK") marks.push({ type: "highlight", start, end });
    else if (tag === "CODE") marks.push({ type: "code", start, end });
    else if (tag === "A") {
      const href = node.getAttribute("href");
      if (isSafeHref(href)) marks.push({ type: "link", start, end, href });
    }
  }
  root.childNodes.forEach(walk);
  return { text, marks: safeMarks(text, normalizeMarks(marks, text.length)) };
}

function lengthOf(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) return node.nodeValue?.length ?? 0;
  if (isEmptyMarker(node)) return 0;
  if (node instanceof HTMLElement && node.tagName === "BR") return 1;
  let total = startsLine(node) ? 1 : 0;
  node.childNodes.forEach((child) => { total += lengthOf(child); });
  return total;
}

/** Text offset of a DOM position inside `root` (same counting as `readMarked`). */
function offsetOf(root: HTMLElement, container: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(root);
  try { range.setEnd(container, offset); } catch { return lengthOf(root); }
  return lengthOf(range.cloneContents());
}

/** Selection start/end as text offsets, or null when the selection is outside `root`. */
export function selectionOffsets(root: HTMLElement, selection: Selection | null = window.getSelection()): { start: number; end: number } | null {
  if (!selection || !selection.rangeCount || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;
  const range = selection.getRangeAt(0);
  const start = offsetOf(root, range.startContainer, range.startOffset);
  const end = offsetOf(root, range.endContainer, range.endOffset);
  return { start: Math.min(start, end), end: Math.max(start, end) };
}

function position(root: HTMLElement, target: number): { node: Node; offset: number } {
  let remaining = target;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.nodeValue?.length ?? 0;
      if (remaining <= length) return { node, offset: remaining };
      remaining -= length;
    } else if (startsLine(node)) {
      // The caret after an item's line break sits at the start of the next item.
      const previous = (node as HTMLElement).previousElementSibling!;
      if (remaining === 0) return { node: previous, offset: previous.childNodes.length };
      remaining -= 1;
      if (remaining === 0 && !node.textContent) return { node, offset: 0 };
    } else if (node instanceof HTMLElement && node.tagName === "BR" && !isEmptyMarker(node)) {
      if (remaining === 0) { const parent = node.parentNode!; return { node: parent, offset: Array.prototype.indexOf.call(parent.childNodes, node) }; }
      remaining -= 1;
    }
  }
  return { node: root, offset: root.childNodes.length };
}

/** Puts the selection back on text offsets after the node's content was rebuilt. */
export function selectOffsets(root: HTMLElement, start: number, end: number) {
  const selection = window.getSelection();
  if (!selection) return;
  const from = position(root, start), to = position(root, end);
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}
