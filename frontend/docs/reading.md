# Okuma araçları uygulaması

Satır İzi, yalnız kalıcı yazı sayfasında ReadingTools bileşenini kullanır. Ana sayfadaki açılan okuyucu salt okunur; yazı altındaki not adedi aynı yazının kalıcı bağlantısına götürür. Metin seçince toolbox açılır: renkli fosforlu kalem, kırmızı alt çizgi, metin notu, ses notu, okuma ayracı ve kelime anlamı. Studio ve salt okunur kitaplık önizlemesinde yan etki üretmez.

Seçili metne bağlı notlar geniş alanda kenardaki kartlarda düzenlenir; bağlantı çizgileri kaynakla ilişkiyi gösterir. Ölçülen kart yükseklikleriyle kaynak sırasına göre çakışmadan dizilir. Aynı paragraftaki kapalı metin/ses notları ayrı ikonlar ve adetlerle gruplanır. Dar alanda açık kartlar metnin altında sıralanır. Her kart ayrı kapanır; Notları göster toggle’ı kart/ikon/çizgi/not vurgusunu gizler, kaydı silmez. Bağımsız fosforlu işaretler ve okuma ayracı korunur.

Mevcut not düzenlenir/silinir, silme geri alınabilir. Sunucu güncellemesinde kaydın revisionId/version değeri kullanılır; 412 durumunda taslak korunur. Stable block UUID, UTF-16 aralık ve quote/context ile eşleşmeyen kayıt yanlış metne bağlanmaz; listede ve düzenleme kartında korunur. CSS Highlight API metnin DOM’unu sarmadan renklendirir. Destek yoksa kayıt listesi çalışır.

Alıntı eşleştirmesinde eski konum tek başına yeterli değildir: kaydedilen önceki/sonraki bağlamla yalnız bir eşleşme bulunmalıdır. Bağlam değişmişse veya aynı bağlam birden çok yerde varsa işaret çözümlenmez. Eski kayıtta bağlam yoksa alıntının blokta tek olması gerekir. Böylece düzenleme sonrası eski konuma gelen başka bir tekrar yanlışlıkla vurgulanmaz; güvenle eşleşmeyen not silinmeden korunur.

Metni seçerek vurgu/alt çizgi kaldırma işlemi de aynı güncel kaynak eşleşmesini kullanır; eski offset üzerinden başka bir tekrarın işareti kaldırılmaz. Taşınmış bir vurguyu tıklayarak yeni not oluşturulursa yeni kayıt güncel metnin konumu, bağlamı ve revision'ıyla gönderilir; mevcut notun özgün kaynak kaydı değiştirilmez.

Serbest Notlar seçime bağlı değildir; /notlar sayfasında ve okuma içindeki Serbest Not penceresinde yazılır. Inline hashtag’ler yalnız bu Serbest Notlar için arama/filtre işlevi taşır; alıntı notlarında hashtag sınıflandırması yoktur. Notlarım ayrı belge ikonuyla açılır. Not metni HTML olarak yorumlanmaz.

Doğrulanmış üyelerin notları Spring Boot API’de, misafirlerin metin/ayraç/Serbest Notları localStorage’da; misafir sesleri hesap/yazı bazında IndexedDB’de saklanır. Tarayıcı site verileri temizlenirse misafir notları kaybolur. Üyelik çağrısı bunu açıklar; kayıtlar kendiliğinden hesaba aktarılmaz. İçe aktarma açık tercihle yapılır, başarısız kayıtlar korunur. Hesap değişince bileşen yeniden kurulur; eski hesabın görünür notları ve ses URL’leri temizlenir.

Ses kaydı yalnız kullanıcı mikrofon düğmesine basınca başlar. İzin reddi/destek yokluğu/boş kayıt/boyut hataları görünürdür. Pencere kapanınca mikrofon durur; izin geç gelirse açılan track’ler hemen kapatılır. MediaRecorder ve private audio endpoint kullanılır; public medya alanına kaydedilmez. Kayıt en çok 2 dakika/1 MB; hesap ses alanı 25 MB. Nesne URL’leri unmount’ta revoke edilir. Tarayıcıya göre WebM/Opus, Ogg/Opus veya MP4 kullanılır.

