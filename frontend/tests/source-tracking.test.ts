import { describe, expect, it } from "vitest";
import { resolveSource, type SourceBlock } from "../lib/reading/source-tracking";
import type { TextAnchor } from "../lib/reading/model";
import { sourceCases } from "../lib/reading/source-cases";
function source(text: string, quote: string): TextAnchor { const start = text.indexOf(quote); return { anchorId: "p", start, end: start + quote.length, quote, before: text.slice(Math.max(0, start - 48), start), after: text.slice(start + quote.length, start + quote.length + 48), sourceText: text }; }
const block = (text: string): SourceBlock[] => [{ id: "p", text }];
describe("version-aware private note sources", () => {
 it.each(sourceCases)("matches the public scenario page: $title", example => {
  const s=source(example.original,example.quote);s.anchorId="source";
  expect(resolveSource(s,example.blocks).state).toBe(example.expected);
 });
 it("keeps a repeated phrase at its saved location in an unchanged snapshot", () => {
  const s = source("A Hello B A Hello B", "Hello"); expect(resolveSource(s, block(s.sourceText!)).parts[0].start).toBe(2);
 });
 it("moves a note after insertions outside the selection and preserves its original", () => {
  const s = source("Bugün saatte buluşalım.", "saatte");
  const r = resolveSource(s, block("Yeni giriş. Bugün saatte buluşalım."));
  expect(r.state).toBe("moved"); expect(r.current).toBe("saatte"); expect(s.start).toBe(6);
 });
 it("follows a suffix edit and exposes both old and current quotations", () => {
  const s = source("Bugün saatte buluşalım.", "saatte");
  expect(resolveSource(s, block("Bugün saatlerde buluşalım."))).toMatchObject({ state: "changed", original: "saatte", current: "saatlerde" });
  expect(resolveSource(s, block("Bugün saatlerde buluşalım."), "exact").parts).toEqual([]);
 });
 it("marks even a small change in meaning as changed", () => {
  const s = source("Bu yöntem güvenli kabul edilir.", "güvenli");
  expect(resolveSource(s, block("Bu yöntem güvensiz kabul edilir."))).toMatchObject({ state: "changed", current: "güvensiz" });
 });
 it("keeps removed and heavily rewritten sources without painting an unrelated range", () => {
  const s = source("Bugün saatte buluşalım.", "saatte");
  expect(resolveSource(s, block("Bugün buluşalım.")).parts).toEqual([]);
  expect(resolveSource(s, block("Tamamen farklı bir cümle yazıldı.")).parts).toEqual([]);
 });
 it("refuses duplicate contexts after edits", () => {
  const s = source("A Hello B", "Hello");
  expect(resolveSource(s, block("A Hello B A Hello B")).state).toBe("review");
 });
 it("never attaches a deleted occurrence to a different surviving occurrence", () => {
  const saved=source("A Hello B X Hello Y", "Hello");
  const result=resolveSource(saved,block("A B X Hello Y"));
  expect(result.parts).toEqual([]);
  expect(result.state).toBe("removed");
  const ambiguous=source("A Hello B A Hello B", "Hello");
  expect(resolveSource(ambiguous,block("A Hello B")).parts).toEqual([]);
 });
 it("keeps stable IDs through reordering, and handles split and merged blocks", () => {
  const s = source("Başlangıç önemli bir cümle son.", "önemli bir cümle");
  const split = [{ id: "p", text: "Başlangıç önemli" }, { id: "new", text: "bir cümle son." }];
  expect(resolveSource(s, split).parts.map(p => p.quote)).toEqual(["önemli", "bir cümle"]);
  const moved = [{ id: "x", text: "Başka paragraf." }, ...block(s.sourceText!)];
  expect(resolveSource(s, moved).current).toBe(s.quote);
  const merged = source("önemli bir cümle son.", "önemli bir cümle"); merged.anchorId = "removed";
  expect(resolveSource(merged, [{ id: "p", text: "Başlangıç önemli bir cümle son." }]).current).toBe(merged.quote);
 });
 it("restores the original source after undo, preserving independent overlapping records", () => {
  const s = source("Bugün saatte buluşalım.", "saatte");
  const changed = resolveSource(s, block("Bugün saatlerde buluşalım."));
  expect(changed.state).toBe("changed");
  expect(resolveSource(s, block(s.sourceText!)).state).toBe("exact");
  expect(resolveSource({ ...s }, block("Bugün saatlerde buluşalım."))).toEqual(changed);
 });
 it("bounds expensive rewrites and preserves exact legacy context matching", () => {
  const s = source("a".repeat(3000) + " son", "son");
  expect(resolveSource(s, block("b".repeat(3000))).parts).toEqual([]);
  const legacy = { ...source("A Hello B", "Hello"), sourceText: undefined };
  expect(resolveSource(legacy, block("X Hello Y A Hello B")).parts[0].start).toBe(12);
 });
 it("recovers a small edit for older browser notes only when both context flanks survive", () => {
  const saved={...source("Bugün saatte buluşalım.","saatte"),sourceText:undefined};
  expect(resolveSource(saved,block("Bugün saatlerde buluşalım."))).toMatchObject({state:"changed",current:"saatlerde"});
  expect(resolveSource(saved,block("Yeni saatlerde başka konu." )).parts).toEqual([]);
 });
});
