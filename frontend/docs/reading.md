# Okuma araçları uygulaması

Satır İzi, gerçek yazı sayfasında ve ana sayfanın açılan okuma panelinde aynı ReadingTools bileşenini kullanır. Metin seçince toolbox açılır: renkli fosforlu kalem, kırmızı alt çizgi, metin notu, ses notu, okuma ayracı ve kelime anlamı. Studio ve salt okunur kitaplık önizlemesinde yan etki üretmez.

Seçili metne bağlı notlar geniş alanda kenardaki kartlarda düzenlenir; bağlantı çizgileri kaynakla ilişkiyi gösterir. Ölçülen kart yükseklikleriyle kaynak sırasına göre çakışmadan dizilir. Aynı paragraftaki kapalı metin/ses notları ayrı ikonlar ve adetlerle gruplanır. Dar alanda kart metnin yanında açılan kompakt bir yüzey olur. Her kart ayrı kapanır; Notları göster toggle’ı kart/ikon/çizgi/not vurgusunu gizler, kaydı silmez. Bağımsız fosforlu işaretler ve okuma ayracı korunur.

Mevcut not düzenlenir/silinir, silme geri alınabilir. Sunucu güncellemesinde kaydın revisionId/version değeri kullanılır; 412 durumunda taslak korunur. Stable block UUID, UTF-16 aralık ve quote/context ile eşleşmeyen kayıt yanlış metne bağlanmaz; listede ve düzenleme kartında korunur. CSS Highlight API metnin DOM’unu sarmadan renklendirir. Destek yoksa kayıt listesi çalışır.

Serbest Notlar seçime bağlı değildir; /notlar sayfasında ve okuma içindeki Serbest Not penceresinde yazılır. Inline hashtag’ler yalnız bu Serbest Notlar için arama/filtre işlevi taşır; alıntı notlarında hashtag sınıflandırması yoktur. Notlarım ayrı belge ikonuyla açılır. Not metni HTML olarak yorumlanmaz.

Doğrulanmış üyelerin notları Spring Boot API’de, misafirlerin metin/ayraç/Serbest Notları localStorage’da; misafir sesleri hesap/yazı bazında IndexedDB’de saklanır. Tarayıcı site verileri temizlenirse misafir notları kaybolur. Üyelik çağrısı bunu açıklar; kayıtlar kendiliğinden hesaba aktarılmaz. İçe aktarma açık tercihle yapılır, başarısız kayıtlar korunur. Hesap değişince bileşen yeniden kurulur; eski hesabın görünür notları ve ses URL’leri temizlenir.

Ses kaydı yalnız kullanıcı mikrofon düğmesine basınca başlar. İzin reddi/destek yokluğu/boş kayıt/boyut hataları görünürdür. Pencere kapanınca mikrofon durur; izin geç gelirse açılan track’ler hemen kapatılır. MediaRecorder ve private audio endpoint kullanılır; public medya alanına kaydedilmez. Kayıt en çok 2 dakika/1 MB; hesap ses alanı 25 MB. Nesne URL’leri unmount’ta revoke edilir. Tarayıcıya göre WebM/Opus, Ogg/Opus veya MP4 kullanılır.

Mini sözlük kullanıcı seçimiyle ücretsiz Dictionary API / Wiktionary kaynaklarından doğrudan sonuç gösterir. Şimdilik İngilizce açıklamadır; Türkçe çeviri iddiası yoktur. Yalnız seçilen kısa kelime dış kaynağa gönderilir. Sunucu sabit HTTPS host, zaman/boyut sınırı, 500 kelimelik kısa önbellek ve rate limit uygular; hata/sonuç bulunamadı durumları panelde görünür. Kaynak bağlantısı gösterilir; ikinci bir arama düğmesi yoktur.

## Defter Ayracı / İnce Dizin

Header’daki ortak `NotebookControl`, Defterim bağlantısıyla `/notlar` sayfasını, + ile seçimsiz Serbest Not dialog’unu açar. Genişlik 760 px ile sınırlıdır. `AutoGrowTextarea` ayrı gizli ölçüm alanıyla görünür textarea’yı sıçratmadan 280 ms’de büyütür/küçültür; üst sınır viewport’a bağlıdır, uzun içerik kendi içinde kayar. Dar ekranda dialog ekran sınırını korur. Kaydedilmeyen taslak kapanışta uyarılır.

Not dizini sol tarafa sabitlenebilir; tercih tarayıcıda saklanır. Uzun not listesi kendi içinde kayar ve aranır. Seçilen kaynak notu sağdaki alanda tek kart açar; aynı paragrafta önceki/sonraki kullanılabilir. Kaynak kartı ancak silme işlemi başarılı olduktan sonra tozlaşır; abort/unmount tüm animasyonları temizler. Motion kapalıysa anında kaldırılır. /notlar, Serbest Notları arama/hashtag ve seçili not düzenleyicisiyle listeler. Yazı notları sekmesi erişilebilir yayınlardaki özel notları toplar; seçilen kayıt doğrudan yazının notuna döner.

Serbest Notlara da private ses eklenebilir (V16): metin güncellenince ses korunur. `/me/notes/{id}/audio` yalnız sahibine no-store yanıt verir; ses doğrulama ve hesap başına toplam 25 MB sınırı yazı notlarıyla ortaktır. Misafir sesi IndexedDB’dedir; üyeliğe aktarım açık tercihle sesle birlikte yapılır.
