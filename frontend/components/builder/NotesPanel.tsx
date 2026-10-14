"use client";
import { useId, useState } from "react";
import type { Article } from "../../lib/content";
import { maxNoteLength, useArticleNotes, type ArticleNote } from "../../lib/studio/notes";
import { EditorIcon } from "./EditorIcon";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The owner's private notes on a writing. They never reach visitors, readers or a revision; a note
 * can hang on the selected paragraph or on the whole writing.
 */
export function NotesPanel({ article, field }: { article: Article; field: string }) {
  const { notes, loading, error, reload, add, update, remove } = useArticleNotes(article.id);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const inputId = useId();
  const paragraph = /^paragraph-(\d+)$/.exec(field);
  const index = paragraph ? Number(paragraph[1]) : null;
  const anchor = index !== null ? article.blockIds?.paragraphs[index] ?? null : null;
  const blocks = article.blockIds?.paragraphs ?? [];

  if (!article.id) return <section className="studio-notes" aria-label="Özel notlar"><p className="notes-empty">Notlar, yazı ilk kez kaydedildikten sonra eklenebilir. Yalnız sen görürsün.</p></section>;

  const where = (note: ArticleNote) => {
    if (!note.blockId) return "Tüm yazı";
    const position = blocks.indexOf(note.blockId);
    return position < 0 ? "Bağlı paragraf kaldırıldı" : `Paragraf ${position + 1}`;
  };
  const open = notes.filter((note) => !note.resolved);
  const done = notes.filter((note) => note.resolved);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true); setProblem("");
    const failure = await add(body, anchor);
    setBusy(false);
    if (failure) setProblem(failure); else setText("");
  }
  async function change(task: Promise<string | null>) { const failure = await task; setProblem(failure ?? ""); }
  const item = (note: ArticleNote) => <li key={note.id} className={`note-item${note.resolved ? " is-resolved" : ""}`}>
    <p className="note-body">{note.body}</p>
    <div className="note-meta">
      <span>{where(note)} · <time dateTime={note.createdAt}>{dateFormat.format(new Date(note.createdAt))}</time></span>
      <span className="note-actions">
        <button type="button" onClick={() => void change(update(note.id, { resolved: !note.resolved }))} aria-label={note.resolved ? "Notu yeniden aç" : "Notu çözüldü yap"} title={note.resolved ? "Yeniden aç" : "Çözüldü"}><EditorIcon name={note.resolved ? "undo" : "check"} size={15} /></button>
        <button type="button" onClick={() => void change(remove(note.id))} aria-label="Notu sil" title="Sil"><EditorIcon name="close" size={15} /></button>
      </span>
    </div>
  </li>;
  return <section className="studio-notes" aria-label="Özel notlar">
    <div className="notes-heading"><h3>Özel notlar</h3><span>Yalnız sen görürsün</span></div>
    <form className="note-composer" onSubmit={submit}>
      <label htmlFor={inputId}>{index !== null && anchor ? `Paragraf ${index + 1} için not` : "Tüm yazı için not"}</label>
      <textarea id={inputId} rows={3} maxLength={maxNoteLength} value={text} placeholder="Kendine bir not bırak…" onChange={(event) => setText(event.target.value)} aria-describedby={`${inputId}-count`} />
      <div className="note-composer-foot"><span id={`${inputId}-count`}>{text.length} / {maxNoteLength}</span><button type="submit" className="studio-secondary" disabled={busy || !text.trim()}>{busy ? "Ekleniyor…" : "Notu ekle"}</button></div>
    </form>
    <p role="status" className="notes-status">{loading ? "Notlar yükleniyor…" : ""}</p>
    {error && <div role="status" className="notes-error"><p>{error}</p><button type="button" className="studio-secondary" onClick={() => void reload()}>Yeniden dene</button></div>}
    {problem && <div role="alert" className="notes-error"><p>{problem}</p></div>}
    {!loading && !error && !notes.length && <p className="notes-empty">Henüz not yok. Düzeltilecek bir cümle ya da sonra yazılacak bir fikir için buraya yaz.</p>}
    {open.length > 0 && <ul className="note-list">{open.map(item)}</ul>}
    {done.length > 0 && <details className="note-done"><summary>Çözülenler · {done.length}</summary><ul className="note-list">{done.map(item)}</ul></details>}
  </section>;
}
