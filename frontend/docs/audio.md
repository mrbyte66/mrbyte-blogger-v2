# Mozart oynatımı

AmbientAudio route’ların üstünde tek kalıcı audio element kullanır. Kullanıcı tıklamadan kaynak yükleme/oynatma yok; duraklat/devam konumu korur. Modal ve floating kontrol aynı context’i kullanır; iframe preview ikinci player açmaz. Touch/keyboard ve her zaman erişilir pause/mute, reduced motion.

Mevcut Mozart Symphony No. 40 kayıtları Musopen Symphony/Wikimedia Commons kaynaklıdır; kaynak/atıf lib/audio/mozart.ts’te izlenir. Eser ve kayıt hakkı ayrı kontrol edilir. Mevcut 40 dakika limiti oynatılan toplam süre; parçanın uzunluğu iddiası değildir.

BroadcastChannel/Web Lock aynı origin sekmeleri koordine eder. Owner sekme kapanınca tarayıcı autoplay politikasına göre yeni tıklama gerekebilir; kesintisiz oynatma garanti edilmez. Retry konumu korur, arka plan denial kilidi serbest bırakmalı.

Ses çeşitleri ve AssistiveTouch benzeri etkileşimli kontrol Backlog; hava durumuna göre öneri ayrı Backlog. Mevcut Mozart bu hazırlıkta değiştirilmez.

Ortak footer’daki Mozart kapsülü aynı AmbientAudioProvider’ı kullanır; ikinci audio element veya autoplay eklenmez. Public footer varken eski köşe düğmesi gizlenir. Kaynak/atıf, devralma ve hata bilgisi kapsülde korunur. Karakterli ana sayfada footer karakteri yukarı itmez; sahnenin alt köşelerinde durur.
