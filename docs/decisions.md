# Kesin ürün kararları

2026-10-12 anketinin geçerli kararları. Son cevap önceki çelişen cevabın yerini alır; bu belge eski proje geçmişi değildir. İş durumu GitHub’dadır.

| Alan | Karar |
| --- | --- |
| Amaç / isim | Kişisel blog; AI/yazılım/bilişim. Eski ürün adı reddedildi. Mürekkephane aday; isim seçimi Backlog. |
| Sürüm | İlk hedef V1; sonraki sürümler V1’den sonra adlandırılır. |
| Kod / teknoloji | Mevcut kod sadeleştirilir; Next.js/React/TypeScript + Java 25/Spring Boot + PostgreSQL. |
| Tasarım / Studio | CRT karakteri ve tasarım korunur; görsel Studio temel özellik. |
| Üyelik | Okuyucu üyeliği ve Google girişi; hazır avatarlar. Yazarlık şimdilik yalnız sahibin; ilerisi Backlog. |
| Yetki / not | Sahip okuyucu araçlarında herkesle aynı; ek yetkisi Studio. Herkesin notları özel; açık yazar notu yok. |
| Kitaplık / eşitleme | Mevcut sunucu kaydı/eşitleme korunur; geliştirmesi Backlog. |
| Geçmiş / okuma | Son açılan bölüm korunur; notlar ve geçmiş önemli ölçüde geliştirilecek. |
| Yazı düzenleme | Yayındaki içerik ayrı çalışma taslağına kaydedilir; yalnız Yayımla kamu sürümünü değiştirir. |
| URL | Yazı/seri ilk yayından sonra kalıcı kilit; öncesinde değişebilir. Alanda kısa info. Eski alias’lar kırılmaz. |
| Seri | Bölümler Yazılar listesinde görünmez; ilk bölümle seri yayımlanır. Bölümün kalıcı adresi korunur. |
| Silme | Önce geri alınabilir çöp kutusu; doğrudan kalıcı silme yok. |
| Planlama | Tarih/saat ile sunucuda yayın planlama kalır. |
| E-posta | Yazar ve doğrulanmış abone okuyucu; tercih kapatılabilir. Okuyucu başlangıçta açık, tüm yeni yayınlar; tekrar yayın bildirilmez. Kategori/seri seçimi Backlog. |
| SEO | Studio’da site geneli tek indeksleme seçeneği; kapalıysa bütün yazılar noindex. Gizli hesap/Studio sayfaları her zaman korunur. |
| Tepkiler | Alkış/beğeni ve paylaşım kalır. |
| İstatistik | Son cevapla tamamı şimdilik kaldırılır; önceki “kart sayaçları gösterilsin” cevabı geçersiz. Geri ekleme Backlog. |
| Kapak | Pexels şimdilik yok; sonra site görsel kütüphanesi, içerik önerisi ve elle seçim. Sessiz otomatik atama kararı yok. |
| Ses | Mozart kalır; seçenekler, AssistiveTouch benzeri kontrol ve hava durumu Backlog. |
| Kapsam dışı | Sahip özel/kilitli yazıları, kamu yazar notları, Studio toplu export/import. |
| Test verisi | Ayrı ortam, gerçek backend/veritabanı; cookie/localStorage demo saklama yok. Oturum cookie’si güvenlik için kalır. |
| Dağıtım | Mac + Docker yerel önizleme; yakın hedef VPS. Sunucu/yedek/e-posta sağlayıcısı seçimi Backlog, domain ertelendi. |

## Çalışma kararları

Tek Codex kodlar; isteğe bağlı ikinci session yalnız analiz. Kısa Türkçe, kısa anketler, minimalist issue açıklamaları. Kullanıcı sohbetten iş verir; asistan takibi yönetir. Aynı tamamlanmamış konular birleşir. Her erteleme Backlog issue’sudur. Todo ve Done geçişleri kullanıcıdadır; asistan seçilen işi In Progress yapar.

