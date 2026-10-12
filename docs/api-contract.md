# API sözleşmesi ve hedef farkları

## Çalışan sözleşme

[backend/docs/openapi.yaml](../backend/docs/openapi.yaml) mevcut API’nin makinece kontrol edilen wire kaynağıdır. Bu MD yeni endpoint icat etmez. Backend response/operation testleri ve frontend generated types bununla uyumlu tutulur. Yeni hedef uygulandığında OpenAPI ve adapter/testler aynı işte güncellenir.

## Korunan protokol

`/api/v1`, JSON UTF-8, UUID, UTC RFC3339 ve DATE alanları; version/ETag/If-Match, command idempotency, doğrulanmış bounded DTO’lar. Hatalar problem+json; 401/403 kimlik/yetki, 404 gizli/yok, 409 iş çatışması, 412 eski version, 422 validation, 429 rate limit, 503 bağımlılık arızası. Stack trace/token/özel metaveri dönmez.

Cookie mutasyonları CSRF ister. Public ve özel içerik güvenli no-store politikasıyla gelir; üye verisi public DTO’ya karışmaz. UUID sahiplik kaynağı değildir; hesap oturumdan belirlenir. Liste/filter/sort sınırlı ve allowlist’tir. GET içerik okuması yayın/mail/görüntülenme yan etkisi üretmez.

## Mevcut alan grupları

| Alan | Prefix / kaynak |
| --- | --- |
| Public içerik | site, categories, articles, series, media, seo |
| Kimlik | auth; profil/preferences/connections/sessions için me |
| Kitaplık / not / geçmiş | me/collections, bookmarks, annotations, history, visits |
| Tepki | clap, engagement/session, impressions |
| Studio | articles, series, categories, site, theme, media, cover-jobs; mevcut statistics uçları |

Kesin route, method, schema, limit ve status kodu için OpenAPI’yi oku. Mevcut `stats`, private visibility, cover-jobs ve indeksleme gate’i yeni ürün kapsamıyla aynı değildir; endpoint’in varlığı özelliği yeni UI’da tutma kararı değildir.

## Uygulanacak farklar

Ayrı draft/published revision; yazı/seri ilk-yayın slug kilidi; bağımsız Yazılar kataloğu; ilk bölümle seri yayını; okuyucu bildirim tercihi/ilk-yayın fanout; site genelinde Studio indeksleme kontrolü. Bunların DTO/endpoint ayrıntıları Mac’te uygulama sırasında gerçek use-case’e göre belirlenecek; bu hazırlık OpenAPI’yi değiştirmez.

İstatistik UI’sı ve dış kapak araması şimdilik çıkarılacak. Eski stats/özel yazı/export sözleşmesini yeni ürün gereksinimi diye kopyalama. Üyelerin private veri/annotation/media güvenliği gevşetilmez. Herkesin özel notları vardır; public owner annotation endpoint planı yok. [Ürün](product.md), [mimari](backend-architecture.md).
