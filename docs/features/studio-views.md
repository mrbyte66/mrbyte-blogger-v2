# Studio görünümleri

Studio aynı araçları dört yerleşimde sunar. Seçim tarayıcıda (`satir:studio-view`, <html data-studio-view>) ve giriş yapılmışsa hesapta saklanır (bkz. [görünüm tercihleri](appearance.md)); içeriği, siteyi ya da ziyaretçi görünümünü değiştirmez. Her görünümün açık, koyu ve okuma eşi vardır.

Üst çubuğun sağında üç ayrı denetim vardır, her biri tek basışta: **renk modu** (Gündüz · Okuma · Gece), **Studio görünümü** (kendi düğmesinde; dört görünüm kartı, Odak’ta soluklaştırma anahtarı) ve **hesap** (profil menüsü). Görünüm seçimi hesap menüsüne karışmaz; “Siteye dön” bağlantısı yoktur (marka kutusu siteyi açar).

- **Marjinalya** (varsayılan): sol ray (Yazılar, Site) ve altında son açılan sayfalar; tasarım ile bir sayfa arasında tek basışla gidip gelinir. Üst çubukta konum/durum/tarih, yazı tuvalinde sessiz sayfa ve tuval çubuğunda küçük Yazı araçları menüsü. Adres, kapak, yayın ve özel notlar ihtiyaç halinde açılır.
- **Odak**: sessiz üst çubukta sayfa işlemleri, tuval çubuğunda küçük araç menüsü, sağda paragraf haritası; Odak anahtarı yazılmayan blokları soluklaştırır.
- **Kontakt**: pill gezinme (Yazılar, Seriler, Ana sayfa; 1100–1299 px’te yalnız ikon), kart düzeni; sayfa seçici kapak kartlı kitaplık galerisi ve ayrıntı çekmecesi açar.
- **Sahne**: başlangıç düzenleri üst çubukta, sayfa sahnede, bloklar altta şeritte; blok paleti kendi “Blok ekle” düğmesinin üstünde açılır.

**Paneller.** Yazı ve seri düzenlerken açık ayar paneli tuvale dönünce kapanmaz. 1100 px ve üstünde tuvalin yanında yer ayırır; metnin üstünü örtmez. Kapat düğmesi veya panelde Escape ile kapanır. Ana sayfa tasarımındaki yüzen panellerin mevcut davranışı korunur. Yüzen yüzeyler `data-layer` ile işaretlidir: son açılan ya da basılan öne gelir (`lib/studio/layers.ts`), örneğin tasarım paneli açıkken açılan blok paleti onun arkasında kalmaz; paneli açan düğmeye yeniden basmak paneli öne getirir. Katmanlar site geneli ses düğmesinin altında kalır.

**Bir ikon, bir işlev.** Dişli: Site tercihleri · palet: Tema tasarımı · üç katlı blok: Sayfa yapısı · not kâğıdı: Özel notlar · dikey çerçeve: Kapak · yatay çerçeve: Görsel · ev: Site tasarımı · iki pencere: Studio görünümü. Aynı ikon başka bir işleve verilmez; tanımsız ad boş çizilir.

**Hareket.** Tek yaylı karakter: basınca hafif çökme, üstüne gelince kalkma, paneller tetikleyicilerinden açılır ve kapanırken kapanır, ayarlar sırayla gelir, tuval yerine oturur. Yalnız transform ve opacity hareket eder; hareket kapalıyken ve reduced-motion’da hepsi durur.

1100 px altında üst çubuk satırlara sarılır (telefonda üç satır), yazı araçları tuval çubuğunda sarılır; telefonda ayar paneli alt sayfa olur. Dört görünümde de metin seçimi biçim araçlarını, paragraf yanındaki ＋ eklemeyi açar. Medya kitaplığı ve istatistikler v2 kararlarıyla kapsam dışıdır.

Canlı tuval çerçevesi (`/preview?embedded=1`) görünümü <html> üzerinden okur (`app/studio-canvas.css`): site tasarımı aynen kalır, yazma yüzeyi sade kalır; görünüm, çevresindeki yerleşimi ve isteğe bağlı soluklaştırmayı değiştirir. Satır sayılan bloklar `lib/builder/rows.ts` ile CSS’te aynı listedir. Tuvalden gelen düzenlemeler render beklenmeden en güncel taslağa uygulanır; taslak tuvalin başladığı metni tutmuyorsa tuvaldeki değer geçerli olur. Geri alma ya da sunucu kopyası tuvaldeki yazımı bitirip metni yeniler (`mrbyte:canvas-reset`).

Yazı ve seri düzenlerken Tasarım düğmesi aynı site tema taslağını açar; ayarlar o sayfanın tuvalinde canlı görünür. Temayı uygula açık bir işlemdir ve yazı kaydından ayrıdır. Odak dahil bütün görünümlerde Kaydet/yayın işlemleri üst çubukta, yazı araçları tuval çubuğunda kalır. Düzenle modunda site header’ı korunur. Bağımsız yazı/seri seçimi kaydetmeden önce de önizlemeye yansır; ziyaretçinin yayınlanmış sayfası bu seçimden etkilenmez.
