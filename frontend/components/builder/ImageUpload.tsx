"use client";
import { useId, useState } from "react";
import { describe } from "../../lib/api/http";
import { useContentWorkspace } from "../../lib/editorial/use-content-workspace";

/** Size of the chosen file, so the page can reserve its space; unknown when the browser cannot decode it. */
async function imageSize(file: File): Promise<{ width: number; height: number } | undefined> {
  try { const bitmap = await createImageBitmap(file); const size = { width: bitmap.width, height: bitmap.height }; bitmap.close(); return size; }
  catch { return undefined; }
}

/** Owner image upload (JPEG/PNG/GIF, max 10 MiB). The server re-encodes the image and strips metadata. */
export function ImageUpload({ label, onUploaded }: { label: string; onUploaded: (url: string, size?: { width: number; height: number }) => void }) {
  const { studio } = useContentWorkspace();
  const [state, setState] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });
  const id = useId();
  if (!studio) return null;
  return <div className="studio-upload">
    <label className="studio-secondary" htmlFor={id} aria-disabled={state.busy}>{state.busy ? "Yükleniyor…" : label}</label>
    <input id={id} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/gif" disabled={state.busy} onChange={async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { setState({ busy: false, message: "Görsel en fazla 10 MiB olabilir." }); return; }
      setState({ busy: true, message: "" });
      try { const size = await imageSize(file); onUploaded(await studio.uploadImage(file), size); setState({ busy: false, message: "Görsel yüklendi." }); }
      catch (cause) { setState({ busy: false, message: describe(cause) }); }
    }} />
    <span role="status" className="property-note">{state.message}</span>
  </div>;
}
