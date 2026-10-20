"use client";
import { useEffect, useState } from "react";

const dateFormat = new Intl.DateTimeFormat("tr-TR", { weekday: "long", day: "numeric", month: "long" });
const timeFormat = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

/** Local wall time; refresh exactly at minute boundaries and when returning to the tab. */
export function StudioClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      clearTimeout(timer);
      setNow(new Date());
      timer = setTimeout(refresh, 60_000 - Date.now() % 60_000);
    }
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    refresh();
    document.addEventListener("visibilitychange", visible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);
  return <time className="studio-clock" aria-label="Tarih ve saat" dateTime={now?.toISOString()}>
    <span className="studio-clock-date">{now ? dateFormat.format(now) : "\u00a0"}</span>
    <span className="studio-clock-time">{now ? timeFormat.format(now) : "—:—"}</span>
  </time>;
}
