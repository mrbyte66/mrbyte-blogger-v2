import { WritingGlyph } from "./WritingGlyph";
import { EditorIcon } from "./EditorIcon";
import type { BlockKind } from "./BlockBar";

export function WritingTools({ article, disabled, full, onInsert, onSelect, onDesign }: { article: boolean; disabled: boolean; full: boolean; onInsert: (kind: BlockKind) => void; onSelect: (field: string) => void; onDesign: () => void }) {
  const items = [{id:"paragraph", label:"Metin", icon:"body"}, {id:"heading",label:"Başlık",icon:"heading"}, {id:"quote",label:"Alıntı",icon:"quote"}, {id:"figure",label:"Görsel",icon:"figure"}, {id:"code",label:"Kod",icon:"code"}, {id:"table",label:"Tablo",icon:"table"}];
  return <div className="writing-tool-ribbon" role="toolbar" aria-label="Yazı araçları">
    {article && <div className="writing-tool-primary">{items.map(item => <button key={item.id} disabled={disabled || (full && ["paragraph","heading","quote"].includes(item.id))} aria-label={`${item.label} ekle`} onClick={() => ["paragraph","heading","quote"].includes(item.id) ? onInsert(item.id as BlockKind) : onSelect(item.id)}><WritingGlyph kind={item.id} size={23}/><span>{item.label}</span></button>)}<button disabled className="ribbon-voice" aria-label="Sesle yazma · Yakında" title="Sesle yazma · Yakında"><EditorIcon name="microphone" size={19}/><span>Ses</span><small>Yakında</small></button></div>}
    <div className="writing-tool-settings"><button disabled={disabled} aria-label="Tasarım" onClick={onDesign}><EditorIcon name="design" size={19}/><span>Tasarım</span></button><button disabled={disabled} aria-label={article ? "Yayın planı" : "Seri ayarları"} onClick={() => onSelect(article ? "publication" : "meta")}><EditorIcon name="publication" size={19}/><span>{article ? "Yayın" : "Seri bilgileri"}</span></button></div>
  </div>;
}
