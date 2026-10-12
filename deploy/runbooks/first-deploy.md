# İlk VPS kurulumu

Önce [VPS planı](../../docs/deployment-vps.md). Henüz sunucu/domain/sağlayıcı seçilmedi; hiçbir canlı kurulum yapılmadı.

1. VPS/Linux, domain ve canonical host, offsite yedek, mail hizmeti, Google OAuth ve alarm kanalını seç. SSH anahtarı, deploy hesabı, firewall; yalnız edge portları public.
2. deploy/.env.example’den /etc/satir/release.env hazırla; teknik yol adı henüz runtime ile uyumlu kalır. Gerçek sırlar Git dışında /etc/satir/secrets; servislerin okuyabildiği izinler ve parent directory koruması. DB app/migrator/backup password, HMAC, mail/Google/restic sırları ayrı. NEXT_PUBLIC alanına secret koyma.
3. CI’da testlenmiş frontend/backend image digest’lerini al; registry ve image adlarını bu repo workflow’undan doğrula, eski proje registry’sini varsayma. Üretimde build yapma.
4. Repo deploy dizininde:

```sh
export COMPOSE="docker compose --env-file /etc/satir/release.env -f compose.prod.yml"
$COMPOSE pull
$COMPOSE up -d postgres
$COMPOSE run --rm migrate
$COMPOSE run --rm -T migrate bootstrap-owner --email=<email> --username=<username> --name=<name> < <git-disi-parola-dosyasi>
$COMPOSE up -d backend frontend proxy
$COMPOSE ps
```

5. TLS/canonical, csrf/login/logout, member Studio reddi, draft/hidden 404, backend arızası 503, medya ve yeni ürün farklarını smoke test et. Health/actuator ayrıntıları public olmamalı.
6. Şifreli offsite depo initialize, DB/media backup ve boş ortamda restore deneyini yap; cron ve hata uyarısını kur. Sır/yedek anahtarı sunucudan ayrı saklanır.
7. Gerçek içerik ve site-wide Studio indeksleme kontrolünü doğrula. Mevcut INDEXING_ENABLED gate’i kodda vardır; yeni hedef uyarlanmadan Studio anahtarını tek kontrol gibi sunma. Test verisi canlıya taşınmaz.

İmza/digest, resource budget, least-privilege DB ve proxy ayarları mevcut dosyalara karşı kontrol edilir. Canlıya deploy kullanıcı talimatıyla; V1 etiketi özellik kontrolünden önce başarı ilanı değildir.
