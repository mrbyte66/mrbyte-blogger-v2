# Kimlik ve üye ekranları

Spring session gerçek kimlik kaynağıdır; AuthProvider auth/session’ı login/logout, focus ve session changed bildirimiyle yeniden okur. BroadcastChannel sır/kimlik taşımaz; private veri hesabı değişince temizlenir. Oturum cookie’si güvenlik içindir; içerik kaydı cookie’de tutulmaz.

Giriş/üyelik/Google/doğrulama/parola reset ve hesap ekranları korunur. Token link GET ile tüketilmez; açık POST onayı gerekir. Studio/preview owner gate’i server-side; bütün Studio API’leri Spring authorization’dan geçer. Member kayıt yazarlık vermez.

Yeni okuyucu publication subscription üyelikte açık, profil tercihiyle kapatılabilir; açık açıklama. Doğrulanmış e-posta şartı; yazarın kendi yayın bildirimi tercihi ayrı. Ayrıntılı kategori/seri aboneliği Backlog.

Mevcut hazır avatarlar kalır; upload sonraya. Owner’ın okuyucu özel not/kitaplık yetkisi diğer hesaplarla aynı. Forms ortak tema, açık labels, native dialog focus yönetimi ve mobil touch hedeflerini korur.
