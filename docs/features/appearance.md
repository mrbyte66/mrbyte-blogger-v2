# Görünüm tercihleri ve okuma modu

**Renk modu.** Site genelinde üç mod: **Gündüz** (açık), **Okuma** (açık paletin üstüne sıcak kâğıt tonları, daha az mavi ışık) ve **Gece** (koyu). Okuma modu açık temanın bütün kurallarını korur: `<html data-theme="light" data-tone="reading">`. Denetim üç ikonlu, sabit genişlikte bir düğmedir; göstergesi ilk boyamada doğru yerdedir, sayfa açılırken kaymaz. Karakter sahnesindeki ışık düğmesi üç modu sırayla gezer (Işıklar açık → Okuma ışığı → Işıklar kapalı). Studio görünümlerinin de okuma eşi vardır.

**Hesapla gelen görünüm.** Renk modu, hareket ve Studio görünümü hesapta saklanır (`Profile.appearance`, `PUT /api/v1/me/appearance`; null = seçilmedi). Kurallar:

- Başkasına ait ya da hiç eşleşmemiş bir tarayıcıda giriş yapınca hesabın seçimleri uygulanır; hiç seçimi olmayan hesap tarayıcınınkini alır.
- Hesabın kendi tarayıcısında (`satir:appearance-account`) yerel seçim en yenisidir; hesap onu yakalar.
- Değişiklikler kısa bir bekleme ile tek istekte gönderilir; sayfadan çıkarken bekleyen değişiklik gönderilir. Ziyaretçi için sunucuya hiçbir şey gitmez.
- Görünüm profil sürümüne dahil değildir; görünüm değiştirmek açık bir profil düzenlemesini bayatlatmaz.

Şimdilik ziyaretçilerin gördüğü tema tektir (sahibin seçtiği); okuma modu ve diğer tercihler bu temanın üstünde kişiye özel çalışır.
