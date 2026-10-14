"use client";
import { useState } from "react";
import { applyDraft, themeErrors } from "../../lib/builder/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { ThemeSettings } from "./ThemeSettings";

/** The same site draft can be tuned while looking at an article or a series. */
export function SiteDesignControls() {
  const { workspace, save, ready, storageError } = useWorkspace();
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const dirty = JSON.stringify(workspace.draft) !== JSON.stringify(workspace.applied);
  const errors = themeErrors(workspace.draft);
  return <div className="site-design-controls">
    <p className="property-summary">Bu sayfada görerek düzenle. Tasarım tüm site için ortak; yazının içeriğini değiştirmez.</p>
    <ThemeSettings readingFirst theme={workspace.draft} onChange={theme => { setMessage(""); void save({ ...workspace, draft: theme }); }} />
    <div className="site-design-apply">
      <button className="studio-primary" disabled={!ready || !dirty || !!errors.length || applying} onClick={async () => {
        setApplying(true);
        try { setMessage(await save(applyDraft(workspace), true) ? "Site tasarımı uygulandı." : "Tasarım uygulanamadı. Taslağın korunuyor."); }
        catch { setMessage("Tasarım uygulanamadı. Tekrar deneyebilirsin."); }
        finally { setApplying(false); }
      }}>{applying ? "Uygulanıyor…" : "Temayı uygula"}</button>
      <p role="status">{storageError ?? errors[0] ?? message}</p>
    </div>
  </div>;
}
