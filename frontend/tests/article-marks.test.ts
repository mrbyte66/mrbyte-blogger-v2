import { describe, expect, it } from "vitest";
import { adjustMarks, clearMark, countWords, covers, isSafeHref, normalizeMarks, runs, splitMarks, toggleMark, validMarks, type TextMark } from "../lib/articles/marks";

const bold = (start: number, end: number): TextMark => ({ type: "bold", start, end });
const italic = (start: number, end: number): TextMark => ({ type: "italic", start, end });
const link = (start: number, end: number, href = "https://example.org"): TextMark => ({ type: "link", start, end, href });

describe("mark validation (same rules as the server)", () => {
  const text = "Merhaba dünya";
  it("accepts ranges inside the text, different kinds may overlap", () => {
    expect(validMarks(text, [bold(0, 7), italic(3, 12), link(8, 13, "/yazilar/baska"), link(0, 3, "mailto:ben@example.org")])).toBe(true);
  });
  it("rejects bad ranges, unknown kinds, same-kind overlap and unsafe links", () => {
    expect(validMarks(text, [bold(0, 99)])).toBe(false);
    expect(validMarks(text, [bold(5, 5)])).toBe(false);
    expect(validMarks(text, [{ type: "underline", start: 0, end: 3 } as unknown as TextMark])).toBe(false);
    expect(validMarks(text, [bold(0, 5), bold(3, 8)])).toBe(false);
    expect(validMarks(text, [link(0, 5, "javascript:alert(1)")])).toBe(false);
    expect(validMarks(text, [link(0, 5, "//example.org")])).toBe(false);
    expect(validMarks(text, [{ type: "link", start: 0, end: 5 }])).toBe(false);
    expect(validMarks(text, [{ type: "bold", start: 0, end: 5, href: "https://example.org" }])).toBe(false);
    expect(isSafeHref("http://example.org")).toBe(false);
  });
  it("never cuts an emoji in half", () => {
    expect(validMarks("a😀b", [bold(2, 3)])).toBe(false);
    expect(validMarks("a😀b", [bold(1, 3)])).toBe(true);
  });
});

describe("toggling and clearing", () => {
  it("adds a mark and merges touching ranges of the same kind", () => {
    const first = toggleMark([], "bold", 0, 4, 20);
    expect(toggleMark(first, "bold", 4, 9, 20)).toEqual([bold(0, 9)]);
  });
  it("removes a fully covered range and splits a partly cleared mark", () => {
    expect(toggleMark([bold(0, 10)], "bold", 0, 10, 20)).toEqual([]);
    expect(toggleMark([bold(0, 10)], "bold", 3, 6, 20)).toEqual([bold(0, 3), bold(6, 10)]);
    expect(covers([bold(0, 10)], "bold", 2, 5)).toBe(true);
    expect(covers([bold(0, 4)], "bold", 2, 5)).toBe(false);
  });
  it("formats the uncovered part when a selection is only partly bold", () => {
    expect(toggleMark([bold(0, 4)], "bold", 2, 8, 20)).toEqual([bold(0, 8)]);
  });
  it("replaces a link instead of stacking links and can clear it", () => {
    const first = toggleMark([], "link", 0, 6, 20, "https://a.example");
    const second = toggleMark(first, "link", 3, 9, 20, "https://b.example");
    expect(second).toEqual([link(0, 3, "https://a.example"), link(3, 9, "https://b.example")]);
    expect(clearMark(second, "link", 0, 20, 20)).toEqual([]);
  });
  it("clips marks to the text and drops empty ranges", () => {
    expect(normalizeMarks([bold(-3, 4), italic(6, 6), bold(8, 40)], 12)).toEqual([bold(0, 4), bold(8, 12)]);
  });
});

describe("keeping marks attached through text edits", () => {
  it("shifts marks after an insertion before them and keeps those before", () => {
    expect(adjustMarks("abc bold end", "XYabc bold end", [bold(4, 8)])).toEqual([bold(6, 10)]);
    expect(adjustMarks("abc bold end", "abc bold end!", [bold(4, 8)])).toEqual([bold(4, 8)]);
  });
  it("grows a mark when text is typed inside it, not when typed at its edge", () => {
    expect(adjustMarks("abc bold end", "abc boXld end", [bold(4, 8)])).toEqual([bold(4, 9)]);
    expect(adjustMarks("abc bold end", "abc boldX end", [bold(4, 8)])).toEqual([bold(4, 8)]);
  });
  it("shrinks or drops marks when their text is deleted", () => {
    expect(adjustMarks("abc bold end", "abc bd end", [bold(4, 8)])).toEqual([bold(4, 6)]);
    expect(adjustMarks("abc bold end", "abc  end", [bold(4, 8)])).toEqual([]);
  });
  it("leaves marks alone when nothing changed", () => {
    expect(adjustMarks("same", "same", [bold(0, 2)])).toEqual([bold(0, 2)]);
  });
});

describe("splitting and cutting into runs", () => {
  it("splits marks at a paragraph break and rebases the right half", () => {
    expect(splitMarks([bold(2, 9), italic(0, 3)], 5, 12)).toEqual([[italic(0, 3), bold(2, 5)], [bold(0, 4)]]);
  });
  it("cuts text into runs with their active marks", () => {
    const result = runs("abcdefgh", [bold(0, 4), italic(2, 6)]);
    expect(result.map((run) => run.text)).toEqual(["ab", "cd", "ef", "gh"]);
    expect(result.map((run) => run.marks.map((mark) => mark.type))).toEqual([["bold"], ["bold", "italic"], ["italic"], []]);
  });
  it("counts words like the server", () => {
    expect(countWords("  bir iki   üç ")).toBe(3);
    expect(countWords("   ")).toBe(0);
  });
});
