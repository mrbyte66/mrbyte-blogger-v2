# Kişisel yayın sitesi

Ürün adı henüz seçilmedi. İlk odak yapay zeka, yazılım ve bilişim yazılarıdır. İlk sürüm V1; çok yazarlı gelecek ve diğer fikirler Backlog’da tutulur.

Mevcut Next.js/React/TypeScript frontend ve Java 25/Spring Boot/PostgreSQL backend geliştirilecek. CRT sahnesi, görsel Studio, üyelik, seriler, kitaplık, özel okuyucu notları ve Mozart korunur. Yeni kararlar [ürün belgesinde](docs/product.md), çalışma kuralları [AGENTS.md](AGENTS.md) içindedir.

## Yerelde önizleme

Mac’te repo kökünden:

```sh
docker compose -f deploy/compose.local.yml up -d --build
```

Site: http://127.0.0.1:3010 — Studio: http://127.0.0.1:3010/studio — test e-postaları: http://127.0.0.1:8025.

Asistan yerel çalışma kopyasını düzenler ve gerekli servisleri yeniden derler. Kullanıcı push öncesinde sonucu görür. [Yerel kurulum](deploy/runbooks/local-stack.md) ve [Mac’te devam](docs/local-handoff.md).

## Takip ve doğrulama

GitHub issue’ları ve Project tek görev kaynağıdır: İş akışı, Backlog, Gereksinimler. Kullanıcı Done yapar; asistan kendi başına işi kapatmaz. [Pano kurulumu](docs/github-project.md), [issue bağlantıları](docs/roadmap.md).

Klonla gelen özellikler yeniden kontrol edilecek; eski test sayıları veya “tamamlandı” kayıtları yeni doğrulama sayılmaz. Bu belge güncellemesi uygulama davranışını değiştirmez. [Backend çalışma bilgisi](backend/README.md), [API sözleşmesi](docs/api-contract.md), [VPS hazırlığı](docs/deployment-vps.md).

CI main push’larında ve varsa PR’larda test/typecheck/build yapar. PR açmak zorunlu değildir. Uygulama ve dağıtım yapılandırması bu belge çalışmasında değiştirilmedi.
