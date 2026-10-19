"use client";
import type { ReadingMark } from "../../lib/reading/model";
import { resolveSource, sourceLabels, type SourceBlock, type AnchorMode } from "../../lib/reading/source-tracking";
export function SourceDetails({ mark, blocks, readOnly, onMode, onReattach, canReattach = false }: { mark: ReadingMark; blocks: SourceBlock[]; readOnly?: boolean; canReattach?: boolean; onReattach?:()=>void; onMode?: (mode: AnchorMode) => void }) {
 const resolved = mark.fragments.map(f => resolveSource(f, blocks, mark.anchorMode));
 const state = (["review", "removed", "changed", "moved", "exact"] as const).find(s => resolved.some(r => r.state === s)) ?? "exact";
 return <details className={`rn-source-details source-${state}`}><summary>{sourceLabels[state]}</summary>
   <dl><dt>Özgün alıntı</dt><dd>{mark.originalQuote??mark.fragments.map(f=>f.quote).join(" ")}</dd>
   {resolved.some(r=>r.parts.length>0)&&<><dt>Güncel metin</dt><dd>{resolved.map(r=>r.current).join(" ")}</dd></>}</dl>
   {(state==="review"||state==="removed")&&<p>Notun korunuyor. Kesin eşleşme bulunana kadar metnin üzerinde işaret gösterilmiyor.</p>}
   {state==="changed"&&<p>Konum takip edildi; metnin anlamı da değişmiş olabilir. Özgün alıntıyı karşılaştırabilirsin.</p>}
   {readOnly?<small>Studio önizlemesi · kayıtların değişmez.</small>:<label>Kaynak takibi<select aria-label={`Kaynak takibi: ${mark.fragments[0].quote.slice(0,30)}`} value={mark.anchorMode??"follow"} onChange={e=>onMode?.(e.target.value as AnchorMode)}><option value="follow">Metni takip et</option><option value="exact">Özgün alıntıya bağlı kal</option></select></label>}
 {!readOnly&&onReattach&&(state==="review"||state==="removed"||state==="changed")&&<button type="button" disabled={!canReattach} onClick={onReattach}>Seçili metne yeniden bağla</button>}
 </details>;
}
