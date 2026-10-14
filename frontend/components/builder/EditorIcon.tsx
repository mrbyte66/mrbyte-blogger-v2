import type { CSSProperties } from "react";
export function EditorIcon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    microphone:"M9 4a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0zM6 10v1a6 6 0 0 0 12 0v-1M12 17v4M8 21h8",
    title:"M4 5h16M12 5v14M8 19h8", excerpt:"M4 6h16M4 12h11M4 18h7", body:"M4 5h16M4 10h16M4 15h16M4 20h10",
    cover:"M6 3h12v18H6zM6 15l3.5-3.5 3 3 2-2 3.5 3.5M14.5 7.5h.01", figure:"M3 4h18v16H3zM3 16l6-6 5 5 3-3 4 4M16 8h.01",
    code:"m8 6-6 6 6 6m8-12 6 6-6 6m-3-14-2 16", table:"M3 4h18v16H3zM3 10h18M9 4v16",
    meta:"M12 11v7M12 7h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
    publication:"M5 5h14v16H5zM8 3v4M16 3v4M5 10h14M9 14h6",
    layout:"M3 4h18v16H3zM9 4v16", chapters:"M7 4h14v16H7zM3 7v10M11 9h6M11 14h6",
    summary:"M4 6h16M4 12h11M4 18h7", desktop:"M3 4h18v13H3zM8 21h8M12 17v4",
    mobile:"M7 2h10v20H7zM11 18h2", focus:"M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5",
    settings:"M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2zM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
    design:"M12 21a9 9 0 1 1 9-9c0 2.2-1.8 3.2-3.6 3.2H15.5a1.9 1.9 0 0 0-1.4 3.2c.8.9.1 2.6-2.1 2.6zM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01M17 11h.01",
    structure:"M4 4h16v4H4zM4 10h16v4H4zM4 16h16v4H4z", views:"M3 4h18v16H3zM8.5 4v16M8.5 14.5H21",
    close:"m6 6 12 12M6 18 18 6", back:"m14 6-6 6 6 6", check:"m5 12 4 4L19 6",
    undo:"M8 4 3 9l5 5M3 9h11a6 6 0 0 1 0 12", redo:"m16 4 5 5-5 5M21 9H10a6 6 0 0 0 0 12",
    bold:"M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z", italic:"M10 5h8M6 19h8M14 5 10 19",
    link:"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    unlink:"M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1M4 4l16 16",
    up:"m6 14 6-6 6 6", down:"m6 10 6 6 6-6", plus:"M12 4v16M4 12h16", series:"M7 3h14v16H7zM3 7v14h14",
    pages:"M8 3h8.5l3.5 3.5V19H8zM16.5 3v3.5H20M4 7v14h12", article:"M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6", homepage:"M3 11 12 3.5l9 7.5M5.5 9v12h13V9M10 21v-6h4v6", stats:"M5.5 19v-7M12 19V5M18.5 19v-4",
    note:"M5 4h14v12l-5 5H5zM14 21v-5h5", notes:"M5 4h14v12l-5 5H5zM14 21v-5h5M8.5 9h7M8.5 12.5h4", goal:"M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
    paragraph:"M13 4v16M17 4v16M13 4H9a4 4 0 0 0 0 8h4", heading:"M6 4v16M18 4v16M6 12h12", quote:"M7 8h4v4a4 4 0 0 1-4 4M15 8h4v4a4 4 0 0 1-4 4",
    device:"M3 5h18v11H3zM8 20h8M12 16v4", search:"M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.5-4.5",
    grid:"M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z", list:"M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
    trash:"M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6", strike:"M5 12h14M16 6.5c-.7-1.5-2.2-2.5-4.2-2.5C9.4 4 8 5.4 8 7c0 1.6 1.2 2.4 3 3M8 17.5c.7 1.5 2.3 2.5 4.3 2.5 2.4 0 4-1.4 4-3.2 0-.9-.3-1.6-.9-2.1",
    highlight:"m9 11-5 5v4h4l5-5M9 11l6-6 4 4-6 6M9 11l4 4M3 21h18", clear:"M6 5h12M12 5 8 19M4 4l16 16", user:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0",
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0} as CSSProperties}><path d={paths[name] ?? ""}/></svg>;
}
