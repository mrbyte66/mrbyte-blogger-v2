"use client";
import { createContext, useContext } from "react";
import type { StudioTarget } from "../builder/document-protocol";
import type { Article } from "../content";
import type { BlogSeries } from "../series/model";

/**
 * What the Studio chrome needs to know about the workspace around it: where the author is, what exists
 * and how to move. Chrome parts that live outside SiteEditor (the statistics page) get the empty value.
 */
export type StudioShell = {
  /** False outside the editor, where navigation falls back to plain links. */
  active: boolean;
  target: StudioTarget;
  articles: readonly Article[];
  series: readonly BlogSeries[];
  ready: boolean;
  error: string | null;
  /** `field` asks the opened page to select that field (a settings panel) right away. */
  onNavigate: (target: StudioTarget, options?: { field?: string }) => void;
  onCreateArticle: () => void;
  onCreateSeries: () => void;
  onReload: () => void;
};

const detached: StudioShell = { active: false, target: { kind: "home" }, articles: [], series: [], ready: false, error: null, onNavigate: () => {}, onCreateArticle: () => {}, onCreateSeries: () => {}, onReload: () => {} };
const Context = createContext<StudioShell>(detached);
export const StudioShellProvider = Context.Provider;
export function useStudioShell(): StudioShell { return useContext(Context); }

/** The page library lives in PageNavigator; chrome elsewhere asks it to open. */
export const openLibraryEvent = "satir:studio-open-library";
export function openStudioLibrary(options: { kind?: "article" | "series" } = {}) { window.dispatchEvent(new CustomEvent(openLibraryEvent, { detail: options })); }
