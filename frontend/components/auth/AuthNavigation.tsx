"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { isAccountRoute } from "../../lib/auth/transitions";

/** A public article stays open on logout; private account/Studio screens return home. */
export function AuthNavigation() {
  const { session, ready } = useAuth();
  const path = usePathname(); const router = useRouter();
  const hadSession = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (session) hadSession.current = true;
    else if (hadSession.current) {
      hadSession.current = false;
      if (isAccountRoute(path)) router.replace("/");
      router.refresh();
    }
  }, [ready, session, path, router]);
  return null;
}