Mini sözlük kullanıcı seçimiyle ücretsiz Dictionary API / Wiktionary kaynaklarından doğrudan sonuç gösterir. Şimdilik İngilizce açıklamadır; Türkçe çeviri iddiası yoktur. Yalnız seçilen kısa kelime dış kaynağa gönderilir. Sunucu sabit HTTPS host, zaman/boyut sınırı, 500 kelimelik kısa önbellek ve rate limit uygular; hata/sonuç bulunamadı durumları panelde görünür. Kaynak bağlantısı gösterilir; ikinci bir arama düğmesi yoktur.

## Defter Ayracı / İnce Dizin

Header’daki ortak `NotebookControl`, Defterim bağlantısıyla `/notlar` sayfasını, + ile seçimsiz Serbest Not dialog’unu açar. Not Atlası hızlı paneli en fazla 840 px genişler. `AutoGrowTextarea` ayrı gizli ölçüm alanıyla görünür textarea’yı sıçratmadan 280 ms’de büyütür/küçültür; üst sınır viewport’a bağlıdır, uzun içerik kendi içinde kayar. Dar ekranda dialog ekran sınırını korur. Kaydedilmeyen taslak kapanışta uyarılır.

Not dizini sol tarafa sabitlenebilir; tercih tarayıcıda saklanır. Uzun not listesi kendi içinde kayar ve aranır. Seçilen kaynak notu aynı kaynaktaki kartların tümünü açar; diğer açık kartları kapatmaz. Kaynak kartı ancak silme işlemi başarılı olduktan sonra tozlaşır; abort/unmount tüm animasyonları temizler. Motion kapalıysa anında kaldırılır. /notlar, Serbest Notları arama/hashtag ve seçili not düzenleyicisiyle listeler. Yazı notları sekmesi erişilebilir yayınlardaki özel notları toplar; seçilen kayıt doğrudan yazının notuna döner.

Serbest Notlara da private ses eklenebilir (V16): metin güncellenince ses korunur. `/me/notes/{id}/audio` yalnız sahibine no-store yanıt verir; ses doğrulama ve hesap başına toplam 25 MB sınırı yazı notlarıyla ortaktır. Misafir sesi IndexedDB’dedir; üyeliğe aktarım açık tercihle sesle birlikte yapılır.

## Not Atlası — 17 Ekim 2026

Defterim renkli kart ve sıkı liste görünümü, başlık/metin araması, doğrudan Enter ile etiket girişi ve etiket filtreleri içerir. Seçili Serbest Not geniş yan editörde açılır; başlık, büyüyen metin alanı, kaldırılabilir etiketler ve bağımsız ses kayıtları aynı taslağın parçalarıdır. Header Defterim | + kontrolünü korur; hızlı panel de aynı editörü kullanır. Kaydedilmeyen değişiklikte geçiş/kapanış uyarılır.

Bir Serbest Nota en fazla 10 ses kaydı eklenebilir; her kayıt ayrı oynatılır, ileri alınır ve kaldırılır. Yeni kayıt sırasında önceki kayıtlar görünür kalır; kayıt sürerken kaydetme kapalıdır. Eski tek sesli notlar V17 ile kayıt listesine taşınır; legacy audio endpoint ilk kaydı döndürür. Yeni private recording endpoint not sahibini doğrular ve no-store yanıt verir. 2 dakika/1 MB kayıt ve toplam 25 MB hesap sınırı korunur.

Metindeki vurgulu yere tıklamak veya işaretli aralığı seçmek kaldırma araçlarını açar. Vurguyu kaldır ve Alt çizgiyi kaldır ayrı işlemlerdir; alıntıya bağlı metin/ses notu korunur. İşaret kaldırma geri alınabilir. Geniş okuma alanında kenar kartları 360 px olur; pinli dizin ve dar ekran düzeni korunur. Misafir kayıtları tarayıcıdadır ve site verileri temizlenince kaybolur; üyeliğe aktarım açık tercihtir.

Üretim edge’inde yalnız `PUT /api/v1/me/notes/*` için 14 MB JSON sınırı vardır (10 × 1 MB sesin base64 aktarımı + metin). Diğer API istekleri 2 MB sınırını korur.

