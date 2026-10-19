# Release ve geri dönüş

Repo deploy dizininde COMPOSE değişkeni:

```sh
export COMPOSE="docker compose --env-file /etc/satir/release.env -f compose.prod.yml"
```

Güncelleme: mevcut manifest/release.env ve yedek zamanı kaydet; testlenmiş yeni image digest’leri seç, DB/media yedeği al, pull, kısa bakım ve migrate. Writer/scheduler/worker’ı da bakım penceresinde tutarlı durdur; yalnız proxy’yi kapatmak arka plan işleri durdurmaz. Migration başarılı olmadan yeni uygulamayı hazır sayma. Backend/frontend/proxy başlat, readiness ve içerik/auth/draft/URL/medya smoke kontrolü yap.

Expand-contract schema değişikliği; uygulanmış Flyway dosyası değişmez. Hata varsa schema uyumlu önceki digest’e dön; otomatik down migration yok. Uyumsuz schema için ileri düzeltme veya açık veri kaybı değerlendirmesiyle restore. Dışarı gönderilmiş mail geri alınamaz; outbox tekrarlarını incele.

Secret rotation provider/DB’de yeni değeri kurup mounted secret’ı güncelle ve ilgili servisi yeniden oluştur. init-roles.sh sadece boş DB’de çalışır; mevcut kullanıcı parolasını değiştirmez. HMAC anahtarı değişimi token/session yönetim handle’larını etkileyebilir.

Owner parolası için mevcut mail reset akışı; bootstrap mevcut owner’ı overwrite etmez. Yeni operatör kurtarma akışı gerçek ihtiyaç kontrolüyle altyapı issue’sunda ele alınır. [Backup](backup-restore.md).

## Repo kapsamlı image adları

Images workflow `scripts/image-name.sh` ile `ghcr.io/<owner>/<repository>-backend` ve `ghcr.io/<owner>/<repository>-frontend` paketlerini kullanır. Bu repo için adlar `ghcr.io/mrbyte66/mrbyte-blogger-v2-backend` ve `ghcr.io/mrbyte66/mrbyte-blogger-v2-frontend` olur. Eski `satir-*` paketleri başka repoya aittir; onların erişimi veya etiketleri bu proje için değiştirilmez. İlk push’taki `org.opencontainers.image.source` etiketi yeni paketi bu repoya bağlar. Paket görünürlüğü ayrıca yönetilir; workflow bunu public yapmaz.

Push kontrolü yalnız CI ile bitmez: aynı git SHA için Images iki build/tarama, iki GHCR push/imza ve release manifest dahil başarılı olmalıdır. `permission_denied: write_package` durumunda önce paket adı, kaynak repo ve Manage Actions access kontrol edilir; doğrudan token yetkisi büyütülmez veya eski paket paylaşılmaz. Release her zamanki gibi manifestteki immutable digest’leri kullanır.
