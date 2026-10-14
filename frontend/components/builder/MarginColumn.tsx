"use client";
import type { DocumentDraft } from "../../lib/builder/document-protocol";
import type { Article } from "../../lib/content";
import { articleWords } from "../../lib/studio/writing";
import { NotesPanel } from "./NotesPanel";
import { WordGoal } from "./WordGoal";

const excerptLimit = 4000;

/**
 * The right-hand margin of Marjinalya: the page's address, summary length, cover and reading time at
 * a glance, then the owner's private notes. Every control opens the same settings the field list does.
 */
export function MarginColumn({ draft, saved, field, isNew, slugEdited, onOpenField }: { draft: DocumentDraft; saved: DocumentDraft | null; field: string; isNew: boolean; slugEdited: boolean; onOpenField: (id: string) => void }) {
  if (draft.kind === "series") {
    const { series } = draft;
    return <aside className="studio-margin" aria-label="Kenar notları">
      <section className="margin-card"><h3 className="margin-label">ADRES</h3><p className="margin-address">/seriler/{series.slug}</p><p className="margin-hint">Kalıcı adres · bölüm sayısı {series.articleSlugs.length}</p></section>
      <section className="margin-card"><div className="margin-row"><h3 className="margin-label">AÇIKLAMA</h3><span className="margin-count">{series.summary.length} / 1000</span></div><Bar value={series.summary.length / 1000} /><p className="margin-hint">Seri sayfasında ve listelerde bu metin görünür.</p><button type="button" className="margin-link" onClick={() => onOpenField("summary")}>Açıklamayı düzenle</button></section>
    </aside>;
  }
  const article: Article = draft.article;
  const savedArticle = saved?.kind === "article" ? saved.article : undefined;
  const words = articleWords(article);
  return <aside className="studio-margin" aria-label="Kenar notları">
    <section className="margin-card margin-goal"><WordGoal current={article} saved={savedArticle ?? article} line /></section>
    <section className="margin-card">
      <h3 className="margin-label">ADRES</h3>
      <p className="margin-address">/yazilar/{article.slug}</p>
      <p className="margin-hint">{isNew && !slugEdited ? "Başlıktan türetildi" : isNew ? "Elle belirlendi" : "Kalıcı adres, yayından sonra değişmez"}{isNew && <> · <button type="button" className="margin-link" onClick={() => onOpenField("meta")}>düzenle</button></>}</p>
    </section>
    <section className="margin-card">
      <div className="margin-row"><h3 className="margin-label">ÖZET</h3><span className="margin-count">{article.excerpt.length} / {excerptLimit}</span></div>
      <Bar value={article.excerpt.length / excerptLimit} />
      <p className="margin-hint">Kartlarda ve arama sonuçlarında bu metin görünür. <button type="button" className="margin-link" onClick={() => onOpenField("excerpt")}>Özeti düzenle</button></p>
    </section>
    <section className="margin-card margin-cover">
      <h3 className="margin-label">KAPAK</h3>
      {article.coverUrl ? <img className="margin-cover-image" src={article.coverUrl} alt="" /> : <span className="margin-cover-empty">Henüz kapak yok</span>}
      <div className="margin-buttons">
        <button type="button" className="studio-secondary" onClick={() => onOpenField("cover")}>{article.coverUrl ? "Kapağı değiştir" : "Kapak ekle"}</button>
        <button type="button" className="margin-accent" onClick={() => onOpenField("cover")}>Çevrimiçi bul</button>
      </div>
      <p className="margin-hint">JPEG veya PNG, en fazla 10 MiB. Kapak yalnız sen değiştirdiğinde değişir.</p>
    </section>
    <section className="margin-card"><p className="margin-reading">Okuma süresi {article.minutes} dk · {words.toLocaleString("tr-TR")} kelime</p></section>
    <NotesPanel article={article} field={field} />
  </aside>;
}

function Bar({ value }: { value: number }) {
  return <div className="margin-bar" role="presentation"><span style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} /></div>;
}
