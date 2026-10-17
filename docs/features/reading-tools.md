# Özel okuma araçları

Satır İzi tasarımı: renkli fosforlu kalem, kırmızı alt çizgi, kaynak metne bağlanan kenar notları; ayrı metin/ses ikonları, düzenleme/silme/geri alma, kart kapatma ve genel görünürlük toggle’ı. Pinlenebilir İnce Dizin arama ve kendi iç kaydırmasıyla çok sayıda notu taşır. Aynı paragraftaki kartlar da birlikte açılabilir; diğer açık kartlar korunur. Dizinden tüm notlar tek seferde açılır/kapatılır. Silme kalıcı kayıt başarılı olduktan sonra 420 ms tozlaşma ile gösterilir; geri al korunur. Reduced-motion/sitenin hareket tercihi animasyonu kapatır. Header, okuma alanı ve footer aynı dış hizayı paylaşır. Toolbox kısa etiket ve özel hover açıklamaları taşır; renkler üç görünüme uyarlanır. İçerik değişince güvenle eşleşmeyen alıntı korunur, yanlış metne taşınmaz.

Serbest Not seçili metinden bağımsızdır; hashtag arama/filtre yalnız Serbest Notlarda çalışır. Header’da tek **Defterim | +** kontrolü vardır: Defterim /notlar listesini, + büyük Serbest Not penceresini açar. /notlar listesi ve düzenleyici yan yanadır; yazıya bağlı notlar ayrı sekmededir. Editör yazdıkça 280 ms geçişle büyür, ekran sınırında içeride kayar. Kaydedilmeyen taslak kapanışta korunur. Metin/ses kaydı ayrı ikonlarla gösterilir. Burada kaldım, paragrafa bağlı küçük ayraçtır; dönüş düğmesi satıra götürür.

Notlar tüm roller için özeldir. Doğrulanmış üyeler sunucuda, misafirler tarayıcıda saklar; site verileri temizlenince misafir notları kaybolur. Tarayıcı notlarını hesaba aktarma açık tercihle; başarısız kayıtlar tarayıcıda korunur. Ses private endpoint/IndexedDB üzerinden saklanır; açık medya URL’si yoktur. Gönderim/okuma/hesap izolasyonu ve version kontrolü korunur.

Mini sözlük, ücretsiz Dictionary API ve Wiktionary üzerinden seçilen İngilizce kelimenin açıklamasını küçük panelde doğrudan gösterir. Google zorunluluğu kullanıcı kararıyla kaldırıldı. Kaynak belirtilir; sonuç yokluğu/servis kesintisi görünürdür. Dışarıya yalnız seçilen kelime gönderilir.

AI, quiz, flashcard ve public notlar bu teslimin kapsamında değildir. Dışa aktarma ayrı Backlog işidir. [Frontend ayrıntıları](../../frontend/docs/reading.md).

Takip: [#7](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/7), [#15](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/15), [#21](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/21).

## Not Atlası — 17 Ekim 2026

Defterim renkli kart ve sıkı liste görünümü, başlık/metin araması, açık Etiket ekle kontrolü ve etiket filtreleri içerir. Seçili Serbest Not geniş yan editörde açılır; başlık, büyüyen metin alanı, kaldırılabilir etiketler ve bağımsız ses kayıtları aynı taslağın parçalarıdır. Header Defterim | + kontrolünü korur; hızlı panel de aynı editörü kullanır. Kaydedilmeyen değişiklikte geçiş/kapanış uyarılır.

Bir Serbest Nota en fazla 10 ses kaydı eklenebilir; her kayıt ayrı oynatılır, ileri alınır ve kaldırılır. Yeni kayıt sırasında önceki kayıtlar görünür kalır; kayıt sürerken kaydetme kapalıdır. Eski tek sesli notlar V17 ile kayıt listesine taşınır; legacy audio endpoint ilk kaydı döndürür. Yeni private recording endpoint not sahibini doğrular ve no-store yanıt verir. 2 dakika/1 MB kayıt ve toplam 25 MB hesap sınırı korunur.

Metindeki vurgulu yere tıklamak veya işaretli aralığı seçmek kaldırma araçlarını açar. Vurguyu kaldır ve Alt çizgiyi kaldır ayrı işlemlerdir; alıntıya bağlı metin/ses notu korunur. İşaret kaldırma geri alınabilir. Geniş okuma alanında kenar kartları 360 px olur; pinli dizin ve dar ekran düzeni korunur. Misafir kayıtları tarayıcıdadır ve site verileri temizlenince kaybolur; üyeliğe aktarım açık tercihtir.

Üretim edge’inde yalnız `PUT /api/v1/me/notes/*` için 14 MB JSON sınırı vardır (10 × 1 MB sesin base64 aktarımı + metin). Diğer API istekleri 2 MB sınırını korur.

### Çoklu açık kart ve kalıcı okuyucu — 17 Ekim 2026

Metin/ses kartları bağımsız açılır, kapanır ve aynı kaynaktakiler birlikte gösterilir. Dizin Tümünü aç / Tümünü kapat sunar. Ölçülen kart yüksekliği ve kaynak sırası çakışmayı önler; reserve yalnız gerçek kart/dizin sonuna kadar alan ayırır. Connector SVG tahmini fazladan yükseklik üretmez. Dar ekranda açık kartlar metnin altına dizilir. Kart konumu ve sayfa alanı geçişle güncellenir; hareket kapalıysa geçiş yoktur.

Kaynak düğmesi veya dizinden bir not seçmek, tam alıntıya yumuşak kaydırır ve 3 saniyelik kırmızı çerçeve/etiket gösterir. Metin DOM’u değişmez; çok satırlı alıntı ayrı satır kutularıyla işaretlenir. Çözülemeyen kaynakta yanlış yere gidilmez. Yeni alıntı notuna rastgele varsayılan renk atanır; kullanıcı seçimi ve kayıtlı renk korunur.

Ana sayfanın açılır okuyucusunda not ekleme, dizin ve highlight araçları yoktur. Üst menü yalnız mevcut yazının özel metin/ses notu adedini gösterir; tıklamak alttaki kalıcı bağlantı ile aynı yazıyı açar. Public summary için revision gerekmeden hesap notları okunur; eski hesabın sonucu yeni oturumda gösterilmez. Panelin eski genişliği korunur.
