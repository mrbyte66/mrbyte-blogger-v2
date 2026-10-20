import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { CrtIcon } from "./StudioIcons";
import { BlockArt } from "./BlockArt";
import { addBlock, blockDescriptions, blockKinds, blockLabels, canMoveBlock, inferStarter, moveBlock, type Starter, type Theme } from "../../lib/builder/model";

const symbols = { header: "≡", intro: "Aa", scene: <CrtIcon />, articles: "▤", series: "▥", quote: "“", about: "◎", projects: "⌘", footer: "↳" };
export const starters: { id: Starter; label: string; detail: string }[] = [
  { id: "scene", label: "Karakterli evren", detail: "Tek ekran · etkileşimli sahne" },
  { id: "feed", label: "Açık defter", detail: "Kaydırılan sayfa · yazı akışı" },
  { id: "magazine", label: "Dergi", detail: "Editoryal tipografi · kartlar" },
];


type Props = {
  sections?: "all" | "structure" | "starters";
  theme: Theme;
  ready: boolean;
  selectedId?: string;
  paletteOpen: boolean;
  onPaletteChange: (open: boolean) => void;
  onChooseStarter: (starter: Starter) => void;
  onChange: (theme: Theme) => void;
  onSelect: (id: string) => void;
};

export function ThemeStructure({ sections = "all", theme, ready, selectedId, paletteOpen, onPaletteChange, onChooseStarter, onChange, onSelect }: Props) {
  const selectedStarter = inferStarter(theme);
  const addButton = useRef<HTMLButtonElement>(null);
  const palette = useRef<HTMLDivElement>(null);
  // Where the palette floats (Sahne's strip), it opens over its own "Blok ekle" button, kept inside the strip.
  useLayoutEffect(() => {
    const node = palette.current, add = addButton.current, frame = node?.offsetParent;
    if (!paletteOpen || !node || !add || !frame || !node.closest('[data-view="sahne"]') || !matchMedia("(min-width: 1100px)").matches) return;
    const room = frame.getBoundingClientRect(), anchor = add.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left - room.left, room.width - node.offsetWidth - 12));
    node.style.left = `${left}px`; node.style.right = "auto";
    node.style.transformOrigin = `${Math.round(anchor.left - room.left - left + anchor.width / 2)}px 100%`;
  }, [paletteOpen]);
  const [showStarters, setShowStarters] = useState(false);
  const insert = <li className="studio-insert-slot"><button ref={addButton} className="studio-add" disabled={!ready} aria-expanded={paletteOpen} aria-controls="block-palette" onClick={() => onPaletteChange(!paletteOpen)}><span aria-hidden="true">{paletteOpen ? "−" : "+"}</span> Blok ekle</button></li>;
  return (
      <section className="studio-structure" aria-label="Tema yapısı">
        {sections !== "structure" && <section aria-labelledby="starter-heading">
          <div className="studio-section-title"><h2 id="starter-heading">Başlangıç düzeni</h2></div><button className="starter-picker-trigger" aria-label="Başlangıç düzenini değiştir" aria-expanded={showStarters} onClick={() => setShowStarters(!showStarters)}><CrtIcon /><span>{starters.find((s) => s.id === selectedStarter)?.label ?? "Özel düzen"}</span><span aria-hidden="true">⌄</span></button>
          <div className="starter-options" hidden={sections !== "starters" && !showStarters}>{starters.map((starter) => <button key={starter.id} className="starter-card" aria-label={`${starter.label} başlangıç düzeni`} aria-pressed={selectedStarter === starter.id} disabled={!ready} onClick={() => { onChooseStarter(starter.id); setShowStarters(false); }}><span className={`starter-visual starter-${starter.id}`} aria-hidden="true">{starter.id === "scene" ? <CrtIcon /> : <><b>{starter.id === "magazine" ? "Aa." : "Aa"}</b><i /><i /><i /></>}</span><span><strong>{starter.label}</strong>{selectedStarter === starter.id && <span className="starter-current">Seçili ✓</span>}</span></button>)}</div>
        </section>}
        {sections !== "starters" && <section aria-labelledby="structure-heading">
        <div className="studio-section-title"><h1 id="structure-heading">Sayfa yapısı</h1><span>{theme.blocks.length} blok</span></div>
        {!theme.blocks.some(block => block.kind !== "footer") && <p className="property-note">Henüz içerik yok. Footer korunuyor; yeni bir bölüm ekleyebilirsin.</p>}
        <ol className="studio-block-list">{theme.blocks.map((block) => <Fragment key={block.id}>{block.kind === "footer" && insert}<li data-selected={block.id === selectedId} data-kind={block.kind} className={block.id === selectedId ? "is-selected" : ""}>
          <button disabled={!ready} className="block-select" aria-pressed={block.id === selectedId} onClick={() => onSelect(block.id)}><span className="block-art-frame" aria-hidden="true"><BlockArt kind={block.kind} /></span><span className="block-symbol" aria-hidden="true">{symbols[block.kind]}</span><span>{blockLabels[block.kind]}<small>{block.kind === "header" ? "Başta sabit" : block.kind === "footer" ? "Sonda sabit" : ["intro", "scene"].includes(block.kind) ? "Giriş · sabit" : "İçerik bölümü"}</small></span></button>
          <div className="block-order"><button disabled={!ready || !canMoveBlock(theme, block.id, -1)} title={canMoveBlock(theme, block.id, -1) ? "Bir sıra yukarı" : "Bu konum yerleşim kuralıyla korunuyor"} aria-label={`${blockLabels[block.kind]} yukarı taşı`} onClick={() => { onChange(moveBlock(theme, block.id, -1)); onSelect(block.id); }}>↑</button><button disabled={!ready || !canMoveBlock(theme, block.id, 1)} title={canMoveBlock(theme, block.id, 1) ? "Bir sıra aşağı" : "Bu konum yerleşim kuralıyla korunuyor"} aria-label={`${blockLabels[block.kind]} aşağı taşı`} onClick={() => { onChange(moveBlock(theme, block.id, 1)); onSelect(block.id); }}>↓</button></div>
        </li></Fragment>)}{!theme.blocks.some(block => block.kind === "footer") && insert}</ol>
        {paletteOpen && <div ref={palette} id="block-palette" className="studio-palette">{blockKinds.map((kind) => {
          const exists = theme.blocks.some((block) => block.kind === kind);
          const otherLead = ["intro", "scene"].includes(kind) && theme.blocks.some((block) => ["intro", "scene"].includes(block.kind) && block.kind !== kind);
          const disabled = exists || otherLead;
          return <button key={kind} aria-label={`${blockLabels[kind]} ${disabled ? "mevcut" : "ekle"}`} disabled={disabled} onClick={() => { const id = crypto.randomUUID(); onChange(addBlock(theme, kind, id)); onSelect(id); }}><span aria-hidden="true">{symbols[kind]}</span><span><strong>{blockLabels[kind]}</strong><small>{exists ? "Sayfada mevcut" : otherLead ? "Önce mevcut giriş bloğunu kaldır" : blockDescriptions[kind]}</small></span><b aria-hidden="true">{disabled ? "✓" : "+"}</b></button>;
        })}</div>}
        <p className="studio-sidebar-foot">Üst menü başta, giriş başlangıçta, footer sonda kalır. İçerik bölümlerini kendi aralarında sırala.</p>
        </section>}
      </section>
  );
}
