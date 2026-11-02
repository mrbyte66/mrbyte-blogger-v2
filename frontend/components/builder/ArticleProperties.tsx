"use client";
import { PublicationSchedule } from "./PublicationSchedule";
import { articleCategories, articleDate } from "../../lib/articles/metadata";
import { type Article } from "../../lib/content";
import { ArticleCategoryField } from "./ArticleCategoryField";
import { ImageUpload } from "./ImageUpload";
import { CoverField } from "./CoverSearch";
import { EditorIcon } from "./EditorIcon";
import { maxSources, type ArticleSource } from "../../lib/articles/blocks";
export function TextField({ label, value, onChange, multiline = false }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return <label className="studio-field"><span>{label}</span>{multiline ? <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)} /> : <input value={value} onChange={(e) => onChange(e.target.value)} />}</label>;
}
export const articleFields = [["title", "Başlık"], ["excerpt", "Özet / abstract"], ["cover", "Kapak görseli"], ["body", "Metin ve paragraflar"], ["figure", "Görsel"], ["code", "Kod örneği"], ["table", "Tablo"], ["meta", "Yazı bilgileri"], ["sources", "Kaynaklar"], ["publication", "Yayın planı"], ["layout", "Sayfa düzeni"]] as const;
export function ArticleProperties({ article, field, onChange, allowSlugEdit = false, onSchedule, onCancelSchedule, scheduleDisabled = false }: { onSchedule?: () => void; onCancelSchedule?: () => void; scheduleDisabled?: boolean; allowSlugEdit?: boolean; article: Article; field: string; onChange: (a: Article) => void }) {
  const update = (change: Partial<Article>) => onChange({ ...article, ...change });
  const presentation = article.presentation ?? { width: "comfortable", heading: "left", showMeta: true };
  if (field === "publication") return <>{article.visibility === "private" && <div role="note"><p>Bu eski özel kayıt yalnızca sana açık. Yayına hazırlamak için önce kamu taslağına dönüştür.</p><button type="button" onClick={() => update({visibility:"public",status:"draft"})}>Kamu yayınına hazırla</button></div>}<PublicationSchedule article={article} onChange={onChange} onSchedule={onSchedule} onCancel={onCancelSchedule} disabled={scheduleDisabled || article.visibility === "private"} /></>;
  if (field === "sources") return <SourcesField sources={article.sources ?? []} onChange={(sources) => update({ sources })} />;
  if (field === "title") return <TextField label="Yazı başlığı" value={article.title} onChange={(title) => update({ title })} />;
  if (field === "cover") return <CoverField cover={article.coverUrl} resource={article.id && article.version !== undefined ? { type: "article", id: article.id, version: article.version } : null} privateContent={article.visibility === "private"} suggestedQuery={article.title} previewAlt="Yazı kapağı önizlemesi" onChange={(coverUrl) => update({ coverUrl })} />;
  if (field === "excerpt") return <TextField label="Özet / abstract" value={article.excerpt} multiline onChange={(excerpt) => update({ excerpt })} />;
  if (field === "meta") return <><TextField label="Üst başlık" value={article.eyebrow} onChange={(eyebrow) => update({ eyebrow })} /><ArticleCategoryField article={article} onChange={update} /><label className="studio-field"><span>Yazı tarihi</span><input type="date" required value={articleDate(article)} onChange={(e) => update({ publishedAt: e.target.value })} /></label><p className="property-note">Yazılar en yeni tarihten başlayarak sıralanır. Serideki bölüm sırası değişmez.</p><label className="studio-field"><span>Okuma süresi (dakika)</span><input type="number" min={1} max={240} value={article.minutes} onChange={(e) => update({ minutes: Number(e.target.value) })} /></label><>{allowSlugEdit && <TextField label="Kalıcı bağlantı adı" value={article.slug} onChange={(slug) => update({ slug })} />}<p className="property-note">Kalıcı bağlantı: /yazilar/{article.slug}{article.firstPublishedAt ? " · İlk yayından sonra değiştirilemez." : " · İlk yayına kadar düzenleyebilirsin."}</p></></>;
  if (field === "layout") return <><label className="studio-field"><span>İçerik genişliği</span><select value={presentation.width} onChange={(e) => update({ presentation: { ...presentation, width: e.target.value as "comfortable" | "wide" } })}><option value="comfortable">Rahat okuma</option><option value="wide">Geniş içerik</option></select></label><label className="document-checkbox"><input type="checkbox" checked={presentation.showMeta} onChange={(e) => update({ presentation: { ...presentation, showMeta: e.target.checked } })} />Etiketler, tarih ve okuma süresini göster</label></>;
  if (field === "figure") return <>{article.figure ? <><TextField label="Görsel adresi" value={article.figure.src} onChange={(src) => update({ figure: { ...article.figure!, src } })} /><TextField label="Alternatif metin" value={article.figure.alt} onChange={(alt) => update({ figure: { ...article.figure!, alt } })} /><TextField label="Görsel açıklaması" value={article.figure.caption} onChange={(caption) => update({ figure: { ...article.figure!, caption } })} /><ImageUpload label="Görseli değiştir" onUploaded={(src, size) => update({ figure: { ...article.figure!, src, ...(size ?? {}) } })} /><button className="studio-remove" onClick={() => update({ figure: undefined })}>Görseli kaldır</button></> : <ImageUpload label="Görsel yükle" onUploaded={(src, size) => update({ figure: { src, alt: "", caption: "", width: size?.width ?? 1200, height: size?.height ?? 675 } })} />}<p className="property-note">JPEG, PNG veya hareketli GIF yükle (en fazla 10 MiB). Sunucu görseli yeniden kodlar ve konum gibi gizli bilgileri siler. Site içi /assets/ yolları da kullanılabilir.</p></>;
  if (field === "code") return <><TextField label="Kod örneği" multiline value={article.code ?? ""} onChange={(code) => update({ code: code || undefined })} /><p className="property-note">Boş bırakılırsa kod bölümü görünmez.</p></>;
  if (field === "table") return article.table ? <><TextField label="Tablo açıklaması" value={article.table.caption} onChange={(caption) => update({ table: { ...article.table!, caption } })} />{article.table.columns.map((column, i) => <TextField key={i} label={`Sütun ${i + 1}`} value={column} onChange={(v) => update({ table: { ...article.table!, columns: article.table!.columns.map((c, j) => j === i ? v : c) } })} />)}{article.table.rows.map((row, r) => <fieldset className="document-table-row" key={r}><legend>Satır {r + 1}</legend>{row.map((cell, c) => <TextField key={c} label={article.table!.columns[c] || `Sütun ${c + 1}`} value={cell} onChange={(v) => update({ table: { ...article.table!, rows: article.table!.rows.map((item, i) => i === r ? item.map((old, j) => j === c ? v : old) : item) } })} />)}<button onClick={() => update({ table: { ...article.table!, rows: article.table!.rows.filter((_, i) => i !== r) } })}>Satırı kaldır</button></fieldset>)}<button className="studio-secondary" onClick={() => update({ table: { ...article.table!, rows: [...article.table!.rows, article.table!.columns.map(() => "")] } })}>Satır ekle</button><button className="studio-secondary" disabled={article.table.columns.length >= 20} onClick={() => update({ table: { ...article.table!, columns: [...article.table!.columns, "Yeni sütun"], rows: article.table!.rows.map((r) => [...r, ""]) } })}>Sütun ekle</button><button className="studio-remove" onClick={() => update({ table: undefined })}>Tabloyu kaldır</button></> : <button className="studio-secondary" onClick={() => update({ table: { caption: "", columns: ["Başlık", "Açıklama"], rows: [["", ""]] } })}>Tablo ekle</button>;
  const selectedIndex = field.startsWith("paragraph-") ? Number(field.slice(10)) : null;
  const picture = selectedIndex === null ? undefined : article.paragraphFormats?.[selectedIndex];
  if (selectedIndex !== null && picture?.kind === "image") return <ArticleImageProperties article={article} index={selectedIndex} onChange={onChange} />;
  return <>{article.paragraphs.map((paragraph, index) => (selectedIndex === null || index === selectedIndex) && <div key={index} className="document-paragraph"><TextField label={`Paragraf ${index + 1}`} value={paragraph} multiline onChange={(value) => update({ paragraphs: article.paragraphs.map((p, i) => i === index ? value : p) })} /><div className="document-order">{([-1, 1] as const).map((direction) => <button key={direction} disabled={index + direction < 0 || index + direction >= article.paragraphs.length} aria-label={`Paragraf ${index + 1} ${direction === -1 ? "yukarı" : "aşağı"}`} onClick={() => { const paragraphs = [...article.paragraphs]; [paragraphs[index], paragraphs[index + direction]] = [paragraphs[index + direction], paragraphs[index]]; const formats=article.paragraphs.map((_,i)=>article.paragraphFormats?.[i] ?? {kind:"paragraph" as const});
      [formats[index],formats[index+direction]]=[formats[index+direction],formats[index]];
      const ids=article.blockIds ? {...article.blockIds,paragraphs:[...article.blockIds.paragraphs]} : undefined;
      if(ids) [ids.paragraphs[index],ids.paragraphs[index+direction]]=[ids.paragraphs[index+direction],ids.paragraphs[index]];
      update({ paragraphs, paragraphFormats:formats, ...(ids ? {blockIds:ids} : {}) }); }}>{direction === -1 ? "↑" : "↓"}</button>)}<button disabled={article.paragraphs.length === 1} onClick={() => update({ paragraphs: article.paragraphs.filter((_, i) => i !== index), ...(article.paragraphFormats ? {paragraphFormats:article.paragraphFormats.filter((_,i)=>i!==index)} : {}), ...(article.blockIds ? {blockIds:{...article.blockIds,paragraphs:article.blockIds.paragraphs.filter((_,i)=>i!==index)}} : {}) })}>Paragrafı kaldır</button></div></div>)}<button className="studio-secondary" onClick={() => update({ paragraphs: [...article.paragraphs, "Yeni paragraf."], ...(article.paragraphFormats ? {paragraphFormats:[...article.paragraphFormats,{kind:"paragraph"}]} : {}), ...(article.blockIds ? {blockIds:{...article.blockIds,paragraphs:[...article.blockIds.paragraphs,crypto.randomUUID()]}} : {}) })}>Paragraf ekle</button></>;
}

