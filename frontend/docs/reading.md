# Okuma araçları uygulaması

ReadingTools üye için server annotations, guest için local records kullanır. Stable block UUID/revision, UTF-16 aralık, quote/context ve bounded note doğrulanır. CSS Highlight API ile React DOM’unu sarmadan işaretle; destek yoksa alıntı/not listesi çalışır.

Selection toolbar etkileşiminde korunur; bırakılan seçim stale annotation üretmez. İçerik değişince güvenle eşleşmeyen not unresolved olarak listede kalır. Kullanıcı değişince eski private marks/cache temizlenir. Guest import yalnız açık tercih, idempotent server kayıt ve başarılı kabul sonrası local temizleme.

Notlar herkes için özel; owner public annotation katmanı yok. Mevcut server sync korunur; geliştirilmiş araçlar ve sync/geçmiş iyileştirmeleri Backlog. Toolbar metni kapatmaz; mobil panel, keyboard ve reduce-motion desteklenir.