Main üzerinde çalış; PR/rol/puan/agent etiketi yok. Asistan test ve commit yapar; push kullanıcı talimatıyla. Son çalışma düzeni: her şey Mac’teki yerel Codex’te yapılır; kod, MD, Docker ve GitHub takibi aynı oturumdadır. Buluttaki mevcut hazırlık tek devir paketiyle aktarılır. Pano için önce mevcut erişim doğrulanır; tarayıcı kontrolü mevcutsa tarayıcı, aksi halde yerel yetkili CLI/API kullanılır. Önce kurallar ve pano, sonra mevcut özellik kontrolü. Done → issue kapanışı tek kullanıcı işlemiyle olacak.

## Teknik karar ile çalışan kod ayrımı

Bu kararlar hedef davranıştır. Klonla gelen uygulama bunların tümünü henüz karşılamaz. Özellikle taslak/yayın ayrımı, URL kilidi, seri katalog ayrımı, okuyucu bildirimleri, indeksleme kontrolü ve kaldırılacak özellikler Mac’te uygulanacak. Bu MD değişikliğinde hiçbir uygulama dosyası veya migration değiştirilmez.

## Görsel hareket tercihi — 2026-10-13

Kullanıcı üyelikteki CRT açılış/karşılama/kapanış dilini beğendi. Hareketler belirgin, yumuşak ve mevcut sahneyle bütünleşmeli; gece/gündüz ışığı aniden değişmemeli. Sadece fark edilmeyen solma veya bütün ekranı kapatan ilişkisiz efekt tercih edilmiyor. Reduced-motion ve hareket kapatma seçeneği korunur.

Gece/gündüz geçişinde parlama/ışık patlaması istenmiyor; kesintisiz palet geçişi korunacak.

Üyelik formunda ilk parola ve tekrar parola alanında kopyalama/yapıştırma ve sürükleyerek aktarım engellenir. Bu karar mevcut hesapla giriş alanındaki yapıştırma davranışını değiştirmez.

Form tasarımında hatalı alanlar kırmızı çerçeve ve kısa açıklamayla belirtilir; kullanıcı devre dışı butonun nedenini anlayabilmelidir. Hata düzeltildiğinde işaret kalkar. Açık/koyu tema, erişilebilirlik ve parlamasız görünüm korunur.

## Üyelik doğrulaması ve çalışma beklentisi — 2026-10-13