### Çoklu açık kart ve kalıcı okuyucu — 17 Ekim 2026

Metin/ses kartları bağımsız açılır, kapanır ve aynı kaynaktakiler birlikte gösterilir. Dizin Tümünü aç / Tümünü kapat sunar. Ölçülen kart yüksekliği ve kaynak sırası çakışmayı önler; reserve yalnız gerçek kart/dizin sonuna kadar alan ayırır. Connector SVG tahmini fazladan yükseklik üretmez. Dar ekranda açık kartlar metnin altına dizilir. Kart konumu ve sayfa alanı geçişle güncellenir; hareket kapalıysa geçiş yoktur.

Kaynak düğmesi veya dizinden bir not seçmek, tam alıntıya yumuşak kaydırır ve 3 saniyelik kırmızı çerçeve/etiket gösterir. Metin DOM’u değişmez; çok satırlı alıntı ayrı satır kutularıyla işaretlenir. Çözülemeyen kaynakta yanlış yere gidilmez. Yeni alıntı notuna rastgele varsayılan renk atanır; kullanıcı seçimi ve kayıtlı renk korunur.

Ana sayfanın açılır okuyucusunda not ekleme, dizin ve highlight araçları yoktur. Yazı altındaki sayaç kalıcı okuyucuyla aynı özel kayıt adedini gösterir; tıklamak alttaki kalıcı bağlantı ile aynı yazıyı açar. Public summary için revision gerekmeden hesap notları okunur; eski hesabın sonucu yeni oturumda gösterilmez. Panelin eski genişliği korunur.

Önizleme sayacı kalıcı bağlantı satırında, yazının altında yer alır; üst adada gösterilmez. Kalıcı okuyucudaki Notlar toplamıyla aynı kayıtlar sayılır (metin/ses notu, fosfor, alt çizgi ve ayraç). Sıfır, yükleniyor ve hata durumunda kontrol disabled olur; dolu sayaç kalıcı yazıyı açar.

### Defterim çalışma alanı — 19 Ekim 2026

Editör açıkken kart görünümünde solda tek kart sütunu ve yaklaşık 1:3 oranla geniş sağ editör kullanılır. Dar ekranda editör ve tek sütun kartlar alt alta gelir. Yeni not eylemi sayfa başlığındaki ayrı kapsül yerine kart listesinin araç satırındadır. Editör kapatıldığında mevcut kart/liste görünümü korunur.

Etiketler ayrı düğme/pencere açmadan doğrudan yazılır; Enter etiketi çipe çevirir ve aynı alanda sonraki etiket yazılır. Geçerli ama henüz Enter’a basılmamış etiket Kaydet ile eklenir; hatalı etiket sessizce düşürülmez. Bekleyen etiket de kaydedilmemiş taslak sayılır. Yeni Serbest Not rastgele varsayılan renkle başlar ve art arda yeni notta önceki renk tekrar seçilmez; kullanıcı seçimi ve mevcut notların rengi korunur. Otomatik başlangıç rengi taslağı kendiliğinden kirli yapmaz.


### Not Atlası — kaynak takibi ve Studio karşılaştırması (19 Ekim 2026)

Notun özgün alıntısı ve kaynak sürümü otomatik eşleştirmede değiştirilmez. Üye API'si yalnız ilgili hesabın kayıtları için özgün blok metinlerini döndürür; tarayıcı notları oluşturulurken kaynak görüntüsü alınır. Eski tarayıcı kayıtları iki yan bağlam tek ve değişmeden kaldıysa küçük bir düzenlemeyi takip edebilir. Kanıt yetersizse kayıt korunur, işaret tahminle başka yere taşınmaz.

Varsayılan Metni takip et; not sahibi isterse Özgün alıntıya bağlı kal seçer. Değişmeyen/kayan kaynak, küçük kaynak düzenlemesi, kontrol bekleyen eşleşme ve kaldırılan kaynak ayrı durumlarla gösterilir. Küçük düzenleme anlamı değiştirebileceği için Kaynak değişti etiketiyle özgün/güncel alıntılar karşılaştırılır. Büyük veya belirsiz değişiklikte vurgu uygulanmaz. Silinen tekrar yazıda kalan başka bir aynı ifadeye bağlanmaz. Paragraf kimliği taşımalarda korunur; bitişik bölünmüş/birleşmiş kaynaklar yeterli kanıt varsa birden çok aralıkla gösterilir. Pahalı diff işlemi sınırlıdır; büyük yeniden yazım kontrol bekler.

