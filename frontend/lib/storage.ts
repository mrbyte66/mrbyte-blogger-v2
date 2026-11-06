import { api, ApiError } from "./api/http";
import type { Schema } from "./api/contract";
export type StorageFile = Schema<"StorageFile">;
export const MAX_FILE_BYTES = 50_000_000_000;
export const CHUNK_BYTES = 8 * 1024 * 1024;
export function bytes(value: number): string {
  if (value < 1000) return `${value} B`;
  const unit = Math.min(3, Math.floor(Math.log10(value) / 3));
  return `${(value / 1000 ** unit).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} ${["B", "KB", "MB", "GB"][unit]}`;
}
export function remaining(expiresAt: string, now = Date.now()): string {
  const minutes = Math.ceil((Date.parse(expiresAt) - now) / 60000);
  if (minutes <= 0) return "Süresi doldu";
  if (minutes < 60) return `${minutes} dakika kaldı`;
  if (minutes < 1440) return `${Math.ceil(minutes / 60)} saat kaldı`;
  return `${Math.ceil(minutes / 1440)} gün kaldı`;
}
/** Bounded memory even for 50 GB. This is a resume identity, not a full-file integrity digest. */
export async function fingerprint(file: File): Promise<string> {
  const sample = 1024 * 1024;
  const data = new Blob([String(file.size), await file.slice(0, sample).arrayBuffer(), await file.slice(Math.max(0, file.size - sample)).arrayBuffer()]);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await data.arrayBuffer())), b => b.toString(16).padStart(2, "0")).join("");
}
export async function upload(file: File, initial: StorageFile, signal: AbortSignal, progress: (file: StorageFile) => void): Promise<StorageFile> {
  let current = initial;
  let retries = 0;
  while (current.uploadedBytes < file.size) {
    signal.throwIfAborted();
    const form = new FormData();
    form.append("file", file.slice(current.uploadedBytes, current.uploadedBytes + CHUNK_BYTES), "chunk");
    try {
      current = (await api<StorageFile>("POST", `/studio/files/${current.id}/chunks?offset=${current.uploadedBytes}`, { form, signal })).data;
      retries = 0; progress(current);
    } catch (error) {
      signal.throwIfAborted();
      if (!(error instanceof ApiError) || !(error.status === 0 || error.status === 409 || error.status >= 500) || retries++ >= 2) throw error;
      // The server may have committed a chunk whose response was lost. Re-read its offset before retrying.
      current = (await api<StorageFile>("GET", `/studio/files/${current.id}`, { signal })).data;
      progress(current);
    }
  }
  signal.throwIfAborted();
  return (await api<StorageFile>("POST", `/studio/files/${current.id}/complete`, { signal })).data;
}
