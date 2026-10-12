# GitHub Project kurulumu

## Mevcut durum

2026-10-12: yerel `gh` ve Chrome erişimi doğrulandı. Mevcut **blog-v2 / Project 3** kullanıldı; yeni pano veya issue açılmadı. 32 issue kategori ve Kayıt alanlarıyla eşitlendi. #1 In Progress, diğerleri Backlog; hiçbir issue asistan tarafından Done/kapatılmadı. Geçici `durum:*` etiketleri kaldırıldı.

Project ID: `PVT_kwHOBJLPx84Bmr3d`.

| Alan | Kimlik |
| --- | --- |
| Status | `PVTSSF_lAHOBJLPx84Bmr3dzhlT3k4` |
| Kategori | `PVTSSF_lAHOBJLPx84Bmr3dzhlURBs` |
| Kayıt | `PVTSSF_lAHOBJLPx84Bmr3dzhlURRM` |

| Görünüm | Kimlik / numara | Kaydedilmiş filtre |
| --- | --- | --- |
| İş akışı | `PVTV_lAHOBJLPx84Bmr3dzgMBiQQ` / 2 | `status:Todo,"In Progress",Done` |
| Backlog | `PVTV_lAHOBJLPx84Bmr3dzgMBiLw` / 1 | `status:Backlog` |
| Gereksinimler | `PVTV_lAHOBJLPx84Bmr3dzgMBiQU` / 3 | `kayıt:Mevcut,Tamamlandı` |

İş akışı ilk sırada Board; diğer ikisi kategori gruplu Table. Görünümlerde Title, Status, Kategori ve Kayıt var; rol/puan alanları gizli. Status tam olarak Backlog / Todo / In Progress / Done. In review boşken kullanıcı onayıyla kaldırıldı. Eski varsayılan Roadmap/My items görünümleri kaldırıldı; kartlar korundu.

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

Yerel UI denetimi: Auto-close issue **On**, tetikleyici **Status=Done**. Item closed, Pull request merged ve Pull request linked to issue **Off**. Yeni açık repo issue'ları otomatik eklenir (`is:issue is:open`); Item added to project **On → Backlog**. Code review/change/reopened ve auto-archive akışları etkin değil.

GitHub'ın yerleşik workflow'ları özel Kayıt alanını yazmıyor; farklı alanlar arasında OR filtre de desteklenmiyor. Bu nedenle [scripts/project-sync.py](../scripts/project-sync.py) yalnız kullanıcı tarafından zaten Done yapılmış repo issue kartlarının Kayıt alanını Tamamlandı yapar. Status ve issue state yazmaz; tamamlanmış geçmişi geri almaz. [Kurucu](../scripts/install-project-sync.py) Mac LaunchAgent `com.mrbyte.blog-v2.project-sync` olarak 120 saniyede bir çalıştırır. Mac kapalı/uykuda veya oturum kapalıyken eşitleme bekler; issue kapanışı GitHub'da çalışmaya devam eder.

Kurulumun ilk gerçek çalışması exit 0, hata günlüğü boş. Karar sınırı testleri ve canlı dry run geçti (şu an 0 Done kartı). Gerçek bir Done geçişi ve issue kapanışı henüz kullanıcı tarafından denenmedi; asistan denemek için kartı Done'a almaz. Kullanıcı #1'i Done yapınca kapanış ve Kayıt eşitlemesi ayrıca doğrulanır.

Yerleşik status/issue-close desteği: [GitHub automations](https://docs.github.com/en/issues/planning-and-tracking-with-projects/automating-your-project/using-the-built-in-automations).

## Yerel bakım

```sh
python3 scripts/project-sync.py --dry-run
python3 scripts/install-project-sync.py
```

Kurucu güncel script'i `~/Library/Application Support/blog-v2-project/` içine kopyalar; güncelleme sonrası yeniden çalıştırılır. GitHub CLI mevcut keychain girişini kullanır; token dosyaya veya sohbete alınmaz. Loglar aynı destek klasöründe `sync.log` / `errors.log`.

Takip: [#1](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/1).
