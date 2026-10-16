"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { AuthIcon } from "./AuthIcon";
import { LibraryIcon } from "../library/LibraryIcon";
import { ProfileAvatar } from "./ProfileAvatar";
import { useAuth } from "./AuthProvider";
export function AccountMenu({ appearance }: { appearance?: "island" } = {}) {
  const island = appearance === "island";
  const { session, ready, openAuth, signOut, error } = useAuth();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null); const trigger = useRef<HTMLButtonElement>(null); const id = useId();
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside); return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => { if (!session) setOpen(false); }, [session]);
  if (!session) return <div className="account-menu"><button type="button" className="account-avatar" aria-label="Giriş yap" title="Giriş yap veya üye ol" disabled={!ready} onClick={() => openAuth()}><ProfileAvatar name="Misafir" avatar="robot" /></button></div>;
  return <div className="account-menu" ref={ref} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <button type="button" ref={trigger} className="account-avatar" aria-label={`${session.profile.name} · Hesap menüsü`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><ProfileAvatar name={session.profile.name} avatar={session.profile.avatar} /></button>
    {open && <nav className={`account-dropdown${island ? " account-dropdown--island" : ""}`} id={id} aria-label="Hesap">{island ? <div className="island-account-heading"><ProfileAvatar name={session.profile.name} avatar={session.profile.avatar} /><div><strong>{session.profile.name}</strong><span>{session.profile.verified ? (session.profile.role === "owner" ? "Site sahibi" : "Okur hesabı") : "E-posta doğrulanmadı"}</span></div></div> : <><strong>{session.profile.name}</strong><span>{session.profile.verified ? (session.profile.role === "owner" ? "Site sahibi" : "Okur hesabı") : "E-posta doğrulanmadı"}</span></>}<Link href="/kaydedilenler" onClick={() => setOpen(false)}>{island && <LibraryIcon kind="bookmark" />}Kitaplığım</Link>{session.profile.role === "owner" && <Link href="/studio" onClick={() => setOpen(false)}>{island && <LibraryIcon kind="grid" />}Studio</Link>}<Link href="/hesap" onClick={() => setOpen(false)}>{island && <AuthIcon kind="user" />}Hesap</Link><button type="button" disabled={leaving} onClick={async () => { setLeaving(true); await signOut(); setLeaving(false); }}>{island && <AuthIcon kind="arrow" />}{leaving ? "Çıkış yapılıyor…" : "Çıkış yap"}</button>{error && <p role="alert" className="auth-field-error">{error}</p>}</nav>}
  </div>;
}