/** The article's bibliography: shown after the text, numbered, titles in italics. Untitled rows are not saved. */
function SourcesField({ sources, onChange }: { sources: readonly ArticleSource[]; onChange: (sources: ArticleSource[]) => void }) {
  const set = (index: number, change: Partial<ArticleSource>) => onChange(sources.map((source, i) => i === index ? clean({ ...source, ...change }) : { ...source }));
  const move = (index: number, direction: -1 | 1) => { const next = sources.map((source) => ({ ...source })); [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(next); };
  const badUrl = (url?: string) => !!url && !/^https:\/\/\S+$/.test(url.trim());
  return <>
    <p className="property-note">Yazının sonunda “Kaynaklar” başlığıyla, numaralı ve başlıkları italik gösterilir. Yalnız başlığı olan kaynaklar kaydedilir.</p>
    <ol className="source-list">{sources.map((source, index) => <li className="source-card" key={index} aria-label={`Kaynak ${index + 1}`}>
      <div className="source-card-head"><strong>Kaynak</strong>
        <button type="button" disabled={index === 0} aria-label={`Kaynak ${index + 1} yukarı`} title="Yukarı taşı" onClick={() => move(index, -1)}><EditorIcon name="up" size={16}/></button>
        <button type="button" disabled={index === sources.length - 1} aria-label={`Kaynak ${index + 1} aşağı`} title="Aşağı taşı" onClick={() => move(index, 1)}><EditorIcon name="down" size={16}/></button>
        <button type="button" aria-label="Kaynağı kaldır" title="Kaldır" onClick={() => onChange(sources.filter((_, i) => i !== index).map((item) => ({ ...item })))}><EditorIcon name="trash" size={16}/></button>
      </div>
      <TextField label="Başlık" value={source.title} onChange={(title) => set(index, { title })} />
      <div className="source-card-row"><TextField label="Yazar veya site" value={source.publisher ?? ""} onChange={(publisher) => set(index, { publisher })} /><TextField label="Yıl" value={source.year ?? ""} onChange={(year) => set(index, { year })} /></div>
      <label className="studio-field"><span>Bağlantı</span><textarea className="source-url" rows={2} inputMode="url" spellCheck={false} placeholder="https://…" aria-invalid={badUrl(source.url)} value={source.url ?? ""} onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }} onChange={(e) => set(index, { url: e.target.value.replace(/\s+/g, "") })} /></label>
      {badUrl(source.url) && <p className="source-warning" role="alert">Bağlantı https:// ile başlamalı.</p>}
    </li>)}</ol>
    <button type="button" className="studio-secondary source-add" disabled={sources.length >= maxSources} onClick={() => onChange([...sources.map((source) => ({ ...source })), { title: "" }])}>Kaynak ekle</button>
  </>;
}
/** Optional fields are left out instead of kept empty. */
function clean(source: ArticleSource): ArticleSource {
  return { title: source.title.slice(0, 300), ...(source.publisher ? { publisher: source.publisher.slice(0, 200) } : {}), ...(source.year ? { year: source.year.slice(0, 20) } : {}), ...(source.url ? { url: source.url.slice(0, 500) } : {}) };
}

