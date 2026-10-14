# Studio görünümleri

Studio aynı araçları dört yerleşimde sunar; seçim tarayıcıya özeldir (`satir:studio-view`, <html data-studio-view>) ve içeriği, siteyi ya da ziyaretçi görünümünü değiştirmez. Seçici kişisel menüde (kullanıcı simgesi) ve Site tercihleri → Studio görünümü sekmesindedir. Her görünümün açık ve koyu eşi vardır; renk modu sitenin mevcut anahtarıdır.

- **Marjinalya** (varsayılan): sol ray (Yazılar, Ana sayfa), üst çubukta konum/durum/tarih, kenar sütunu: adres, özet sayacı, kapak, okuma süresi, özel notlar ve günlük kelime hedefi. Tuvalde satır numaraları ve sıcak kenar çizgisi; altta blok ekleme ve alan çubuğu.
- **Odak**: sessiz üst çubuk, üstte hedef çizgisi, altta yüzen dock (alanlar, Blok menüsü, sayfa işlemleri), sağda paragraf haritası, solda hedef halkası, Odak anahtarı yazılmayan blokları soluklaştırır.
- **Kontakt**: pill gezinme (Yazılar, Seriler, Ana sayfa), kart düzeni; sayfa seçici kapak kartlı kitaplık galerisi ve ayrıntı çekmecesi açar (durum süzgeci, sıralama, galeri/liste).
- **Sahne**: başlangıç düzenleri üst çubukta, sayfa sahnede, bloklar altta şeritte; ayar paneli sahne üstünde yüzer.

Ortak kurallar: ayar paneli sayfayı daraltmaz, yüzer; Escape veya boş yere basınca (tuval çerçevesi içindekiler dahil) kapanır. Durum iletileri yüzer. 1100 px altında üst çubuk satırlara sarılır, araçlar sayfanın altında şeride iner; telefonda ayar paneli alt sayfa olur. Odak’ta “/” ile blok menüsü yok; Blok menüsü dock’tadır. Medya kitaplığı ve istatistikler v2 kararlarıyla kapsam dışıdır; bu yüzden görünümlerde yer almaz.

Canlı tuval çerçevesi (`/preview?embedded=1`) görünümü <html> üzerinden okur (`app/studio-canvas.css`): site tasarımı aynen kalır, yalnızca satır numaraları, soluklaştırma ve yazı araç çubuğunun şekli değişir. Satır sayılan bloklar `lib/builder/rows.ts` ile CSS’te aynı listedir.
