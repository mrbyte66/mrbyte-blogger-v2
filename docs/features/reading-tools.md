# Özel okuma araçları

Satır İzi tasarımı: renkli fosforlu kalem, kırmızı alt çizgi, kaynak metne bağlanan kenar notları; ayrı metin/ses ikonları, düzenleme/silme/geri alma, kart kapatma ve genel görünürlük toggle’ı. Pinlenebilir İnce Dizin arama ve kendi iç kaydırmasıyla çok sayıda notu taşır. Aynı paragrafta tek açık kart ve önceki/sonraki geçişi kullanılır; diğer kayıtlar tür/adet işaretleriyle erişilir. Silme kalıcı kayıt başarılı olduktan sonra 420 ms tozlaşma ile gösterilir; geri al korunur. Reduced-motion/sitenin hareket tercihi animasyonu kapatır. Header, okuma alanı ve footer aynı dış hizayı paylaşır. Toolbox kısa etiket ve özel hover açıklamaları taşır; renkler üç görünüme uyarlanır. İçerik değişince güvenle eşleşmeyen alıntı korunur, yanlış metne taşınmaz.

Serbest Not seçili metinden bağımsızdır; hashtag arama/filtre yalnız Serbest Notlarda çalışır. Header’da tek **Defterim | +** kontrolü vardır: Defterim /notlar listesini, + büyük Serbest Not penceresini açar. /notlar listesi ve düzenleyici yan yanadır; yazıya bağlı notlar ayrı sekmededir. Editör yazdıkça 280 ms geçişle büyür, ekran sınırında içeride kayar. Kaydedilmeyen taslak kapanışta korunur. Metin/ses kaydı ayrı ikonlarla gösterilir. Burada kaldım, paragrafa bağlı küçük ayraçtır; dönüş düğmesi satıra götürür.

Notlar tüm roller için özeldir. Doğrulanmış üyeler sunucuda, misafirler tarayıcıda saklar; site verileri temizlenince misafir notları kaybolur. Tarayıcı notlarını hesaba aktarma açık tercihle; başarısız kayıtlar tarayıcıda korunur. Ses private endpoint/IndexedDB üzerinden saklanır; açık medya URL’si yoktur. Gönderim/okuma/hesap izolasyonu ve version kontrolü korunur.

Mini sözlük, ücretsiz Dictionary API ve Wiktionary üzerinden seçilen İngilizce kelimenin açıklamasını küçük panelde doğrudan gösterir. Google zorunluluğu kullanıcı kararıyla kaldırıldı. Kaynak belirtilir; sonuç yokluğu/servis kesintisi görünürdür. Dışarıya yalnız seçilen kelime gönderilir.

AI, quiz, flashcard ve public notlar bu teslimin kapsamında değildir. Dışa aktarma ayrı Backlog işidir. [Frontend ayrıntıları](../../frontend/docs/reading.md).

Takip: [#7](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/7), [#15](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/15), [#21](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/21).
