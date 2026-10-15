# Studio uygulama rehberi

ThemeRenderer ve document page renderer ziyaretçi/preview için ortaktır. SiteEditor/PageNavigator home/article/series seçimi; yapı/canvas/inspector görünür, context field seçimi iki yönlü. Trusted same-origin/frame message’ları doğrulanır; edit modunda link yerine field seçilir.

Theme draft/apply/restore gerçek backend workspace’inden; draft Apply’dan önce public siteyi değiştirmez. Content Save/Yayımla ayrı işlev. Yeni hedefte published yazıya Save ayrı draft revision kaydeder; mevcut yayını kaldırmadan Yayımla beklenir. Unsaved çalışma Save/Revert olmadan kaybolmamalı.

URL alanı ilk yayın öncesi düzenlenebilir; sonrasında disabled/read-only. Kısa bilgi: “Bu adres ilk yayından sonra değiştirilemez.” Aynı seri kuralı. Public linkler içerik kimliği/kalıcı slug üzerinden.

Seri bölümleri bağımsız Yazılar listesine karışmaz; ilk bölümde draft seri yayınlanır. Seri archive/trash yazıları silmez; çöp geri alınır. Sayfa seçimleri taslak/public durumunu doğru söyler.

Site genelinde tek indeksleme kontrolü Studio ayarında. Owner private yazı ürünü ve istatistik UI’sı kaldırılacak; Pexels araması şimdilik yok. Kapak upload/select korunur. Tema kütüphanesi/nesting/grid ve zengin editör Backlog. Eski localStorage/prototype açıklamaları yeni mimari kaynağı değildir.

Studio üst çubuğundaki sayfa seçici geniş bir dialog açar; arama, durum filtresi ve yazı/seri oluşturma buradadır. Escape ve dış alan tıklaması kapatır, odak seçiciye döner. Başlangıç düzenleri kompakt seçicidedir; düzen değişiminden sonra önceki taslağa dönüş sunulur. Tuvale odaklan yan panelleri gizler.

Düzenle modunda desteklenen başlık, özet ve paragraflar tuvalden tıklama veya Enter ile açılır. Bağlamsal metin editöründe Tamam / Ctrl–⌘+Enter taslağa aktarır; Escape metni koruyarak düzenlemeyi bitirir. Frame origin/source, alan izin listesi ve önceki değer doğrulanır. URL/yayın durumu bu mesajla değişmez. Zengin metin biçimlendirme #25 kapsamındadır.

Tema tasarımı → Keşfedilebilirlik altında tek site indeksleme anahtarı vardır. Gerçek backend ayarı version/If-Match ile hemen kaydedilir; başarısız işlem başarılı gösterilmez. Deployment indeksleme koruması ayrıca geçerlidir. Studio chrome açık/koyu tema, dar ekran ve reduced-motion desteğiyle çalışır; CRT artwork korunur.

Studio dört görünümde çalışır (Marjinalya, Odak, Kontakt, Sahne); ayrıntı ve ortak kurallar `docs/features/studio-views.md`, yazı araçları (satır içi biçim, özel notlar, günlük hedef) `docs/features/studio-writing-tools.md` içindedir. Yazı/seri düzenlerken İçindekiler ve Ayarlar tek bir sağ paneli paylaşır; panel tuvale dönünce kapanmaz. Dar ekranda geçici yüzey olur, bir başlığa gidince kapanır; tuval çerçevesi ilk boyamadan gerçek boyutta kurulur.

Yazı araçları altta doğrudan görünür; sık kullanılan ekleme işlemleri menüye saklanmaz. Hover ＋ dolu metni değiştirmeden altına blok ekler; seçili metin araçları mevcut bloğu biçimlendirir. İçindekiler gerçek başlıklardan türetilir ve tuvalin kaydırmasını izler.
