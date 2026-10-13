# GitHub Project kurulumu

## Mevcut durum

2026-10-13: mevcut **blog-v2 / Project 3** kullanılıyor; 32 kart korunuyor. Status ve Kategori yeterli. Kullanıcının kararıyla Kayıt alanı ve yerel eşitleme servisi kaldırıldı. #1, #2 ve #12 kullanıcı onayıyla Done; bağlı issue’lar kapalı. Geçici `durum:*` etiketleri kaldırıldı.

Project ID: `PVT_kwHOBJLPx84Bmr3d`.

| Alan | Kimlik |
| --- | --- |
| Status | `PVTSSF_lAHOBJLPx84Bmr3dzhlT3k4` |
| Kategori | `PVTSSF_lAHOBJLPx84Bmr3dzhlURBs` |

| Görünüm | Kimlik / numara | Kaydedilmiş filtre |
| --- | --- | --- |
| İş akışı | `PVTV_lAHOBJLPx84Bmr3dzgMBiQQ` / 2 | `status:Todo,"In Progress",Done` |
| Backlog | `PVTV_lAHOBJLPx84Bmr3dzgMBiLw` / 1 | `status:Backlog` |
| Gereksinimler | `PVTV_lAHOBJLPx84Bmr3dzgMBiQU` / 3 | Filtre yok; tüm issue kayıtları |

İş akışı ilk sırada Board; diğer ikisi kategori gruplu Table. Görünümlerde Title, Status ve Kategori var. Status tam olarak Backlog / Todo / In Progress / Done. In review boşken kullanıcı onayıyla kaldırıldı. Eski varsayılan Roadmap/My items görünümleri kaldırıldı; kartlar korundu.

## Hedef pano

Ad: **blog-v2**. Kullanıcı tarafından oluşturulan pano: [Project 3](https://github.com/users/mrbyte66/projects/3/views/1). Repo/klasör adındaki teknik ek ürün sürümü değildir. İlk release V1; sonrakiler daha sonra seçilir.

| Görünüm | Düzen | İçerik |
| --- | --- | --- |
| İş akışı | Board, Status’a göre | Todo, In Progress, Done; Backlog görünmez |
| Backlog | Table, kategoriye göre | Status = Backlog; kullanıcı Todo’ya alır |
| Gereksinimler | Table, kategoriye göre | Tüm issue kayıtları; mevcut, planlanan ve tamamlanan işler Status ile ayırt edilir |

Alanlar: **Status** (Backlog/Todo/In Progress/Done), **Kategori** (Üyelik, Yazı, Seri, Studio, Okuma, Görsel, Ses, Tasarım, Altyapı, Proje). Gereksinimler kategori gruplu tam listedir. Klonla gelen özelliklerin `gereksinim:mevcut` etiketleri korunur; bu etiket doğrulanmış başarı demek değildir. Tamamlanma yalnız Status=Done ile izlenir.

Başlık ve kategori issue’da da görünür. Agent, testçi, puan veya Scrum rol alanları yok. Açık yinelenen kapsamlar birleşir; mevcut tamamlanmış gereksinimin geçmişi silinmez.

## Otomasyon

Kullanıcı Status’ı Done’a alır → GitHub’ın yerleşik status-change issue-close workflow’u issue’yu kapatır. Bu yönde ayarla; asistan kendi başına Done yapmaz. Varsayılan “issue closed / PR merged → Done” workflow’larını devre dışı bırak; Done dışarıdan otomatik verilmesin. Yeni item’lar Backlog’dan başlar; otomatik Todo vermeyi kapat.

Yerel UI denetimi: Auto-close issue **On**, tetikleyici **Status=Done**. Item closed, Pull request merged ve Pull request linked to issue **Off**. Yeni açık repo issue'ları otomatik eklenir (`is:issue is:open`); Item added to project **On → Backlog**. Code review/change/reopened ve auto-archive akışları etkin değil.

Kayıt alanı kaldırıldığı için yerel alan eşitlemesi gerekmiyor. `com.mrbyte.blog-v2.project-sync` durduruldu ve LaunchAgent plist’i `.disabled` olarak korundu. Done → issue kapanışı GitHub’da yerleşik workflow ile çalışır; Mac’in açık olmasına bağlı değildir. #12’nin kullanıcı tarafından Done yapılmasında kapanış doğrulandı.

Yerleşik status/issue-close desteği: [GitHub automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations).

Takip: [#1](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/1).
