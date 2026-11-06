"use client";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthProvider";
import { api, describe } from "../../lib/api/http";
import type { Schema } from "../../lib/api/contract";
import { bytes, remaining } from "../../lib/storage";
import { StorageShell } from "./StorageShell";
export function SharedFilePage({ id }: { id: string }) {
  const { session, ready } = useAuth();
  return <StorageShell>{ready ? <SharedFile key={`${id}:${session?.profile.id ?? "guest"}`} id={id} /> : <p role="status">Dosya kontrol ediliyor…</p>}</StorageShell>;
}
function SharedFile({ id }: { id: string }) {
  const [file, setFile] = useState<Schema<"StorageShared"> | null>(null);
  const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api<Schema<"StorageShared">>("GET", `/storage/${id}`, { signal: controller.signal })
      .then(r => { if (!controller.signal.aborted) setFile(r.data); }).catch(e => { if (!controller.signal.aborted) setError(describe(e)); });
    return () => controller.abort();
  }, [id]);
  async function unlock(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await api("POST", `/storage/${id}/unlock`, { body: { password } }); setPassword(""); setFile((await api<Schema<"StorageShared">>("GET", `/storage/${id}`)).data); }
    catch (e) { setError(describe(e)); } finally { setBusy(false); }
  }
  return <section className="storage-card storage-shared"><p className="storage-eyebrow">MRBYTE / DOSYA PAYLAŞIMI</p><h1>{file?.name ?? "Paylaşılan dosya"}</h1>
    {error && <p role="alert" className="storage-error">{error}</p>}{!file && !error && <p role="status">Dosya kontrol ediliyor…</p>}
    {file && <><p>{remaining(file.expiresAt)}</p>{file.passwordRequired ? <form onSubmit={unlock}><p>Bu dosya şifreyle korunuyor.</p><label>İndirme şifresi<input type="password" value={password} maxLength={128} required autoComplete="off" disabled={busy} onChange={e => { setPassword(e.target.value); setError(""); }} /></label><button className="storage-primary" disabled={busy}>{busy ? "Kontrol ediliyor…" : "Dosyayı aç"}</button></form> : <><p className="storage-download-size">{bytes(file.sizeBytes ?? 0)}</p><a className="storage-primary" href={`/api/v1/storage/${id}/download`}>Dosyayı indir ↓</a></>}<p className="storage-hint">Bağlantı {new Date(file.expiresAt).toLocaleString("tr-TR")} tarihinde sona erer. Dosya sahibi daha önce silebilir.</p></>}
  </section>;
}
