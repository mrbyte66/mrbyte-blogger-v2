# Mac’te yerel Docker

Asistan kullanıcı Mac’inde bu çalışma kopyasından derler; remote branch/PR seçimi veya push gerekmez. Eski scripts/local-refresh remote hedefi çekebildiği için yeni önizleme akışında kullanılmaz.

## İlk başlatma

Repo kökünden:

```sh
docker compose -f deploy/compose.local.yml up -d --build
docker compose -f deploy/compose.local.yml ps
```

Site http://127.0.0.1:3010, Studio /studio, Mailpit http://127.0.0.1:8025. Portlar LOCAL_WEB_PORT, LOCAL_MAIL_UI_PORT, LOCAL_DB_PORT ile değişebilir. Owner henüz yoksa parola git dışı dosyada, en az 12 karakter:

```sh
docker compose -f deploy/compose.local.yml run --rm -T backend bootstrap-owner --email=<email> --username=<username> --name=<name> < <git-disi-parola-dosyasi>
```

Mevcut owner üzerine yazma reddedilir. Kullanıcı register → Mailpit → açık verification onayıyla test hesabı açabilir. Parola/token hiçbir kayda girmez.

## Değişiklikten sonra

```sh
docker compose -f deploy/compose.local.yml up -d --build backend frontend
docker compose -f deploy/compose.local.yml ps
```

DB/media volume’ları korunur. Sağlıklı yeni imaj ve beklenen içerik doğrulanır; kullanıcı yerelde bakar, sonra push talimatı verir. Compose build commit edilmemiş çalışma dosyalarını da kapsar.

## Test verisi

Ayrı development DB/media ortamında, gerçek backend kayıt akışı:

```sh
docker compose -f deploy/compose.local.yml run --rm backend seed-demo --file=/opt/satir/seed/demo.json
```

Mevcut seed private yazı örnekleri de içerebilir; yeni kapsamda özel yazı olmayacağı için Mac’te seed uyarlanacak. Seed yalnız dev’de; production’da kullanılmaz. Cookie/localStorage demo hesap/veri sistemi yok. Authentication cookie’si kalır.

Başka eski klon Mac’te çalışıyorsa aynı Compose adı/port/volume kullanımını kontrol et. Mevcut name satir-local teknik addır; ikinci repo otomatik ayrı DB yaratmaz. Asistan gerçek veriyi koruyarak ayrımı yerel altyapı issue’sunda yapar.

## Google ve durdurma

Google redirect http://127.0.0.1:3010/api/v1/auth/google/callback. SATIR_GOOGLE_CLIENT_ID/SECRET yalnız git dışı deploy/google.local.env; configured backend yeniden başlatılır. Google callback için aynı origin kullanılır.

```sh
docker compose -f deploy/compose.local.yml stop
```

Volume silme normal yenileme değildir; asistan kullanıcı verisini reset etmez. SMTP gerçek sağlayıcı değildir, bütün dev postaları Mailpit’te kalır. Pexels yeni kapsamda şimdilik kullanılmaz.
