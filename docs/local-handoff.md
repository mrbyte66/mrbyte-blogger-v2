# Mac’te devam

## Çalışma biçimi

Bütün iş Mac’teki yerel Codex oturumunda yapılır: kod, MD, test, Docker ve GitHub takibi. Buluttaki mevcut belge değişiklikleri bir kez aktarılır. Main’de çalışılır; commit serbest, push yalnız kullanıcı açıkça istediğinde yapılır. Kullanıcı Backlog → Todo ve Done geçişlerini yönetir; asistan seçilen işi In Progress yapar.

## Devir paketini uygulama

`yerel-devir.zip` paketindeki `yeni-proje-kurallari.patch` bütün bulut belge değişikliklerini içerir. Yerel asistan çalışma ağacını kontrol eder, kullanıcı değişikliklerini korur, önce `git apply --check` ile doğrular ve sonra patch’i uygular. Çakışma varsa güvenli biçimde çözer; reset/overwrite yapmaz. Karar belgeleri aktarılmadan özellik uygulamasına başlamaz. Anket tekrarlanmaz; ürün kapsamı korunur.

## Yerel oturuma kısa talimat

> Her şey bu Mac’te yapılacak. Devir paketindeki patch’i kullanıcı değişikliklerini koruyarak uygula. AGENTS.md, docs/decisions.md ve docs/github-project.md oku. Önce mevcut Project 3 (blog-v2) erişimini ve tarayıcı araçlarını doğrula; erişilebilen tarayıcıdan, yoksa yetkili yerel gh/API ile panoyu kur. Yeni pano veya yinelenen issue açma. Status: Backlog/Todo/In Progress/Done; In Review yok. İş akışı, Backlog, Gereksinimler görünümlerini ve 32 mevcut issue’nun kategorilerini düzenle. Kullanıcı Done yapınca issue kapanışını doğrula; Done yetkisi kullanıcıda. Sonra mevcut özellik kontrolüne geç. Main’de çalış, testleri yap ve Docker önizlemesini çalıştır. Commit yapabilirsin; push yalnız kullanıcı söyleyince. Anketi tekrarlama; yeni agent başlatma. Erişim ve kurulum sonuçlarını gerçekten doğrulamadan tamamlandı deme.

## Önizleme

[Yerel runbook](../deploy/runbooks/local-stack.md). Koddan sonra asistan repo kökünde:

```sh
scripts/local-preview up -d --build backend frontend
scripts/local-preview ps
```

Bu checkout site adresi http://127.0.0.1:3011; ayrı `blog-v2-local` ortamı. Eski 3010 ortamı ve verileri korundu. Yeni imaj sağlıklı başlamadan güncellendi deme. İlk çalıştırmada tam yığın ve owner kurulumu gerekir. Mac’te başka klon da çalışıyorsa Compose adı, port ve volume ayrımını kontrol et; aynı `satir-local` adı iki farklı repo için ayrı veri ortamı sağlamaz. İsim/port ayrımı gerekiyorsa yerel altyapı issue’sunda uygula.

## V1

Kullanıcı Backlog’dan istediği işleri Todo’ya alır. Yeni ürün adı, VPS, domain, e-posta ve offsite yedek sağlayıcısı kararlaştırılmadan bunları satın alma/yayına çıkarma. Mevcut test verisi gerçek DB’de fakat gerçek içerikten ayrı ortamda tutulur.

Takip: [#12](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/12), [#1](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/1).

## Devir alındı

2026-10-12: boş Masaüstü hedefi klonlandı; temiz main üzerinde `git apply --check` sonrası belge patch'i bir kez uygulandı. Yerel belge commit'i `09fe835`; bulut commit'i `886dc09` paket referansıdır, yerel commit kimliği değildir. Yerel Project erişimi çalışıyor; eski bulut erişim hataları yerel durum değildir. [Pano doğrulaması](github-project.md). Uygulama hedef farkları ilgili mevcut issue'lara kaydedilir; kullanıcı seçmeden geliştirme önceliği atanmaz.
