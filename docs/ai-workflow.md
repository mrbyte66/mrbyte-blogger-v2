# Sade iş akışı

Bütün çalışma Mac’teki yerel Codex oturumunda yürütülür. Kullanıcı işi sohbetten söyler; asistan GitHub kayıtlarını yönetir. Pano erişimi başlangıçta doğrulanır; mevcut tarayıcı araçları veya yetkili yerel CLI/API kullanılır. [Proje kuralları](../AGENTS.md) ve [pano](github-project.md).

## Issue

Başlık `Üyelik: giriş ve hesap yönetimi` gibi kategori + hedef olur. Açıklama kısa hedef ve 2–4 kapsam/kabul maddesi içerir. Büyük ana özellikler tek issue altında tutulur. Aynı başlıktaki tamamlanmamış işleri birleştir; farklı hedefleri veya tamamlanmış geçmişi ezme. Her ertelenen iş Backlog’da görünür olmalıdır.

Kategori etiketi yeterlidir; agent/testçi/puan/öncelik etiketi zorunlu değildir. Kullanıcı için uygulanmış gereksinimlerle yeni yapılacaklar ayrılır. Mevcut kaydın gerçekten çalışıp çalışmadığı doğrulanmadan tamamlandı denmez.

## Durum

`Backlog → Todo → In Progress → Done`

- Backlog yalnız Backlog görünümünde; Todo’ya kullanıcı alır.
- Kullanıcı işi seçince asistan In Progress yapar, uygular ve ilgili kontrolleri çalıştırır.
- Yerel sonucu kullanıcı push öncesinde görebilir. Teslimde kısa sonuç ve test bilgisi verilir.
- Done’a yalnız kullanıcı alır. Bu geçiş issue’yu otomatik kapatır; asistan kendi başına Done/kapatma yapmaz.
- Yeni bir hata mevcut teslimi etkiliyorsa aynı açık issue’ya ekle. Tamamlanmış konuya yeni kapsam gelirse geçmişi koruyup yeni issue aç; kullanıcı isterse açık yinelenen işleri birleştir.

## Kod ve test

Main yeterlidir; branch/worktree/PR veya bağımsız testçi zorunlu değildir. Asistan uygun otomatik ve davranış testlerini yapar. Başka agent tetikleyen taramalar, CI-monitor rol devirleri ve periyodik AI çalıştırmaları yeni süreçte kullanılmaz. Repo içinde eski script’lerin bulunması yeni kuralı etkinleştirmez; mevcut kurulumlar Mac’te kontrol edilip kaldırılır.

Commit serbest; push açık kullanıcı talimatıyla. CI main push’unda çalışmaya devam eder. Testlerin geçmesi kullanıcının Done yetkisini değiştirmez. Asistan kullanıcının Mac’indeki Docker’ı günceller; önizleme için remote commit veya PR gerekmez.
