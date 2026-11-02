"use client";
import { articleCategories, articleDate, formatArticleDate } from "../lib/articles/metadata";

import { useState } from "react";
import type { Article } from "../lib/content";
import { ArticleEngagement } from "./ArticleEngagement";
import { MarkedText } from "./MarkedText";
import { markedHtml } from "../lib/articles/marked-html";
import { calloutLabels, listHtml, listLines, type ArticleSource, type CalloutTone } from "../lib/articles/blocks";
import { usePermalinkView } from "../lib/reactions/use-views";

function CodeBlock({ code, language = "java" }: { code: string; language?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch { setStatus("error"); }
  }
  return <div className="code-block" data-edit-field="code">
    <div className="code-toolbar"><span>{language === "plain" ? "ÖRNEK" : language.toUpperCase()}</span><button onClick={copy}>{status === "copied" ? "Kopyalandı" : "Kodu kopyala"}</button></div>
    <pre><code>{code}</code></pre>
    <span className="copy-status" role="status">{status === "error" ? "Kopyalanamadı. Kodu seçerek kopyalayabilirsin." : ""}</span>
  </div>;
}

function ParagraphContent({article,index,text,preview}: {article:Article;index:number;text:string;preview:boolean}) {
  const format=article.paragraphFormats?.[index];
  if (format?.kind === "image") {
    const image = format.image;
    const identity={"data-edit-field":`paragraph-${index}`,"data-reading-anchor":article.blockIds?.paragraphs[index] ?? `paragraph-${index}`};
    if (!image?.src) return preview ? <figure {...identity} className="article-figure-pending"><span>Görsel yükle · sağ panelden seç</span></figure> : null;
    return <figure {...identity}><img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" />{image.caption && <figcaption>{image.caption}</figcaption>}</figure>;
  }
  if (format?.kind === "list") {
    const List = format.style === "ordered" ? "ol" : "ul";
    const identity={"data-edit-field":`paragraph-${index}`,"data-reading-anchor":article.blockIds?.paragraphs[index] ?? `paragraph-${index}`,"data-reading-legacy":`paragraph-${index}`};
    const marks=article.paragraphMarks?.[index];
    // The canvas writes the whole list as one field, so React must not own its items there.
    return preview ? <List {...identity} className="article-items" dangerouslySetInnerHTML={{__html:listHtml(text,marks)}} />
      : <List {...identity} className="article-items">{listLines(text,marks).filter((line)=>line.text.trim()).map((line,i)=><li key={i}><MarkedText text={line.text} marks={line.marks} /></li>)}</List>;
  }
  if (format?.kind === "callout") {
    const tone=format.tone ?? "note";
    return <aside className={`article-callout tone-${tone}`} aria-label={format.title || calloutLabels[tone]}><CalloutIcon tone={tone} /><div className="article-callout-body"><p className="article-callout-title" aria-hidden="true">{format.title || calloutLabels[tone]}</p><CalloutText article={article} index={index} text={text} preview={preview} /></div></aside>;
  }
  const Tag=format?.kind==="heading" ? format.level===3 ? "h3" : "h2" : format?.kind==="quote" ? "blockquote" : "p";
  const marks=format?.kind==="heading" ? undefined : article.paragraphMarks?.[index];
  const identity={"data-edit-field":`paragraph-${index}`,"data-reading-anchor":article.blockIds?.paragraphs[index] ?? `paragraph-${index}`,"data-reading-legacy":`paragraph-${index}`};
  // In the Studio canvas the paragraph is edited in place, so React hands over its children (escaped HTML).
  return <>{preview ? <Tag {...identity} dangerouslySetInnerHTML={{__html:markedHtml(text,marks)}} /> : <Tag {...identity}><MarkedText text={text} marks={marks} /></Tag>}{format?.kind==="quote" && format.attribution && <cite className="article-quote-attribution">{format.attribution}</cite>}</>;
}
/** One small line icon per tone: a spark to sum up, a note, a bulb for tips, a triangle for caution. */
function CalloutIcon({ tone }: { tone: CalloutTone }) {
  const paths: Record<CalloutTone, string> = {
    summary: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6",
    note: "M12 8h.01M11 12h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    tip: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3Z",
    warning: "M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z",
  };
  return <span className="article-callout-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[tone]} /></svg></span>;
}

