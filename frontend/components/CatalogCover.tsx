"use client";

import { useState } from "react";

/** Card art, decorative by default (the adjacent title names it); `alt` describes a standalone cover. */
export function CatalogCover({ src, fallback, className = "", loading = "lazy", alt = "" }: { src?: string; fallback: string; className?: string; loading?: "lazy" | "eager"; alt?: string }) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const image = [src, fallback].find((source) => source && !failedSources.includes(source));
  const classes = `catalog-cover ${className}`;
  return image
    ? <img className={classes} src={image} alt={alt} width={1200} height={720} loading={loading} decoding="async" onError={() => setFailedSources((failed) => [...failed, image])} />
    : <span className={classes} aria-hidden="true" />;
}
