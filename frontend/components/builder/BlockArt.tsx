import type { PageBlock } from "../../lib/builder/model";

/** A small wireframe of a theme block, drawn with the Studio's own palette (Sahne's filmstrip tiles). */
export function BlockArt({ kind }: { kind: PageBlock["kind"] }) {
  const ink = "var(--art-ink)", soft = "var(--art-soft)", pastel = "var(--art-pastel)", lilac = "var(--art-lilac)", peach = "var(--art-peach)", sky = "var(--art-sky)", card = "var(--art-card)";
  return <svg className="block-art" viewBox="0 0 176 100" aria-hidden="true" focusable="false">
    {kind === "scene" && <><rect x="14" y="24" width="70" height="10" rx="5" fill={ink} /><rect x="14" y="42" width="54" height="10" rx="5" fill={soft} /><rect x="14" y="66" width="44" height="16" rx="8" fill={pastel} /><rect x="112" y="18" width="52" height="52" rx="16" fill="#2f3833" /><rect x="127" y="34" width="6" height="14" rx="3" fill="#c8efbc" /><rect x="143" y="34" width="6" height="14" rx="3" fill="#c8efbc" /></>}
    {kind === "intro" && <><rect x="14" y="22" width="40" height="8" rx="4" fill={soft} /><rect x="14" y="40" width="118" height="12" rx="6" fill={ink} /><rect x="14" y="60" width="88" height="8" rx="4" fill={soft} /><rect x="14" y="76" width="60" height="8" rx="4" fill={soft} /></>}
    {kind === "articles" && <><rect x="12" y="20" width="46" height="64" rx="12" fill={card} /><rect x="12" y="20" width="46" height="24" rx="12" fill={lilac} /><rect x="66" y="20" width="46" height="64" rx="12" fill={card} /><rect x="66" y="20" width="46" height="24" rx="12" fill={peach} /><rect x="120" y="20" width="46" height="64" rx="12" fill={card} /><rect x="120" y="20" width="46" height="24" rx="12" fill={sky} /></>}
    {kind === "series" && <><rect x="12" y="18" width="74" height="68" rx="14" fill={card} /><rect x="12" y="18" width="74" height="30" rx="14" fill={lilac} /><rect x="92" y="18" width="74" height="68" rx="14" fill={card} /><rect x="92" y="18" width="74" height="30" rx="14" fill={pastel} /></>}
    {kind === "quote" && <><text x="16" y="52" fontFamily="Georgia, serif" fontStyle="italic" fontSize="60" fill={lilac}>“</text><rect x="60" y="40" width="100" height="8" rx="4" fill={ink} /><rect x="60" y="58" width="70" height="8" rx="4" fill={soft} /></>}
    {kind === "about" && <><circle cx="40" cy="50" r="24" fill={peach} /><rect x="76" y="30" width="84" height="8" rx="4" fill={ink} /><rect x="76" y="48" width="64" height="8" rx="4" fill={soft} /><rect x="76" y="64" width="74" height="8" rx="4" fill={soft} /></>}
    {kind === "projects" && <><rect x="14" y="26" width="148" height="48" rx="14" fill="none" stroke={soft} strokeWidth="2" strokeDasharray="6 6" /><text x="88" y="56" textAnchor="middle" fontFamily="monospace" fontSize="14" fill={soft}>[ _ ]</text></>}
    {kind === "header" && <><rect x="12" y="20" width="50" height="10" rx="5" fill={ink} /><rect x="96" y="22" width="14" height="6" rx="3" fill={soft} /><rect x="116" y="22" width="14" height="6" rx="3" fill={soft} /><rect x="136" y="22" width="26" height="6" rx="3" fill={soft} /></>}
    {kind === "footer" && <><rect x="12" y="68" width="152" height="20" rx="10" fill={soft} opacity=".5" /><rect x="12" y="20" width="44" height="8" rx="4" fill={ink} opacity=".6" /></>}
  </svg>;
}
