"use client";
import type { Input, Output } from "../../lib/api/contract";

import { SitePageHeader } from "../SitePageHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { api, ApiError, describe, resetCsrf } from "../../lib/api/http";
import { useAuth } from "./AuthProvider";
import { AuthIcon } from "./AuthIcon";
import { avatars, ProfileAvatar } from "./ProfileAvatar";
import { AccountHistory } from "./AccountHistory";
import { validEmail, type AvatarStyle } from "../../lib/auth/model";

const sections = [{ id: "profile", label: "Profil" }, { id: "notifications", label: "Bildirimler" }, { id: "history", label: "Okuma Geçmişi" }, { id: "security", label: "Güvenlik" }, { id: "connected", label: "Bağlı Hesaplar" }, { id: "sessions", label: "Oturumlar" }] as const;
type Section = typeof sections[number]["id"];
type SessionInfo = Output<"listSessions">["items"][number];
const formatTime = (value: string | number) => new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });

export function AccountPage() {
  const auth = useAuth(); const { workspace } = useWorkspace(); const appearance = themeAppearance(workspace.applied);
  const [avatar, setAvatar] = useState<AvatarStyle>("initials");
  const [active, setActive] = useState<Section>("profile"); const [name, setName] = useState(""); const [confirmation, setConfirmation] = useState("");
  const [newEmail, setNewEmail] = useState(""); const [newPassword, setNewPassword] = useState(""); const [newPasswordRepeat, setNewPasswordRepeat] = useState("");
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false); const dialog = useRef<HTMLDialogElement>(null);
  const [reauth, setReauth] = useState<{ action: () => Promise<void> } | null>(null); const [reauthPassword, setReauthPassword] = useState(""); const reauthDialog = useRef<HTMLDialogElement>(null);
  const [validationTouched, setValidationTouched] = useState<Record<string, boolean>>({});
  const profile = auth.session?.profile;
  const nameError = validationTouched.name && !name.trim() ? "Adını yaz." : "";
  const emailError = validationTouched.email && !validEmail(newEmail.trim()) ? "E-postanı ad@ornek.com biçiminde yaz." : "";
  const passwordError = validationTouched.password && newPassword.length < 12 ? "En az 12 karakter kullan." : "";
  const deleteConfirmationError = confirmation.length > 0 && confirmation.trim().toLowerCase() !== profile?.email.toLowerCase() ? "Hesabındaki e-posta adresini aynen yaz." : "";
  const repeatError = validationTouched.repeat && (!newPasswordRepeat || newPasswordRepeat !== newPassword) ? "Şifreler aynı olmalı." : "";
  useEffect(() => { setName(profile?.name ?? ""); setAvatar(profile?.avatar ?? "initials"); }, [profile?.name, profile?.avatar, profile?.id]);
  useEffect(() => { if (deleting && !dialog.current?.open) dialog.current?.showModal(); else if (!deleting && dialog.current?.open) dialog.current.close(); }, [deleting]);
  useEffect(() => { if (reauth && !reauthDialog.current?.open) reauthDialog.current?.showModal(); else if (!reauth && reauthDialog.current?.open) reauthDialog.current.close(); }, [reauth]);
  useEffect(() => { if (!auth.session) { setDeleting(false); setReauth(null); } }, [auth.session]);
  useEffect(() => { setActive("profile"); setConfirmation(""); setNotice(""); setValidationTouched({}); }, [profile?.id]);

  const loadSessions = useCallback(async () => {
    try { setSessions((await api<Output<"listSessions">>("GET", "/me/sessions")).data.items); } catch (cause) { auth.setError(describe(cause)); }
  }, [auth]);
  useEffect(() => { if (active === "sessions" && profile?.verified) void loadSessions(); }, [active, profile?.verified, loadSessions]);

  /** Runs a sensitive action; if the server asks for recent re-authentication, asks for it and retries. */
  async function sensitive(action: () => Promise<void>) {
    setBusy(true); auth.setError(""); setNotice("");
    try { await action(); }
    catch (cause) {
      if (cause instanceof ApiError && cause.code === "REAUTH_REQUIRED") { setReauthPassword(""); setReauth({ action }); }
      else auth.setError(describe(cause));
    } finally { setBusy(false); }
  }
  async function confirmReauth() {
    const pending = reauth; if (!pending) return;
    setBusy(true); auth.setError("");
    try {
      await api("POST", "/auth/reauthenticate", { body: ({ password: reauthPassword } satisfies Input<"reauthenticate">) });
      setReauthPassword(""); setReauth(null);
      await pending.action();
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "PASSWORD_NOT_SET") { setReauth(null); await auth.startGoogle("reauth"); }
      else auth.setError(describe(cause));
    } finally { setBusy(false); }
  }
  /** After password/e-mail changes or deletion the server ends every session, including this one. */
  async function afterSignOutBySever(message: string) { resetCsrf(); await auth.refresh(); auth.notify(message); }

  return <main className={`${appearance.className} account-page`} style={appearance.style}>
    <SitePageHeader theme={workspace.applied} />
    <div className="account-layout"><div className="account-heading"><p className="eyebrow">KENDİ ALANIN</p><h1>Hesap</h1><p>Profilin, tercihlerin ve oturumun bir arada.</p></div>
      {!auth.ready ? <p role="status">Oturum yükleniyor…</p> : !profile ? <section className="account-empty"><AuthIcon kind="user" /><h2>Hesabına giriş yap.</h2><p>Kitaplığını ve kişisel ayarlarını burada yönetebilirsin.</p><button className="auth-primary" onClick={() => auth.openAuth()}>Giriş yap</button>{auth.error && <p role="alert" className="auth-field-error">{auth.error}</p>}</section>
      : !profile.verified ? <section className="account-empty"><AuthIcon kind="user" /><h2>E-posta adresini doğrula.</h2><p>{profile.email} adresine gönderdiğimiz bağlantıyı açtığında hesabın etkinleşir. Doğrulanmamış hesapla yalnız doğrulama ve çıkış yapılabilir.</p><button className="auth-primary" disabled={busy} onClick={() => sensitive(async () => { await api("POST", "/auth/verification/resend", { body: ({ email: profile.email } satisfies Input<"resendVerification">) }); setNotice("Yeni doğrulama bağlantısı gönderildi."); })}>Doğrulama bağlantısını yeniden gönder</button><button className="account-outline" type="button" onClick={() => void auth.signOut()}>Çıkış yap</button>{notice && <p role="status">{notice}</p>}{auth.error && <p role="alert" className="auth-field-error">{auth.error}</p>}</section>
      : <div className="account-columns">
        <nav className="account-sidebar" aria-label="Hesap bölümleri">{sections.map(section => <button type="button" key={section.id} aria-current={active === section.id ? "page" : undefined} onClick={() => { setActive(section.id); setNotice(""); auth.setError(""); }}>{section.label}</button>)}</nav>
        <div className="account-content">
          <section aria-label={sections.find(s => s.id === active)?.label} className="account-section">
            {active === "profile" && <><h2>Profil</h2><p>Sana nasıl hitap edelim?</p><form onSubmit={e => { e.preventDefault(); void sensitive(async () => { if (await auth.updateProfile({ name, avatar })) auth.notify("Profil güncellendi"); }); }}><fieldset className="avatar-picker"><legend>Profil avatarın</legend><div className="avatar-preview"><ProfileAvatar name={name || profile.name} avatar={avatar} /><span>Seni kitaplığında ve hesap menüsünde temsil eder.</span></div><div className="avatar-options">{avatars.map(option => <label key={option.id} title={option.label}><input type="radio" name="avatar" value={option.id} checked={avatar === option.id} onChange={() => setAvatar(option.id)} aria-label={option.label} /><ProfileAvatar name={name || profile.name} avatar={option.id} /></label>)}</div></fieldset><label className="auth-field">Adın<input aria-label="Adın" autoComplete="name" maxLength={80} value={name} aria-invalid={!!nameError} aria-describedby={nameError ? "account-name-error" : undefined} onChange={e => { setName(e.target.value); setValidationTouched(v => ({ ...v, name: true })); }} />{nameError && <span id="account-name-error" className="auth-field-error">{nameError}</span>}</label><button className="auth-primary" type="submit" disabled={busy || !name.trim() || (name.trim() === profile.name && avatar === (profile.avatar ?? "initials"))}>Değişiklikleri kaydet</button></form>
              <form className="account-email-change" onSubmit={e => { e.preventDefault(); void sensitive(async () => { await api("POST", "/me/email-change", { body: ({ email: newEmail.trim() } satisfies Input<"requestEmailChange">) }); setNewEmail(""); setValidationTouched(v => ({ ...v, email: false })); setNotice("Yeni adresine bir onay bağlantısı gönderdik. Onaylayana kadar mevcut adresin geçerli."); }); }}><label className="auth-field">E-posta<input type="email" value={profile.email} readOnly /></label><label className="auth-field">Yeni e-posta adresi<input aria-label="Yeni e-posta adresi" type="email" autoComplete="email" aria-invalid={!!emailError} aria-describedby={emailError ? "account-email-error account-email-hint" : "account-email-hint"} maxLength={254} value={newEmail} onChange={e => { setNewEmail(e.target.value); setValidationTouched(v => ({ ...v, email: true })); }} />{emailError && <span id="account-email-error" className="auth-field-error">{emailError}</span>}</label><span id="account-email-hint" className="auth-field-hint">Değişiklik için şifreni yeniden doğrulaman istenir; onay yeni adrese gider.</span><button className="account-outline" type="submit" disabled={busy || !validEmail(newEmail.trim())}>E-postayı değiştir</button></form></>}
            {active === "notifications" && <><h2>Yayın bildirimleri</h2><p>Sitede yeni bir yazı yayımlandığında e-posta alabilirsin.</p><label className="account-notification-toggle"><span><strong>Yeni yayınlardan haberdar ol</strong><small>Yalnız ilk yayında; güncelleme ve yeniden yayında tekrar gönderilmez.</small></span><input type="checkbox" role="switch" checked={profile.publicationSubscription} disabled={busy} onChange={e => { const on = e.target.checked; void sensitive(async () => { if (await auth.updateProfile({ publicationSubscription: on })) auth.notify(on ? "Yeni yayın aboneliğin açıldı" : "Yeni yayın aboneliğin kapatıldı"); }); }} /></label>{profile.role === "owner" && <label className="account-notification-toggle"><span><strong>Kendi yazım yayımlandığında haber ver</strong><small>Planladığın veya yeniden yayımladığın yazıların için bildirim.</small></span><input type="checkbox" role="switch" checked={profile.publicationEmail} disabled={busy} onChange={e => { const on = e.target.checked; void sensitive(async () => { if (await auth.updateProfile({ publicationEmail: on })) auth.notify(on ? "Kendi yayın bildirimin açıldı" : "Kendi yayın bildirimin kapatıldı"); }); }} /></label>}<p className="auth-field-hint">Aboneliğin kapalıyken yayımlanan yazılar için sonradan e-posta gönderilmez.</p></>}
            {active === "security" && <><h2>Güvenlik</h2><p>Şifreni değiştirdiğinde bütün cihazlardaki oturumların kapanır.</p><form onSubmit={e => { e.preventDefault(); void sensitive(async () => { await api("PUT", "/me/password", { body: ({ password: newPassword, passwordConfirmation: newPasswordRepeat } satisfies Input<"changePassword">) }); setNewPassword(""); setNewPasswordRepeat(""); await afterSignOutBySever("Şifren değişti. Yeni şifrenle giriş yap."); auth.openAuth("login"); }); }}><label className="auth-field">Yeni şifre<input aria-label="Yeni şifre" type="password" autoComplete="new-password" aria-invalid={!!passwordError} aria-describedby={passwordError ? "account-password-error" : "account-password-hint"} maxLength={128} value={newPassword} onChange={e => { setNewPassword(e.target.value); setValidationTouched(v => ({ ...v, password: true })); }} />{passwordError && <span id="account-password-error" className="auth-field-error">{passwordError}</span>}</label><span id="account-password-hint" className="auth-field-hint">En az 12 karakter.</span><label className="auth-field">Yeni şifre tekrarı<input aria-label="Yeni şifre tekrarı" type="password" autoComplete="new-password" maxLength={128} value={newPasswordRepeat} aria-invalid={!!repeatError} aria-describedby={repeatError ? "account-password-repeat-error" : undefined} onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()} onChange={e => { setNewPasswordRepeat(e.target.value); setValidationTouched(v => ({ ...v, repeat: true })); }} />{repeatError && <span id="account-password-repeat-error" className="auth-field-error">{repeatError}</span>}</label><button className="auth-primary" type="submit" disabled={busy || newPassword.length < 12 || newPassword !== newPasswordRepeat}>Şifreyi değiştir</button></form></>}
            {active === "connected" && <><h2>Bağlı Hesaplar</h2><p>Google hesabınla da giriş yapabilirsin. Bağlantı için şifreni yeniden doğrulaman istenir.</p><div className="account-inline"><span>Google <small>{profile.googleConnected ? "Bağlı" : "Bağlı değil"}</small></span>{profile.googleConnected
              ? <button type="button" disabled={busy} onClick={() => sensitive(async () => { await api("DELETE", "/me/connections/google"); await auth.refresh(); auth.notify("Google bağlantısı kaldırıldı"); })}>Bağlantıyı kaldır</button>
              : <button type="button" disabled={busy} onClick={() => sensitive(async () => { const { data } = await api<Output<"startGoogleLink">>("POST", "/me/connections/google/start", { body: ({ returnTo: "/hesap" } satisfies Input<"startGoogleLink">) }); window.location.assign(data.authorizationUrl); })}>Google hesabını bağla</button>}</div></>}
            {active === "sessions" && <><h2>Oturumlar</h2><p>Hesabına açık oturumlar. Tanımadığın bir oturumu kapatabilirsin.</p>{!sessions ? <p role="status">Oturumlar yükleniyor…</p> : sessions.map(item => <div className="account-session" key={item.id}><strong>{item.deviceLabel} {item.current && <span>Bu oturum</span>}</strong><p>Açılış: {formatTime(item.createdAt)} · Son etkinlik: {formatTime(item.lastSeenAt)}</p><p>Bitiş: {formatTime(item.expiresAt)}</p><button className="account-outline" type="button" disabled={busy} onClick={() => sensitive(async () => { await api("DELETE", `/me/sessions/${item.id}`); if (item.current) await afterSignOutBySever("Bu oturum kapatıldı"); else await loadSessions(); })}>{item.current ? "Bu oturumu kapat" : "Oturumu kapat"}</button></div>)}{sessions && sessions.length > 1 && <button className="account-outline" type="button" disabled={busy} onClick={() => sensitive(async () => { await api("POST", "/me/sessions/revoke-others"); await loadSessions(); auth.notify("Diğer oturumlar kapatıldı"); })}>Diğer bütün oturumları kapat</button>}</>}
            {active === "history" && <AccountHistory />}
          </section>
          {notice && <p role="status" className="account-notice">{notice}</p>}
          {auth.error && <p role="alert" className="auth-field-error">{auth.error}</p>}
          {profile.role !== "owner" && active === "security" && <details className="account-delete"><summary>Diğer hesap işlemleri</summary><section><h2>Hesabı sil</h2><p>Hesabın, giriş yöntemlerin, tercihlerin, oturumların, kitaplığın, notların, okuma geçmişin ve alkışların kaldırılır. Bu tarayıcıda hesapsız tuttuğun notlar ayrıca tarayıcıdan silinebilir.</p><button className="account-danger" type="button" onClick={() => { setConfirmation(""); setDeleting(true); }}>Hesabı sil</button></section></details>}
        </div>
      </div>}
    </div>
    <dialog ref={dialog} className={`${appearance.className} account-confirm`} style={appearance.style} aria-labelledby="delete-account-title" onCancel={() => setDeleting(false)} onClose={() => setDeleting(false)}><h2 id="delete-account-title">Hesabını silmek istiyor musun?</h2><p>Bu işlem geri alınamaz. Onaylamak için e-posta adresini yaz.</p><label className="auth-field">E-posta adresin<input aria-label="E-posta adresin" aria-invalid={!!deleteConfirmationError} aria-describedby={deleteConfirmationError ? "account-delete-email-error" : undefined} autoComplete="off" value={confirmation} onChange={e => setConfirmation(e.target.value)} />{deleteConfirmationError && <span id="account-delete-email-error" className="auth-field-error">{deleteConfirmationError}</span>}</label><div><button type="button" className="account-outline" autoFocus onClick={() => setDeleting(false)}>Vazgeç</button><button type="button" className="account-danger" disabled={busy || !profile || confirmation.trim().toLowerCase() !== profile.email.toLowerCase()} onClick={() => { setDeleting(false); void sensitive(async () => { await api("DELETE", "/me", { body: ({ confirmation: "DELETE" } satisfies Input<"deleteAccount">) }); await afterSignOutBySever("Hesabın silindi"); }); }}>Hesabı sil</button></div></dialog>
    <dialog ref={reauthDialog} className={`${appearance.className} account-confirm`} style={appearance.style} aria-labelledby="reauth-title" onCancel={() => setReauth(null)} onClose={() => setReauth(null)}><h2 id="reauth-title">Kimliğini doğrula</h2><p>Bu işlem için şifreni yeniden yaz. Doğrulama 5 dakika geçerli.</p><form onSubmit={e => { e.preventDefault(); void confirmReauth(); }}><label className="auth-field">Şifre<input type="password" autoComplete="current-password" maxLength={128} value={reauthPassword} autoFocus onChange={e => setReauthPassword(e.target.value)} /></label>{auth.error && <p role="alert" className="auth-field-error">{auth.error}</p>}<div><button type="button" className="account-outline" onClick={() => setReauth(null)}>Vazgeç</button>{profile?.googleConnected && <button type="button" className="account-outline" onClick={() => { setReauth(null); void auth.startGoogle("reauth"); }}>Google ile doğrula</button>}<button type="submit" className="auth-primary" disabled={busy || !reauthPassword}>Doğrula ve devam et</button></div></form></dialog>
  </main>;
}
