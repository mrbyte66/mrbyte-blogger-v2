"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Article } from "../../lib/content";
import { articleWords, liveWords, useWritingProgress } from "../../lib/studio/writing";

const radius = 19;
const circumference = 2 * Math.PI * radius;

/** Ring and counter for the daily word goal; `current` is the open draft, `saved` its last saved state. */
export function WordGoal({ current, saved, line = false }: { current?: Article | null; saved?: Article | null; line?: boolean }) {
  const { today, goal, error, setGoal } = useWritingProgress();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const field = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => { if (editing) field.current?.focus(); }, [editing]);
  if (today === null || goal === null) return error ? <p role="status" className="word-goal-error">{error}</p> : null;

  const words = liveWords(today, saved ? articleWords(saved) : 0, current ? articleWords(current) : saved ? articleWords(saved) : 0);
  const done = goal > 0 && words >= goal;
  const ratio = goal > 0 ? Math.min(1, words / goal) : 0;
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setProblem("");
    const failure = await setGoal(Number(draft));
    setBusy(false);
    if (failure) setProblem(failure); else setEditing(false);
  }
  return <div className={`word-goal${done ? " is-done" : ""}`}>
    {line && goal > 0 && <div className="word-goal-line" role="progressbar" aria-label="Günlük kelime hedefi ilerlemesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)}><span style={{ width: `${ratio * 100}%` }} /></div>}
    <button type="button" className="word-goal-button" aria-expanded={editing} aria-controls={id} onClick={() => { setDraft(String(goal)); setProblem(""); setEditing(!editing); }}>
      <svg width="48" height="48" viewBox="0 0 48 48" role="img" aria-label={goal > 0 ? `Günlük hedefin yüzde ${Math.round(ratio * 100)}'i tamamlandı` : "Günlük kelime hedefi kapalı"}>
        <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeOpacity=".18" strokeWidth="5" />
        {goal > 0 && <circle cx="24" cy="24" r={radius} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(circumference * ratio).toFixed(1)} ${circumference.toFixed(1)}`} transform="rotate(-90 24 24)" />}
      </svg>
      <span className="word-goal-text"><strong>{goal > 0 ? `${words.toLocaleString("tr-TR")} / ${goal.toLocaleString("tr-TR")}` : `${words.toLocaleString("tr-TR")} kelime`}</strong><small>{goal > 0 ? (done ? "bugünkü hedef tamam" : "günlük kelime hedefi") : "bugün yazılan · hedef kapalı"}</small></span>
    </button>
    {editing && <form id={id} className="word-goal-form" onSubmit={save} noValidate>
      <label>Günlük hedef (kelime)<input ref={field} type="number" inputMode="numeric" min={0} max={20000} step={50} value={draft} aria-invalid={!!problem} aria-describedby={`${id}-help`} onChange={(event) => setDraft(event.target.value)} /></label>
      <p id={`${id}-help`}>0 yazarsan hedef kapanır. Sayaç, bugün yazıya eklediğin net yeni kelimeleri sayar.</p>
      {problem && <p role="alert" className="word-goal-error">{problem}</p>}
      <div><button type="button" className="studio-secondary" onClick={() => setEditing(false)}>Vazgeç</button><button type="submit" className="studio-primary" disabled={busy}>{busy ? "Kaydediliyor…" : "Kaydet"}</button></div>
    </form>}
  </div>;
}
