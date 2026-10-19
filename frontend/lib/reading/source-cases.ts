import type { SourceBlock, SourceState } from "./source-tracking";
export type SourceCase = { id: string; title: string; description: string; original: string; quote: string; blocks: SourceBlock[]; expected: SourceState; multiple?: boolean };
const original = "Bugün saatte buluşalım. Sonra notları konuşuruz.";
const b = (text: string): SourceBlock[] => [{ id: "source", text }];
export const sourceCases: SourceCase[] = [
 { id:"unchanged",title:"01 · Değişmeyen kaynak",description:"Özgün konum ve sürüm korunur.",original,quote:"saatte",blocks:b(original),expected:"exact" },
 { id:"prefix",title:"02 · Önüne metin ekleme",description:"Seçimin dışındaki değişiklik notun bağlantısını koparmaz.",original,quote:"saatte",blocks:b("Yeni bir giriş. "+original),expected:"moved" },
 { id:"suffix",title:"03 · Saatte → saatlerde",description:"Küçük düzenlemede not metni takip eder; özgün alıntı karşılaştırma için saklanır.",original,quote:"saatte",blocks:b(original.replace("saatte","saatlerde")),expected:"changed" },
 { id:"meaning",title:"04 · Anlam değişikliği",description:"Küçük harf farkı anlamı değiştirebilir. Kaynak değişti durumu sessizce kaybolmaz.",original:"Bu yöntem güvenli kabul edilir.",quote:"güvenli",blocks:b("Bu yöntem güvensiz kabul edilir."),expected:"changed" },
 { id:"rewrite",title:"05 · Cümleyi yeniden yazma",description:"Yeterli kanıt yoksa rastgele bir yere fosfor uygulanmaz. Notun kendisi korunur.",original,quote:"saatte",blocks:b("Tamamen farklı bir cümle ve bambaşka bir konu."),expected:"review" },
 { id:"duplicate",title:"06 · Birden fazla aynı ifade",description:"Aynı bağlama sahip iki hedef varsa yakın olanı seçmek yerine kontrol bekler.",original:"A Hello B",quote:"Hello",blocks:b("A Hello B A Hello B"),expected:"review" },
 { id:"deleted",title:"07 · Kaynağı silme",description:"Not, özgün alıntı ve ses kaydı kaybolmaz; yalnız kaynak işareti kaldırılır.",original,quote:"saatte",blocks:b(original.replace("saatte ","")),expected:"removed" },
 { id:"reorder",title:"08 · Paragrafı taşıma",description:"Paragrafın kalıcı kimliği aynı kaldığı için başka sırada da bulunur.",original,quote:"saatte",blocks:[{id:"other",text:"Araya giren başka bir paragraf."},...b(original)],expected:"exact" },
 { id:"split",title:"09 · Paragrafı bölme",description:"Alıntı iki bloğa yayılsa da iki parça aynı notun kaynağıdır.",original:"Başlangıç önemli bir cümle son.",quote:"önemli bir cümle",blocks:[{id:"source",text:"Başlangıç önemli"},{id:"second",text:"bir cümle son."}],expected:"moved" },
 { id:"merge",title:"10 · Paragrafları birleştirme",description:"Kaynak tek ve doğrulanabiliyorsa birleşen blokta bulunur.",original:"önemli bir cümle son.",quote:"önemli bir cümle",blocks:[{id:"merged",text:"Başlangıç önemli bir cümle son."}],expected:"moved" },
 { id:"undo",title:"11 · Düzenlemeyi geri alma",description:"Metni değiştirip Özgün sürüme dön düğmesine bas: notun ilk yerine döner.",original,quote:"saatte",blocks:b(original.replace("saatte","saatlerde")),expected:"changed" },
 { id:"overlap",title:"12 · Aynı yerde iki not",description:"Kaynak aynı olsa da iki notun kimliği ve rengi bağımsızdır.",original,quote:"saatte",blocks:b(original.replace("saatte","saatlerde")),expected:"changed",multiple:true },
 { id:"remaining-copy",title:"13 · Silinen kelimenin başka tekrarı var",description:"İlk Hello silinince not, yazıda kalan diğer Hello kelimesine atlamaz.",original:"A Hello B X Hello Y",quote:"Hello",blocks:b("A B X Hello Y"),expected:"removed" },
 { id:"block-removed",title:"14 · Kaynak bloğu tamamen kaldırıldı",description:"Metin bu sürümde yok; özgün alıntı ve not hâlâ ulaşılabilir.",original,quote:"saatte",blocks:[],expected:"removed" },
];
