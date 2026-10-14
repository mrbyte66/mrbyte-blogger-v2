"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, describe } from "../api/http";
import type { Input, Output } from "../api/contract";

export type ArticleNote = Output<"studioListArticleNotes">["items"][number];
export const maxNoteLength = 1000;

/**
 * The owner's private notes on one saved writing. Mutations resolve to an error message (or null),
 * so the panel can show what went wrong without throwing.
 */
export function useArticleNotes(articleId: string | undefined) {
  const [notes, setNotes] = useState<ArticleNote[]>([]);
  const [state, setState] = useState<{ loading: boolean; error: string | null }>({ loading: !!articleId, error: null });
  const target = useRef(articleId);
  target.current = articleId;
  const path = `/studio/articles/${articleId}/notes`;

  const load = useCallback(async () => {
    if (!articleId) { setNotes([]); setState({ loading: false, error: null }); return; }
    setState({ loading: true, error: null });
    try {
      const { data } = await api<Output<"studioListArticleNotes">>("GET", `/studio/articles/${articleId}/notes`);
      if (target.current === articleId) { setNotes(data.items); setState({ loading: false, error: null }); }
    } catch (cause) {
      if (target.current === articleId) setState({ loading: false, error: `Notlar yüklenemedi. ${describe(cause)}` });
    }
  }, [articleId]);
  useEffect(() => { setNotes([]); void load(); }, [load]);

  const add = useCallback(async (body: string, blockId: string | null): Promise<string | null> => {
    try {
      const { data } = await api<ArticleNote>("POST", path, { body: { body, blockId } satisfies Input<"studioCreateArticleNote"> });
      if (target.current === articleId) setNotes((list) => [...list, data]);
      return null;
    } catch (cause) { return `Not eklenemedi. ${describe(cause)}`; }
  }, [articleId, path]);

  const update = useCallback(async (id: string, patch: { body?: string; resolved?: boolean }): Promise<string | null> => {
    try {
      const { data } = await api<ArticleNote>("PATCH", `${path}/${id}`, { body: patch satisfies Input<"studioUpdateArticleNote"> });
      if (target.current === articleId) setNotes((list) => list.map((note) => note.id === id ? data : note));
      return null;
    } catch (cause) { return `Not güncellenemedi. ${describe(cause)}`; }
  }, [articleId, path]);

  const remove = useCallback(async (id: string): Promise<string | null> => {
    try {
      await api("DELETE", `${path}/${id}`);
      if (target.current === articleId) setNotes((list) => list.filter((note) => note.id !== id));
      return null;
    } catch (cause) { return `Not silinemedi. ${describe(cause)}`; }
  }, [articleId, path]);

  return { notes, loading: state.loading, error: state.error, reload: load, add, update, remove };
}
