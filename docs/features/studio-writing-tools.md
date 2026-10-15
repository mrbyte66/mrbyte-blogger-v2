# Studio yazı araçları

**Satır içi biçim.** Paragraf ve alıntıda kalın, italik, üstü çizili, vurgu, satır içi kod ve bağlantı (`bold`, `italic`, `strike`, `highlight`, `code`, `link`). Biçim düz metnin yanında `marks: [{type, start, end, href?}]` olarak saklanır (UTF-16 ofsetleri), böylece okur işaretleri ve alıntıları aynı karakterlere bağlı kalır. Aynı türdeki işaretler çakışmaz; bağlantı yalnız `https://`, `mailto:` ya da site içi `/yol` olabilir; sunucu aynı kuralları doğrular. Başlıkta biçim yoktur. Yazarın vurgusu temanın vurgu renginde bir fosfor çizgisidir; okurun kendi sarı vurgusundan ayrı görünür. Kısayollar: ⌘/Ctrl+B, I, E (kod), K (bağlantı), ⇧⌘X (üstü çizili), ⇧⌘H (vurgu).

**Yazma.** Yeni yazı başlığından başlar. Enter başlıktan özete, özetten metne geçer; metinde yeni paragraf açar. Seçili metin Enter ile değiştirilir; Shift+Enter satır sonu bırakır. Backspace paragrafın başında öncekiyle, Delete sonunda sonrakiyle birleştirir. Metin ve biçim işaretleri korunur; sağdaki paragrafın kaldırılan kimliğine bağlı özel notlar mevcut kayıp-ankor davranışını sürdürür. Çok satırlı yapıştırma ayrı paragraflar oluşturur; gelen HTML düz metin olarak alınır. IME yazımındaki Enter paragraf açmaz.

**Araçlar.** Yazarken metnin üstünde araç çubuğu durmaz. Metin seçilince kalın, italik, vurgu, bağlantı ve diğer biçimler açılır. Paragraf yanındaki ＋ metin türünü ve eklemeyi sunar; taşıma/silme bu menüde kalır. /, ##, ### ve > kısayolları isteğe bağlıdır, öğrenmek zorunlu değildir. Sayfa araçları küçük “Yazı araçları” menüsündedir; sürekli kenar sütunu, karakter sayacı ve satır/sütun numarası yoktur.

⌘/Ctrl+S kaydeder; ⌘/Ctrl+Z ve ⇧⌘/Ctrl+Z metin ve yapısal geri alma/yinelemeyi sağlar. İlk kayıt editörü yeniden açmaz; kayıt sürerken yazılan metin korunur ve sonraki kayıt güncel sürümü kullanır. Biçim veya birleştirmeden sonra imleç, güncel metin tuvale ulaşınca yerleştirilir. Oturum sona ererse açık taslak tutulur, giriş düğmesi gösterilir ve yeniden girişte tuval tekrar yüklenir.

**Sesle yazma.** Tuval araçlarında pasif “Sesle yaz · Yakında” düğmesi vardır. Mikrofon erişimi istemez; kayıt, sunucu veya ses işleme bağlantısı yoktur. Backend daha sonra ayrıca geliştirilecektir.

**Özel notlar.** Yazı başına en fazla 200 not, her biri en fazla 1000 karakter; paragrafa (kararlı blok kimliği) ya da tüm yazıya bağlanır. Yalnız sahip görür; revizyona, yayına, aramaya ve herkese açık API’ye girmez. Çözüldü işaretlenebilir, silinebilir. Bağlı paragraf kaldırılırsa not “Bağlı paragraf kaldırıldı” olarak kalır. Uçlar: `/api/v1/studio/articles/{id}/notes` (GET, POST), `…/notes/{noteId}` (PATCH, DELETE).

**Günlük kelime hedefi.** Site ayarında `dailyWordGoal` (0–20.000, 0 kapalı). Bugünkü sayı, her yazıda gün başındaki son revizyonla bugünkü son revizyon arasındaki net kelime artışıdır (site saat dilimi); silinen metin hedefi geri götürmez, kaydedilmemiş değişiklik canlı eklenir. Uç: `GET /api/v1/studio/writing/today`. Hedef, If-Match ile `PATCH /api/v1/studio/site` üzerinden kaydedilir.

İmleç konumu tuval çerçevesinden iletilir; yazma yüzeyinde teknik satır/sütun bilgisi gösterilmez.

Seçili metnin yanındaki araç çubuğunda ara başlık ve alıntı tek tıkla uygulanır; aynı düğme paragraf biçimine döndürür. Biçim değişiminde metin içi vurgular korunur. Yazarken Escape düzenlemeyi bitirir, yazılan metni geri almaz.
