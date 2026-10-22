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

## Okuyucu yayın aboneliği (#2)

`Profile.preferences.publicationSubscription` ve `PATCH /me/preferences` aynı boolean alanını kullanır. Varsayılan true; `publicationEmail` yazarın kendi yayın bildirimi olarak korunur. Abone okuyucu yalnız doğrulanmış aktif hesap ve açık tercih ile ilk yayın e-postası alır. Yeniden yayın/güncelleme okuyucu mail işi oluşturmaz. Kişi başına iş retry'si, tamamlanan alıcıları yeniden kuyruğa koymaz; SMTP kabulü ile iş kaydı arasındaki çökme için exactly-once garanti verilmez. Yeni abonelik geçmiş yayınları göndermez.

## Hesapla gelen görünüm (#5)

`Profile.appearance` her zaman gelir: `{colorMode: light|dark|reading|null, motion: boolean|null, studioView: marjinalya|odak|kontakt|sahne|null}`; null seçilmedi demektir. `PUT /me/appearance` bütün kümeyi değiştirir, profil sürümüne (ETag) dokunmaz, bilinmeyen değerde 422 döner. Ayrıntı: [görünüm tercihleri](features/appearance.md).

## Tema görünüm seçenekleri (#5)

`ThemeDocument` isteğe bağlı `corners` (sharp|soft|round), `textSize` (small|medium|large), `texture` (plain|dots|lines) ve `cards` (outlined|raised|flat) alanlarını kabul eder. Alan yoksa özgün görünüm geçerlidir (soft, medium, plain, outlined); eski temalar aynen okunur.

## Giriş için adres doğrulaması (#2)

Geçerli şifre + doğrulanmamış hesap `403 EMAIL_VERIFICATION_REQUIRED` döner; authenticated session oluşturulmaz. Yanlış kimlik bilgileri genel `401 INVALID_CREDENTIALS` olarak kalır. Eski PENDING oturumları her istekte geçersizleştirilir. Anonim verification/resend, hesap varlığını açıklamayan 202 yanıtını korur. E-postaya teslim edilen tek kullanımlık sıfırlama bağlantısının onayı, mevcut sözleşmede adresi de doğrular; GET linki tüketmez ve sıfırlama otomatik giriş yapmaz.

## İletişim formu

`POST /api/v1/contact` herkese açık, CSRF zorunlu iletişim gönderimidir. `name` (1–80), `email` (geçerli adres, en fazla 254), `subject` (1–120, tek satır), `message` (1–5000) alır. İstemci alıcı veremez; aktif site sahibinin adresi kullanılır. SMTP kabulünde 204, alan hatasında 422, sınırlamada Retry-After ile 429, sağlayıcı/alıcı yoksa veya SMTP hatasında 503 döner. Reply-To doğrulanmış gönderen, From yapılandırılmış uygulama adresidir. İçerik uygulama DB/log’unda saklanmaz. Saatlik limitler IP 5, e-posta 3, site 30. Sözleşme: backend/docs/openapi.yaml.

## Yayın ve çalışma taslağı (#3)

`PUT /studio/articles/{id}` yalnız çalışma sürümünü kaydeder. Okuyucu yanıtları, arama/kategori/seri listeleri, kitaplık, medya, SEO ve bildirimler son yayımlanmış snapshot'ı kullanır. `ArticleEdit.publishedRevisionId` mevcut yayını, `hasUnpublishedChanges` çalışma sürümünün farklı olduğunu belirtir. `revisionId` Studio'da çalışma sürümüdür; public detail'da yayın sürümüdür. Bu üç alan istemcinin yayın kararı vermesi için sunucudan okunur, write body'ye gönderilmez.

`save-draft` veya `cancel-schedule` mevcut yayını kaldırmaz. `publish` geçerli çalışma sürümünü atomik olarak yayına alır; zaten aynı sürüm yayındaysa no-op'tur. Planlı güncellemede eski yayın saat gelene kadar görünürdür. `archive`/`trash`/eski `make-private` yayını kaldırır; `restore` tek başına yeniden yayımlamaz. İlk yayından sonra slug değişimi 409 `SLUG_LOCKED` döner. Taslakta eksik başlık/kategori/metin saklanabilir; yayımlama ve planlama bunları doğrular.

Public annotation/history kaynağı yalnız gerçekten yayımlanmış revision olabilir; owner Studio önizlemesi ayrı yetkili okumadır. Yeni özel yazı seçeneği Studio'dan kaldırıldı; eski özel kayıtların güvenli API/medya sınırı ve kamu taslağına dönüştürme yolu korunur.
