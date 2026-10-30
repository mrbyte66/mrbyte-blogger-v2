"use client";
import { useEffect, useState } from "react";
import { api } from "../lib/api/http";
import type { Output } from "../lib/api/contract";
import { useAuth } from "./auth/AuthProvider";

const gb = (bytes: number) => (bytes / 1e9).toLocaleString("tr-TR", { maximumFractionDigits: bytes < 10e9 ? 1 : 0 });

/** Free space of the server disk, shown only to the owner (Studio access); nobody else requests or sees it. */
export function ServerStorage() {
  const { session } = useAuth();
  const owner = session?.profile.role === "owner";
  const [disk, setDisk] = useState<{ freeBytes: number; totalBytes: number } | null>(null);
  useEffect(() => {
    if (!owner) { setDisk(null); return; }
    let live = true;
    api<Output<"studioGetStorage">>("GET", "/studio/storage").then(({ data }) => { if (live) setDisk(data); }).catch(() => undefined);
    return () => { live = false; };
  }, [owner]);
  if (!owner || !disk) return null;
  const low = disk.freeBytes < disk.totalBytes * 0.1;
  return <span className={`footer-storage${low ? " is-low" : ""}`} title="Yalnız sana görünür">Sunucu: {gb(disk.freeBytes)} GB boş / {gb(disk.totalBytes)} GB</span>;
}
