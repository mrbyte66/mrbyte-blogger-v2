import type { TextAnchor } from "./model";

export type AnchorMode = "follow" | "exact";
export type SourceBlock = { id: string; text: string; legacy?: string };
export type SourceState = "exact" | "moved" | "changed" | "review" | "removed";
export type SourceResolution = { state: SourceState; parts: TextAnchor[]; original: string; current: string };
export const sourceLabels: Record<SourceState, string> = {
  exact: "Kaynak yerinde", moved: "Kaynak taşındı", changed: "Kaynak değişti",
  review: "Eşleşmeyi kontrol et", removed: "Kaynak kaldırıldı",
};
type Edit = { start: number; end: number; nextStart: number; nextEnd: number };
const context = 48;
const word = (s: string) => /[\p{L}\p{N}_]/u.test(s);
function occurrences(text: string, quote: string) {
  const found: number[] = [];
  if (!quote) return found;
  for (let at = text.indexOf(quote); at >= 0; at = text.indexOf(quote, at + 1)) found.push(at);
  return found;
}
function anchor(block: SourceBlock, start: number, end: number): TextAnchor {
  return { anchorId: block.id, start, end, quote: block.text.slice(start, end), before: block.text.slice(Math.max(0, start - context), start), after: block.text.slice(end, end + context), sourceText: block.text };
}
/** Bounded UTF-16 diff. Large rewrites are reviewable rather than blocking the reading thread. */
function changes(old: string, next: string): Edit[] | null {
  let prefix = 0;
  while (prefix < Math.min(old.length, next.length) && old[prefix] === next[prefix]) prefix++;
  let suffix = 0;
  while (suffix < old.length - prefix && suffix < next.length - prefix && old[old.length - 1 - suffix] === next[next.length - 1 - suffix]) suffix++;
  const a = old.slice(prefix, old.length - suffix), b = next.slice(prefix, next.length - suffix);
  if (!a && !b) return [];
  if (!a || !b) return [{ start: prefix, end: prefix + a.length, nextStart: prefix, nextEnd: prefix + b.length }];
  if ((a.length + 1) * (b.length + 1) > 1_000_000) return null;
  const width = b.length + 1, table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
    table[i * width + j] = a[i] === b[j] ? 1 + table[(i + 1) * width + j + 1] : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
  const edits: Edit[] = []; let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (a[i] === b[j] && i < a.length && j < b.length) { i++; j++; continue; }
    const start = i, nextStart = j;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) break;
      if (i < a.length && (j === b.length || table[(i + 1) * width + j] >= table[i * width + j + 1])) i++;
      else j++;
    }
    edits.push({ start: prefix + start, end: prefix + i, nextStart: prefix + nextStart, nextEnd: prefix + j });
  }
  return edits;
}
function project(old: string, next: string, start: number, end: number) {
  const edits = changes(old, next);
  if (!edits) return null;
  let mappedStart = start, mappedEnd = end, lost = 0, touched = false, crossed = false;
  for (const e of edits) {
    const inserted = e.nextEnd - e.nextStart, delta = inserted - (e.end - e.start);
    const suffix = e.start === end && e.end === end && word(old[end - 1] ?? "") && word(next.slice(e.nextStart, e.nextEnd)) && !/\s/u.test(next.slice(e.nextStart, e.nextEnd));
    if (e.end <= start) { mappedStart += delta; mappedEnd += delta; }
    else if (e.start < end || suffix) {
      touched = true;
      lost += Math.max(0, Math.min(end, e.end) - Math.max(start, e.start));
      if (e.start < start || e.end > end) crossed = true;
      mappedEnd += delta;
    }
  }
  const empty = mappedEnd <= mappedStart;
  const state: SourceState = empty ? "removed" : crossed || (touched && lost > (end - start) / 2) ? "review" : touched ? "changed" : "moved";
  return { start: mappedStart, end: mappedEnd, state };
}

