# Mac’te yerel Docker

Asistan kullanıcı Mac’inde bu çalışma kopyasından derler; remote branch/PR seçimi veya push gerekmez. Eski scripts/local-refresh remote hedefi çekebildiği için yeni önizleme akışında kullanılmaz.

## İlk başlatma

Repo kökünden:

```sh
scripts/local-preview up -d --build
scripts/local-preview ps
```

Bu checkout için `blog-v2-local`, ayrı DB/media volume ve `blog-v2` imaj etiketi kullanılır. Eski `satir-local` servisleri ve verileri korunur. Site http://127.0.0.1:3011, Studio /studio, Mailpit http://127.0.0.1:8026. DB portu 55433. Portlar LOCAL_WEB_PORT, LOCAL_MAIL_UI_PORT, LOCAL_DB_PORT ile değişebilir. Owner henüz yoksa parola git dışı dosyada, en az 12 karakter:

```sh
scripts/local-preview run --rm -T backend bootstrap-owner --email=<email> --username=<username> --name=<name> < <git-disi-parola-dosyasi>
```

Mevcut owner üzerine yazma reddedilir. Kullanıcı register → Mailpit → açık verification onayıyla test hesabı açabilir. Parola/token hiçbir kayda girmez.

## Değişiklikten sonra

```sh
scripts/local-preview up -d --build backend frontend
scripts/local-preview ps
```

DB/media volume’ları korunur. Sağlıklı yeni imaj ve beklenen içerik doğrulanır; kullanıcı yerelde bakar, sonra push talimatı verir. Compose build commit edilmemiş çalışma dosyalarını da kapsar.

## Test verisi

Ayrı development DB/media ortamında, gerçek backend kayıt akışı:

```sh
scripts/local-preview run --rm backend seed-demo --file=/opt/satir/seed/demo.json
```

Mevcut seed private yazı örnekleri de içerebilir; yeni kapsamda özel yazı olmayacağı için Mac’te seed uyarlanacak. Seed yalnız dev’de; production’da kullanılmaz. Cookie/localStorage demo hesap/veri sistemi yok. Authentication cookie’si kalır.

Başka eski klon Mac’te çalışıyorsa aynı Compose adı/port/volume kullanımını kontrol et. Mevcut name satir-local teknik addır; ikinci repo otomatik ayrı DB yaratmaz. Asistan gerçek veriyi koruyarak ayrımı yerel altyapı issue’sunda yapar.

## Google ve durdurma

Bu ayrı ortamda Google redirect http://127.0.0.1:3011/api/v1/auth/google/callback. Google kimlik bilgileri henüz bu checkout için yapılandırılmadı. SATIR_GOOGLE_CLIENT_ID/SECRET yalnız git dışı deploy/google.local.env; configured backend yeniden başlatılır. Google callback için aynı origin kullanılır.

```sh
scripts/local-preview stop
```

Volume silme normal yenileme değildir; asistan kullanıcı verisini reset etmez. SMTP gerçek sağlayıcı değildir, bütün dev postaları Mailpit’te kalır. Pexels yeni kapsamda şimdilik kullanılmaz.

## 2026-10-12 yerel doğrulama

Yeni checkout Masaüstündeki `mrbyte-blogger-v2`. Backend, frontend, PostgreSQL ve Mailpit sağlıklı; site tarayıcıda açıldı. Ayrı DB'ye 25 yazı, 4 seri, 3 üye ve development owner yüklendi. Owner parolası yalnız git dışı `deploy/owner.local.txt` içinde; production hesabı değildir. Seed yeni kararlara tam uyumlu sayılmaz; özel yazı örnekleri ve sayaçlar #12/#3/#9'da denetlenir.

Eski `com.satir.ci-monitor` LaunchAgent durduruldu; plist `.disabled` uzantısıyla korundu. Normal CI workflow'ları korunur. Bu servisi yeni çalışma düzeninde yeniden kurma. Kayıt eşitleme servisi yalnız Project özel alanını günceller; AI/agent çalıştırmaz.

## Yerel üyelik hesabı ve Google

3011 test ortamındaki owner bilgisi `deploy/owner-account.local.env`, parola `deploy/owner.local.txt` içindedir; ikisi de git dışıdır. Hesap/parola bu çalışma sırasında yerel API ile güncellendi; canlı ortama seed veya sabit kimlik bilgisi eklenmez. Eski 3010 ortamı başka hesaba/veritabanına aittir; onun doğru parola dosyasını yeni ortam için kullanma. Eski servislerin pause durumu korundu.

Google bilgileri mevcut git dışı yapılandırmadan `deploy/google.local.env` içine alındı. 3011 akışı için Google Console'da `http://127.0.0.1:3011/api/v1/auth/google/callback` izinli dönüş adresi olmalıdır. Kaydedilmiş ve gerçek hesapla doğrulanmış saymak için Console kaydı ile gerçek OAuth dönüşü ayrı kontrol edilir.

Google Console'daki mevcut client'a 3011 callback kullanıcı onayıyla eklendi; eski 3010 callback korundu. Kayıt yeniden açılarak iki URI doğrulandı. Gerçek Google hesabıyla 3011'e dönüş ve doğrulanmış MEMBER oturumu test edildi; Studio yetkisi verilmedi.