function CalloutText({article,index,text,preview}: {article:Article;index:number;text:string;preview:boolean}) {
  const marks=article.paragraphMarks?.[index];
  const identity={"data-edit-field":`paragraph-${index}`,"data-reading-anchor":article.blockIds?.paragraphs[index] ?? `paragraph-${index}`,"data-reading-legacy":`paragraph-${index}`};
  return preview ? <p {...identity} dangerouslySetInnerHTML={{__html:markedHtml(text,marks)}} /> : <p {...identity}><MarkedText text={text} marks={marks} /></p>;
}

/** "Publisher (year). Title. ↗" — numbered, the title in italics, like a bibliography. */
function ArticleSources({ sources, preview = false }: { sources: readonly ArticleSource[]; preview?: boolean }) {
  const shown = sources.filter((source) => source.title.trim());
  // In the Studio canvas the area is always there, so the Sources panel is one click away.
  if (!shown.length) return preview ? <section className="article-sources is-empty" data-edit-field="sources" aria-label="Kaynaklar"><h2>Kaynaklar</h2><p>＋ Kaynak ekle · yazının sonunda numaralı kaynakça olarak görünür</p></section> : null;
  return <section className="article-sources" data-edit-field="sources" aria-labelledby="article-sources-title">
    <h2 id="article-sources-title">Kaynaklar</h2>
    <ol>{shown.map((source, i) => <li key={i}>
      {(source.publisher || source.year) && <span>{source.publisher}{source.year ? `${source.publisher ? " " : ""}(${source.year})` : ""}. </span>}
      <cite>{source.title}</cite>.
      {source.url && /^https:\/\/\S+$/.test(source.url) && <> <a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`Kaynağı aç: ${source.title}`}>↗</a></>}
    </li>)}</ol>
  </section>;
}

export function ArticleContent({ article, fullPage = false, preview = false, readingPreview = false }: { article: Article; fullPage?: boolean; preview?: boolean; readingPreview?: boolean }) {
  usePermalinkView(article.slug, fullPage && !preview && !readingPreview);
  const Heading = fullPage && !readingPreview ? "h1" : "h2";
  return <><article className="article-view" data-edit-field="body">
    <p className="eyebrow" data-edit-field="meta">{article.eyebrow}</p>
    <Heading id={readingPreview ? "library-preview-title" : "panel-title"} data-edit-field="title">{article.title}</Heading>
    {article.presentation?.showMeta !== false && <div className="article-meta" data-edit-field="meta"><span>{articleCategories(article).join(" · ")}</span><time dateTime={articleDate(article)}>{formatArticleDate(article)}</time><span>{article.minutes} dk okuma</span></div>}
    <p className="article-lead" data-edit-field="excerpt" data-reading-anchor="excerpt">{article.excerpt}</p>
    {article.paragraphs.map((paragraph, index) => <div key={index}>
      <ParagraphContent article={article} index={index} text={paragraph} preview={preview}/>
      {index === 0 && article.figure && <figure data-edit-field="figure"><img src={article.figure.src} alt={article.figure.alt} width={article.figure.width} height={article.figure.height} loading="lazy" /><figcaption>{article.figure.caption}</figcaption></figure>}
      {index === Math.min(2, article.paragraphs.length - 1) && article.code && <CodeBlock code={article.code} language={article.codeLanguage} />}
      {index === Math.min(2, article.paragraphs.length - 1) && article.table && <div className="article-table-scroll" data-edit-field="table" role="region" tabIndex={0} aria-label={`${article.table.caption}. Dar ekranda yatay kaydırılabilir.`}><table><caption>{article.table.caption}</caption><thead><tr>{article.table.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead><tbody>{article.table.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>}
    </div>)}
    {!readingPreview && (!!article.sources?.length || preview) && <ArticleSources sources={article.sources ?? []} preview={preview} />}
    {!readingPreview && !article.authored && <div className="article-end"><span aria-hidden="true">✳</span><p>Şimdilik bu kadar.<br />Bir sonraki satırda görüşürüz.</p></div>}
    {!readingPreview && !article.authored && <p className="sample-note">Bu metin, okuma deneyimini göstermek için hazırlanmış bir örnektir.</p>}
  </article>{!readingPreview && <ArticleEngagement key={article.slug} slug={article.slug} title={article.title} preview={preview} />}</>;
}
