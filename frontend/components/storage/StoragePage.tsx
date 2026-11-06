"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "../auth/AuthProvider";
import { api, describe } from "../../lib/api/http";
import type { Schema } from "../../lib/api/contract";
import { bytes, remaining, fingerprint, upload, MAX_FILE_BYTES, type StorageFile } from "../../lib/storage";
import { StorageShell } from "./StorageShell";

export function StoragePage() {
  const { session, ready, openAuth } = useAuth();
  return <StorageShell>{!ready ? <p role="status">Hesap kontrol ediliyor…</p> : session?.profile.role === "owner" ? <OwnerFiles key={session.profile.id} /> : <section className="storage-card"><p className="storage-eyebrow">ÖZEL DOSYA ALANI</p><h1>Dosya alanı</h1><p>Yükleme ve yönetim site sahibine ait. Dosya indirmek için sana gönderilen bağlantıyı aç.</p>{!session && <button onClick={() => openAuth("login")}>Giriş yap</button>}</section>}</StorageShell>;
}
function OwnerFiles() {
  const [listing, setListing] = useState<Schema<"StorageListing"> | null>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<StorageFile | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [extensions, setExtensions] = useState<Record<string, number>>({});
  const alive = useRef(true); const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    try { const result = await api<Schema<"StorageListing">>("GET", "/studio/files"); if (alive.current) setListing(result.data); }
    catch (e) { if (alive.current) setError(describe(e)); }
  }, []);
  useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false; abort.current?.abort(); }; }, [refresh]);
  useEffect(() => { if (busy) return; const timer = setInterval(() => { void refresh(); }, 30000); return () => clearInterval(timer); }, [busy, refresh]);
  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  async function transfer(file: File, previous?: StorageFile) {
    if (busy) return;
    setError(""); setNotice("");
    if (file.size < 1 || file.size > MAX_FILE_BYTES) { setError("Dosya boş olmamalı ve 50 GB sınırını aşmamalı."); return; }
    setBusy(true); const controller = new AbortController(); abort.current = controller;
    try {
      const identity = await fingerprint(file); controller.signal.throwIfAborted();
      if (previous && (previous.sizeBytes !== file.size || previous.fingerprint !== identity)) throw new Error("RESUME_MISMATCH");
      let entry = previous ? (await api<StorageFile>("GET", `/studio/files/${previous.id}`, { signal: controller.signal })).data
        : (await api<StorageFile>("POST", "/studio/files", { body: { name: file.name, sizeBytes: file.size, fingerprint: identity, password, retentionHours: hours }, signal: controller.signal })).data;
      if (!alive.current) return;
      setPassword(""); setActive(entry); await refresh();
      entry = await upload(file, entry, controller.signal, current => { if (alive.current) setActive(current); });
      if (alive.current) { setNotice("Dosya hazır. Paylaşım bağlantısını kopyalayabilirsin."); setSelected(null); if (input.current) input.current.value = ""; }
    } catch (e) {
      if (alive.current) {
        if (controller.signal.aborted) setNotice("Yükleme duraklatıldı. Aynı dosyayı seçerek devam edebilirsin.");
        else setError(e instanceof Error && e.message === "RESUME_MISMATCH" ? "Seçilen dosya önceki yüklemeyle eşleşmiyor. Aynı dosyayı seç." : describe(e));
      }
    } finally { if (alive.current) { setBusy(false); setActive(null); await refresh(); } }
  }
  async function action(work: () => Promise<unknown>, message: string) {
    setBusy(true); setError(""); setNotice("");
    try { await work(); if (alive.current) { setNotice(message); setConfirmDelete(null); } }
    catch (e) { if (alive.current) setError(describe(e)); }
    finally { if (alive.current) { setBusy(false); await refresh(); } }
  }
  async function copy(id: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/storage/${id}`); setNotice("İndirme bağlantısı kopyalandı."); }
    catch { setError("Bağlantı kopyalanamadı. Dosyayı açıp adres çubuğundan kopyalayabilirsin."); }
  }
  function submit(e: FormEvent) { e.preventDefault(); if (selected) void transfer(selected); }
  return <><header className="storage-heading"><div><p className="storage-eyebrow">MRBYTE / STORAGE</p><h1>Gönder. Paylaş. Süresini belirle.</h1><p>Geçici dosyaların için sana özel bir alan.</p></div><span className="storage-badge">Tek dosya · 50 GB</span></header>
    <div className="storage-layout"><section className="storage-card"><h2>Dosya yükle</h2><form onSubmit={submit}>
      <label className="storage-picker">{selected ? <><strong>{selected.name}</strong><span>{bytes(selected.size)} · Değiştirmek için seç</span></> : <><strong>Bir dosya seç</strong><span>Video, belge, arşiv ve diğer dosyalar</span></>}<input ref={input} aria-label="Yüklenecek dosya" type="file" disabled={busy} required onChange={e => { setSelected(e.target.files?.[0] ?? null); setError(""); }} /></label>
      <label>İndirme şifresi <span>(isteğe bağlı)</span><input type="password" autoComplete="new-password" value={password} minLength={6} maxLength={128} disabled={busy} placeholder="En az 6 karakter" onChange={e => setPassword(e.target.value)} /></label>
      <label>Saklama süresi <span>(saat)</span><input type="number" min={1} max={720} required value={hours} disabled={busy} onChange={e => setHours(Number(e.target.value))} /></label>
      <p className="storage-hint">Süre yükleme tamamlanınca başlar. Süre dolunca indirme kapanır ve dosya otomatik temizlenir. Yarım yüklemeler 48 saat saklanır.</p>
      <button className="storage-primary" disabled={busy || !selected || !listing}>{busy ? "İşlem sürüyor…" : "Yüklemeyi başlat"}</button>
    </form>{listing && <p className="storage-capacity">Yükleme için kullanılabilir: <strong>{bytes(listing.availableBytes)}</strong><br/>Toplam dosya kotası: {bytes(listing.quotaBytes)}</p>}</section>
    <section className="storage-files" aria-label="Dosyalarım"><div className="storage-list-heading"><h2>Dosyalarım <span>{listing?.items.length ?? 0}</span></h2><button disabled={busy} onClick={() => { setError(""); void refresh(); }}>Yenile</button></div>
      {error && <p role="alert" className="storage-error">{error}</p>}{notice && <p role="status" className="storage-notice">{notice}</p>}
      {active && <div className="storage-card" role="status"><strong>{active.name}</strong><progress max={active.sizeBytes} value={active.uploadedBytes} aria-label="Yükleme ilerlemesi"/><p>{bytes(active.uploadedBytes)} / {bytes(active.sizeBytes)} · %{Math.floor(active.uploadedBytes / active.sizeBytes * 100)}</p><button type="button" onClick={() => abort.current?.abort()}>Duraklat</button></div>}
      {!listing && !error && <p role="status">Dosyalar yükleniyor…</p>}{listing?.items.length === 0 && <div className="storage-empty"><span aria-hidden="true">↑ ↓</span><h3>Alan hazır.</h3><p>İlk dosyanı yüklediğinde burada görünecek.</p></div>}
      {listing?.items.map(file => { const expired = Date.parse(file.expiresAt) <= Date.now(); return <article className="storage-card storage-file" key={file.id}><div className="storage-file-title"><h3>{file.name}</h3><span className="storage-badge">{file.state === "READY" ? (file.passwordRequired ? "Şifreli" : "Bağlantıyla erişim") : "Yarım yükleme"}</span></div><p>{bytes(file.sizeBytes)} · {remaining(file.expiresAt)}</p><p className="storage-hint">{file.state === "READY" ? "Silinme zamanı" : "Yükleme son tarihi"}: <time dateTime={file.expiresAt}>{new Date(file.expiresAt).toLocaleString("tr-TR")}</time></p>
      {file.state === "UPLOADING" && <><progress max={file.sizeBytes} value={file.uploadedBytes} aria-label={`${file.name} yükleme ilerlemesi`} /><label className="storage-resume">Aynı dosyayı seçerek devam et<input type="file" aria-label={`${file.name} yüklemesine devam et`} disabled={busy || expired} onChange={e => { const chosen = e.target.files?.[0]; e.target.value = ""; if (chosen) void transfer(chosen, file); }}/></label></>}
      <div className="storage-actions">{file.state === "READY" && !expired && <><button disabled={busy} onClick={() => void copy(file.id)}>Bağlantıyı kopyala</button><Link href={`/storage/${file.id}`}>İndir</Link></>}<button disabled={busy} onClick={() => setConfirmDelete(file.id)}>Sil</button></div>
      {file.state === "READY" && !expired && <form className="storage-extend" onSubmit={e => { e.preventDefault(); void action(() => api("PATCH", `/studio/files/${file.id}/expiry`, { body: { hours: extensions[file.id] ?? 24 } }), "Süre uzatıldı."); }}><label>Eklenecek saat<input aria-label={`${file.name} eklenecek saat`} type="number" min={1} max={720} required value={extensions[file.id] ?? 24} disabled={busy} onChange={e => setExtensions(v => ({ ...v, [file.id]: Number(e.target.value) }))}/></label><button disabled={busy}>Süreyi uzat</button></form>}
      {confirmDelete === file.id && <div className="storage-confirm"><p>Bu dosya kalıcı olarak silinecek ve paylaşım bağlantısı kapanacak.</p><button disabled={busy} onClick={() => void action(() => api("DELETE", `/studio/files/${file.id}`), "Dosya silindi.")}>Kalıcı sil</button><button disabled={busy} onClick={() => setConfirmDelete(null)}>Vazgeç</button></div>}</article>; })}
    </section></div></>;
}
