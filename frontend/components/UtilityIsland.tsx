import type { ReactNode } from "react";

/** The same utility shell on the public site, reader and Studio; callers keep their own tools. */
export function UtilityIsland({ children, className = "", label = "Sayfa araçları", inert = false }: { children: ReactNode; className?: string; label?: string; inert?: boolean }) {
  return <div className={`utility-island ${className}`.trim()} role="group" aria-label={label} inert={inert}>{children}</div>;
}
