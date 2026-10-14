import { useEffect, useState, type ReactNode } from "react";
import { accentColor, type Theme } from "../../lib/builder/model";

const colors = [
  { label: "Nane", value: "#c8efbc" }, { label: "Lavanta", value: "#d9c6f0" },
  { label: "Kehribar", value: "#efd19b" }, { label: "Mercan", value: "#ed9383" },
  { label: "Mavi", value: "#83b9e8" }, { label: "Grafit", value: "#475569" },
];
type Option<T extends string> = { value: T; label: string; preview: ReactNode };

/** One look setting as a row of small pictures: what each choice does is visible before choosing it. */
function Choice<T extends string>({ label, hint, value, options, onChange }: { label: string; hint?: string; value: T; options: readonly Option<T>[]; onChange: (value: T) => void }) {
  return <div className="studio-field theme-choice settings-full">
    <span>{label}</span>
    {hint && <p className="setting-explanation">{hint}</p>}
    <div className="choice-row" role="group" aria-label={label} style={{ "--choices": options.length } as React.CSSProperties}>
      {options.map((option) => <button key={option.value} type="button" aria-label={`${label}: ${option.label}`} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
        <span className={`choice-preview preview-${option.value}`} aria-hidden="true">{option.preview}</span>
        <span className="choice-label">{option.label}</span>
      </button>)}
    </div>
  </div>;
}
const lines = (count: number) => Array.from({ length: count }, (_, index) => <i key={index} />);

export function ThemeSettings({ theme, onChange, readingFirst = false }: { theme: Theme; onChange: (theme: Theme) => void; readingFirst?: boolean }) {
  const color = accentColor(theme.accent);
  const [hex, setHex] = useState(color);
  useEffect(() => setHex(color), [color]);
  const validHex = /^#[a-fA-F0-9]{6}$/.test(hex);
  const set = <K extends keyof Theme>(key: K) => (value: Theme[K]) => onChange({ ...theme, [key]: value });
  const identity = <>
    <h3 className="settings-group settings-full">Kimlik</h3>
    <label className="studio-field"><span>Tema adı</span><input maxLength={80} value={theme.name} onChange={(event) => onChange({ ...theme, name: event.target.value })} /></label>
    <label className="studio-field"><span>Site adı</span><input maxLength={40} value={theme.siteName} onChange={(event) => onChange({ ...theme, siteName: event.target.value })} /></label>
    <div className="studio-field settings-full"><span>Vurgu rengi</span><p className="setting-explanation">Giriş işareti, alıntı zemini, yazı kartları ve sahnedeki yazı kısayolu değişir. Karakter görseli ve arkasındaki halka özgün tasarımını korur.</p>
      <div className="accent-options" role="group" aria-label="Hazır vurgu renkleri">{colors.map((item) => <button type="button" key={item.value} className="accent-choice" style={{ background: item.value }} aria-label={item.label} aria-pressed={color.toLowerCase() === item.value} onClick={() => onChange({ ...theme, accent: item.value })}><span aria-hidden="true">{color.toLowerCase() === item.value ? "✓" : ""}</span></button>)}</div>
      <div className="custom-color"><label><span>Kendi rengin</span><input type="color" aria-label="Özel vurgu rengi" value={color} onChange={(event) => onChange({ ...theme, accent: event.target.value })} /></label><label><span>HEX renk kodu</span><input aria-invalid={!validHex} maxLength={7} value={hex} onChange={(event) => { setHex(event.target.value); if (/^#[a-fA-F0-9]{6}$/.test(event.target.value)) onChange({ ...theme, accent: event.target.value }); }} /></label></div>
      {!validHex && <small role="status">Altı haneli bir renk kodu gir: örneğin #83b9e8. Son geçerli renk korunur.</small>}
    </div>

  </>;
  const writing = <>
    <h3 className="settings-group settings-full">Yazı</h3>
    <Choice label="Tipografi" value={theme.typography} onChange={set("typography")} options={[
      { value: "modern", label: "Modern", preview: <b className="type-sans">Aa</b> },
      { value: "editorial", label: "Editoryal", preview: <b className="type-serif">Aa</b> },
      { value: "mono", label: "Terminal", preview: <b className="type-mono">Aa</b> },
    ]} />
    <Choice label="Yazı boyutu" hint="Yazı ve seri sayfalarındaki okuma metni." value={theme.textSize} onChange={set("textSize")} options={[
      { value: "small", label: "Küçük", preview: <b>A</b> }, { value: "medium", label: "Orta", preview: <b>A</b> }, { value: "large", label: "Büyük", preview: <b>A</b> },
    ]} />

  </>;
  return <div className="theme-settings">
    {readingFirst ? writing : identity}
    {readingFirst ? identity : writing}

    <h3 className="settings-group settings-full">Sayfa</h3>
    <Choice label="Sayfa atmosferi" value={theme.surface} onChange={set("surface")} options={[
      { value: "paper", label: "Kâğıt", preview: <i /> }, { value: "warm", label: "Sıcak arşiv", preview: <i /> }, { value: "night", label: "Gece", preview: <i /> },
    ]} />
    <Choice label="Zemin dokusu" value={theme.texture} onChange={set("texture")} options={[
      { value: "plain", label: "Düz", preview: <i /> }, { value: "dots", label: "Noktalı", preview: <i /> }, { value: "lines", label: "Çizgili", preview: <i /> },
    ]} />
    <Choice label="İçerik genişliği" value={theme.width} onChange={set("width")} options={[
      { value: "reading", label: "Odaklı okuma", preview: lines(3) }, { value: "wide", label: "Geniş vitrin", preview: lines(3) },
    ]} />
    <Choice label="Bölüm aralıkları" value={theme.spacing} onChange={set("spacing")} options={[
      { value: "airy", label: "Ferah", preview: lines(3) }, { value: "compact", label: "Kompakt", preview: lines(3) },
    ]} />

    <h3 className="settings-group settings-full">Şekil</h3>
    <Choice label="Köşeler" hint="Yazı ve seri kartlarıyla kapakların köşeleri." value={theme.corners} onChange={set("corners")} options={[
      { value: "sharp", label: "Keskin", preview: <i /> }, { value: "soft", label: "Yumuşak", preview: <i /> }, { value: "round", label: "Yuvarlak", preview: <i /> },
    ]} />
    <Choice label="Kartlar" value={theme.cards} onChange={set("cards")} options={[
      { value: "outlined", label: "Çerçeveli", preview: <i /> }, { value: "raised", label: "Gölgeli", preview: <i /> }, { value: "flat", label: "Düz", preview: <i /> },
    ]} />
    <p className="property-note settings-full">Hepsi taslaktır; ana sayfa ve okuma sayfaları ancak “Temayı uygula” ile değişir. Karakter sahnesi ekranı dolduran özel düzenini korur.</p>
  </div>;
}
