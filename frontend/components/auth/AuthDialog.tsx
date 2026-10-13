"use client";
import { useEffect, useRef, useState } from "react";
import type { AuthScreen } from "../../lib/auth/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { AuthCard } from "./AuthCard";
import { AuthIcon } from "./AuthIcon";
import { useAuth } from "./AuthProvider";
import { AuthSignal } from "./AuthSignal";
import { authMotionDuration } from "../../lib/auth/transitions";
export function AuthDialog({ screen }: { screen: AuthScreen | null }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const completed = useRef(false);
  const { closeAuth, session } = useAuth();
  const [displayed, setDisplayed] = useState(screen);
  const [closing, setClosing] = useState<"success" | "dismiss" | null>(null);
  const [closingHeight, setClosingHeight] = useState<number>();
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  useEffect(() => {
    const element = dialog.current;
    if (screen) {
      completed.current = false; setDisplayed(screen); setClosing(null);
      if (!element?.open) element?.showModal();
    } else if (element?.open) {
      const successful = completed.current && session !== null;
      const duration = successful ? 1400 : authMotionDuration(340);
      if (duration) {
        setClosingHeight(element.getBoundingClientRect().height);
        setClosing(successful ? "success" : "dismiss");
        const timer = setTimeout(() => { element.close(); setDisplayed(null); setClosing(null); }, duration);
        return () => clearTimeout(timer);
      }
      element.close(); setDisplayed(null); setClosing(null);
    }
  }, [screen, session]);
  return <dialog ref={dialog} className={`${appearance.className} auth-dialog${closing === "success" ? " is-closing" : closing === "dismiss" ? " is-dismissing" : ""}`} style={{ ...appearance.style, ...(closing === "success" ? { height: closingHeight } : {}) }} aria-label="Hesap erişimi" onCancel={event => { event.preventDefault(); closeAuth(); }} onClose={closeAuth} onClick={event => { if (event.target === event.currentTarget) closeAuth(); }}>
    {closing !== "success" && <button className="auth-dialog-close" type="button" aria-label="Giriş penceresini kapat" onClick={closeAuth}><AuthIcon kind="close" /></button>}
    {closing === "success" ? <AuthSignal kind="in" /> : displayed && <AuthCard key={displayed} initial={displayed} onComplete={() => { completed.current = true; closeAuth(); }} />}
  </dialog>;
}
