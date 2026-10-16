"use client";
import Link from "next/link";
import type { Input } from "../../lib/api/contract";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { passwordStrength, validEmail, type AuthScreen } from "../../lib/auth/model";
import { api, ApiError, describe } from "../../lib/api/http";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { AuthIcon, GoogleLogo } from "./AuthIcon";
import { useAuth } from "./AuthProvider";

const headings: Record<AuthScreen, [string, string]> = {
  login: ["Tekrar hoş geldin", "Kendi kitaplığına, kaldığın satıra."],
  register: ["Hesap oluştur", "Sevdiğin yazıları kendi düzeninde sakla."],
  forgot: ["Şifreni mi unuttun?", "E-posta adresini yaz; sıfırlama bağlantısı gönderelim."],
  reset: ["Yeni bir şifre", "Hesabın için güçlü bir şifre seç."],
  verify: ["Son bir küçük adım", "E-posta adresini doğrula."],
};
const MIN_PASSWORD = 12;

/** Token from an e-mail link. It is only consumed by an explicit button press (POST), never on page load. */
function linkToken() {
  if (typeof window === "undefined") return { token: "", emailChange: false };
  const params = new URLSearchParams(window.location.search);
  return { token: params.get("token") ?? "", emailChange: params.get("degisiklik") === "1" };
}

