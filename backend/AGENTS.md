# Backend çalışma kuralları

Önce [kök kurallar](../AGENTS.md), [ürün](../docs/product.md) ve [README](README.md). Teknik rehberler: [mimari](../docs/backend-architecture.md), [API](../docs/api-contract.md), [dağıtım](../docs/deployment-vps.md).

Java 25/Spring Boot/PostgreSQL modüler monolit korunur. Modüllerde `api / application / domain / infrastructure` ayrımı; ArchUnit sınırları. İş kuralları unit, HTTP/DB sınırları gerçek PostgreSQL integration testleriyle kontrol edilir; H2 kullanılmaz. Anlamlı değişiklik sonrası `./mvnw verify`; eksik ortamı/atlanan kontrolleri açıkça bildir.

Uygulanmış Flyway migration’ını değiştirme. Yetkiyi sunucuda oturumdan belirle; istemci rolüne güvenme. Mevcut OpenAPI ile hedef ürün farklarını gizleme. Sözleşme değişirse `docs/openapi.yaml`, frontend generated types ve testler birlikte güncellenir. Test verisi gerçek schema/API’de ama ayrı ortamda olmalı.
