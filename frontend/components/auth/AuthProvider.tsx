"use client";
import type { Input, Schema, Output } from "../../lib/api/contract";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { AuthScreen, AvatarStyle } from "../../lib/auth/model";
import { api, ApiError, describe, resetCsrf } from "../../lib/api/http";
import { AuthDialog } from "./AuthDialog";
import { authMotionDuration } from "../../lib/auth/transitions";

/** The signed-in account as the server reports it. Roles always come from the server session. */
export type AccountProfile = {
  id: string; name: string; email: string; verified: boolean; avatar?: AvatarStyle; role: "member" | "owner";
  publicationEmail: boolean; publicationSubscription: boolean; timeZone: string; version: number; googleConnected: boolean;
};
export type AccountSession = { profile: AccountProfile; expiresAt: number };
type ProfileDto = Schema<"Profile">;

type AuthContext = {
  session: AccountSession | null; ready: boolean; error: string;
  openAuth: (screen?: AuthScreen) => void; closeAuth: () => void; notify: (message: string) => void; setError: (message: string) => void;
  refresh: () => Promise<void>;
  login: (identifier: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, confirmation: string) => Promise<boolean>;
  startGoogle: (purpose?: "login" | "reauth") => Promise<void>;
  updateProfile: (patch: { name?: string; avatar?: AvatarStyle; publicationEmail?: boolean; publicationSubscription?: boolean }) => Promise<boolean>;
  signOut: () => Promise<void>;
};
const noop = async () => false;
const fallback: AuthContext = { session: null, ready: false, error: "", openAuth: () => {}, closeAuth: () => {}, notify: () => {}, setError: () => {}, refresh: async () => {}, login: noop, register: noop, startGoogle: async () => {}, updateProfile: noop, signOut: async () => {} };
const Context = createContext<AuthContext>(fallback);
export function useAuth() { return useContext(Context); }

