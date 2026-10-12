# Frontend çalışma kuralları

Önce [kök kurallar](../AGENTS.md) ve [ürün](../docs/product.md).

| Konu | Rehber |
| --- | --- |
| Görsel yön | [docs/design.md](docs/design.md) |
| Bileşen/API sınırları | [docs/frontend.md](docs/frontend.md) |
| Studio/tema | [docs/builder.md](docs/builder.md) |
| Okuma / ses / seri / hesap | [docs/reading.md](docs/reading.md), [docs/audio.md](docs/audio.md), [docs/series.md](docs/series.md), [docs/auth.md](docs/auth.md) |
| Doğrulama | [docs/quality.md](docs/quality.md) |

Next.js App Router, React, TypeScript ve mevcut CSS düzeni korunur. CRT karakterini veya tasarımı kendiliğinden değiştirme. İş API’si ve kalıcı içerik Spring Boot’tadır; Next yalnız render, SSR ve transport sınırını yönetir. Üye verisini localStorage prototipine geri çevirme.

Anlamlı uygulama değişikliğinde `npm test`, `npm run typecheck`, `npm run build`; davranış/UI için ilgili tarayıcı kontrolü. Framework API’sini kullanmadan önce kurulu Next sürümünün ilgili rehberini oku. Üretilen framework notları kalıcı proje kurallarını ezmemeli.
