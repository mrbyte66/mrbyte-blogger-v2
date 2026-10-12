# Kimlik ve üye ekranları

Spring session gerçek kimlik kaynağıdır; AuthProvider auth/session’ı login/logout, focus ve session changed bildirimiyle yeniden okur. BroadcastChannel sır/kimlik taşımaz; private veri hesabı değişince temizlenir. Oturum cookie’si güvenlik içindir; içerik kaydı cookie’de tutulmaz.

Giriş/üyelik/Google/doğrulama/parola reset ve hesap ekranları korunur. Token link GET ile tüketilmez; açık POST onayı gerekir. Studio/preview owner gate’i server-side; bütün Studio API’leri Spring authorization’dan geçer. Member kayıt yazarlık vermez.

Yeni okuyucu publication subscription üyelikte açık, profil tercihiyle kapatılabilir; açık açıklama. Doğrulanmış e-posta şartı; yazarın kendi yayın bildirimi tercihi ayrı. Ayrıntılı kategori/seri aboneliği Backlog.

Mevcut hazır avatarlar kalır; upload sonraya. Owner’ın okuyucu özel not/kitaplık yetkisi diğer hesaplarla aynı. Forms ortak tema, açık labels, native dialog focus yönetimi ve mobil touch hedeflerini korur.

## Üyelik uygulaması (#2)

Okuyucu aboneliği `publicationSubscription`, yazarın kendi yayın bildirimi `publicationEmail` alanıdır. Üye Bildirimler ekranı okuyucu aboneliğini; owner ayrıca kendi yazı bildirimini yönetir. Yeni üyeler varsayılan abone; mevcut kapalı tercihler migration'da korunur. İlk yayında mevcut doğrulanmış aboneler için kişi başına outbox işi oluşturulur; yeni abonelik geçmiş gönderimleri başlatmaz. Güncelleme/yeniden yayın okuyucu gönderimi oluşturmaz.

Logout başarısızsa yerel kimlik düşürülmez; hata gösterilir. Başarılı çıkışta özel veriler temizlenir, hesap/Studio/kitaplık sayfaları ana sayfaya döner; herkese açık yazı açık kalır. Giriş dialog'u yumuşak kapanır; hareket tercihi/reduced-motion korunur. Tekrar parola alanı paste/drop kabul etmez; ilk parola ve giriş alanları parola yöneticisine açıktır. Hesap silme yalnız üye Güvenlik bölümündeki kapalı Diğer hesap işlemleri detayında bulunur; mevcut geri alınamaz silme onayı ve owner koruması devam eder.

Owner Google bağlantısı yalnız mevcut oturum ve yeniden kimlik doğrulamasıyla kurulur; Google ile e-posta benzerliğinden otomatik hesap birleştirme veya owner yetkisi verilmez. Rol daima sunucudan gelir.
