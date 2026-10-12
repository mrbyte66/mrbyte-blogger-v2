# Backend çalıştırma ve mevcut temel

Java 25, Spring Boot 4.1.1, PostgreSQL 18 ve Flyway. Mevcut modüler monolit: platform, identity, editorial, site, media, delivery, library, reading, engagement. Bu modüller klonla geldi; bu MD çalışmasında yeniden E2E test edilmedi.

## Yerel çalışma

Tercih edilen tam yığın: [yerel Docker runbook](../deploy/runbooks/local-stack.md). Backend’i ayrı çalıştırmak için repo kökünde DB/Mailpit başlatılır:

```sh
docker compose -f deploy/compose.dev.yml up -d
cd backend
./mvnw verify
./mvnw package -DskipTests
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar migrate
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar bootstrap-owner --email=<email> --username=<username> --name=<name> --password-file=<git-disi-dosya>
SPRING_PROFILES_ACTIVE=dev java -jar target/satir-backend-0.1.0-SNAPSHOT.jar
```

Üretim profilinde `DB_*` ve en az 32 karakter `SATIR_RATE_LIMIT_KEY` gerekir; secret mount/configtree desteklenir. `dev` migrate, Mailpit ve HTTP local session kullanır. Mevcut `satir-*` artifact/env adları teknik uyumluluk içindir; yeni ürün adı değildir.

## Testler ve sözleşme

`./mvnw verify` unit, ArchUnit ve PostgreSQL integration testlerini çalıştırır. Docker yoksa ayrı disposable DB için `SATIR_TEST_JDBC_URL`, `SATIR_TEST_JDBC_USER`, `SATIR_TEST_JDBC_PASSWORD` kullanılabilir; testler bu DB’yi temizler. `-Punit-only` yalnız kısmi doğrulamadır.

[OpenAPI](docs/openapi.yaml) mevcut wire sözleşmesidir. Response/schema ve operation coverage testleri vardır. [API rehberi](../docs/api-contract.md) yeni hedeflerle farkları anlatır.

## Korunacak teknik davranış

Sunucu oturumu/Spring Session JDBC, Argon2id, CSRF, rate limit, server authorization; immutable içerik revision’ları, optimistic version kontrolü, UUID kimlikleri, planlama/outbox ve özel üye veri izolasyonu. Çalışan sınırlar: koleksiyon 100, bookmark 1000; JPEG/PNG upload en çok 10 MiB; private üye verisi admin listeye çıkmaz. Hesap silme kişisel kitaplık/not/geçmiş/üye alkışlarını temizler. Genel koleksiyon değiştirilemez; gizlenen yazı kaydı metadata sızdırmadan erişilemiyor olarak kalır.

## Mac’te uygulanacak farklar

Yayındaki yazı için ayrı çalışma taslağı; ilk yayından sonra yazı/seri slug kilidi; seri bölümünü genel Yazılar kataloğundan ayırma; ilk bölümde seri yayını; okuyucu ilk-yayın aboneliği; tek site indeksleme kontrolü. İstatistik ve Pexels sunumu şimdilik kaldırılacak. Sahip özel yazı ürünü ve Studio export/import kapsam dışı; mevcut özel kayıtlara erişim güvenliği veri geçişi bitmeden gevşetilmez. Geliştirmeler GitHub issue’larıyla izlenir; geçmiş “V1 tamam” iddiası kullanılmaz.

Medya public referans/owner authorization ile servis edilir. Provider sorgusu/anahtarı sunucudadır. Misafir notları ancak açık tercih ve başarılı import ile hesaba taşınır. SMTP dış yan etkisinde exactly-once teslim garanti değildir; idempotency, retry ve görünür hata korunur.
