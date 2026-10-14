"use client";
import { useEffect, useRef } from "react";
import { api } from "../../lib/api/http";
import type { Input } from "../../lib/api/contract";
import { appearanceChangedEvent, readLocalAppearance, type Appearance } from "../../lib/appearance";
import { writeStudioView } from "../../lib/studio/view";
import { useSitePreferences } from "../SitePreferences";
import { useAuth } from "./AuthProvider";

/** Which account this browser's appearance belongs to: its own copy is then the newest one. */
const ownerKey = "satir:appearance-account";
const empty = (value: Appearance) => value.colorMode === null && value.motion === null && value.studioView === null;
const same = (a: Appearance, b: Appearance) => a.colorMode === b.colorMode && a.motion === b.motion && a.studioView === b.studioView;
function owner() { try { return localStorage.getItem(ownerKey); } catch { return null; } }
function claim(id: string) { try { localStorage.setItem(ownerKey, id); } catch { /* applies to this page only */ } }

/**
 * Appearance follows the account. Signing in on a browser that belongs to someone else (or to nobody yet)
 * brings the account's colour mode, motion and Studio view; an account with none takes this browser's.
 * On the account's own browser the local copy is the newest and the account catches up with it.
 */
export function AppearanceSync() {
  const { session } = useAuth();
  const { setColorMode, setMotionEnabled } = useSitePreferences();
  const applied = useRef<string | null>(null);
  const account = session?.profile.id ?? null;

  useEffect(() => {
    if (!session) { applied.current = null; return; }
    const id = session.profile.id;
    if (applied.current === id) return;
    applied.current = id;
    const stored = session.profile.appearance;
    const local = readLocalAppearance();
    if (owner() === id || empty(stored)) {
      claim(id);
      if (!same(stored, local) && !empty(local)) void send(local);
      return;
    }
    claim(id);
    if (stored.colorMode && stored.colorMode !== local.colorMode) setColorMode(stored.colorMode, "account");
    if (stored.motion !== null && stored.motion !== local.motion) setMotionEnabled(stored.motion, "account");
    if (stored.studioView && stored.studioView !== local.studioView) writeStudioView(stored.studioView);
  }, [session, setColorMode, setMotionEnabled]);

  useEffect(() => {
    if (!account) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => { if (timer === undefined) return; clearTimeout(timer); timer = undefined; void send(readLocalAppearance()); };
    // Quick changes in a row (trying the modes) are sent once; leaving the page sends what is pending.
    const changed = () => { clearTimeout(timer); timer = setTimeout(flush, 400); };
    window.addEventListener(appearanceChangedEvent, changed);
    window.addEventListener("pagehide", flush);
    return () => { flush(); window.removeEventListener(appearanceChangedEvent, changed); window.removeEventListener("pagehide", flush); };
  }, [account]);
  return null;
}

async function send(appearance: Input<"updateAppearance">) {
  // The browser keeps the choice either way; the account copy catches up on the next change.
  try { await api("PUT", "/me/appearance", { body: appearance }); } catch { /* offline or signed out */ }
}
