"use client";
import { useEffect, useRef, useState } from "react";
import type { AuthScreen } from "../../lib/auth/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { AuthCard } from "./AuthCard";
import { AuthIcon } from "./AuthIcon";
import { useAuth } from "./AuthProvider";
import { authMotionDuration } from "../../lib/auth/transitions";
export function AuthDialog({ screen }: { screen: AuthScreen | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { closeAuth, session } = useAuth();
  const [displayed, setDisplayed] = useState(screen);
  const [closing, setClosing] = useState(false);
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  useEffect(() => {
    const element = dialog.current;
    if (screen) {
      setDisplayed(screen); setClosing(false);
      if (!element?.open) element?.showModal();
    } else if (element?.open) {
      const duration = session ? authMotionDuration(180) : 0;
      if (duration) {
        setClosing(true);
        const timer = setTimeout(() => { element.close(); setDisplayed(null); setClosing(false); }, duration);
        return () => clearTimeout(timer);
      }
      element.close(); setDisplayed(null); setClosing(false);
    }
  }, [screen, session]);
  return <dialog ref={dialog} className={`${appearance.className} auth-dialog${closing ? " is-closing" : ""}`} style={appearance.style} aria-label="Hesap erişimi" onCancel={event => { event.preventDefault(); closeAuth(); }} onClose={closeAuth} onClick={event => { if (event.target === event.currentTarget) closeAuth(); }}>
    <button className="auth-dialog-close" type="button" aria-label="Giriş penceresini kapat" onClick={closeAuth}><AuthIcon kind="close" /></button>
    {displayed && <AuthCard key={displayed} initial={displayed} onComplete={closeAuth} />}
  </dialog>;
}