export function AuthCard({ initial = "login", onComplete }: { initial?: AuthScreen; onComplete?: () => void }) {
  const auth = useAuth();
  const { workspace } = useWorkspace();
  const [screen, setScreen] = useState(initial);
  const [tabMotion, setTabMotion] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [email, setEmail] = useState(""); const [name, setName] = useState(""); const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState(""); const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [visible, setVisible] = useState(false); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ title: string; text: string; next?: AuthScreen; resend?: boolean; home?: boolean } | null>(null);
  const [link, setLink] = useState({ token: "", emailChange: false });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const waitUntil = auth.verificationWaitUntil(email);
  const [resendReady, setResendReady] = useState(true);
  useEffect(() => {
    const remaining = waitUntil - Date.now();
    setResendReady(remaining <= 0);
    if (remaining <= 0) return;
    const timer = setTimeout(() => setResendReady(true), remaining);
    return () => clearTimeout(timer);
  }, [waitUntil]);
  useEffect(() => { setLink(linkToken()); }, []);
  useEffect(() => { if (auth.session?.profile.email && !email) setEmail(auth.session.profile.email); }, [auth.session?.profile.email, email]);
  const register = screen === "register";
  const login = screen === "login";
  const hasPassword = login || register || screen === "reset";
  const newPassword = register || screen === "reset";
  const emailError = login ? (!email.trim() ? "E-posta adresini veya kullanıcı adını yaz." : "") : !validEmail(email.trim()) ? "E-postanı ad@ornek.com biçiminde yaz." : "";
  const nameError = !name.trim() ? "Sana nasıl hitap edelim?" : "";
  const passwordError = newPassword ? (password.length < MIN_PASSWORD ? `En az ${MIN_PASSWORD} karakter kullan.` : "") : (!password ? "Şifreni yaz." : "");
  const confirmationError = confirmation !== password || !confirmation ? "Şifreler aynı olmalı." : "";
  const needsEmail = screen !== "reset" && !(screen === "verify" && link.token);
  const valid = !(screen === "verify" && !link.token && !resendReady) && (!newPassword || !confirmationError) && (!register || !nameError) && (!needsEmail || !emailError) && (!hasPassword || !passwordError) && (screen !== "reset" || !!link.token);
  const strength = passwordStrength(password);
  function change(next: AuthScreen) { if (next === screen && !result) return; setLinkInvalid(false); setTabMotion((screen === "login" || screen === "register") && (next === "login" || next === "register")); setScreen(next); setPassword(""); setConfirmation(""); setConfirmationVisible(false); setVisible(false); setTouched({}); setResult(null); auth.setError(""); heading.current?.focus(); }
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true); auth.setError("");
    try { await action(); } catch (cause) { if (cause instanceof ApiError && cause.code === "INVALID_TOKEN") setLinkInvalid(true); auth.setError(describe(cause)); } finally { setBusy(false); }
  }
  function forgetLinkToken() {
    const params = new URLSearchParams(window.location.search);
    params.delete("token"); params.delete("degisiklik");
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }
  function recoverLink() {
    forgetLinkToken(); setLink({ token: "", emailChange: false }); setLinkInvalid(false);
    setPassword(""); setConfirmation(""); setTouched({}); setResult(null); auth.setError("");
    setScreen(screen === "reset" ? "forgot" : "verify");
  }
  async function resendVerification() {
    if (busy || Date.now() < waitUntil) return;
    if (!result) setResult({ title: "E-posta doğrulaması gerekli", text: "Giriş yapmadan önce e-posta adresini doğrula. Yeni bağlantı için yeniden gönder düğmesini kullanabilirsin.", resend: true, home: true });
    await run(async () => {
      await api("POST", "/auth/verification/resend", { body: ({ email: email.trim() } satisfies Input<"resendVerification">) });
      auth.verificationMailSent(email);
      setResult({ title: "E-postanı kontrol et", text: "Doğrulanmamış bir hesap varsa bu adrese yeni bir doğrulama bağlantısı gönderdik. Bağlantıdaki onay düğmesine basıp daha sonra giriş yap.", resend: true, home: true });
    });
  }
  async function submit() {
    setTouched({ name: true, email: true, password: true, confirmation: true });
    if (!valid) return;
    await run(async () => {
      if (login) {
        if (await auth.login(email, password)) { setPassword(""); auth.notify("Giriş yapıldı"); onComplete?.(); }
      } else if (register) {
        if (await auth.register(name, email, password, confirmation)) {
          setPassword(""); setConfirmation("");
          setResult({ title: "E-postanı kontrol et", text: `Doğrulama bağlantısını ${email.trim()} adresine gönderdik. Gelen kutunu ve spam klasörünü kontrol et. Giriş yapmadan önce e-postandaki bağlantıyı onayla; bu sırada siteyi gezebilirsin.`, resend: true, home: true });
        }
      } else if (screen === "forgot") {
        await api("POST", "/auth/password/forgot", { body: ({ email: email.trim() } satisfies Input<"forgotPassword">) });
        setResult({ title: "Sıradaki adım hazır", text: "Bu adrese kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderdik. Bağlantı 30 dakika geçerli.", next: "login" });
      } else if (screen === "reset") {
        await api("POST", "/auth/password/reset", { body: ({ token: link.token, password, passwordConfirmation: confirmation } satisfies Input<"resetPassword">) });
        forgetLinkToken(); setPassword(""); setConfirmation(""); await auth.refresh();
        setResult({ title: "Şifren güncellendi", text: "Güvenliğin için bütün oturumların kapatıldı. Yeni şifrenle giriş yapabilirsin.", next: "login" });
      } else if (screen === "verify") {
        if (link.token) {
          await api("POST", link.emailChange ? "/auth/email-change/confirm" : "/auth/verification/confirm", { body: ({ token: link.token } satisfies Input<"confirmVerification"> & Input<"confirmEmailChange">) });
          forgetLinkToken(); await auth.refresh();
          setResult(link.emailChange
            ? { title: "E-posta adresin değişti", text: "Güvenliğin için bütün oturumların kapatıldı. Yeni adresinle giriş yapabilirsin.", next: "login" }
            : { title: "E-postan doğrulandı", text: "Hesabın etkin. Giriş yaparak kitaplığını ve hesap ayarlarını kullanabilirsin.", next: auth.session ? undefined : "login" });
        } else {
          await api("POST", "/auth/verification/resend", { body: ({ email: email.trim() } satisfies Input<"resendVerification">) });
          auth.verificationMailSent(email);
          setResult({ title: "E-postanı kontrol et", text: "Doğrulanmamış bir hesap varsa bu adrese yeni bir doğrulama bağlantısı gönderdik. Gelen kutunu ve spam klasörünü kontrol et.", resend: true, home: true });
        }
      }
    });
  }
  const submitLabel = login ? "Giriş yap" : register ? "Hesap oluştur" : screen === "forgot" ? "Sıfırlama bağlantısı gönder" : screen === "reset" ? "Şifreyi güncelle" : link.token ? (link.emailChange ? "Yeni adresimi onayla" : "E-postamı doğrula") : "Doğrulama bağlantısını yeniden gönder";
  return <section className="auth-card" data-screen={screen} data-tab-motion={tabMotion} aria-labelledby={`${id}-title`} aria-busy={busy}>
    <span className="auth-wordmark">{workspace.applied.siteName}<span>.</span></span>
    <h1 id={`${id}-title`} tabIndex={-1} ref={heading}>{result?.title ?? headings[screen][0]}</h1>
    {login && !result ? <p className="auth-subtitle auth-wave" aria-label={headings.login[1]}>{headings.login[1].split(" ").map((word, wordIndex, words) => <span className="auth-wave-word" aria-hidden="true" key={wordIndex}>{[...word].map((letter, index) => <span key={index} style={{ "--letter": words.slice(0, wordIndex).join("").length + index } as CSSProperties}>{letter}</span>)}{wordIndex < words.length - 1 ? " " : ""}</span>)}</p> : <p className="auth-subtitle">{result?.text ?? (screen === "reset" && !link.token ? "Bu ekran, e-postana gelen sıfırlama bağlantısıyla açılır." : headings[screen][1])}</p>}
    {result ? <div className="auth-message-actions">
      {result.next && <button type="button" className="auth-primary" onClick={() => change(result.next!)}>{result.next === "login" ? "Girişe dön" : "Devam et"}</button>}
      {result.home && <Link href="/" className="auth-primary" onClick={() => auth.closeAuth()}>Ana sayfaya dön</Link>}
      {result.resend && !resendReady && <p className="auth-field-hint auth-mail-help">Postanın ulaşması biraz sürebilir. Gelmezse bir dakika sonra yeniden gönderebilirsin.</p>}
      {result.resend && resendReady && <button className="auth-text-button" type="button" disabled={busy} onClick={() => void resendVerification()}>{busy ? "Gönderiliyor…" : "Doğrulama postasını yeniden gönder"}</button>}
      {!result.next && !result.resend && onComplete && <button type="button" className="auth-primary" onClick={onComplete}>Tamam</button>}
    </div> : <>
      {(login || register) && <>
        <div className="auth-tabs" role="tablist" aria-label="Hesap erişimi" onKeyDown={event => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) || busy) return;
          event.preventDefault();
          const next = event.key === "Home" ? "login" : event.key === "End" ? "register" : register ? "login" : "register";
          change(next); event.currentTarget.querySelector<HTMLButtonElement>(`#${CSS.escape(id)}-${next}`)?.focus();
        }}><button type="button" role="tab" tabIndex={register ? -1 : 0} aria-selected={!register} aria-controls={`${id}-form`} id={`${id}-login`} disabled={busy} onClick={() => change("login")}>Giriş yap</button><button type="button" role="tab" tabIndex={register ? 0 : -1} aria-selected={register} aria-controls={`${id}-form`} id={`${id}-register`} disabled={busy} onClick={() => change("register")}>Üye ol</button></div>
        <button className="auth-google" type="button" disabled={busy} onClick={() => void run(() => auth.startGoogle("login"))}><GoogleLogo />Google ile devam et</button>
        <div className="auth-divider"><span>veya</span></div>
      </>}
      <form key={screen} id={`${id}-form`} role={login || register ? "tabpanel" : undefined} aria-labelledby={login || register ? `${id}-${register ? "register" : "login"}` : undefined} noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="auth-form-fields">{register && <label className="auth-field" htmlFor={`${id}-name`}>Adın<input aria-label="Adın" autoComplete="name" id={`${id}-name`} maxLength={80} value={name} disabled={busy} onBlur={() => setTouched(v => ({ ...v, name: true }))} onChange={e => { setName(e.target.value); setTouched(v => ({ ...v, name: true })); auth.setError(""); }} aria-invalid={!!(touched.name && nameError)} aria-describedby={touched.name && nameError ? `${id}-name-error` : undefined} />{touched.name && nameError && <span id={`${id}-name-error`} className="auth-field-error">{nameError}</span>}</label>}
        {needsEmail && <label className="auth-field" htmlFor={`${id}-email`}>{login ? "E-posta veya kullanıcı adı" : "E-posta"}<input aria-label={login ? "E-posta veya kullanıcı adı" : "E-posta"} autoComplete={login ? "username" : "email"} inputMode={login ? "text" : "email"} type={login ? "text" : "email"} id={`${id}-email`} maxLength={254} value={email} disabled={busy} onBlur={() => setTouched(v => ({ ...v, email: true }))} onChange={e => { setEmail(e.target.value); setTouched(v => ({ ...v, email: true })); auth.setError(""); }} aria-invalid={!!(touched.email && emailError) || (login && auth.loginRejected)} aria-describedby={login && auth.loginRejected ? `${id}-server-error` : touched.email && emailError ? `${id}-email-error` : undefined} />{touched.email && emailError && <span id={`${id}-email-error`} className="auth-field-error">{emailError}</span>}</label>}
        {hasPassword && <div className="auth-field"><label htmlFor={`${id}-password`}>{screen === "reset" ? "Yeni şifre" : "Şifre"}</label><div className="auth-password"><input id={`${id}-password`} type={visible ? "text" : "password"} autoComplete={newPassword ? "new-password" : "current-password"} maxLength={128} value={password} disabled={busy} onPaste={e => { if (register) e.preventDefault(); }} onDrop={e => { if (register) e.preventDefault(); }} onCopy={e => { if (register) e.preventDefault(); }} onCut={e => { if (register) e.preventDefault(); }} onDragStart={e => { if (register) e.preventDefault(); }} onChange={e => { setPassword(e.target.value); setTouched(v => ({ ...v, password: true })); auth.setError(""); }} onBlur={() => setTouched(v => ({ ...v, password: true }))} aria-invalid={!!(touched.password && passwordError) || (login && auth.loginRejected)} aria-describedby={login && auth.loginRejected ? `${id}-server-error` : `${id}-password-hint`} /><button type="button" disabled={busy} aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={visible} onClick={() => setVisible(!visible)}><AuthIcon kind={visible ? "hidden" : "eye"} /></button></div>
          {newPassword && <div className="auth-strength" role="meter" aria-label="Şifre gücü" aria-valuemin={0} aria-valuemax={4} aria-valuenow={strength} aria-valuetext={["Henüz girilmedi", "Zayıf", "Orta", "İyi", "Güçlü"][strength]}><span style={{ width: `${strength * 25}%` }} /></div>}
          <span id={`${id}-password-hint`} className={touched.password && passwordError ? "auth-field-error" : "auth-field-hint"}>{touched.password && passwordError ? passwordError : newPassword ? `En az ${MIN_PASSWORD} karakter; uzun bir cümle de olabilir.` : ""}</span>
        </div>}
        {newPassword && <div className="auth-field"><label htmlFor={`${id}-confirmation`}>Şifre tekrarı</label><div className="auth-password"><input id={`${id}-confirmation`} type={confirmationVisible ? "text" : "password"} autoComplete="new-password" maxLength={128} value={confirmation} disabled={busy} onCopy={e => { if (register) e.preventDefault(); }} onCut={e => { if (register) e.preventDefault(); }} onDragStart={e => { if (register) e.preventDefault(); }} onPaste={e => { e.preventDefault(); setTouched(v => ({ ...v, confirmation: true })); auth.setError(""); }} onDrop={e => e.preventDefault()} onChange={e => { setConfirmation(e.target.value); setTouched(v => ({ ...v, confirmation: true })); auth.setError(""); }} onBlur={() => setTouched(v => ({ ...v, confirmation: true }))} aria-invalid={!!(touched.confirmation && confirmationError)} aria-describedby={touched.confirmation && confirmationError ? `${id}-confirmation-error` : undefined} /><button type="button" disabled={busy} aria-label={confirmationVisible ? "Şifre tekrarını gizle" : "Şifre tekrarını göster"} aria-pressed={confirmationVisible} onClick={() => setConfirmationVisible(!confirmationVisible)}><AuthIcon kind={confirmationVisible ? "hidden" : "eye"} /></button></div>{touched.confirmation && confirmationError && <span id={`${id}-confirmation-error`} className="auth-field-error">{confirmationError}</span>}</div>}{login && <button type="button" className="auth-text-button auth-forgot" disabled={busy} onClick={() => change("forgot")}>Şifremi unuttum</button>}
        </div><button className="auth-primary" type="submit" aria-describedby={!valid ? `${id}-submit-hint` : undefined} disabled={busy || !valid}>{busy && <span className="auth-spinner" aria-hidden="true" />}{busy ? "Bir an…" : submitLabel}</button>
        {!valid && !busy && <p id={`${id}-submit-hint`} className="auth-submit-hint">{screen === "verify" && !link.token && !resendReady ? "Doğrulama postası az önce gönderildi. Yeni posta istemeden önce bir dakika bekle." : "Devam etmek için gerekli alanları doldur; işaretli hataları düzelt."}</p>}
      </form>
      {(screen === "forgot" || screen === "reset" || screen === "verify") && <button type="button" className="auth-text-button auth-back" onClick={() => change("login")} disabled={busy}>← Girişe dön</button>}
    </>}
    {linkInvalid && (screen === "reset" || (screen === "verify" && !link.emailChange)) && <button className="auth-text-button" type="button" onClick={recoverLink}>{screen === "reset" ? "Yeni şifre sıfırlama bağlantısı iste" : "Yeni doğrulama bağlantısı iste"}</button>}
    {login && auth.verificationRequired && !resendReady && <p className="auth-field-hint auth-mail-help">Doğrulama postası az önce gönderildi. Gelen kutunu ve spam klasörünü kontrol et.</p>}
    {login && auth.verificationRequired && resendReady && <button className="auth-text-button auth-verification-resend" type="button" disabled={busy} onClick={() => validEmail(email.trim()) ? void resendVerification() : change("verify")}>Doğrulama postasını yeniden gönder</button>}
    {auth.error && <p id={`${id}-server-error`} className="auth-field-error" role="alert">{auth.error}</p>}
    {(login || register) && !result && <p className="auth-benefit">Üyelik okur hesabıdır; yazı yazma veya yönetim yetkisi vermez.</p>}
  </section>;
}
