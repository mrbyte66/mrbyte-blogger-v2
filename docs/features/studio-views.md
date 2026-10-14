# Studio görünümleri

Studio aynı araçları dört yerleşimde sunar. Seçim tarayıcıda (`satir:studio-view`, <html data-studio-view>) ve giriş yapılmışsa hesapta saklanır (bkz. [görünüm tercihleri](appearance.md)); içeriği, siteyi ya da ziyaretçi görünümünü değiştirmez. Her görünümün açık, koyu ve okuma eşi vardır.

Üst çubuğun sağında üç ayrı denetim vardır, her biri tek basışta: **renk modu** (Gündüz · Okuma · Gece), **Studio görünümü** (kendi düğmesinde; dört görünüm kartı, Odak’ta soluklaştırma anahtarı) ve **hesap** (profil menüsü). Görünüm seçimi hesap menüsüne karışmaz; “Siteye dön” bağlantısı yoktur (marka kutusu siteyi açar).

- **Marjinalya** (varsayılan): sol ray (Yazılar, Site) ve altında son açılan sayfalar; tasarım ile bir sayfa arasında tek basışla gidip gelinir. Üst çubukta konum/durum/tarih, yazı tuvalinde sessiz sayfa ve altta küçük Yazı araçları menüsü. Adres, kapak, yayın ve özel notlar ihtiyaç halinde açılır.
- **Odak**: sessiz üst çubuk, altta küçük araç menüsü ve sayfa işlemleri, sağda paragraf haritası; Odak anahtarı yazılmayan blokları soluklaştırır.
- **Kontakt**: pill gezinme (Yazılar, Seriler, Ana sayfa; 1100–1299 px’te yalnız ikon), kart düzeni; sayfa seçici kapak kartlı kitaplık galerisi ve ayrıntı çekmecesi açar.
- **Sahne**: başlangıç düzenleri üst çubukta, sayfa sahnede, bloklar altta şeritte; blok paleti kendi “Blok ekle” düğmesinin üstünde açılır.

**Paneller.** Ayar paneli sayfayı daraltmaz, yüzer; Escape veya boş yere basınca (tuval çerçevesi içindekiler dahil) kapanır. Yüzen yüzeyler `data-layer` ile işaretlidir: son açılan ya da basılan öne gelir (`lib/studio/layers.ts`), örneğin tasarım paneli açıkken açılan blok paleti onun arkasında kalmaz; paneli açan düğmeye yeniden basmak paneli öne getirir. Katmanlar site geneli ses düğmesinin altında kalır.

**Bir ikon, bir işlev.** Dişli: Site tercihleri · palet: Tema tasarımı · üç katlı blok: Sayfa yapısı · not kâğıdı: Özel notlar · dikey çerçeve: Kapak · yatay çerçeve: Görsel · ev: Site tasarımı · iki pencere: Studio görünümü. Aynı ikon başka bir işleve verilmez; tanımsız ad boş çizilir.

**Hareket.** Tek yaylı karakter: basınca hafif çökme, üstüne gelince kalkma, paneller tetikleyicilerinden açılır ve kapanırken kapanır, ayarlar sırayla gelir, tuval yerine oturur. Yalnız transform ve opacity hareket eder; hareket kapalıyken ve reduced-motion’da hepsi durur.

1100 px altında üst çubuk satırlara sarılır (telefonda üç satır), araçlar sayfanın altında şeride iner; telefonda ayar paneli alt sayfa olur. Dört görünümde de metin seçimi biçim araçlarını, paragraf yanındaki ＋ eklemeyi açar. Medya kitaplığı ve istatistikler v2 kararlarıyla kapsam dışıdır.

Canlı tuval çerçevesi (`/preview?embedded=1`) görünümü <html> üzerinden okur (`app/studio-canvas.css`): site tasarımı aynen kalır, yazma yüzeyi sade kalır; görünüm, çevresindeki yerleşimi ve isteğe bağlı soluklaştırmayı değiştirir. Satır sayılan bloklar `lib/builder/rows.ts` ile CSS’te aynı listedir. Tuvalden gelen düzenlemeler render beklenmeden en güncel taslağa uygulanır; taslak tuvalin başladığı metni tutmuyorsa tuvaldeki değer geçerli olur. Geri alma ya da sunucu kopyası tuvaldeki yazımı bitirip metni yeniler (`mrbyte:canvas-reset`).
