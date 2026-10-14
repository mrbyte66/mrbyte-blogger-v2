/**
 * Inline formatting for article text. Marks sit beside the plain text (never inside it): offsets are
 * UTF-16 code units of the text, so reader annotations keep anchoring to the same characters.
 * Mirrors the backend rules (ArticleDocument): kinds, ranges and links.
 */
export type MarkType = "bold" | "italic" | "strike" | "highlight" | "code" | "link";
export type TextMark = { type: MarkType; start: number; end: number; href?: string };

export const markTypes: readonly MarkType[] = ["bold", "italic", "strike", "highlight", "code", "link"];
export const maxMarksPerBlock = 200;
/** Links: https, mailto or a site-relative path. Never scripts, data URLs or protocol-relative addresses. */
const linkPattern = /^(?:https:\/\/[^\s]{1,480}|mailto:[^\s@]{1,100}@[^\s]{1,100}|\/(?!\/)[^\s]{0,480})$/;

export function isSafeHref(href: unknown): href is string {
  return typeof href === "string" && href.length <= 500 && linkPattern.test(href);
}

function splitsSurrogatePair(text: string, index: number) {
  if (index <= 0 || index >= text.length) return false;
  const before = text.charCodeAt(index - 1), after = text.charCodeAt(index);
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff;
}

/** True when `marks` is a list the server would accept for `text`. */
export function validMarks(text: string, marks: unknown): marks is TextMark[] {
  if (!Array.isArray(marks)) return false;
  if (marks.length > maxMarksPerBlock) return false;
  for (const mark of marks as TextMark[]) {
    if (!mark || typeof mark !== "object" || !markTypes.includes(mark.type)) return false;
    if (!Number.isInteger(mark.start) || !Number.isInteger(mark.end) || mark.start < 0 || mark.end <= mark.start || mark.end > text.length) return false;
    if (splitsSurrogatePair(text, mark.start) || splitsSurrogatePair(text, mark.end)) return false;
    if (mark.type === "link" ? !isSafeHref(mark.href) : mark.href !== undefined) return false;
  }
  for (const type of markTypes) {
    const same = (marks as TextMark[]).filter((mark) => mark.type === type).sort((a, b) => a.start - b.start);
    for (let i = 1; i < same.length; i++) if (same[i].start < same[i - 1].end) return false;
  }
  return true;
}

function clean(mark: TextMark): TextMark {
  return mark.type === "link" ? { type: "link", start: mark.start, end: mark.end, href: mark.href } : { type: mark.type, start: mark.start, end: mark.end };
}

/**
 * Sorted, clipped to [0, length], without empty ranges, with touching or overlapping marks of the same
 * kind merged (links merge only when they point to the same address; otherwise the later one wins the overlap).
 */
export function normalizeMarks(marks: readonly TextMark[], length: number): TextMark[] {
  const result: TextMark[] = [];
  for (const type of markTypes) {
    const same = marks
      .filter((mark) => mark.type === type)
      .map((mark) => ({ ...mark, start: Math.max(0, mark.start), end: Math.min(length, mark.end) }))
      .filter((mark) => mark.end > mark.start)
      .sort((a, b) => a.start - b.start || a.end - b.end);
    const merged: TextMark[] = [];
    for (const mark of same) {
      const last = merged[merged.length - 1];
      if (last && mark.start <= last.end && (type !== "link" || last.href === mark.href)) last.end = Math.max(last.end, mark.end);
      else if (last && mark.start < last.end) { last.end = mark.start; if (last.end > last.start) merged.push(clean(mark)); else merged[merged.length - 1] = clean(mark); }
      else merged.push(clean(mark));
    }
    result.push(...merged);
  }
  return result.sort((a, b) => a.start - b.start || markTypes.indexOf(a.type) - markTypes.indexOf(b.type));
}

/** Normalized marks without anything the server would reject for this text (unsafe links, cut emoji). */
export function safeMarks(text: string, marks: readonly TextMark[]): TextMark[] {
  return normalizeMarks(marks, text.length).filter((mark) =>
    !splitsSurrogatePair(text, mark.start) && !splitsSurrogatePair(text, mark.end) && (mark.type === "link" ? isSafeHref(mark.href) : true)).slice(0, maxMarksPerBlock);
}

/** Does one mark of `type` cover the whole range? */
export function covers(marks: readonly TextMark[], type: MarkType, start: number, end: number): boolean {
  return marks.some((mark) => mark.type === type && mark.start <= start && mark.end >= end);
}

/** Marks of `type` that touch the range (for the toolbar's pressed state of a caret/selection). */
export function markAt(marks: readonly TextMark[], type: MarkType, start: number, end: number): TextMark | undefined {
  return marks.find((mark) => mark.type === type && (start === end ? mark.start < start && mark.end >= start : mark.start < end && mark.end > start));
}

