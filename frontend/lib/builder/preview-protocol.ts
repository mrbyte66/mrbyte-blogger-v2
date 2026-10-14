export const previewEvents = {
  workspace: "mrbyte:preview",
  ready: "mrbyte:canvas-ready",
  selection: "mrbyte:canvas-selection",
  select: "mrbyte:select-block",
  /** Where the writing caret is: block row (as numbered in the canvas) and column. `null` row = no caret. */
  caret: "mrbyte:caret",
  /** A press on empty canvas space: the Studio closes floating panels. */
  pointer: "mrbyte:canvas-pointer",
  /** The Studio replaced the text from outside the canvas (undo, server copy): writing in the canvas ends. */
  reset: "mrbyte:canvas-reset",
} as const;

export type CaretPosition = { row: number; column: number } | null;
export function parseCaret(data: unknown): CaretPosition | undefined {
  if (typeof data !== "object" || data === null) return undefined;
  const message = data as Record<string, unknown>;
  if (message.type !== previewEvents.caret) return undefined;
  if (message.row === null) return null;
  const { row, column } = message;
  if (typeof row !== "number" || typeof column !== "number" || !Number.isSafeInteger(row) || !Number.isSafeInteger(column) || row < 1 || column < 1 || row > 5000 || column > 100000) return undefined;
  return { row, column };
}

export type CanvasSelection = { id: string | null; request: number; editing: boolean };
export function isBlockId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(value);
}
export function parseCanvasSelection(data: unknown): CanvasSelection | null {
  if (typeof data !== "object" || data === null) return null;
  const message = data as Record<string, unknown>;
  if (message.type !== previewEvents.selection || !(message.id === null || isBlockId(message.id)) || typeof message.request !== "number" || !Number.isSafeInteger(message.request) || message.request < 0 || typeof message.editing !== "boolean") return null;
  return { id: message.id, request: message.request, editing: message.editing };
}

export type SceneField = "featured-article" | "featured-series";
export function isSceneField(value: unknown): value is SceneField { return value === "featured-article" || value === "featured-series"; }