/** The original record is immutable. Resolutions are views of that source in the current document. */
const cache = new WeakMap<TextAnchor, Map<AnchorMode, { blocks: SourceBlock[]; value: SourceResolution }>>();
export function resolveSource(saved: TextAnchor, blocks: SourceBlock[], mode: AnchorMode = "follow"): SourceResolution {
  const entries = cache.get(saved), previous = entries?.get(mode);
  if (previous && previous.blocks.length === blocks.length && previous.blocks.every((b,i)=>b.id===blocks[i].id&&b.text===blocks[i].text&&b.legacy===blocks[i].legacy)) return previous.value;
  const value = resolveUncached(saved, blocks, mode);
  const next = entries ?? new Map(); next.set(mode, { blocks:blocks.map(b=>({...b})), value }); cache.set(saved,next);
  return value;
}
function resolveUncached(saved: TextAnchor, blocks: SourceBlock[], mode: AnchorMode): SourceResolution {
  const result = (state: SourceState, parts: TextAnchor[] = []): SourceResolution => ({ state, parts, original: saved.quote, current: parts.map(p => p.quote).join(" ") });
  if (!blocks.length) return result("removed");
  const own = blocks.find(b => b.id === saved.anchorId || b.legacy === saved.anchorId);
  const old = saved.sourceText;
  // Unchanged snapshots disambiguate repeated phrases without trusting stale offsets after an edit.
  if (own && old === own.text && own.text.slice(saved.start, saved.end) === saved.quote)
    return result("exact", [anchor(own, saved.start, saved.end)]);
  const exact = blocks.flatMap(block => occurrences(block.text, saved.quote).map(start => ({ block, start, end: start + saved.quote.length })));
  const contextual = exact.filter(p => p.block.text.slice(Math.max(0, p.start - saved.before.length), p.start) === saved.before && p.block.text.slice(p.end, p.end + saved.after.length) === saved.after);
  const local = contextual.filter(p => p.block === own);
  if (local.length > 1 || (!local.length && contextual.length > 1)) return result("review");
  const validSnapshot = !!old && old.slice(saved.start, saved.end) === saved.quote;
  const ownProjection = own && validSnapshot ? project(old!, own.text, saved.start, saved.end) : null;
  if (own && validSnapshot) {
    const full = occurrences(own.text, old!);
    if (full.length > 1) return result("review");
    if (full.length === 1) return result("moved", [anchor(own,full[0]+saved.start,full[0]+saved.end)]);
    const oldContexts=occurrences(old!,saved.quote).filter(start=>old!.slice(Math.max(0,start-saved.before.length),start)===saved.before&&old!.slice(start+saved.quote.length,start+saved.quote.length+saved.after.length)===saved.after);
    if (oldContexts.length > 1) return result("review");
    const oldCount=occurrences(old!,saved.quote).length;
    if (oldCount>1&&occurrences(own.text,saved.quote).length<oldCount&&!local.length&&ownProjection?.state!=="removed") return result("review");
    if (ownProjection && (ownProjection.state==="moved"||ownProjection.state==="changed") && ownProjection.start>=0 && ownProjection.end<=own.text.length) {
      const part=anchor(own,ownProjection.start,ownProjection.end);
      if (mode==="exact"&&part.quote!==saved.quote) return result("review");
      return result(part.quote===saved.quote?"moved":"changed",[part]);
    }
  }
  const matched = local[0] ?? contextual[0];
  if (matched && ownProjection?.state!=="removed") return result(matched.block === own && matched.start === saved.start ? "exact" : "moved", [anchor(matched.block, matched.start, matched.end)]);
  // Legacy guests can recover a small edit only between two unchanged, unique context flanks.
  if (!old) {
    if (!exact.length && mode === "follow" && saved.before && saved.after) {
      const recovered: TextAnchor[][] = [];
      for (const block of blocks) for (const left of occurrences(block.text, saved.before)) {
        const from = left + saved.before.length;
        for (const right of occurrences(block.text, saved.after).filter(p=>p>=from&&p-from<=saved.quote.length+48)) {
          const segment = block.text.slice(left, right + saved.after.length);
          const snapshot = saved.before + saved.quote + saved.after;
          const sub = resolveSource({ ...saved, anchorId:block.id, start:saved.before.length, end:saved.before.length+saved.quote.length, sourceText:snapshot }, [{id:block.id,text:segment}], mode);
          if (sub.parts.length) recovered.push(sub.parts.map(p=>anchor(block,left+p.start,left+p.end)));
        }
      }
      if (recovered.length === 1) return result("changed", recovered[0]);
      if (recovered.length > 1) return result("review");
    }
    return result(exact.length ? "review" : "removed");
  }
  if (old.slice(saved.start, saved.end) !== saved.quote) return result("review");
  if (exact.length > 1) return result("review");
  // Try the original block first, then adjacent blocks for a split/merge. There must be one target.
  const candidates: { parts: TextAnchor[]; state: SourceState }[] = [];
  const windows: SourceBlock[][] = own ? [[own]] : [];
  for (let i = 0; i < blocks.length; i++) {
    if (!own || blocks[i] === own || blocks[i + 1] === own) {
      for (let count = own ? 2 : 1; count <= 3 && i + count <= blocks.length; count++) windows.push(blocks.slice(i, i + count));
    }
  }
  let removed = false;
  for (const window of windows) {
    const text = window.map(b => b.text).join(" ");
    if (!window.includes(own!) && text !== old && !(saved.before && saved.after && text.includes(saved.before) && text.includes(saved.after))) continue;
    if (ownProjection?.state==="removed"&&window.length>1&&!text.includes(old)) continue;
    // A complete rewrite of an unrelated block is not evidence of the original location.
    const mapped = project(old, text, saved.start, saved.end);
    if (!mapped) continue;
    if (mapped.state === "removed") { if (window.length === 1 && window[0] === own) removed = true; continue; }
    if (mapped.state === "review" || mapped.start < 0 || mapped.end > text.length) continue;
    const parts: TextAnchor[] = []; let offset = 0;
    for (const block of window) {
      const start = Math.max(0, mapped.start - offset), end = Math.min(block.text.length, mapped.end - offset);
      if (end > start) parts.push(anchor(block, start, end));
      offset += block.text.length + 1;
    }
    if (!parts.length) continue;
    if (mode === "exact" && parts.map(p => p.quote).join(" ") !== saved.quote) continue;
    if (!candidates.some(c => JSON.stringify(c.parts) === JSON.stringify(parts))) candidates.push({ parts, state: mapped.state });
    if (window.length === 1 && window[0] === own) break;
  }
  if (candidates.length === 1) return result(candidates[0].state, candidates[0].parts);
  return result(removed && !candidates.length ? "removed" : "review");
}
