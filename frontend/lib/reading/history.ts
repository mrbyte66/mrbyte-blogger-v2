
import type { Input, Output } from "../api/contract";
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { api } from "../api/http";
import type { Article } from "../content";

/**
 * Records a verified member's real permalink opening in their private history (API contract §5).
 * A visit means "opened", never "finished"; guests, previews and Studio record nothing.
 */
export function useMemberVisit(article: Article) {
  const { session } = useAuth();
  const userId = session?.profile.verified ? session.profile.id : null;
  const { id, revisionId } = article;
  useEffect(() => {
    if (!userId || !id || !revisionId) return;
    const controller = new AbortController();
    void api("POST", "/me/visits", { signal: controller.signal, body: ({ eventId: crypto.randomUUID(), articleId: id, revisionId, visitedAt: new Date().toISOString() } satisfies Input<"recordVisit">) }).catch(() => {});
    return () => controller.abort();
  }, [userId, id, revisionId]);
}

export type SeriesVisit = NonNullable<Output<"seriesHistory">["items"]>[number];

/** The member's visits to the public chapters of one series (empty for guests). */
export function useSeriesHistory(seriesId: string | undefined): SeriesVisit[] {
  const { session } = useAuth();
  const userId = session?.profile.verified ? session.profile.id : null;
  const [history, setHistory] = useState<{ userId: string | null; seriesId?: string; visits: SeriesVisit[] }>({ userId: null, visits: [] });
  useEffect(() => {
    if (!userId || !seriesId) return;
    let cancelled = false;
    api<Output<"seriesHistory">>("GET", `/me/series/${seriesId}/history`)
      .then(({ data }) => { if (!cancelled) setHistory({ userId, seriesId, visits: data.items ?? [] }); }, () => {});
    return () => { cancelled = true; };
  }, [userId, seriesId]);
  return history.userId === userId && history.seriesId === seriesId ? history.visits : [];
}
