# Frontend sınırları

Next.js App Router/React/TypeScript; app route ve stiller, components ekran/bileşenler, lib typed model/API adapter. Kalıcı içerik ve kimlik gerçek Spring API’sindedir; fixtures ürün veri kaynağı değildir.

SSR içerik ve metadata aynı public backend snapshot’ını kullanır; 404/503 ve private/draft koruması ilk response’ta doğru olmalı. Auth cookie yalnız sabit backend’e iletilir; Studio owner authorization sunucuda kontrol edilir. UI rolü koruma değildir.

API wire kaynağı backend/docs/openapi.yaml. `npm run api:generate` generated.ts üretir; elle düzenleme. `npm run api:check` contract drift denetler. DTO request/response sınırı ile UI state ayrıdır. Yeni hedefler uygulandığında spec, adapter ve test aynı işte değişir.

SiteData public/Studio veri akışını, auth provider session’ı, saved/reading member private kayıtlarını yönetir. Hesap değişiminde özel cache/selection temizlenir. Reading block UUID/revision ve quoted context korunur. Visitor display preference ve guest note tarayıcıda olabilir; member içerik tarayıcı demosuna dönmez.

Yeni hedefler: ayrı çalışma taslağı; URL kilidi; seri bölümlerini Yazılar kataloğundan ayırma; site-wide indeksleme UI; okuyucu abonelik tercihi. İstatistik ve Pexels araması şimdilik çıkarılacak. Kod mevcut haliyle bu hedeflerin hepsini karşılıyor denmez.