/** Applies or removes a mark over [start, end). A fully covered range is cleared; anything else is formatted. */
export function toggleMark(marks: readonly TextMark[], type: MarkType, start: number, end: number, length: number, href?: string): TextMark[] {
  if (end <= start) return [...marks];
  if (type !== "link" && covers(marks, type, start, end)) {
    const next: TextMark[] = [];
    for (const mark of marks) {
      if (mark.type !== type || mark.end <= start || mark.start >= end) { next.push(mark); continue; }
      if (mark.start < start) next.push({ ...mark, end: start });
      if (mark.end > end) next.push({ ...mark, start: end });
    }
    return normalizeMarks(next, length);
  }
  if (type === "link") {
    const cleared = marks.flatMap((mark): TextMark[] => {
      if (mark.type !== "link" || mark.end <= start || mark.start >= end) return [mark];
      return [...(mark.start < start ? [{ ...mark, end: start }] : []), ...(mark.end > end ? [{ ...mark, start: end }] : [])];
    });
    return href ? normalizeMarks([...cleared, { type: "link", start, end, href }], length) : normalizeMarks(cleared, length);
  }
  return normalizeMarks([...marks, { type, start, end }], length);
}

/** Removes one kind of mark inside the range, for the "clear link" action. */
export function clearMark(marks: readonly TextMark[], type: MarkType, start: number, end: number, length: number): TextMark[] {
  const next: TextMark[] = [];
  for (const mark of marks) {
    if (mark.type !== type || mark.end <= start || mark.start >= end) { next.push(mark); continue; }
    if (mark.start < start) next.push({ ...mark, end: start });
    if (mark.end > end) next.push({ ...mark, start: end });
  }
  return normalizeMarks(next, length);
}

/**
 * Keeps marks attached to the same characters after a text edit. The change is found as the region between
 * the common prefix and suffix; marks left of it stay, marks right of it shift, marks spanning it stretch.
 */
export function adjustMarks(before: string, after: string, marks: readonly TextMark[]): TextMark[] {
  if (before === after || !marks.length) return [...marks];
  const max = Math.min(before.length, after.length);
  let prefix = 0;
  while (prefix < max && before.charCodeAt(prefix) === after.charCodeAt(prefix)) prefix++;
  let suffix = 0;
  while (suffix < max - prefix && before.charCodeAt(before.length - 1 - suffix) === after.charCodeAt(after.length - 1 - suffix)) suffix++;
  const oldTail = before.length - suffix; // end of the replaced region in `before`
  const delta = after.length - before.length;
  const next: TextMark[] = [];
  for (const mark of marks) {
    if (mark.end <= prefix) { next.push(mark); continue; }
    if (mark.start >= oldTail) { next.push({ ...mark, start: mark.start + delta, end: mark.end + delta }); continue; }
    const hasLeft = mark.start < prefix;
    const hasRight = mark.end > oldTail;
    if (hasLeft && hasRight) next.push({ ...mark, end: mark.end + delta });
    else if (hasLeft) next.push({ ...mark, end: Math.min(mark.end, prefix) });
    else if (hasRight) next.push({ ...mark, start: Math.max(mark.start, oldTail) + delta, end: mark.end + delta });
  }
  return normalizeMarks(next, after.length);
}

/** Splits a block's marks at `offset`: [marks for text before, marks for text after (rebased to 0)]. */
export function splitMarks(marks: readonly TextMark[], offset: number, length: number): [TextMark[], TextMark[]] {
  const left: TextMark[] = [], right: TextMark[] = [];
  for (const mark of marks) {
    if (mark.start < offset) left.push({ ...mark, end: Math.min(mark.end, offset) });
    if (mark.end > offset) right.push({ ...mark, start: Math.max(mark.start, offset) - offset, end: mark.end - offset });
  }
  return [normalizeMarks(left, offset), normalizeMarks(right, length - offset)];
}

export type Run = { text: string; marks: readonly TextMark[] };

/** Text cut into runs that share the same set of marks, in text order. */
export function runs(text: string, marks: readonly TextMark[]): Run[] {
  if (!marks.length || !text) return [{ text, marks: [] }];
  const cuts = new Set<number>([0, text.length]);
  for (const mark of marks) { if (mark.start > 0 && mark.start < text.length) cuts.add(mark.start); if (mark.end > 0 && mark.end < text.length) cuts.add(mark.end); }
  const points = [...cuts].sort((a, b) => a - b);
  const result: Run[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [from, to] = [points[i], points[i + 1]];
    result.push({ text: text.slice(from, to), marks: marks.filter((mark) => mark.start <= from && mark.end >= to) });
  }
  return result;
}

/** Plain words of a text, for the word counter (same split the server uses). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
