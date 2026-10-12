# Görsel Studio ve tema

Görsel Studio temel özellik; bloklarla manuel tema/sayfa düzenleme korunur. Sahne, akış ve dergi başlangıçları aynı içerik kaynaklarını kullanır. CRT karakteri ve tasarımı korunur; tema değişimi içerik kimliğini veya URL’yi değiştirmez.

İçerik blokları ile sayfa/tema blokları ayrıdır. ThemeRenderer ziyaretçi, canlı canvas ve preview için ortak; owner draft/preview/apply işlemleri ayrı. Tema draft’ı public siteyi Apply’dan önce değiştirmez. Yazı Kaydet/Yayımla davranışı tema Apply’dan bağımsızdır.

Mevcut düz sıralama ve header/lead/footer sınırları korunur. Sahne kontrollü bir bloktur; piksel yerleştirme veya AI tema üretimi ilk hedef değildir. Seçim yapısı/canvas/inspector masaüstünde birlikte; mobilde okunur paneller. Edit modu içerik linkine gitmeden alan seçer; browse modu gerçek ziyaretçi gibi çalışır. Unsaved değişiklik kaybolmamalı.

Tema kütüphanesi, sütun/ızgara ve iç içe bloklar Backlog. Yeni içerik türleri de Backlog. Studio site ayarlarında tek indeksleme anahtarı hedeflenir. İşlerin durumu GitHub’da; [frontend rehberi](../frontend/docs/builder.md).

Takip: [#5](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/5), [#24](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/24).