/** A picture placed in the text: upload or replace it, describe it, or remove it from the text. */
function ArticleImageProperties({ article, index, onChange }: { article: Article; index: number; onChange: (a: Article) => void }) {
  const image = article.paragraphFormats![index].image ?? { src: "", alt: "", caption: "", width: 1200, height: 675 };
  const setImage = (next: Partial<typeof image>) => onChange({ ...article, paragraphFormats: article.paragraphFormats!.map((format, i) => i === index ? { kind: "image", image: { ...image, ...next } } : format) });
  const remove = () => onChange({ ...article, paragraphs: article.paragraphs.filter((_, i) => i !== index), paragraphFormats: article.paragraphFormats!.filter((_, i) => i !== index), ...(article.paragraphMarks ? { paragraphMarks: article.paragraphMarks.filter((_, i) => i !== index) } : {}), ...(article.blockIds ? { blockIds: { ...article.blockIds, paragraphs: article.blockIds.paragraphs.filter((_, i) => i !== index) } } : {}) });
  return <>
    {image.src && <img className="property-image-preview" src={image.src} alt="" />}
    <ImageUpload label={image.src ? "Görseli değiştir" : "Görsel yükle"} onUploaded={(src, size) => setImage({ src, ...(size ?? {}) })} />
    <TextField label="Alternatif metin" value={image.alt} onChange={(alt) => setImage({ alt })} />
    <TextField label="Görsel açıklaması" value={image.caption} onChange={(caption) => setImage({ caption })} />
    <button className="studio-remove" onClick={remove}>Görseli metinden kaldır</button>
    <p className="property-note">JPEG, PNG veya hareketli GIF yükle (en fazla 10 MiB). Görsel metinde bu noktada görünür; paragraflarla birlikte taşınır. Yüklenmemiş görsel kaydedilmez.</p>
  </>;
}
