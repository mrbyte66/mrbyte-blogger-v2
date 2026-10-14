"use client";
import { useEffect, useRef } from "react";
import { api } from "../../lib/api/http";
import type { Input } from "../../lib/api/contract";
import { appearanceChangedEvent, readLocalAppearance } from "../../lib/appearance";
import { writeStudioView } from "../../lib/studio/view";
import { useSitePreferences } from "../SitePreferences";
import { useAuth } from "./AuthProvider";

/**
 * Appearance follows the account: on sign-in the account's colour mode, motion and Studio view replace this
 * browser's (an account that has none yet takes this browser's); later changes are sent back to the account.
 */
export function AppearanceSync() {
  const { session } = useAuth();
  const { setColorMode, setMotionEnabled } = useSitePreferences();
  const applied = useRef<string | null>(null);
  const account = session?.profile.id ?? null;

  useEffect(() => {
    if (!session) { applied.current = null; return; }
    if (applied.current === session.profile.id) return;
    applied.current = session.profile.id;
    const stored = session.profile.appearance;
    const local = readLocalAppearance();
    if (stored.colorMode === null && stored.motion === null && stored.studioView === null) {
      if (local.colorMode !== null || local.motion !== null || local.studioView !== null) void send(local);
      return;
    }
    if (stored.colorMode && stored.colorMode !== local.colorMode) setColorMode(stored.colorMode, "account");
    if (stored.motion !== null && stored.motion !== local.motion) setMotionEnabled(stored.motion, "account");
    if (stored.studioView && stored.studioView !== local.studioView) writeStudioView(stored.studioView);
  }, [session, setColorMode, setMotionEnabled]);

  useEffect(() => {
    if (!account) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Quick changes in a row (trying the modes) are sent once.
    const changed = () => { clearTimeout(timer); timer = setTimeout(() => void send(readLocalAppearance()), 500); };
    window.addEventListener(appearanceChangedEvent, changed);
    return () => { clearTimeout(timer); window.removeEventListener(appearanceChangedEvent, changed); };
  }, [account]);
  return null;
}

async function send(appearance: Input<"updateAppearance">) {
  // The browser keeps the choice either way; the account copy catches up on the next change.
  try { await api("PUT", "/me/appearance", { body: appearance }); } catch { /* offline or signed out */ }
}
