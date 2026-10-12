# Yayın planlama ve bildirim

Yazı için gelecekte tarih/saat seçimi, yeniden planlama, iptal ve anında yayın korunur. UTC plan anı ile düzenlenebilir kart tarihi ayrıdır; saat dilimi açık gösterilir. Scheduler tarayıcı kapalıyken de çalışır; iptal/yeniden plan/yayın yarışı çift yayın üretmez.

Yayındaki yazının düzenlemesi ayrı çalışma taslağına gider; Kaydet public metni değiştirmez, Yayımla yeni sürümü atomik uygular.

Yayın e-postası yazar ve doğrulanmış abone okuyucuya. Tercihler kapatılabilir. Okuyucu aboneliği üyelikte açık ve tüm yeni yayınlar içindir. Güncelleme/yeniden yayında okuyucu mail’i gönderilmez. Kategori/seri seçimi Backlog. Yazarın kendi yayın bildirimi tercihi ayrı korunur.

Outbox, dedupe, teslim anı tercih kontrolü, retry ve görünür hata gerekir; mail hatası yayını geri almaz. SMTP/provider henüz seçilmedi; yapılandırılmadan başarılı teslim taklidi yapma.

Takip: [#3](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/3), [#2](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/2), [#30](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/30).
