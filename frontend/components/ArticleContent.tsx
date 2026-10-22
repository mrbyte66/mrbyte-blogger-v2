"use client";
import { articleCategories, articleDate, formatArticleDate } from "../lib/articles/metadata";

import { ArticleNotesLink } from "./reading/ArticleNotesLink";
import { SlideLink } from "./SlideLink";
import { useState } from "react";
import type { Article } from "../lib/content";
import { ArticleEngagement } from "./ArticleEngagement";
import { MarkedText } from "./MarkedText";
import { markedHtml } from "../lib/articles/marked-html";
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
  const Tag=format?.kind==="heading" ? format.level===3 ? "h3" : "h2" : format?.kind==="quote" ? "blockquote" : "p";
  const marks=format?.kind==="heading" ? undefined : article.paragraphMarks?.[index];
  const identity={"data-edit-field":`paragraph-${index}`,"data-reading-anchor":article.blockIds?.paragraphs[index] ?? `paragraph-${index}`,"data-reading-legacy":`paragraph-${index}`};
  // In the Studio canvas the paragraph is edited in place, so React hands over its children (escaped HTML).
  return <>{preview ? <Tag {...identity} dangerouslySetInnerHTML={{__html:markedHtml(text,marks)}} /> : <Tag {...identity}><MarkedText text={text} marks={marks} /></Tag>}{format?.kind==="quote" && format.attribution && <cite className="article-quote-attribution">{format.attribution}</cite>}</>;
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
    {!readingPreview && !article.authored && <div className="article-end"><span aria-hidden="true">✳</span><p>Şimdilik bu kadar.<br />Bir sonraki satırda görüşürüz.</p></div>}
    {!readingPreview && !fullPage && <div className="reading-links"><SlideLink className="reading-permalink" href={`/yazilar/${article.slug}`}>Bu yazının kalıcı bağlantısını aç ↗</SlideLink>{!preview&&<ArticleNotesLink key={article.slug} article={article}/>}</div>}
    {!readingPreview && !article.authored && <p className="sample-note">Bu metin, okuma deneyimini göstermek için hazırlanmış bir örnektir.</p>}
  </article>{!readingPreview && <ArticleEngagement key={article.slug} slug={article.slug} title={article.title} preview={preview} />}</>;
}
