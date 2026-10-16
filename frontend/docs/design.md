# Korunan tasarım

Mevcut karakter merkezli CRT sahnesi, kıvırcık saçlı artwork, yuvarlak siyah gözlük, ekran göz takibi ve blink korunur. Kendiliğinden yeni portre/asset üretme, raster head warp/rotate uygulama. Diğer temalar akış/dergi düzeni olabilir; mevcut görsel kimlik yeniden tasarlanmayacak.

Okunur metin/kod, mevcut palette/typography/radius/spacing, açık-koyu tema ve motion kontrolü korunur. Keyboard focus, reduce-motion, dokunma ve dar ekran düzeni; tablo/kod kendi yüzeyinde scroll. Hover underline ekleme; semantik prose link/not underline farklıdır.

Panel/sayfa geri dönüşü filtre/scroll/focus bağlamını korur. Yazı/seri kartları ortak dilde; istatistik sunumu yeni kararla şimdilik kaldırılacak. Sahne featured kartları owner seçimiyle kalır. Audio opt-in ve durdurma kontrolü erişilebilir.

Studio yapı/canvas/inspector masaüstünde birlikte görünür, mobilde okunur paneller. Site adı seçilmedi; eski ürün adını yeni tasarım gereksinimi diye koruma. [Ürün](../../docs/product.md), [Studio](builder.md).

Formlarda hatalı alan kırmızı çerçeve ve alanın altındaki kısa açıklamayla belirtilir; yalnız renge dayanılmaz. Açık/koyu tema ve ekran okuyucu için aria-invalid/aria-describedby kullanılır. Kullanıcı yazmaya başladığında hatası görünür; düzeltince çerçeve ve uyarı kalkar. Parlama kullanılmaz.

Studio’da değişiklik en az tıklama ve kısa mouse yolu ile yapılır. Metin tuvalde düzenlenir; ikincil panel seçilen alanın/araç düğmesinin yanında açılır. Kayıt ve yayın komutları sayfa ve görünüm değişiminde aynı yerde kalır.

- Sürekli yazma akışında panel açıp kapatma zorunluluğu azaltılır. Ara başlık ve alıntı seçili metnin yanında uygulanır; açık çalışma paneli tuvale dönünce kendiliğinden kapanmaz. Geniş ekranda panel yazının üstünü örtmez. Escape metni geri almaz; geri alma ayrı ve açık bir eylemdir. Bu kolaylıklar mevcut tema, tipografi ve görsel bütünlük korunarak sağlanır.

Üst menü araçları ortak `UtilityIsland` kabuğunu kullanır; Studio görünümü düğmesi Studio adasında kalır. Açılan menü ve pencere yüzeylerinde ortak buzlu cam tonu/blur kullanılır, içerik alanı okunur kalır. Ada blur’u ayrı arka plan katmanındadır; fixed alt pencereler için containing block oluşturulmaz.

Ana sayfadaki açılır okuma panelinin adası da üçlü renk seçiciyi içerir. Cam kabuğu opak `CoverTransition` yüzeyleriyle kapatma: yerleşik görünümde ara katmanlar şeffaftır; metinler üst üste binmesin diye yalnız sayfa geçişinde dolgu korunur. Bu panelde kart ve kategori düğmeleri de hafif cam yüzey kullanır.
