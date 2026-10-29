# Seri uygulaması

Series gerçek API editorial kayıtlarıdır; theme snapshot içinde makale kopyası değildir. Bölüm sırası Studio belirler; slug bölüm sırasından bağımsız. Tarih/difficulty seri metadata sunumu olarak eklenmez.

Hedef: seri bölümleri genel Yazılar kataloğunda görünmez, kendi chapter listesinde görünür. İlk yayınlanan bölüm draft seriyi de yayınlar. Public chapter listesi yalnız published/public bölümler; prev/next ve bölüm numaraları buna göre. Seri kaldırma yazıyı silmez.

Seri slug ilk yayından sonra kilit; preview unsaved draft’ı gösterebilir, public catalog’a sızdırmaz. Kalıcı bölüm URL’si kalır. Member history son açılan bölüm linki; ziyaret tamamlanma değildir. Mevcut geçmiş korunur; geliştirme Backlog. Ayrı fixture-only veya local series publication sistemi kullanılmaz.

Seri etiketleri: ayrı bir alan yoktur; yazının etiketleri (kodda `categories`) seri sayfasında da filtre olur (docs/decisions.md · Etiketler). Seri sayfası yalnız kendi bölümlerinin kullandığı etiketleri gösterir; okur birden çok etiket seçer, bölüm hepsini taşıyorsa görünür. Bölüm numaraları seri sırasını korur.
