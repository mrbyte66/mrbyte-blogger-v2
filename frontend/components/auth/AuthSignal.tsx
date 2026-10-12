"use client";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";

/** A single, quiet CRT power cycle shared by sign-in and sign-out surfaces. */
export function AuthSignal({ kind, floating = false }: { kind: "in" | "out"; floating?: boolean }) {
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  return <div className={`${appearance.className} auth-signal is-${kind}${floating ? " is-floating" : ""}`} style={appearance.style} role="status" aria-live="polite">
    <div className="auth-signal-screen" aria-hidden="true">
      <svg viewBox="0 0 80 64" fill="none"><rect x="9" y="5" width="62" height="44" rx="12" /><path className="auth-signal-stand" d="M32 49v8m16-8v8M25 58h30" /><g className="auth-signal-face"><path d="M28 22v5m24-5v5M32 34q8 6 16 0" /></g><path className="auth-signal-line" d="M23 27h34" /></svg>
      <span className="auth-signal-orbit" />
    </div>
    <div className="auth-signal-copy"><span className="auth-signal-label"><i />{kind === "in" ? "Giriş yapıldı" : "Çıkış yapıldı"}</span><strong>{kind === "in" ? "Hoş geldin." : "Görüşmek üzere."}</strong><p>{kind === "in" ? "Kaldığın yerden devam." : "Oturumun güvenle kapatıldı."}</p></div>
  </div>;
}