const channelName = "satir-auth";
const googleMessages: Record<string, string> = {
  signed_in: "Google ile giriş yapıldı", linked: "Google hesabın bağlandı", reauthenticated: "Kimliğin doğrulandı; işlemi tekrar başlatabilirsin",
};
const googleErrors: Record<string, string> = {
  account_exists: "Bu e-posta ile zaten bir hesap var. O hesapla giriş yapıp Google’ı Hesap → Bağlı Hesaplar’dan bağlayabilirsin.",
  google_cancelled: "Google ile giriş iptal edildi.", google_state: "Google oturumu doğrulanamadı; tekrar dene.",
  google_failed: "Google ile giriş tamamlanamadı.", google_email_unverified: "Google hesabının e-postası doğrulanmamış.",
  google_identity_in_use: "Bu Google hesabı başka bir hesaba bağlı.",
  google_already_linked: "Google hesabın zaten bağlı.", google_link_session: "Bağlama sırasında oturum değişti; tekrar dene.",
  google_reauth_mismatch: "Doğrulama için bu hesaba bağlı Google hesabını kullan.",
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [screen, setScreen] = useState<AuthScreen | null>(null);
  const [toast, setToast] = useState("");
  const [transition, setTransition] = useState<"in" | "out" | null>(null);
  const signingOut = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  const userId = useRef<string | null>(null);
  const refreshGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    try {
      const { data } = await api<Schema<"Session">>("GET", "/auth/session");
      if (generation !== refreshGeneration.current) return;
      if (!data.authenticated || !data.profile) {
        userId.current = null; setSession(null);
      } else {
        let googleConnected = false;
        if (data.profile.verified) {
          try { googleConnected = (await api<Output<"listConnections">>("GET", "/me/connections")).data.items.some((c) => c.provider === "google"); } catch { /* optional detail */ }
        }
        if (generation !== refreshGeneration.current) return;
        const p = data.profile;
        userId.current = p.id;
        setSession({ profile: { id: p.id, name: p.name, email: p.email, verified: p.verified, avatar: (p.avatar ?? undefined) as AvatarStyle | undefined, role: p.role, publicationEmail: p.preferences.publicationEmail, publicationSubscription: p.preferences.publicationSubscription, timeZone: p.preferences.timeZone, version: p.version, googleConnected }, expiresAt: data.expiresAt ? Date.parse(data.expiresAt) : Date.now() });
      }
    } catch { /* keep the last known state while the server is unreachable */ }
    finally { if (generation === refreshGeneration.current) setReady(true); }
  }, []);

  const announce = useCallback(() => { try { channel.current?.postMessage("changed"); } catch { /* single tab */ } }, []);

  useEffect(() => {
    void refresh();
    // Other tabs only learn that "the session changed" and re-read it from the server; no identity is sent.
    try { channel.current = new BroadcastChannel(channelName); channel.current.onmessage = () => { void refresh(); }; } catch { channel.current = null; }
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    // Result of a Google redirect (?google=… or ?google_error=…).
    const params = new URLSearchParams(window.location.search);
    const ok = params.get("google"); const failure = params.get("google_error");
    if (ok || failure) {
      if (ok) { if (ok === "signed_in") setTransition("in"); setToast(googleMessages[ok] ?? "Google işlemi tamamlandı"); announce(); }
      if (failure) setError(googleErrors[failure] ?? "Google işlemi tamamlanamadı.");
      params.delete("google"); params.delete("google_error");
      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    }
    return () => { channel.current?.close(); window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [refresh, announce]);
  useEffect(() => { if (!session) return; const timer = setTimeout(() => void refresh(), Math.max(1000, session.expiresAt - Date.now() + 1000)); return () => clearTimeout(timer); }, [session, refresh]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (transition !== "in") return; const timer = setTimeout(() => setTransition(null), authMotionDuration(450)); return () => clearTimeout(timer); }, [transition]);

  async function login(identifier: string, password: string) {
    setError("");
    try {
      await api("POST", "/auth/login", { body: ({ identifier: identifier.trim(), password } satisfies Input<"login">) });
      resetCsrf(); await refresh(); announce(); setTransition("in"); return true;
    } catch (cause) { setError(describe(cause)); return false; }
  }
  async function register(name: string, email: string, password: string, confirmation: string) {
    setError("");
    try { await api("POST", "/auth/register", { body: ({ name: name.trim(), email: email.trim(), password, passwordConfirmation: confirmation } satisfies Input<"register">) }); return true; }
    catch (cause) { setError(describe(cause)); return false; }
  }
  async function startGoogle(purpose: "login" | "reauth" = "login") {
    setError("");
    try {
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const { data } = await api<Output<"startGoogle">>("POST", "/auth/google/start", { body: ({ returnTo, purpose } satisfies Input<"startGoogle">) });
      window.location.assign(data.authorizationUrl);
    } catch (cause) { setError(cause instanceof ApiError && cause.code === "GOOGLE_NOT_CONFIGURED" ? "Google ile giriş henüz yapılandırılmadı. E-posta ve şifreyle devam edebilirsin." : describe(cause)); }
  }
  async function updateProfile(patch: { name?: string; avatar?: AvatarStyle; publicationEmail?: boolean; publicationSubscription?: boolean }) {
    if (!session) return false;
    setError("");
    try {
      if (patch.name !== undefined || patch.avatar !== undefined) await api("PATCH", "/me", { body: ({ name: patch.name, avatar: patch.avatar } satisfies Input<"updateProfile">), ifMatch: session.profile.version });
      if (patch.publicationEmail !== undefined || patch.publicationSubscription !== undefined) {
        const { data } = await api<ProfileDto>("GET", "/me");
        await api("PATCH", "/me/preferences", { body: ({ publicationEmail: patch.publicationEmail, publicationSubscription: patch.publicationSubscription } satisfies Input<"updatePreferences">), ifMatch: data.version });
      }
      await refresh(); announce(); return true;
    } catch (cause) { setError(describe(cause)); await refresh(); return false; }
  }
  async function signOut() {
    if (signingOut.current) return;
    signingOut.current = true; setError(""); setTransition("out");
    try {
      await api("POST", "/auth/logout");
    } catch (cause) {
      if (!(cause instanceof ApiError && cause.status === 401)) {
        setTransition(null); signingOut.current = false; setError(describe(cause)); return;
      }
    }
    refreshGeneration.current++;
    resetCsrf(); setSession(null); userId.current = null; setScreen(null); setError(""); setToast("Çıkış yapıldı"); announce();
    setTransition("in"); signingOut.current = false;
  }
  return <Context.Provider value={{ session, ready, error, setError, openAuth: (next = "login") => { setError(""); setScreen(next); }, closeAuth: () => setScreen(null), notify: setToast, refresh, login, register, startGoogle, updateProfile, signOut }}>
    {children}<AuthDialog screen={screen} />
    {transition && <div className={`auth-session-transition is-${transition}`} aria-hidden="true" />}
    <div className={`auth-toast ${toast ? "is-visible" : ""}`} role="status" aria-live="polite">{toast}</div>
  </Context.Provider>;
}
