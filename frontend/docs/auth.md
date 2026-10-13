# Kimlik ve üye ekranları

Spring session gerçek kimlik kaynağıdır; AuthProvider auth/session’ı login/logout, focus ve session changed bildirimiyle yeniden okur. BroadcastChannel sır/kimlik taşımaz; private veri hesabı değişince temizlenir. Oturum cookie’si güvenlik içindir; içerik kaydı cookie’de tutulmaz.

Giriş/üyelik/Google/doğrulama/parola reset ve hesap ekranları korunur. Token link GET ile tüketilmez; açık POST onayı gerekir. Studio/preview owner gate’i server-side; bütün Studio API’leri Spring authorization’dan geçer. Member kayıt yazarlık vermez.

Yeni okuyucu publication subscription üyelikte açık, profil tercihiyle kapatılabilir; açık açıklama. Doğrulanmış e-posta şartı; yazarın kendi yayın bildirimi tercihi ayrı. Ayrıntılı kategori/seri aboneliği Backlog.

Mevcut hazır avatarlar kalır; upload sonraya. Owner’ın okuyucu özel not/kitaplık yetkisi diğer hesaplarla aynı. Forms ortak tema, açık labels, native dialog focus yönetimi ve mobil touch hedeflerini korur.

## Üyelik uygulaması (#2)

Okuyucu aboneliği `publicationSubscription`, yazarın kendi yayın bildirimi `publicationEmail` alanıdır. Üye Bildirimler ekranı okuyucu aboneliğini; owner ayrıca kendi yazı bildirimini yönetir. Yeni üyeler varsayılan abone; mevcut kapalı tercihler migration'da korunur. İlk yayında mevcut doğrulanmış aboneler için kişi başına outbox işi oluşturulur; yeni abonelik geçmiş gönderimleri başlatmaz. Güncelleme/yeniden yayın okuyucu gönderimi oluşturmaz.

Logout başarısızsa yerel kimlik düşürülmez; hata gösterilir. Başarılı çıkışta özel veriler temizlenir, hesap/Studio/kitaplık sayfaları ana sayfaya döner; herkese açık yazı açık kalır. Hesap pencereleri CRT ekran açılışıyla belirir. Başarılı giriş dialog içinde kısa karşılama ve çizgiye kapanma gösterir. Boş alana tıklama, X ve Esc ile manuel kapanış açılışın tersine CRT çizgisine kapanır; Google dönüşü ve başarılı çıkış aynı CRT durum kartını kullanır. Başarısız çıkış başarı efekti göstermez; kimlik/veri temizliği animasyonu beklemez. Hareket tercihi/reduced-motion efektleri kapatır, okunabilir durum metni kalır. Üyelik formunun iki parola alanı da copy/cut/paste ve sürükleme/drop kabul etmez. Giriş parolası yapıştırmaya açıktır; parola yöneticisi otomatik doldurması ayrı kontrol edilir. Sıfırlama/değiştirmede tekrar alanının mevcut paste/drop engeli korunur. Hesap silme yalnız üye Güvenlik bölümündeki kapalı Diğer hesap işlemleri detayında bulunur; mevcut geri alınamaz silme onayı ve owner koruması devam eder.

Owner Google bağlantısı yalnız mevcut oturum ve yeniden kimlik doğrulamasıyla kurulur; Google ile e-posta benzerliğinden otomatik hesap birleştirme veya owner yetkisi verilmez. Rol daima sunucudan gelir.

Giriş/Üye ol sekmelerinde seçim çizgisi 260 ms kayar, form 180 ms hafifçe yerleşir; parlama kullanılmaz. Seçili sekmeye yeniden tıklama parola girişini silmez. Manuel kapanış başarılı girişten ayrı ele alınır.

Üyelik, sıfırlama ve hesap ayarlarında alan hataları yazarken görünür; kırmızı çerçeve, kısa açıklama ve aria-invalid/aria-describedby birlikte kullanılır. Üyelikte devre dışı butonun nedeni açıklanır. Girişte yanlış kimlik bilgileri iki alanı birlikte işaretler; hangi bilginin yanlış olduğu açıklanmaz. Düzenleme hatayı temizler; ağ hatası alan hatası sayılmaz.
