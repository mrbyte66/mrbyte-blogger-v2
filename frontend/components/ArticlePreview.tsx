"use client";

import { useState } from "react";
import type { Article, ArticleImage } from "../lib/content";
import { articleDraftCover } from "../lib/catalog-covers";
import { CatalogCover } from "./CatalogCover";
import { ArticleNotesLink } from "./reading/ArticleNotesLink";
import { SlideLink } from "./SlideLink";

/** The article's own images in reading order: the lead figure follows the first paragraph. */
export function articleImages(article: Article): ArticleImage[] {
  const images: ArticleImage[] = [];
  article.paragraphs.forEach((_, index) => {
    const image = article.paragraphFormats?.[index]?.kind === "image" ? article.paragraphFormats[index].image : undefined;
    if (image?.src) images.push(image);
    if (index === 0 && article.figure?.src) images.push(article.figure);
  });
  return images;
}

/** The panel shows what the article is about without scrolling; the whole text lives at its permalink. */
export function ArticlePreview({ article }: { article: Article }) {
  const [failed, setFailed] = useState<string[]>([]);
  const thumbnails = articleImages(article).filter((image) => image.src !== article.coverUrl && !failed.includes(image.src)).slice(0, 2);
  const href = `/yazilar/${article.slug}`;
  return <article className="article-view article-preview"><div className="article-preview-layout">
    <CatalogCover className="article-preview-cover" src={article.coverUrl} fallback={articleDraftCover(article)} loading="eager" />
    <div className="article-preview-body">
      {article.eyebrow && <p className="eyebrow">{article.eyebrow}</p>}
      <h2 id="panel-title">{article.title}</h2>
      <p className="article-lead">{article.excerpt}</p>
      {thumbnails.length > 0 && <div className="article-preview-shots" role="group" aria-label="Yazıdan görseller"><span aria-hidden="true">Yazıdan</span>
        {thumbnails.map((image) => <img key={image.src} src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" decoding="async" onError={() => setFailed((list) => [...list, image.src])} />)}
      </div>}
      <div className="reading-links">
        <SlideLink className="article-preview-read" href={href}>Yazının tamamını oku <span aria-hidden="true">→</span><small>{article.minutes} dk</small></SlideLink>
        <ArticleNotesLink key={article.slug} article={article} />
      </div>
    </div>
  </div></article>;
}
