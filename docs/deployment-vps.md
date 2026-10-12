# VPS ve yayın hazırlığı

Yakın hedef tek VPS üzerinde Docker Compose: Caddy → Next frontend / Spring API → PostgreSQL ve özel medya volume’u. VPS, domain, offsite yedek ve e-posta hizmeti henüz seçilmedi. Domain ertelendi; sağlayıcıları kısa karşılaştırmayla seç. Yeni ürün adı belli değil.

Mevcut production Compose/Dockerfile’lar klonla geldi; V1 yayını olarak doğrulanmadı. Teknik `satir-*`, SATIR_* adları ürün adı değildir; bu MD çalışması runtime config’i değiştirmez. [İlk deploy](../deploy/runbooks/first-deploy.md), [release](../deploy/runbooks/release.md), [backup](../deploy/runbooks/backup-restore.md).

## Sınırlar

Public yalnız HTTPS/HTTP edge; DB/backend/frontend internal. Owner bootstrap server CLI, production secret mount; migration DDL rolü runtime DML’den ayrı. Images testlenmiş release digest’iyle; prod VPS’de build yerine CI artifact kullanılır. Mevcut workflow’ların repo/registry adları yeni repo için kontrolden geçer.

Sadece container başladı demek hazır demek değildir: schema/DB readiness, site/auth/content/media smoke kontrolü gerekir. No-store private içerik, trusted canonical origin, doğru 404/503 ve SSR metadata; eski özel içerik açığa çıkmaz.

## İndeksleme

Hedef Studio’da tek site-wide anahtar: kapalıysa tüm kamu yazıları noindex ve sitemap dışı. Açık olsa da draft/hesap/Studio indekslenmez. Mevcut INDEXING_ENABLED deployment gate’i uygulamada hâlâ vardır; Studio-only ürün hedefi Mac’te uyarlanacak. Test ortamı indeksleme kapalı kalır. Arama motorunun eski kayıtları hemen kaldırması garanti değildir.

## Yedek ve restore

Sunucudan ayrı şifreli DB + media + release manifest yedeği. Mevcut restic/pg_dump yaklaşımı başlangıç; hedef ayrıca seçilecek. RPO 24 saat/RTO 4 saat yalnız testlenecek hedef; restore kanıtı olmadan garanti verilmez. Restore token/session iptali, silinen hesapların yeniden silinmesi, mail/outbox kontrolü ve medya tutarlılığı gerektirir.

## Yayına çıkmadan önce

Gerçek özellik kontrolü ve kritik yeni hedefler; ayrı test verisi; doğru host/TLS, Google OAuth, mail tercihi/doğrulanmış adres, disk/secret/readiness, backup restore deneyi ve SEO smoke kontrolü. Eski dosyalarda bulunan güvenlik yamaları/adları durumu doğrulanmadan canlı kabulü sayılmaz. Satın alma veya canlı deploy ayrı kullanıcı talimatıyla yapılır.

Takip: [#32](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/32).
