import { EditorIcon } from "./EditorIcon";

/** Miniatures shared by the always-visible ribbon and the inline insertion cards. */
export function WritingGlyph({kind,size=24}:{kind:string;size?:number}) {
  const key=kind === "paragraph" || kind === "body" ? "text" : kind.startsWith("heading") ? "heading" : kind;
  if (!["text","heading","quote","figure","code","table"].includes(key)) return <EditorIcon name={kind} size={size}/>;
  return <svg className={`writing-glyph glyph-${key}`} width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
    {key === "text" && <g fill="currentColor"><rect x="3" y="7" width="26" height="3" rx="1.5"/><rect x="3" y="14" width="21" height="3" rx="1.5" opacity=".75"/><rect x="3" y="21" width="15" height="3" rx="1.5" opacity=".5"/></g>}
    {key === "heading" && <text x="1" y="24" fill="currentColor" fontFamily="Georgia,serif" fontSize="25" letterSpacing="-2">Aa</text>}
    {key === "quote" && <text x="2" y="33" fill="#bba5e1" fontFamily="Georgia,serif" fontSize="43">“</text>}
    {key === "figure" && <><rect x="2" y="5" width="28" height="23" rx="4" fill="#9eaf9c"/><circle cx="21" cy="12" r="4" fill="#f0c4ad"/><path d="M2 22 10 15 19 23 25 19 30 23v2a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3Z" fill="#415d4c"/></>}
    {key === "code" && <><path d="m10 5-4 4 4 4m12-8 4 4-4 4m-4-9-4 10" stroke="currentColor" strokeWidth="1.5"/><rect x="4" y="19" width="24" height="2" rx="1" fill="#bba5e1"/><rect x="4" y="25" width="15" height="2" rx="1" fill="currentColor"/></>}
    {key === "table" && <g stroke="currentColor" strokeWidth="1.3"><rect x="3" y="5" width="26" height="23" rx="2"/><path d="M3 13h26M3 20h26M12 5v23M21 5v23"/></g>}
  </svg>;
}
