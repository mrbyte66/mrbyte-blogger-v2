import { isSafeHref, runs, type TextMark } from "./marks";

const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => entities[char]);
}

/**
 * Safe HTML for one block's text and marks. Used only where React must not own a block's children
 * (the Studio canvas edits paragraphs in place); everything is escaped and links are re-validated.
 */
export function markedHtml(text: string, marks: readonly TextMark[] = []): string {
  return runs(text, marks).map((run) => {
    let html = escapeHtml(run.text).replace(/\n/g, "<br>");
    const has = (type: TextMark["type"]) => run.marks.find((mark) => mark.type === type);
    if (has("code")) html = `<code>${html}</code>`;
    if (has("strike")) html = `<s>${html}</s>`;
    if (has("highlight")) html = `<mark>${html}</mark>`;
    if (has("italic")) html = `<em>${html}</em>`;
    if (has("bold")) html = `<strong>${html}</strong>`;
    const link = has("link");
    if (link && isSafeHref(link.href)) {
      const external = /^https:\/\//.test(link.href);
      html = `<a href="${escapeHtml(link.href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${html}</a>`;
    }
    return html;
  }).join("");
}
