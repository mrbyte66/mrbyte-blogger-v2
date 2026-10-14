"use client";
import { studioViews, useStudioView } from "../../lib/studio/view";

/**
 * Chooses how Studio is arranged. "menu" is the compact switch inside the personal menu,
 * "cards" the larger one in the site preferences dialog.
 */
export function StudioViewSwitch({ variant = "menu" }: { variant?: "menu" | "cards" }) {
  const [view, setView] = useStudioView();
  return <div className={`studio-view-switch studio-view-switch-${variant}`} role="group" aria-label="Studio görünümü">
    {studioViews.map((item) => <button key={item.id} type="button" aria-pressed={view === item.id} title={item.detail} onClick={() => setView(item.id)}>
      <span className={`view-swatch view-swatch-${item.id}`} aria-hidden="true"><i /><i /><i /></span>
      <span className="view-name"><strong>{item.label}</strong>{variant === "cards" && <small>{item.detail}</small>}</span>
    </button>)}
  </div>;
}
