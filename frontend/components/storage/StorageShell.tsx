"use client";
import type { ReactNode } from "react";
import { SitePageHeader } from "../SitePageHeader";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import "./storage.css";
export function StorageShell({ children }: { children: ReactNode }) {
  const { workspace } = useWorkspace(); const appearance = themeAppearance(workspace.applied);
  return <main className={`${appearance.className} storage-page`} style={appearance.style}><SitePageHeader theme={workspace.applied} /><div className="storage-body">{children}</div></main>;
}
