# GitHub Project kurulumu

## Mevcut durum

Pano kullanıcı tarafından Project 3 olarak oluşturuldu. Buradaki integration yeni panoyu okumayı da reddediyor; view/field/automation kurulumu API üzerinden doğrulanamadı. 32 kategorili repo issue’su oluşturuldu; hiçbir issue kapatılmadı veya Done yapılmadı. Asistan üzerinden yeni Project oluşturulamadı: bu ortamın GitHub integration’ı `createProjectV2` için `Resource not accessible by integration` döndürdü. Repo erişimi var, Project yetkisi yok. Var olan başka proje panosu değiştirilmedi.

Üç view ve otomasyon tamamlanana kadar issue’lardaki `durum:backlog` / `durum:in-progress` etiketleri geçici görünür kayıttır; Project alanlarıyla aynı şey olduğu iddia edilmez. Kurulumdan sonra asistan alanları eşitler ve gereksiz geçici etiketleri temizler.

## Hedef pano

Ad: **blog-v2**. Kullanıcı tarafından oluşturulan pano: [Project 3](https://github.com/users/mrbyte66/projects/3/views/1). Repo/klasör adındaki teknik ek ürün sürümü değildir. İlk release V1; sonrakiler daha sonra seçilir.

| Görünüm | Düzen | İçerik |
| --- | --- | --- |
| İş akışı | Board, Status’a göre | Todo, In Progress, Done; Backlog görünmez |
| Backlog | Table, kategoriye göre | Status = Backlog; kullanıcı Todo’ya alır |
| Gereksinimler | Table, kategoriye göre | Klonla gelen özellik kayıtları ve kullanıcı tarafından Done yapılanlar |

Alanlar: **Status** (Backlog/Todo/In Progress/Done), **Kategori** (Üyelik, Yazı, Seri, Studio, Okuma, Görsel, Ses, Tasarım, Altyapı, Proje), **Kayıt** (Mevcut/Planlanan/Tamamlandı). Gereksinimler, Kayıt=Mevcut veya Tamamlandı filtreler. Mevcut etiketi doğrulanmış başarı demek değildir; kullanıcı Done yetkisi korunur.

Başlık ve kategori issue’da da görünür. Agent, testçi, puan veya Scrum rol alanları yok. Açık yinelenen kapsamlar birleşir; mevcut tamamlanmış gereksinimin geçmişi silinmez.

## Otomasyon

Kullanıcı Status’ı Done’a alır → GitHub’ın yerleşik status-change issue-close workflow’u issue’yu kapatır. Bu yönde ayarla; asistan kendi başına Done yapmaz. Varsayılan “issue closed / PR merged → Done” workflow’larını devre dışı bırak; Done dışarıdan otomatik verilmesin. Yeni item’lar Backlog’dan başlar; otomatik Todo vermeyi kapat.

Kayıt=Tamamlandı sınıflaması ve Gereksinimler görünümüne geçiş kullanıcıya ikinci bir işlem yüklemeden asistan/otomasyon tarafından eşitlenmelidir. Gerçek Project yetkisi alındığında native workflow olanakları ve filtre güncellemesi kontrol edilir; desteklenmeyen özel alan otomasyonunu kurulmuş gibi raporlama. Kod/Actions gerekirse yalnız Mac’teki uygulama aşamasında hazırlanır.

Yerleşik status/issue-close desteği: [GitHub automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations).

## Yerelde tamamlama

Bütün çalışma Mac’te sürdürülür. Bulut credential kurulumu tekrar denenmez. Önce belge patch’i yerel çalışma kopyasına aktarılır; sonra asistan yerel makine, mevcut tarayıcı kontrol araçları ve GitHub Project erişimini doğrular. Tarayıcı aracı varsa kullanıcı tarafından açılmış GitHub panosunda çalışır; araç yoksa yerel yetkili gh/API kullanır. Tarayıcıya veya panoya erişimi doğrulamadan kurulumu üstlendiğini söylemez. Kullanıcıdan tokenı sohbete yapıştırmasını istemez.

Yetkili CLI ortamı için örnek:

```sh
gh project view 3 --owner mrbyte66 --format json
```

Asistan repo’ya bağlar, Status seçeneklerini/alanları kurar, [roadmap](roadmap.md) içindeki mevcut issue URL’lerini ekler; ilk çalışma issue’su In Progress, diğerleri Backlog. View adları/düzen/filter ve Workflows UI’dan veya desteklenen API’den gerçekten kurulup doğrulanır. Sadece CLI create çıktısı üç görünümün kurulmuş olduğu anlamına gelmez. Başka issue, repo veya eski projeye dokunma.

Kurulum tamamlanınca Project URL/ID/number ve alan/view kimliklerini bu belgenin Mevcut durum bölümüne yaz. İlk hazırlık issue’sunun kapanışı yine kullanıcıdadır.

Takip: [#1](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/1).
