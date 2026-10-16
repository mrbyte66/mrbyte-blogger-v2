# Kitaplık ve Hesap — tasarım V1.1

Buradaki V1/V1.1 adları kullanıcıyla seçilen **tasarım alternatifleridir**; ürünün ilk sürümü V1 olarak kalır.

Kitaplık, onaylanan V1.1 yerleşimini V1’in klasör sekmeleriyle birleştirir. Sekmeler içerik kategorileri değil, üyeye ait koleksiyonlardır. Kart ve kompakt liste aynı arama/sıralamayı kullanır. İlk 24 kayıt gösterilir, “Daha fazla göster” 24 ekler. Veri mevcut sunucu API’sinden gelir; yerel demo kayıt veya sahte sayaç eklenmez. Arama yüklenen tüm sunucu kayıtları arasında çalışır; 24 sınırı yalnız görünür liste içindir.

- Kartı koleksiyon sekmesine bırakmak gerçek bookmark kaydını taşır. Tümü yalnız filtredir, taşıma hedefi değildir. Aynı işlem kartın menüsünden ve klavyeyle de yapılır; dokunmatik cihazda menü kullanılabilir.
- Kaldırma/taşıma sonrası on saniyelik “Geri al” sunulur. Kaldırılan kayıt yeniden sunucuya kaydedilir; önceki koleksiyon kaldırılmışsa Genel kullanılır. Yeniden kaydın tarihi sunucunun yeni kayıt tarihidir. Başarısız işlem başarı gibi gösterilmez.
- Hızlı git koleksiyon ve yazı başlıklarını arar. Sonuç seçimi filtreden bağımsız olarak kaydı görünür kılar, kaydırır ve odağı bağlantıya taşır. ⌘/Ctrl K menüyü açar, oklar ve Enter gezinir, Escape kapatır.
- Kaydırırken filtre/arama kompakt şeritte kalır. Kaydırma bütün sayfadadır; ana içerikte iç içe scrollbar yoktur. Yazıya gidip geri dönünce filtre, görünüm, yüklenen kayıt sayısı ve konum aynı oturumun belleğinden geri gelir. Hesap değişimi veya çıkış özel bağlamı temizler. Ağ hatasında yalnız aynı hesabın son başarıyla yüklenmiş kitaplığı korunabilir.

Hesap yatay bölüm gezinmesi, avatar seçicisi ve mevcut güvenlik/oturum/bağlantı akışlarını kullanır. Avatar seçenekleri küçük, sayfalı pencerede açılır; ad ve avatar profil API’sine kaydedilir. E-posta arayüzde salt okunurdur; değiştirme formu kaldırılmıştır. Renk modu yalnız üst çubuktadır. Bu sayfada hareket kapatma kontrolü yoktur; sistemin reduced-motion tercihi korunur.

## Footer ve iletişim

Footer yayımlanmış site ve üye/okuma sayfalarında ortaktır. Studio/preview çalışma yüzeylerine eklenmez. Site adı ve varsa tema footer metni korunur; Mozart kapsülü mevcut tek audio context’ini kullanır. Oynatma yalnız kullanıcı eylemiyle başlar; kaynak/atıf ve hata/devralma davranışı korunur.

**Karakterli ana sayfa tam viewport olarak kalır.** Footer karakterin altına ayrı bant/yükseklik eklemez; alt köşelerde sahne üzerine yerleşir, ortadaki CRT alanını açık bırakır. Karakter asset’i ve yerleşim kuralları değiştirilmez. Dar ekranda gezinme ve öne çıkan kartlar footer’la çakışmayacak biçimde hizalanır. Diğer sayfalarda footer normal içerik akışının sonundadır; kısa sayfada ekran altını tamamlar.

İletişim, arka planı bulanıklaştıran erişilebilir bir dialog açar. Ad, yanıt adresi, konu ve mesaj sunucudaki `POST /api/v1/contact` ucuna CSRF ile gönderilir. Alıcı yalnız aktif site sahibinin sunucudaki adresidir; istemci alıcı belirleyemez. Yapılandırılmış SMTP From korunur, doğrulanmış gönderici adresi Reply-To olur. Mesaj uygulama DB’sine veya log’a yazılmaz. IP başına saatte 5, adres başına 3 ve site genelinde 30 sınırı vardır. SMTP kabulü olmadan başarı verilmez; hata halinde form korunur. Yerelde gönderiler Mailpit’e gider; gerçek yayında yapılandırılan SMTP sağlayıcısı kullanılır.

## Sabit hızlı liste

Geniş ekranda Hızlı git penceresindeki iğne, listeyi sol tarafa sabitler. Panel sayfa kayarken görünür kalır; koleksiyon/yazı seçimi veya dışarı tıklamak paneli kapatmaz. Aynı iğneyle ayrılır. ⌘/Ctrl K sabit panelin aramasına odaklanır. Sabitleme tercihi aynı hesabın mevcut oturum belleğinde yazıdan dönüşte korunur; dar ekranda kartları sıkıştırmak yerine açılır Hızlı git kullanılır, ekran genişleyince sabit görünüm döner.

## Kenarda okuma

Mevcut temanın yüzeyleri, tipografisi, paleti ve klasör sekmeleri korunur. Kart/satırın göz düğmesi (hover, klavye odağı veya dokunmatik görünüm) yayımlanmış yazıyı sağda açar. Kenardaki küçük + aynı paneli ilk görünür yazıyla açar; yerel kitaplık kartının bu hedefe sürüklenip bırakılması koleksiyonu değiştirmeden önizlemeyi değiştirir. Koleksiyona bırakma ayrı bir taşıma işlemidir. Yabancı sürükleme verisi kabul edilmez.

- İçerik sunucudan `expand=document` ile gelen public içeriktir; taslak/private/erişilemez kayıt önizlenmez. Ortak ArticleContent biçimlendirme, görsel, kod ve tabloyu gösterir; bu modda engagement/okuma geçmişi/annotation bağlamı kurulmaz ve görüntülenme olayı gönderilmez.
- Kart/liste, sabit hızlı liste ve önizleme birlikte kullanılabilir. Seçili kart/satır ve hızlı listedeki başlık lavantayla eşleşir. Önizleme açıkken hızlı listeden başka başlık seçmek içeriği değiştirir. Filtre değiştirmek açık önizlemeyi kendiliğinden kapatmaz.
- Genişletme ikonu gerçek yazıya gider; açıklama hover/klavye odağında görünür. Başlık ve arama mevcut kitaplıkta kalır. Panel ayırıcısı fareyle veya sağ/sol oklarla boyutlandırılır; dar merkezde tarih/koleksiyon sütunları azaltılır, kartlar gerektiğinde tek sütuna iner.
- 900 px ve altında yerel modal dialog alt pencere olur; arka plan inert ve kaydırma kilitlidir. Escape, kapat düğmesi ve dış alan kapatır; kapanıştan sonra göz düğmesine odak döner. Masaüstünde dış tıklama açık paneli kapatmaz.
- Panel tercihi, genişliği ve seçili yazı mevcut hesaba ait provider belleğinde yazıya gidip dönüşte korunur; çıkış/hesap değişimi temizler. Özel kayıt veya seçim tarayıcı storage’ına yazılmaz.
- Panel açılışı 220 ms, içerik geçişi/kapanışı 160 ms; reduced-motion ve mevcut hareket tercihi korunur. Tema rengi veya karakter değiştirilmez.