Kaynak ayrıntıları dizinde ve kenar kartındadır. Kullanıcı metin seçerek kaynağı açıkça yeniden bağlayabilir; ilk alıntı yine saklanır. Üye tercihleri/version kontrolü API'de, misafir tercihi tarayıcı not kaydındadır. Ses, renk, not kimliği ve çoklu notlar kaynak hesaplamasından etkilenmez.

Studio yazı araç satırındaki Notları göster, taslağın notlu/temiz görünümünü açar. Yalnız kendi okuma notları read-only endpoint'ten gelir; başka okuyucunun özel notları yazar yetkisiyle görünür olmaz. Taslakta değişiklik/silme/geri alma yalnız görüntülenen kaynak sonucunu etkiler; yayınlanmış kayda yazmaz. Studio'da ses de yalnız kendi kaydı için private/no-store olarak okunur. Ana sayfa salt okunur yazı paneline araç eklenmez.

/studio/not-senaryolari owner gate arkasında aynı kaynak motorunu kullanan 14 canlı örnek sunar. Denemeler gerçek notlara/yazılara kaydetmez. Kaynak türü tercihleri V18, ilk alıntının korunması V19 migration'larıyla eklenir; uygulanmış migration'lar değiştirilmez.

- Satır Aynası: 14 örnek tek bir yönlendirilmiş dene → sonucu gör → devam et akışında sunulur. Seçim/ayar/editör menüleri kaldırılmıştır; özgün metin, değişiklik ve kısa sonuç birlikte öğrenmeyi destekler. Geri al ve önceki örnek erişimi vardır. Küçük kenar notu, gerçek highlight ve kart koordinatlarıyla çizilen animasyonlu okla bağlanır; belirsiz/silinmiş kaynakta ok yalnız eski alıntıya döner. İki not bağımsız kartlarla korunur. Resize/font/animasyon sonlarında ok yeniden ölçülür. Reduced-motion ve hesap hareket tercihi korunur. Sayfa, gerçek SitePageHeader ve PublicFrame footer bileşenlerini kullanır; Studio footer opt-in yalnız bu alıştırma sayfasındadır, diğer Studio sayfaları değişmez.

### Alıntı Köprüsü — Akış Adası (19 Ekim 2026)

Kaynak durumu büyük yönerge/selector yerine kısa etiket, saklanan alıntı ve Yeni yer seç eylemiyle gösterilir. Takip et / Alıntıyı koru tercihi küçük ayar kontrolündedir; Studio salt okunur kalır. Bulunamayan kaynağa yanıltıcı atlama eylemi verilmez.

Yeniden bağlama iki adımdır: metni seç, önce/yeni alıntıyı karşılaştırıp Bağla. Cam ada başlangıçta ilgili paragrafın yanında, seçim bitince seçilen son paragrafın altında akış içinde yer alır; metni örtmez. Seçim sırasında olağan toolbox gizlenir, not rengiyle geçici vurgu ve mevcut yuvarlak kaynak ikonundan karta kesik köprü gösterilir. Çizgi kartın gerçek koordinatına bağlıdır ve kart hareket ederken güncellenir. Dar ekranda kart yazının altında, ada paragraf yanında kalır. Reduced-motion ve hareket tercihi korunur.

Seçim/iptal/Escape kayda dokunmaz. Bağla not kimliği, ilk özgün alıntı, renk, metin ve sesi koruyarak yalnız kaynak ve revision'ı günceller. Başarı kartta Bağlandı ve Geri al sunar; geri alma en güncel version ile yalnız önceki bağlantıyı geri getirir, arada düzenlenen not metnini/renk/sesi ezmez. Başka yerde değiştirilmiş bağlantı geri alınmaz. 412 sonrası güncel not yüklenir, seçili taslak korunur ve yeniden açık onay beklenir; otomatik tekrar yazılmaz. Hesap/sürüm geçişinde geçici akış ve geri alma temizlenir.
