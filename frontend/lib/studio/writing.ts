"use client";
import { useCallback, useEffect, useState } from "react";
import { api, describe } from "../api/http";
import type { Input, Output } from "../api/contract";
import { countWords } from "../articles/marks";
import type { Article } from "../content";

export const goalChangedEvent = "satir:writing-goal-changed";
const contentChangedEvent = "satir:content-changed";

/** Words of the readable text: paragraphs, headings and quotes (same split the server uses). */
export function articleWords(article: Pick<Article, "paragraphs">): number {
  return article.paragraphs.reduce((total, paragraph) => total + countWords(paragraph), 0);
}

/**
 * Today's net new words from the server plus what the open draft has gained since it was last
 * saved. Never negative; shrinking text takes away only the unsaved gain.
 */
export function liveWords(serverToday: number, savedWords: number, currentWords: number): number {
  return Math.max(0, serverToday + (currentWords - savedWords));
}

/** Daily word goal (owner setting) and the words written today; reloads after every content save. */
export function useWritingProgress() {
  const [today, setToday] = useState<number | null>(null);
  const [goal, setGoalState] = useState<number | null>(null);
  const [version, setVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [progress, site] = await Promise.all([
        api<Output<"studioWritingToday">>("GET", "/studio/writing/today"),
        api<Output<"studioGetSiteSettings">>("GET", "/studio/site"),
      ]);
      setToday(progress.data.words); setGoalState(site.data.dailyWordGoal); setVersion(site.data.version); setError(null);
    } catch (cause) { setError(`Günlük kelime hedefi yüklenemedi. ${describe(cause)}`); }
  }, []);
  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener(contentChangedEvent, refresh);
    window.addEventListener(goalChangedEvent, refresh);
    return () => { window.removeEventListener(contentChangedEvent, refresh); window.removeEventListener(goalChangedEvent, refresh); };
  }, [load]);

  /** Saves the goal; resolves to an error message or null. */
  const setGoal = useCallback(async (next: number): Promise<string | null> => {
    if (version === null) return "Ayarlar henüz yüklenmedi.";
    if (!Number.isInteger(next) || next < 0 || next > 20000) return "Hedef 0 ile 20.000 arasında bir kelime sayısı olmalı; 0 hedefi kapatır.";
    try {
      const { data } = await api<Output<"studioUpdateSiteSettings">>("PATCH", "/studio/site", { ifMatch: version, body: { dailyWordGoal: next } satisfies Input<"studioUpdateSiteSettings"> });
      setGoalState(data.dailyWordGoal); setVersion(data.version);
      window.dispatchEvent(new Event(goalChangedEvent));
      return null;
    } catch (cause) { return `Hedef kaydedilemedi. ${describe(cause)}`; }
  }, [version]);

  return { today, goal, error, reload: load, setGoal };
}
