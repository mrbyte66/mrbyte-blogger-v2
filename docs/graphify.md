# Yerel Graphify

Graphify kod ilişkilerini haritalayan yardımcıdır; gerçek dosya, OpenAPI ve testlerin yerini almaz. Python/SQL/Java/TypeScript kodu bu Mac’te AST ile işlenir. Doküman/medya için LLM pass veya dış hizmet yapılandırılmadı. Ürün kullanıcılarının kitaplığı/notları bu haritaya girmez.

## Kullanım

```sh
scripts/graphify-local refresh
scripts/graphify-local query 'LoginService'
scripts/graphify-local query 'AuthCard'
scripts/graphify-local explain 'AuthCard()'
scripts/graphify-local stats
```

İlişki/etki analizi için önce ilgili sembolü sorgula; dönen kaynak dosya ve satırları incele. Sorgu eksik veya kesilmişse bütün bağımlılıkların kapsandığını varsayma; ilgili dosya/testlerle tamamla. Anlamlı kod değişikliği sonrası haritayı `refresh` ile güncelle. `EXTRACTED` kaynaktan çıkarılan, `INFERRED` türetilen ilişkidir; ikisi aynı kesinlikte değildir.

Araç `work/tools/graphify`, harita ve rapor `work/graphify/graphify-out`, kullanım sayacı `work/graphify/usage.jsonl` altındadır. Bunlar yerel ve Git tarafından yok sayılır. `.graphifyignore` bağımlılıkları, generated dosyaları, sırları ve test hesap fixture’ını taramadan çıkarır. Otomatik agent/servis veya Git hook kurulmaz; tek Codex oturumu komutları kullanır.

## Kurulumu yeniden oluşturma

Bu Mac’te Homebrew Python 3.13 mevcut. Resmî PyPI paketi `graphifyy` (iki y); sürüm 0.9.88 ve SQL desteği:

```sh
/opt/homebrew/opt/python@3.13/bin/python3.13 -m venv work/tools/graphify
work/tools/graphify/bin/python -m pip install 'graphifyy[sql]==0.9.88'
scripts/graphify-local refresh
```

## Ölçüm

`stats` düğüm/bağlantı sayısını, haritadaki kaynak dosyalarını, başarılı komut sayılarını ve geçen süreyi verir. Sayaç ham sorgu metnini saklamaz. Bunlar kullanım ve harita boyutu ölçüleridir; tasarruf yüzdesi değildir. Token/zaman kazancı ancak aynı görevleri Graphify ile ve onsuz ölçerek raporlanabilir.

2026-10-13 ilk tarama: 348 kod dosyası (13 dosyada sembol çıkarılmadı), 3.101 düğüm, 10.962 bağlantı, 114 topluluk. Giriş servisi, AuthCard ve publicationSubscription sorguları doğrulandı. [Resmî kaynak](https://github.com/Graphify-Labs/graphify). Takip: [#12](https://github.com/mrbyte66/mrbyte-blogger-v2/issues/12).
