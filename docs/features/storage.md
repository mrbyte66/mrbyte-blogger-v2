# Geçici dosya paylaşımı — 6 Kasım 2026

Kullanıcı kararları: `/storage`, yalnız sahip yükler/listeler/yönetir; bağlantıyı alan indirebilir. Tek dosya en fazla 50 GB (50.000.000.000 bayt). İsteğe bağlı indirme şifresi, saklama süresi, erken kalıcı silme ve süre uzatma. Takip: [#43](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/43).

Uygulama hedefi: 8 MiB parçalar, sunucunun doğruladığı offset ile devam; dosyanın tamamı belleğe alınmaz. Süre tamamlanan yüklemeden başlar. Yarım yüklemeler 48 saatte temizlenir. Saklama 1–720 saat; varsayılan 24 saat. Süre dolmuş dosya geri getirilemez. Süre dolunca yeni indirme engellenir; temizlik görevi en geç sonraki başarılı turunda fiziksel dosyayı kaldırır. Önceden indirilmiş kopyalar ve istemciye gönderilmiş baytlar geri alınamaz.

Varsayılan toplam kota 150 GB, disk boş alan koruması 20 GB. Başlanmış yüklemelerin henüz yazılmamış boyutu da kapasite hesabına katılır. Kota tüm dosyalar içindir; 50 GB tek dosya sınırıdır. Geçici dosyalar ayrı volume'da, normal medya yedeklerinin dışındadır. Şifreler Argon2 hash olarak saklanır; indirme yetkisi sunucu oturumundadır. Linkler arama motoruna kapalı, içerik attachment/no-store olarak verilir.

Kullanıcı önizlemeyi sunucuda yapacak; yerel Docker şimdilik duraklatılmış kalacak. Yerel birim/typecheck/build kontrolleri yapılır; PostgreSQL entegrasyonu CI’da ve sunucu öncesi doğrulanır. Push açık kullanıcı talimatıyla; CI ve Images aynı SHA için birlikte izlenir.

Son kullanıcı talimatı: doğrudan canlıya alınacak; `/storage` yalnız URL ile açılır. Ana sayfa, hesap menüsü veya diğer gezinmeye bağlantı eklenmez. Kullanıcı sunucuda deneyecek; push ve deploy bu talimatla yetkilendirildi.

## Yayın ve sunucu kontrolü

- `V23__temporary_storage.sql` yeni migration’dır; mevcut migration’lar değişmez.
- Backend image `/var/lib/satir/transfers` dizinini UID/GID 10001 ile oluşturur. Production Compose `transfers` adlı ayrı kalıcı volume bağlar; medya yedeğine dahil edilmez.
- `SATIR_STORAGE_QUOTA_BYTES` varsayılan 150.000.000.000; `SATIR_STORAGE_RESERVE_BYTES` varsayılan 20.000.000.000. 50 GB üst sınırı kod/API tarafından uygulanır.
- Yeni Caddyfile `/api/v1/studio/files/*/chunks` için 9 MB istek sınırı uygular. Genel JSON ve görsel sınırları korunur. Proxy dosyası ve Compose da image’larla birlikte güncellenmelidir.
- Migration önce çalıştırılır, ardından backend/frontend güncellenir ve Caddy config doğrulanıp reload edilir. Readiness, ana sayfa ve `/storage` kontrol edilir.
- Sahip testi: küçük dosya yükleme, duraklat/devam, indirme, şifre, süre uzatma ve silme. Misafirde özel liste kapalı; yanlış şifre 403, süre dolmuş/silinmiş dosya 404; Range indirmesi 206.
- Otomatik temizlik dakikada bir dener; disk silme başarısızsa kayıt tutulur ve tekrar denenir. İndirme akışı açık kaldığında da saniyede bir süre/silinme kontrol edilir.
- 50 GB gerçek ağ aktarımı bu yerel testlerin parçası değildir; sınır/bellek/parça davranışı ayrı testlerle doğrulanır.
