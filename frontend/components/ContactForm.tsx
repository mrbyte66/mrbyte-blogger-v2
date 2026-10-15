"use client";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth/AuthProvider";
import { validEmail } from "../lib/auth/model";
import { api, ApiError, describe } from "../lib/api/http";
import type { Input } from "../lib/api/contract";
export function ContactForm() {
  const { session } = useAuth();
  const [form, setForm] = useState({ name:session?.profile.name ?? "", email:session?.profile.email ?? "", subject:"", message:"" });
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState(""); const [errors, setErrors] = useState<Record<string,string>>({});
  const controller = useRef<AbortController | null>(null); const pending = useRef(false);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (session) setForm(f=>({...f,name:f.name || session.profile.name,email:f.email || session.profile.email})); }, [session?.profile.id]);
  async function send(event: React.FormEvent) {
    event.preventDefault(); if (pending.current) return;
    const invalid: Record<string,string> = {};
    if (!form.name.trim()) invalid.name = "Adını yaz.";
    if (!validEmail(form.email.trim())) invalid.email = "Geçerli bir e-posta adresi yaz.";
    if (!form.subject.trim()) invalid.subject = "Bir konu yaz.";
    if (!form.message.trim()) invalid.message = "Mesajını yaz.";
    setErrors(invalid); if (Object.keys(invalid).length) return;
    pending.current = true; setBusy(true); setError("");
    const scope = new AbortController(); controller.current = scope;
    try { await api("POST", "/contact", { signal:scope.signal, body:({ name:form.name.trim(),email:form.email.trim(),subject:form.subject.trim(),message:form.message.trim() } satisfies Input<"sendContactMessage">) }); if (!scope.signal.aborted) setSent(true); }
    catch (cause) { if (!scope.signal.aborted) { setError(describe(cause)); if (cause instanceof ApiError) setErrors(Object.fromEntries(cause.errors.map(e => [e.field,"Bu alanı kontrol et."]))); } }
    finally { if (!scope.signal.aborted) { pending.current = false; setBusy(false); } }
  }
  if (sent) return <div className="contact-success" role="status"><span aria-hidden="true">✓</span><h3>Mesajın gönderildi.</h3><p>Yanıt için yazdığın e-posta adresini kullanacağız.</p><button type="button" onClick={() => { setSent(false); setForm(f=>({...f,subject:"",message:""})); }}>Yeni mesaj</button></div>;
  const field = (key:keyof typeof form,label:string,max:number) => <label className="auth-field">{label}{key === "message" ? <textarea name={key} aria-label={label} autoFocus={!!session} rows={5} maxLength={max} value={form[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `contact-${key}-error` : undefined} onChange={e => { setForm(f=>({...f,[key]:e.target.value}));setErrors(v=>({...v,[key]:""})); }} /> : <input name={key} aria-label={label} autoFocus={key === "name" && !session} type={key === "email" ? "email" : "text"} autoComplete={key === "name" ? "name" : key === "email" ? "email" : "off"} maxLength={max} value={form[key]} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `contact-${key}-error` : undefined} onChange={e => { setForm(f=>({...f,[key]:e.target.value}));setErrors(v=>({...v,[key]:""})); }} />}{errors[key] && <span className="auth-field-error" id={`contact-${key}-error`}>{errors[key]}</span>}</label>;
  return <form className="contact-form" noValidate onSubmit={e => void send(e)} aria-busy={busy}><div className="contact-identity">{field("name","Adın",80)}{field("email","E-posta",254)}</div>{field("subject","Konu",120)}{field("message","Mesajın",5000)}{error && <p role="alert" className="auth-field-error">{error}</p>}<button type="submit" className="contact-submit" disabled={busy}>{busy ? "Gönderiliyor…" : "Mesajı gönder ↗"}</button></form>;
}
