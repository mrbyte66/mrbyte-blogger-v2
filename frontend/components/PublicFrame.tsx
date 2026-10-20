"use client";
import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useWorkspace } from "../lib/builder/use-workspace";
import { themeAppearance } from "../lib/builder/appearance";
import { footerBlock, isSceneHome, type Theme } from "../lib/builder/model";
import { SiteFooter, type FooterEditing } from "./SiteFooter";
import { scrollBehavior } from "../lib/motion";

export function PublicFrame({ children, includeStudioFooter = false, theme: themeOverride, home = false, preview = false, footerEditing }: { children: ReactNode; includeStudioFooter?: boolean; theme?: Theme; home?: boolean; preview?: boolean; footerEditing?: FooterEditing }) {
  const path = usePathname() ?? "/"; const { workspace } = useWorkspace(); const theme = themeOverride ?? workspace.applied;
  const appearance = themeAppearance(theme);
  const privateRoute = path.startsWith("/studio") || path.startsWith("/preview");
  const scene = home && isSceneHome(theme);
  useEffect(() => {
    if (!home || scene || preview) return;
    const section = new URLSearchParams(location.search).get("bolum");
    const target = section === "writing" ? "yazilar" : section === "about" ? "hakkimda" : "";
    if (target) document.getElementById(target)?.scrollIntoView({ behavior: scrollBehavior() });
  }, [home, scene, preview]);
  // Home owns its shell in ThemeRenderer so draft/public use the same layout with exactly one footer.
  if ((path === "/" && !home) || (privateRoute && !includeStudioFooter)) return <>{children}</>;
  return <div className={`${appearance.className} public-frame${scene ? " public-home-scene" : ""}${footerEditing ? " canvas-editing" : ""}`} style={appearance.style}>
    <div className="public-content">{children}</div>
    <SiteFooter theme={theme} block={footerBlock(theme)} home={home} scene={scene} preview={preview} editing={footerEditing} />
  </div>;
}
