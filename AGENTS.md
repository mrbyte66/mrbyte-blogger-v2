# Proje çalışma kuralları

## İletişim

Kullanıcı istemedikçe sonuç mesajlarına ekran görüntüsü ekleme; görsel kontrol gerekiyorsa araçla incele.

Kısa ve açık Türkçe yaz. Teknik adlar İngilizce kalabilir. Tercih ve kapsam sorularını kısa anketlerle sor; her tur en fazla 5 soru olsun. Gelen cevapları kaydet. Aynı tercihi tekrar tekrar sorma.

## Çalışma düzeni

- Tek kodlayıcı mevcut Codex session’ıdır. Kullanıcı isterse ayrı session yalnız analiz yapabilir. Kendiliğinden agent veya session başlatma.
- Kullanıcı işi sohbetten söyler. GitHub issue ve Project takibini asistan yönetir; Markdown görev panosu değildir.
- Tamamlanmış işte hata bulunursa aynı issue’ya düzeltme kapsamını ekle, issue’yu yeniden açıp In Progress’e al; ardından kodla ve test et. Yeni teslim sonrası Done kararı yine kullanıcıdadır.
- Aynı konudaki tamamlanmamış işler tek büyük issue’da birleşir. Başlık kategori ve hedef söyler; açıklama birkaç kısa maddeden oluşur.
- Ertelenen her iş Backlog issue’su olur. Backlog → Todo ve her Done geçişini yalnız kullanıcı yapar. Seçilen işi asistan In Progress yapar; teslim sonrası kullanıcı Done yapana kadar bu durumda kalır.
- Doğrudan main üzerinde çalış. Branch, worktree, PR, puan, agent etiketi ve bağımsız testçi zorunluluğu yok.
- Seçilen işte ilgili akışları ve hata durumlarını proaktif denetle; sorun keşfini kullanıcıya bırakma. Bulduğun kapsam içi eksikleri düzelt, kapsam dışı fikirleri uygun Backlog issue’suna kaydet.
- Gerekli testleri ve davranış kontrollerini kendin yap. Kullanıcı gerek duyduğunda ayrıca inceler. Kendi testlerinin geçmesi Done yetkisi vermez.
- Kod ilişkisi ve değişiklik etkisi için yerel Graphify haritasını kullan: `scripts/graphify-local query 'Sembol'`. Kaynak/testlerle doğrula; anlamlı kod değişikliği sonrası `scripts/graphify-local refresh` çalıştır. Kullanım sayacı tasarruf yüzdesi değildir; [rehber](docs/graphify.md).
- Push sonrası aynı commit’in **CI ve Images** akışlarını birlikte kontrol et; image push, imza ve release manifest bitmeden tüm kontroller başarılı deme. Kapsam içi hataları ilgili issue’da takip edip düzelt.
- Commit yapabilirsin. Push yalnız kullanıcının açık talimatıyla; yerel sonucu görüp “olmuş/tamam, gönder” demesi yeterlidir. Yerel önizleme için push gerekmez.
- Bütün çalışma kullanıcının Mac’indeki yerel Codex oturumunda yapılır: kod, belgeler, test, Docker, issue ve Project takibi. Bulut devam eden çalışma ortamı değildir. Bu bulutta hazırlanmış belgeler tek seferlik devir paketiyle aktarılır.
- Project takibinde erişilebilen yerel tarayıcı araçlarını kullan; tarayıcı kontrolü yoksa yetkili yerel GitHub CLI/API kullan. Makine, tarayıcı ve Project erişimini gerçekten kontrol etmeden erişim sözü verme.

## Kaynaklar

| Konu | Belge |
| --- | --- |
| Ürün ve kapsam | [docs/product.md](docs/product.md) |
| Kesin kararlar | [docs/decisions.md](docs/decisions.md) |
| Issue ve pano düzeni | [docs/ai-workflow.md](docs/ai-workflow.md), [docs/github-project.md](docs/github-project.md) |
| Kategorili issue bağlantıları | [docs/roadmap.md](docs/roadmap.md) |
| Frontend / backend | [frontend/AGENTS.md](frontend/AGENTS.md), [backend/AGENTS.md](backend/AGENTS.md) |
| Yerel teslim | [docs/local-handoff.md](docs/local-handoff.md) |
| Kod haritası / Graphify | [docs/graphify.md](docs/graphify.md) |

Mevcut kodu geliştirip sadeleştir. Next.js/React/TypeScript, Java 25/Spring Boot ve PostgreSQL korunur. Tasarım ve CRT karakteri korunur. Yeni hedefleri mevcut kodun davranışı sanma: kod, OpenAPI ve ürün hedefi farklıysa ilgili issue’da farkı belirt. Kullanıcının değişikliklerinin üzerine yazma; sırları kayda veya commit’e koyma. Uygulanmış Flyway migration’ını değiştirme.

İlk ürün sürümü V1’dir. Sonraki sürüm adları V1 çıktıktan sonra seçilir. Eski ürün adı kullanılmaz; mevcut repo, paket ve ortam değişkeni adları kod değiştirilmeden kendiliğinden yeniden adlandırılmaz.
