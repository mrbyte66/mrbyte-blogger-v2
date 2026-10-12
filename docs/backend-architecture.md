# Backend mimari sınırları

## Korunan temel

Tek Spring Boot modüler monolit, Java 25, PostgreSQL/Flyway. Next ayrı frontend. Aynı origin altında `/api/v1` Spring’e, sayfalar Next’e gider. SSR yalnız sabit dahili backend’e sorgu/cookie iletir; iş yetkisi Spring’de tekrar kontrol edilir.

Modüller `platform`, `identity`, `editorial`, `site`, `media`, `delivery`, `library`, `reading`, `engagement`; her modülde api/application/domain/infrastructure. Modüller başka modül repository’sine doğrudan bağlanmaz; port/use-case kullanır. ArchUnit döngü/katman sınırlarını denetler.

UUID kimlik, UTC Instant ve ayrı DATE gösterim tarihi; sorgulanan ilişkiler relational, sürümlü blok/tema JSONB. Flyway uygulanmış dosyaları değişmez; yeni migration gerekir. `version`/If-Match ile kayıp güncelleme engellenir; tekrar gönderim anahtarları ve unique constraint’ler çift sayımı engeller.

## Güvenlik ve veri

Spring Session JDBC opak HttpOnly cookie; prod Secure/SameSite, CSRF, session rotation ve rate limiting korunur. Rol/kimlik her istekte sunucudan alınır. Üye özel kitaplık/not/geçmiş yalnız kendi hesabına açık; owner ekstra okuyucu mahremiyeti yetkisi almaz. Public endpoint gizli/taslak veriye 404, bağımlılık arızasına 503 verir.

Medya decode/re-encode/EXIF temizliği; storage webroot dışında, yetkili media endpoint. Taslakların, üyelerin ve eski private kayıtların medya/API/SSR güvenliği korunur. Gizli/verilmiş sırları outbox, log veya Markdown’a koyma.

## Yeni ürün farkları

[Kesin kararlar](decisions.md) mevcut koddan üstündür; ancak kod uygulanana kadar mevcut wire davranışını farklıymış gibi belgeleme.

- Yayın revision’ı ile çalışma draft revision’ı ayrılacak. Kaydet public pointer’ı değiştirmez; Yayımla atomik geçiş yapar.
- İlk yayında slug kilidi yazı ve seride sunucu kuralı olacak; sonraki draft/archive/trash geçişi kilidi kaldırmaz. Eski alias’lar korunur.
- Genel Yazılar kataloğu bağımsız yazıları gösterir; seri chapter listesi ayrı. Bölüm permalinki kalır. İlk bölümle taslak seri aynı transaction’da yayımlanır; arşiv/çöp seri kendiliğinden geri getirilmez.
- Scheduler tarayıcıdan bağımsız, row lock/generation ile planlama ve iptal yarışına dayanıklı. Publication outbox ile yayın kaydı aynı transaction’da.
- Yazar ve doğrulanmış abone okuyucu tercihi ayrı; okuyucu aboneliği kayıt sırasında açık ve kapatılabilir. Yalnız ilk kamu yayını okuyucu event’i üretir. Teslim anında tercih yeniden kontrol edilir; üyelik/doğrulama e-postaları yayın tercihinden bağımsızdır.
- Tek site indeksleme ayarı tüm yazılara hakim; Studio kullanıcı kontrolü olacak. Geliştirme ortamının noindex koruması sürer.
- İstatistik sunumu ve Pexels araması şimdilik çıkarılır. Yeni süre/cihaz/kişisel ölçüm toplanmaz. Sahip özel/kilitli yazı ürünü ve Studio export/import yok; mevcut özel kayıtları sessizce public yapma.

## Doğrulama

İş kuralları unit, HTTP/izin/precondition ve transaction yarışları gerçek PostgreSQL integration testleriyle. Yeni migration boş ve mevcut schema’dan; stable block UUID/not quote-resolution korunur. SSR metadata, 404/503, draft isolation, URL kilidi, seri katalog ayrımı, abone opt-out/idempotency, medya izolasyonu ve restore davranışı kontrol edilir. CI veya belgeler tek başına ürünün çalıştığı kanıtı değildir.
