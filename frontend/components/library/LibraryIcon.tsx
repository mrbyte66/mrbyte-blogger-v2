import type { CSSProperties } from "react";
type Kind = "pin" | "search" | "grid" | "list" | "bookmark" | "folder" | "arrow" | "close" | "plus" | "lock" | "device" | "link";
const paths: Record<Kind, string> = {
 pin: "M9 3h6l-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v7",
 search: "M21 21l-5-5M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z",
 grid: "M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3zM15 15h6v6h-6z",
 list: "M9 5h12M9 12h12M9 19h12M3 5h1M3 12h1M3 19h1",
 bookmark: "M6 3h12v18l-6-4-6 4V3Z", folder: "M3 7V4h6l3 3h9v13H3V7Z",
 arrow: "M4 12h16m-6-6 6 6-6 6", close: "m6 6 12 12M6 18 18 6", plus: "M12 4v16M4 12h16",
 lock: "M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3M12 14v3", device: "M3 3h18v13H3zM8 21h8M12 16v5",
 link: "m9 15 6-6m-4-4 2-2a5 5 0 0 1 7 7l-3 3M7 11l-3 3a5 5 0 0 0 7 7l2-2",
};
export function LibraryIcon({ kind, style }: { kind: Kind; style?: CSSProperties }) { return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style}><path d={paths[kind]} /></svg>; }
