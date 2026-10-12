# Studio uygulama rehberi

ThemeRenderer ve document page renderer ziyaretçi/preview için ortaktır. SiteEditor/PageNavigator home/article/series seçimi; yapı/canvas/inspector görünür, context field seçimi iki yönlü. Trusted same-origin/frame message’ları doğrulanır; edit modunda link yerine field seçilir.

Theme draft/apply/restore gerçek backend workspace’inden; draft Apply’dan önce public siteyi değiştirmez. Content Save/Yayımla ayrı işlev. Yeni hedefte published yazıya Save ayrı draft revision kaydeder; mevcut yayını kaldırmadan Yayımla beklenir. Unsaved çalışma Save/Revert olmadan kaybolmamalı.

URL alanı ilk yayın öncesi düzenlenebilir; sonrasında disabled/read-only. Kısa bilgi: “Bu adres ilk yayından sonra değiştirilemez.” Aynı seri kuralı. Public linkler içerik kimliği/kalıcı slug üzerinden.

Seri bölümleri bağımsız Yazılar listesine karışmaz; ilk bölümde draft seri yayınlanır. Seri archive/trash yazıları silmez; çöp geri alınır. Sayfa seçimleri taslak/public durumunu doğru söyler.

Site genelinde tek indeksleme kontrolü Studio ayarında. Owner private yazı ürünü ve istatistik UI’sı kaldırılacak; Pexels araması şimdilik yok. Kapak upload/select korunur. Tema kütüphanesi/nesting/grid ve zengin editör Backlog. Eski localStorage/prototype açıklamaları yeni mimari kaynağı değildir.
