# Studio yazı araçları

**Satır içi biçim.** Paragraf ve alıntıda kalın, italik, üstü çizili, vurgu, satır içi kod ve bağlantı (`bold`, `italic`, `strike`, `highlight`, `code`, `link`). Biçim düz metnin yanında `marks: [{type, start, end, href?}]` olarak saklanır (UTF-16 ofsetleri), böylece okur işaretleri ve alıntıları aynı karakterlere bağlı kalır. Aynı türdeki işaretler çakışmaz; bağlantı yalnız `https://`, `mailto:` ya da site içi `/yol` olabilir; sunucu aynı kuralları doğrular. Başlıkta biçim yoktur. Yazarın vurgusu temanın vurgu renginde bir fosfor çizgisidir; okurun kendi sarı vurgusundan ayrı görünür. Kısayollar: ⌘/Ctrl+B, I, E (kod), K (bağlantı), ⇧⌘X (üstü çizili), ⇧⌘H (vurgu).

**Araç çubuğu.** Tuvalde bir paragrafa basınca açılır; gruplar: blok türü (Metin, Başlık, Alt başlık, Alıntı), biçimler ve Biçimi temizle, seçim varken büyük/küçük harf, blok (yukarı, aşağı, altına ekle, sil), geri al/yinele ve Tamam (Esc vazgeçer). Son blok silinirse boş bir paragraf kalır. Çubuk yaylı açılır, imleci yumuşakça izler, dar çerçevede iki satıra iner.

**Özel notlar.** Yazı başına en fazla 200 not, her biri en fazla 1000 karakter; paragrafa (kararlı blok kimliği) ya da tüm yazıya bağlanır. Yalnız sahip görür; revizyona, yayına, aramaya ve herkese açık API’ye girmez. Çözüldü işaretlenebilir, silinebilir. Bağlı paragraf kaldırılırsa not “Bağlı paragraf kaldırıldı” olarak kalır. Uçlar: `/api/v1/studio/articles/{id}/notes` (GET, POST), `…/notes/{noteId}` (PATCH, DELETE).

**Günlük kelime hedefi.** Site ayarında `dailyWordGoal` (0–20.000, 0 kapalı). Bugünkü sayı, her yazıda gün başındaki son revizyonla bugünkü son revizyon arasındaki net kelime artışıdır (site saat dilimi); silinen metin hedefi geri götürmez, kaydedilmemiş değişiklik canlı eklenir. Uç: `GET /api/v1/studio/writing/today`. Hedef, If-Match ile `PATCH /api/v1/studio/site` üzerinden kaydedilir.

İmleç konumu (satır/sütun) tuval çerçevesinden `mrbyte:caret` iletisiyle gelir; satır numarası tuvaldeki numarayla aynıdır.
