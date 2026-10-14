"use client";
import { useEffect, useState } from "react";
import { api, describe } from "../../lib/api/http";

type Settings = { indexingEnabled: boolean; deploymentIndexingEnabled: boolean; version: number };
export function SiteIndexing() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function load() {
    setError("");
    try { setSettings((await api<Settings>("GET", "/studio/site")).data); }
    catch (e) { setError(describe(e)); }
  }
  useEffect(() => { void load(); }, []);
  async function toggle() {
    if (!settings || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await api<Settings>("PATCH", "/studio/site", { ifMatch: settings.version, body: { indexingEnabled: !settings.indexingEnabled } });
      setSettings(result.data); setMessage("Site tercihi kaydedildi.");
    } catch (e) { setError(describe(e)); }
    finally { setBusy(false); }
  }
  return <section className="studio-indexing" aria-labelledby="indexing-title"><span className="studio-eyebrow">ARAMA MOTORLARI</span><h3 id="indexing-title">Keşfedilebilirlik</h3><label className="studio-indexing-switch"><span>Siteyi indekslemeye aç</span><input type="checkbox" role="switch" checked={settings?.indexingEnabled ?? false} disabled={!settings || busy} onChange={toggle} /></label><p>Kapalıyken site, yazılar ve seriler arama sonuçlarına kapalıdır. Bu tercih hemen kaydedilir.</p>{settings && !settings.deploymentIndexingEnabled && <p>Bu geliştirme ortamı her durumda indekslemeye kapalıdır.</p>}<span role="status">{busy ? "Kaydediliyor…" : message}</span>{error && <div role="alert"><p>{error}</p><button className="studio-secondary" onClick={load}>Ayarı yeniden yükle</button></div>}</section>;
}
