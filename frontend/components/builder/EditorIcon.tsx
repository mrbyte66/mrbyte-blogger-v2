import type { CSSProperties } from "react";
export function EditorIcon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    title:"M4 5h16M12 5v14M8 19h8", excerpt:"M4 6h16M4 12h16M4 18h10", body:"M4 5h16M4 10h16M4 15h16M4 20h10",
    cover:"M3 4h18v16H3zM3 16l6-6 5 5 3-3 4 4M16 8h.01", figure:"M3 4h18v16H3zM3 16l6-6 5 5 3-3 4 4M16 8h.01",
    code:"m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16", table:"M3 4h18v16H3zM3 10h18M9 4v16",
    meta:"M12 11v7M12 7h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    publication:"M5 5h14v16H5zM8 3v4M16 3v4M5 10h14M9 14h6",
    layout:"M3 4h18v16H3zM9 4v16", chapters:"M7 4h14v16H7zM3 7v10M11 9h6M11 14h6",
    summary:"M4 6h16M4 12h16M4 18h10", desktop:"M3 4h18v13H3zM8 21h8M12 17v4",
    mobile:"M7 2h10v20H7zM11 18h2", focus:"M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5",
    settings:"M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6",
    close:"m6 6 12 12M6 18 18 6", back:"m14 6-6 6 6 6", check:"m5 12 4 4L19 6",
    undo:"M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12", redo:"m16 4 5 5-5 5M21 9H10a6 6 0 0 0 0 12",
    bold:"M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z", italic:"M10 5h8M6 19h8M14 5 10 19",
    link:"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    unlink:"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1M4 4l16 16",
    up:"m6 14 6-6 6 6", down:"m6 10 6 6 6-6", plus:"M12 4v16M4 12h16", series:"M7 3h14v16H7zM3 7v14h14",
    pages:"M7 3.5h7l4 4v13H7zM14 3.5v4h4", homepage:"M4 4h16v16H4zM4 10h16M10 10v10", stats:"M5.5 19v-7M12 19V5M18.5 19v-4",
    note:"M5 4h14v12l-5 5H5zM14 21v-5h5", goal:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
    paragraph:"M13 4v16M17 4v16M13 4H9a4 4 0 0 0 0 8h4", heading:"M6 4v16M18 4v16M6 12h12", quote:"M7 8h4v4a4 4 0 0 1-4 4M15 8h4v4a4 4 0 0 1-4 4",
    device:"M3 5h18v11H3zM8 20h8M12 16v4", search:"M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.5-4.5",
    grid:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", list:"M4 6h16M4 12h16M4 18h16", user:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0} as CSSProperties}><path d={paths[name] ?? paths.settings}/></svg>;
}
