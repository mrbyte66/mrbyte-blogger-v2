# Doğrulama rehberi

Anlamlı kod değişikliklerinde ilgili unit/component davranış testleri, `npm test`, `npm run typecheck`, `npm run build`. UI değişince masaüstü/dar ekran ve gereken gerçek tarayıcı akışı; bütün geçmiş testleri sırf kayıt oluşturmak için tekrar çalıştırma.

Temel kontroller: keyboard/focus ve back bağlamı, mobil taşma, reduced-motion, theme draft/public isolation, üyelik/Studio gate, hesaplar arası özel veri izolasyonu ve storage/API hata geri dönüşü.

Yeni ürün işleri: Save çalışma taslağında kalır; ilk-yayın URL kilidi UI ve API’de; seri bölümü Yazılar’da görünmez; ilk bölümle seri yayını; okuyucu opt-out/yalnız ilk yayın; global noindex ve metadata/sitemap; kaldırılan UI girişleri erişim güvenliğini bozmaz.

Özel notta metin değişince yanlış highlight yok; guest import açık tercih. Preview sayaç/mail/yayın yan etkisi üretmez. Audio gerçek playback kontrolü olmadan çalıyor denmez.

Sonucu issue’ya kısa yaz. Mevcut dosya/spec varlığı PASS değildir; atlanan kontrol açıkça belirtilir. Bağımsız testçi şartı ve zero-bug garantisi yok. Done kullanıcıya aittir. Yalnız MD değişikliği için link/kapsam/diff kontrolü yeterlidir.
