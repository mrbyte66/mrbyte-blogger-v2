"use client";
import type { Input, Schema, Output } from "../../lib/api/contract";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useContent } from "../data/SiteData";
import { useEngagement } from "../engagement/EngagementProvider";
import { allPages, api, describe } from "../../lib/api/http";

/**
 * The signed-in member's private library, stored on the server (API contract §5). Nothing is kept
 * in browser storage; another account's records are never loaded. Signing out clears the state.
 */
export type SavedCollection = Schema<"Collection">;
export type SavedEntry = { articleId: string; slug?: string; collectionId: string; savedAt: string; version: number; available: boolean };
export type SavedLibrary = { collections: SavedCollection[]; entries: SavedEntry[] };
export type LibraryView = { selected: string; query: string; sort: string; view: "grid" | "list"; limit: number; scroll: number; quickPinned: boolean; previewId: string | null; previewWidth: number };
const initialView = (): LibraryView => ({ selected: "all", query: "", sort: "saved", view: "grid", limit: 24, scroll: 0, quickPinned: false, previewId: null, previewWidth: 400 });
type BookmarkDto = Schema<"BookmarkItem">;
type MemberLibrary = {
  library: SavedLibrary; defaultId: string; ready: boolean; member: boolean; error: string;
  entryFor: (slug: string) => SavedEntry | undefined;
  save: (slug: string, collectionId?: string) => Promise<boolean>;
  remove: (slugOrArticleId: string) => Promise<boolean>;
  create: (name: string, slug?: string) => Promise<boolean>;
  rename: (id: string, name: string) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  move: (articleId: string, collectionId: string) => Promise<boolean>;
  restore: (entry: SavedEntry) => Promise<boolean>;
  recallView: () => LibraryView;
  rememberView: (view: LibraryView) => void;
};
const empty: SavedLibrary = { collections: [], entries: [] };
const no = async () => false;
const fallback: MemberLibrary = { library: empty, defaultId: "", ready: false, member: false, error: "", entryFor: () => undefined, save: no, remove: no, create: no, rename: no, deleteCategory: no, move: no, restore: no, recallView: initialView, rememberView: () => {} };
const Context = createContext<MemberLibrary>(fallback);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { session, ready: authReady } = useAuth();
  const { articles } = useContent();
  const { refreshStats } = useEngagement();
  const member = !!session?.profile.verified;
  const userId = member ? session!.profile.id : null;
  // Route-return context lives only in this authenticated provider, never in browser storage.
  const viewMemory = useRef<{ owner: string | null; value: LibraryView }>({ owner: userId, value: initialView() });
  if (viewMemory.current.owner !== userId) viewMemory.current = { owner: userId, value: initialView() };
  const [library, setLibrary] = useState<SavedLibrary>(empty);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const loadedIdentity = useRef<string | null>(null);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const identity = useRef(userId);
  identity.current = userId;
  const requests = useRef<{ userId: string | null; controller: AbortController } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    requests.current = { userId, controller };
    return () => controller.abort();
  }, [userId]);

  const load = useCallback(async (clearFailure = false) => {
    if (identity.current !== userId) return;
    const current = ++generation.current;
    if (!userId) { setLibrary(empty); setLoadedFor(null); loadedIdentity.current = null; return; }
    try {
      const [collections, bookmarks] = await Promise.all([
        api<Output<"listCollections">>("GET", "/me/collections"), allPages<BookmarkDto>("/me/bookmarks?sort=saved_asc"),
      ]);
      if (current !== generation.current || identity.current !== userId) return;
      setLibrary({ collections: collections.data.items, entries: bookmarks.map(({ article, ...entry }) => ({ ...entry, ...(article ? { slug: article.slug } : {}) })) });
      loadedIdentity.current = userId;
      setLoadedFor(userId);
      if (clearFailure) setError("");
    } catch (cause) {
      if (current === generation.current && identity.current === userId) {
        if (loadedIdentity.current !== userId) setLibrary(empty);
        setLoadedFor(userId); setError(describe(cause));
      }
    }
  }, [userId]);
  useEffect(() => { setError(""); void load(); }, [load]);
  // Another tab or device may have changed the library: re-read on focus.
  useEffect(() => {
    if (!userId) return;
    const visible = () => { if (document.visibilityState === "visible") void load(true); };
    window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [userId, load]);

  const ready = authReady && (!member || loadedFor === userId);
  const visible = member && loadedFor === userId ? library : empty;
  const defaultId = visible.collections.find((c) => c.isDefault)?.id ?? "";
  const idOf = (slug: string) => articles.find((article) => article.slug === slug)?.id ?? visible.entries.find((entry) => entry.slug === slug)?.articleId;

  async function run(task: (signal: AbortSignal) => Promise<unknown>, articleId?: string): Promise<boolean> {
    const scope = requests.current;
    if (!member || !ready || identity.current !== userId || scope?.userId !== userId) return false;
    try { await task(scope.controller.signal); if (scope.controller.signal.aborted || identity.current !== userId) return false; setError(""); return true; }
    catch (cause) { if (!scope.controller.signal.aborted && identity.current === userId) setError(describe(cause)); return false; }
    finally { if (!scope.controller.signal.aborted && identity.current === userId) { await load(); if (articleId) refreshStats(articleId); } }
  }
  const value: MemberLibrary = {
    library: visible, defaultId, ready, member, error,
    recallView: () => viewMemory.current.value,
    rememberView: value => { if (identity.current === userId) viewMemory.current = { owner: userId, value }; },
    entryFor: (slug) => visible.entries.find((entry) => entry.slug === slug),
    save: (slug, collectionId) => {
      const id = idOf(slug);
      if (!id) return Promise.resolve(false);
      return run(signal => api("PUT", `/me/bookmarks/${id}`, { signal, body: (collectionId ? { collectionId } : {} satisfies Input<"saveBookmark">) }), id);
    },
    remove: (key) => {
      const id = idOf(key) ?? key;
      return run(signal => api("DELETE", `/me/bookmarks/${id}`, { signal }), id);
    },
    create: (name, slug) => run(async signal => {
      const { data } = await api<SavedCollection>("POST", "/me/collections", { signal, body: ({ name: name.trim() } satisfies Input<"createCollection">), idempotent: true });
      const id = slug ? idOf(slug) : undefined;
      if (id) { await api("PUT", `/me/bookmarks/${id}`, { signal, body: ({ collectionId: data.id } satisfies Input<"saveBookmark">) }); refreshStats(id); }
    }),
    rename: (id, name) => run(signal => api("PATCH", `/me/collections/${id}`, { signal, body: ({ name: name.trim() } satisfies Input<"renameCollection">), ifMatch: visible.collections.find((c) => c.id === id)?.version ?? 0 })),
    deleteCategory: (id) => run(signal => api("DELETE", `/me/collections/${id}`, { signal, ifMatch: visible.collections.find((c) => c.id === id)?.version ?? 0 })),
    move: (articleId, collectionId) => {
      if (!visible.entries.some(entry => entry.articleId === articleId) || !visible.collections.some(collection => collection.id === collectionId)) return Promise.resolve(false);
      return run(signal => api("PUT", `/me/bookmarks/${articleId}`, { signal, body: ({ collectionId } satisfies Input<"saveBookmark">) }), articleId);
    },
    restore: entry => run(signal => api("PUT", `/me/bookmarks/${entry.articleId}`, { signal, body: ({ collectionId: visible.collections.some(c => c.id === entry.collectionId) ? entry.collectionId : defaultId } satisfies Input<"saveBookmark">) }), entry.articleId),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSavedLibrary() { return useContext(Context); }
