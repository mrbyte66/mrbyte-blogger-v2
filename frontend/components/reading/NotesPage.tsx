"use client";
import { SitePageHeader } from "../SitePageHeader";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { GeneralNotebook } from "./GeneralNotebook";
export function NotesPage(){const {workspace}=useWorkspace();const appearance=themeAppearance(workspace.applied);return <main className={`${appearance.className} rn-notes-page`} style={appearance.style}><SitePageHeader theme={workspace.applied}/><GeneralNotebook/></main>;}