E-posta adresi doğrulanmadan giriş yapılamaz. Google’ın doğruladığı adres ve e-postaya gönderilen şifre sıfırlama bağlantısıyla açık onay da adres sahipliğinin kanıtıdır. Bir günlük deneme erişimi şimdi uygulanmaz; talep oluşursa tanıtım/üyelik işinde (#22) değerlendirilecek.

Asistan seçilen işi hata durumlarıyla birlikte proaktif denetler; kullanıcıya sorun bulma görevi yüklenmez. Kapsam dışı işler uygun Backlog issue’sunda tutulur.

Kayıt sonrası doğrulama postası gönderilince kullanıcı ana sayfaya dönebilir ve siteyi ziyaretçi olarak gezebilir. Yeniden gönder ilk öneri değildir; 60 saniye bekleme sonrası ikincil seçenek olarak açılır. Bu gezinme, doğrulanmadan giriş yasağını kaldırmaz.

## Pano sadeleştirmesi — 2026-10-13

Kayıt (Mevcut/Planlanan/Tamamlandı) alanı kaldırıldı; işin durumu yalnız Status ile izlenir. Gereksinimler kategori gruplu tam listedir; klondan gelen özelliklerin mevcut etiketleri kalır. Yerel Project alan eşitlemesi kaldırılır; GitHub’ın Done → issue kapanışı otomasyonu korunur.

## Studio etkileşim ilkesi — 2026-10-15

Kullanıcı bir değişikliği mümkün olan en az tıklamayla ve mouse’u az gezdirerek yapabilmeli. Metin önce tuvalde doğrudan düzenlenir; ikincil araçlar seçilen alanın veya tetikleyicinin yakınında açılır. Gerekli kayıt, yayın ve gezinme kontrolleri görünüm/sayfa değişince kaybolmaz ya da yer değiştirmez. Minimalistlik gerekli işlevleri saklamak veya sahneyi boşaltmak değildir.

- Sürekli yazma akışında panel açıp kapatma zorunluluğu azaltılır. Ara başlık ve alıntı seçili metnin yanında uygulanır; açık çalışma paneli tuvale dönünce kendiliğinden kapanmaz. Geniş ekranda panel yazının üstünü örtmez. Escape metni geri almaz; geri alma ayrı ve açık bir eylemdir. Bu kolaylıklar mevcut tema, tipografi ve görsel bütünlük korunarak sağlanır.

### Studio tasarımı — Kenar Haritası

2026-10-15: Kullanıcı dört Studio görünümüne uyarlanan Kenar Haritası tasarımının uygulanmasını seçti. Marjinalya okuma rengi çizimdeki sıcak kâğıt tonuna yaklaştırılır; lavanta ayrıntıları korunur. Doğrudan açık yazı araçları ve tek alanı paylaşan İçindekiler/Ayarlar kullanılır. Dar ekranda iki panel ile yazı sıkıştırılmaz.

- 2026-10-15: Kitaplığım/Hesap için onaylanan tasarım V1.1, V1’in klasör biçimli koleksiyon sekmeleriyle uygulanır. Bu adlar tasarım alternatifidir. Kitaplıkta kart/kompakt liste, koleksiyona sürükle-bırak, Hızlı git, 24’lü gösterim ve dönüş bağlamı korunur. Hesapta e-posta değiştirme, yinelenen renk modu ve animasyon anahtarı bulunmaz. Mozart footer kapsülü beğenildi. Footer zorunlu; karakterli ana sayfada CRT’nin tam ekran konumunu değiştirmeden alt köşelere yerleşir, ayrı bant veya kaydırma eklemez. İletişim, bulanık arka planlı gerçek e-posta formudur. Ayrıntılar: [kişisel alan](features/personal-space.md), takip #6 ve #11.

- 2026-10-16: Bundan sonra sunulan tasarım önerilerine ayırt edici isim verilir; revizyonlarda isim korunup tasarım sürümü ilerletilir. Bunlar ürün release adları değildir.

- 16 Ekim 2026: #11 giriş cümlesi için “Satır Dalgası” seçildi; harf yükselişi 8 px. Kelimeler bölünmez; ilk dalga pencere açıldıktan 2 saniye sonra başlar, harf başına hareket 1400 ms sürer ve dalga tamamen bittikten sonra 3 saniye mola vererek tekrarlanır; reduced-motion/hareket kapalı tercihinde sabittir. Koleksiyon adı hataları alan altında erişilebilir açıklamayla gösterilir ve düzenlemede temizlenir.

- 16 Ekim 2026: Ana sayfa hesap düğmesi misafirde de aynı yuvarlak avatar düzenini kullanır. Kitaplığım ikonu her zaman görünür; misafir tıklayınca Üye ol paneli açılır. Sahne kontrollerinin konumu giriş durumuyla değişmez.

- 16 Ekim 2026: Satır Dalgası inişi daha tok: hızlanan düşüş, tabanda kısa ve hafif sıkışma, küçük geri sekme. 8 px yükseliş, ilk 2 sn bekleme ve tamamlanan dalgadan sonra 3 sn mola korunur.

- 16 Ekim 2026: Satır Dalgası hızı %15 azaltıldı (hareket ve harfler arası gecikme birlikte ölçeklenir). Harf hareketi yaklaşık 1647 ms, harf aralığı 40 ms; ilk 2 sn bekleme ve dalga sonrası 3 sn mola değişmez.

- 16 Ekim 2026: Aynı Satır Dalgası Üye ol ekranındaki “Sevdiğin yazıları kendi düzeninde sakla.” metnine de uygulandı. Sekme değişiminde 2 sn bekleme yeniden başlar; uzun metinde de son harften sonra 3 sn mola korunur.

- 16 Ekim 2026: Ana CRT sayfası üst menüsünde “Yüzen Ada” seçildi ve uygulandı. Üçlü renk seçici, doğrudan hareket düğmesi, Kitaplığım ve avatar tek kapsülde; görünüm için ek pencere yok. Yalnız hesap menüsü açılır, lavanta vurgu korunur. Dar telefonda marka ve kapsül iki sıraya geçer; 44 px hedefler ve CRT konumu korunur.

- 16 Ekim 2026: Yüzen Ada ortak üst menü dilidir; Studio, Hesap, Kitaplığım ve diğer site/okuma başlıklarında uygulanır. Studio görünümü düğmesi yerini ve işlevini korur. Ada, hesap menüsü, giriş/üyelik ve diğer açılan panel yüzeyleri tema rengini kullanan buzlu camdır; opak fallback ve ekran içinde kalan dar ekran menüleri korunur.

## Okuma notları — Satır İzi (16 Ekim 2026)

Kullanıcı Satır İzi’ni seçti: satır altındaki büyük editör yerine metne çizgiyle bağlanan renkli kenar kartı. Kapalı metin ve ses notlarının ikonları ayrıdır; notlar düzenlenir/silinir, tek tek kapanır ve genel toggle ile gizlenir. Aynı paragrafta biriken notlar gruplanır, açık kartlar çakışmadan dizilir. Burada kaldım etiketi ayrı içerik satırı oluşturmaz; paragrafa bağlı kenar ayracıdır. Tasarım çizimlerinde telefon görünümü istenmiyor; uygulama dar ekran desteğini korur.

Genel not, alıntıdan bağımsız defter ve hashtag arama içerir; hashtag yalnız genel notta sınıflandırma sağlar. Misafir notları tarayıcıda saklanır ve site verileri temizlenince kaybolur; doğrulanmış üye notları hesabındadır. Aktarım kullanıcı tercihidir. Mini sözlükte Google şartı kaldırıldı; ücretsiz sözlük kaynağı sonucu doğrudan panelde gösterir. AI/flashcard/quiz/public not önerileri seçilmedi.

### 2026-10-17 — Defter Ayracı / İnce Dizin

Onaylanan okuma notu revizyonu: sivri fihrist yerine sade, pinlenebilir ve kendi içinde kaydırılan/aranan not dizini. Genel notun kullanıcı adı **Serbest Not**; liste /notlar’da, header tek **Defterim | +** kapsülü. + seçili metin gerektirmeden büyük Serbest Not panelini açar. Panel yazdıkça yumuşak büyür, ekran sınırında içeride kayar. Misafir kaydı/uyarısı ve özel üye kaydı korunur. Aynı paragrafın notları tek kart ve geçişle gösterilir; silinen kaynak kartı tozlaşır, geri alma kalır.

### 2026-10-17 — Not Atlası

Kullanıcı Not Atlası tasarımının uygulanmasını seçti. Defterim renkli kart/liste, geniş düzenleyici, açık etiket ekleme ve çoklu bağımsız ses kayıtlarıyla yenilenir. Defterim | + kapsülü korunur; + büyük Serbest Not editörünü açar. Alıntı işareti doğrudan metin üzerinden kaldırılabilir; bağlı özel not silinmez. Üye/misafir saklama ve mevcut temalar korunur. #15 kullanıcı incelemesi tamamlanana kadar In Progress kalır.

### 2026-10-17 — Çoklu açık kaynak notları ve kalıcı okuyucu sınırı

Kullanıcı aynı alıntıdaki kartlar dahil tüm yazı notlarının birlikte açılmasını istedi. Tek kart/önceki-sonraki davranışı kaldırıldı. Kaynağa yumuşak dönüş ve geçici kırmızı metin çerçevesi seçildi; kartların gerçek yüksekliği/footer dengesi esas alınır. Rastgele renk yalnız yeni notun başlangıcına uygulanır; kullanıcı seçimi değişmez. Ana sayfadaki açılan okuyucuda not araçları kaldırılır, üstteki not adedi kalıcı yazıya bağlanır ve önceki panel genişliği korunur. Not alma yalnız kalıcı yazıda çalışır.
