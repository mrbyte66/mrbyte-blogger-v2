# Uygulama ve teslim sınırları

Kalıcı kararlar [decisions.md](decisions.md), takip GitHub issue/Project’tedir. Eski tarihli doğrulama kayıtları ve çok-agent devirleri aktif belgelerden çıkarılmıştır.

## Bu hazırlık

MD’ler bu bulut kopyasında düzenlenir; GitHub issue/pano hazırlığı yapılır. Uygulama, script, Compose, OpenAPI ve migration dosyalarına dokunulmaz. Kullanıcının onayı olmadan push yok.

## Mac’te devam

[local-handoff.md](local-handoff.md) izlenir. Aynı yeni kurallar Mac’teki main çalışma kopyasında uygulanır. Yerel Docker current working tree’den derlenir; eski PR/main-fetch yenileme düzeni kullanılmaz. Veri volume’ları korunur.

## Doğrulama

Klonla gelen kodun listesi hazır bir başlangıç kaydıdır; yeniden incelenmeden PASS değildir. Önce çalışma kuralları ve GitHub kayıtları, sonra özellik kontrolü. Eski ürün gereksinimleriyle yeni hedef arasındaki farklar ana kategori issue’sunda tutulur. Sır, kullanıcı notu, oturum tokenı ve gerçek kimlik bilgileri belgelere girmez.
