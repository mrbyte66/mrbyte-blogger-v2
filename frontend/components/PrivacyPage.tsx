"use client";
import { SitePageHeader } from "./SitePageHeader";
import { useWorkspace } from "../lib/builder/use-workspace";
import { themeAppearance } from "../lib/builder/appearance";

const CONTACT = "iletisim@mrbytestudio.dev";

/** Public privacy notice; describes what the backend actually stores (identity, library, engagement, sessions). */
export function PrivacyPage() {
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  return <main className={`${appearance.className} legal-page`} style={appearance.style}><SitePageHeader theme={workspace.applied} />
    <article className="legal-content" aria-labelledby="privacy-title">
      <h1 id="privacy-title">Gizlilik</h1>
      <p className="legal-updated">Son güncelleme: 29 Ekim 2026</p>
      <p>Bu sayfa, mrbytestudio.dev’i kullandığında hangi kişisel verilerin işlendiğini, neden işlendiğini ve hangi haklara sahip olduğunu 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında açıklar. Veri sorumlusu sitenin sahibi MrByte Studio’dur.</p>

      <h2>Hangi verileri tutuyoruz</h2>
      <ul>
        <li><strong>Hesap bilgileri:</strong> e-posta adresin, kullanıcı adın ve görünen adın. Parolan yalnız tek yönlü özetlenmiş (hash) olarak saklanır; açık hâli kimse tarafından görülemez.</li>
        <li><strong>Google ile giriş:</strong> Google’la girersen Google’dan yalnız adını, e-posta adresini ve hesabını tanımlayan kimliği alırız. Google parolana veya diğer Google verilerine erişmeyiz.</li>
        <li><strong>Kişisel alanın:</strong> kaydettiğin yazılar, koleksiyonlar, okuma geçmişin, notların, işaretlemelerin, ses kayıtlı notların ve görünüm tercihlerin. Bunlar yalnız senin hesabına açıktır.</li>
        <li><strong>Etkileşim:</strong> alkışlar ve yazı görüntülenme sayıları. Üye değilsen alkış için tarayıcına rastgele bir kimlik çerezi yerleştirilir; sunucuda bunun yalnız özeti tutulur, parmak izi çıkarılmaz.</li>
        <li><strong>İletişim formu:</strong> gönderdiğin mesaj ve yanıt için verdiğin e-posta adresi.</li>
        <li><strong>Ziyaret istatistikleri:</strong> hangi sayfaların okunduğunu, ziyaretçilerin hangi siteden geldiğini, ülke, tarayıcı ve cihaz türünü toplu olarak görmek için kendi sunucumuzda çalışan Umami’yi kullanırız. Umami çerez kullanmaz, seni siteler arasında izlemez ve IP adresini saklamaz; ziyaretler kimliğe bağlanmadan sayılır. Tarayıcında “İzleme” (Do Not Track) kapalıysa hiç sayılmazsın.</li>
        <li><strong>Teknik kayıtlar:</strong> güvenlik ve kötüye kullanımı önleme için IP adresi, tarayıcı bilgisi ve istek zamanı kısa süreli sunucu kayıtlarında tutulur.</li>
      </ul>

      <h2>Çerezler ve tarayıcı depolama</h2>
      <p>Yalnız sitenin çalışması için gereken çerezleri kullanırız: oturum çerezi, form güvenliği (CSRF) çerezi ve üye olmayanlar için alkış çerezi. Tema, hareket ve okuma tercihlerin tarayıcının yerel depolamasında tutulur. Ziyaret istatistikleri çerezsiz tutulur. Reklam, izleme veya üçüncü taraf analiz çerezi kullanmıyoruz.</p>

      <h2>Neden işliyoruz</h2>
      <p>Verilerini hesabını oluşturmak ve korumak, sana kişisel okuma alanını sunmak, e-posta doğrulama ve parola sıfırlama gibi hesap e-postalarını göndermek, iletişim mesajlarına yanıt vermek, hangi içeriklerin okunduğunu toplu olarak görüp siteyi geliştirmek ve siteyi güvenli tutmak için işleriz. Hukuki sebep, üyelik sözleşmesinin kurulması ve ifası ile sitenin güvenliğine ilişkin meşru menfaattir. Verilerini satmayız ve reklam amacıyla kullanmayız.</p>

      <h2>Kimlerle paylaşılır</h2>
      <p>Verilerin yalnız hizmeti sağlamak için gereken altyapı sağlayıcılarında işlenir: sunucu barındırma (GoDaddy), Google ile giriş (Google) ve hesap e-postalarının gönderimi için e-posta sağlayıcısı. Ziyaret istatistikleri kendi sunucumuzda kalır, üçüncü bir tarafa gönderilmez. Bu sağlayıcıların bir kısmı yurt dışında bulunabilir. Yasal bir zorunluluk olmadıkça başka kimseyle paylaşılmaz.</p>

      <h2>Ne kadar süre saklanır</h2>
      <p>Hesap verilerin hesabın açık kaldığı sürece saklanır. Hesabını sildiğinde kişisel alanındaki veriler silinir; yedeklerdeki kopyalar yedekleme döngüsü içinde kendiliğinden ortadan kalkar. Oturumlar ve teknik kayıtlar kısa süre sonra silinir.</p>

      <h2>Hakların</h2>
      <p>KVKK’nın 11. maddesi uyarınca verilerinin işlenip işlenmediğini öğrenme, bilgi isteme, düzeltilmesini veya silinmesini isteme, itiraz etme ve zarara uğradıysan tazminat isteme hakların vardır. Profilini, oturumlarını ve hesabını Hesap sayfasından yönetebilirsin. Diğer talepler için <a href={`mailto:${CONTACT}`}>{CONTACT}</a> adresine yazabilirsin; talebini en geç 30 gün içinde yanıtlarız.</p>

      <h2>Değişiklikler</h2>
      <p>Bu metni güncellediğimizde yukarıdaki tarihi değiştiririz. Önemli bir değişiklik olursa sitede ayrıca duyururuz.</p>
    </article>
  </main>;
}
