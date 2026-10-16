# Özel okuma araçları

Satır İzi tasarımı: renkli fosforlu kalem, kırmızı alt çizgi, kaynak metne bağlanan kenar notları; ayrı metin/ses ikonları, düzenleme/silme/geri alma, kart kapatma ve genel görünürlük toggle’ı. Yakın kartlar ölçülen yüksekliklerle dikey dizilir. İçerik değişince güvenle eşleşmeyen alıntı korunur, yanlış metne taşınmaz.

Genel defter seçili metinden bağımsızdır; hashtag arama/filtre yalnız genel notlarda çalışır. Ayrı Notlarım ikonu ve /notlar sayfası, okuma içinde hızlı Genel not penceresi bulunur. Burada kaldım, paragrafa bağlı küçük ayraçtır; dönüş düğmesi satıra götürür.

Notlar tüm roller için özeldir. Doğrulanmış üyeler sunucuda, misafirler tarayıcıda saklar; site verileri temizlenince misafir notları kaybolur. Tarayıcı notlarını hesaba aktarma açık tercihle; başarısız kayıtlar tarayıcıda korunur. Ses private endpoint/IndexedDB üzerinden saklanır; açık medya URL’si yoktur. Gönderim/okuma/hesap izolasyonu ve version kontrolü korunur.

Mini sözlük, ücretsiz Dictionary API ve Wiktionary üzerinden seçilen İngilizce kelimenin açıklamasını küçük panelde doğrudan gösterir. Google zorunluluğu kullanıcı kararıyla kaldırıldı. Kaynak belirtilir; sonuç yokluğu/servis kesintisi görünürdür. Dışarıya yalnız seçilen kelime gönderilir.

AI, quiz, flashcard ve public notlar bu teslimin kapsamında değildir. Dışa aktarma ayrı Backlog işidir. [Frontend ayrıntıları](../../frontend/docs/reading.md).

Takip: [#7](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/7), [#15](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/15), [#21](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/21).
