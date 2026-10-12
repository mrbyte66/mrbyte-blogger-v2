# Yedek ve geri yükleme

VPS’den ayrı şifreli offsite hedef seçilecek. Başlangıç hedefi RPO ≤24 saat/RTO ≤4 saat; restore ölçümü olmadan garanti değil. Günlük/haftalık/aylık retention ve silinen hesap backup sınırı canlı hazırlığında seçilip açıklanacak.

Mevcut compose backup/offsite servisleri pg_dump, media checksum ve release manifest kullanır. DB dump ve medya kopyası otomatik ortak snapshot değildir; tutarlı bakım/yazma penceresi veya eşdeğer koordinasyon gerçek veriyle doğrulanmalıdır.

Repo deploy dizininde:

```sh
export COMPOSE="docker compose --env-file /etc/satir/release.env -f compose.prod.yml"
$COMPOSE run --rm backup
$COMPOSE run --rm offsite
```

Restore yalnız izole boş DB/media ortamında. INDEXING_ENABLED=false; dış mail/Google/kapak kapalı. Aynı release/DB major ve roller, offsite restore, checksum, migrate; sonra eski session/action token’ları iptal ve yedek sonrası hesap silmelerini replay. Bekleyen outbox işleri karantina/kontrol altında; aynı yayın tekrar mail üretmesin.

```sh
$COMPOSE run --rm offsite restore latest --target /restore
$COMPOSE run --rm restore
$COMPOSE run --rm migrate
```

restore script’i dolu schema/media’ya overwrite etmemeli. Uygulama açılmadan güvenlik/hesap silme/outbox kontrolü yapılır. Offsite silme kaydı mevcut klonda tamamlanmış varsayılmaz; yayın hazırlığı issue’sunda doğrulanacak.

Owner/member izolasyonu, private üye kayıtları, draft ve medya erişimi, yayın taslağı, URL kilidi, tema ve gerçek içerik tutarlılığı kontrol edilir. Secret/encryption key ayrı güvenli yedeklenir. Studio toplu export/import yapılmayacak; sunucu yedekleri kullanıcı tarafından yeterli seçildi.
