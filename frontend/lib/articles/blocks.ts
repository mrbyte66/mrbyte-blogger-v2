import { safeMarks, type TextMark } from "./marks";
import { markedHtml } from "./marked-html";

/**
 * Lists and callouts in the editor model. A list is one entry of `paragraphs` whose lines are its items
 * ("\n" between them), so the canvas writes it like any rich paragraph; the API stores separate items.
 */
export type ListStyle = "bullet" | "ordered";
export type CalloutTone = "note" | "tip" | "warning" | "summary";
export const calloutTones: readonly CalloutTone[] = ["summary", "note", "tip", "warning"];
export const calloutLabels: Record<CalloutTone, string> = { summary: "Kısaca", note: "Not", tip: "İpucu", warning: "Dikkat" };
export const maxListItems = 100;

export type ArticleSource = { title: string; publisher?: string; year?: string; url?: string };
export const maxSources = 50;

/** Each line with its marks, offsets relative to the line. Marks never cross a line break. */
export function listLines(text: string, marks: readonly TextMark[] = []): { text: string; marks: TextMark[] }[] {
  let start = 0;
  return text.split("\n").map((line) => {
    const end = start + line.length;
    const own = marks.filter((mark) => mark.end > start && mark.start < end)
      .map((mark) => ({ ...mark, start: Math.max(mark.start, start) - start, end: Math.min(mark.end, end) - start }));
    start = end + 1;
    return { text: line, marks: safeMarks(line, own) };
  });
}

/** Items back into one editor text: lines joined by "\n", marks shifted to their place. */
export function joinListLines(items: readonly { text: string; marks?: readonly TextMark[] }[]): { text: string; marks: TextMark[] } {
  let offset = 0; const marks: TextMark[] = [];
  for (const item of items) {
    for (const mark of item.marks ?? []) marks.push({ ...mark, start: mark.start + offset, end: mark.end + offset });
    offset += item.text.length + 1;
  }
  const text = items.map((item) => item.text).join("\n");
  return { text, marks: safeMarks(text, marks) };
}

/** The canvas view of a list being written: one <li> per line. An empty line keeps a caret target. */
export function listHtml(text: string, marks: readonly TextMark[] = []): string {
  return listLines(text, marks).map((line) => `<li>${line.text ? markedHtml(line.text, line.marks) : '<br data-empty="">'}</li>`).join("");
}
