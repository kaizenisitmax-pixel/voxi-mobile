// VOXI Duygusal Zeka (EQ) Veri Kütüphanesi
// 70 sektör senaryosu, 70 tetikleyici, 27 AI özelliği
// Kaynak: ai_duygusal_zeka_ekip_analizi.xlsx

export type EQScenario = {
  id: number;
  category: string;
  business: string;
  scenario: string;
  aiResponse: string;
  trigger: string;
  impact: string;
  wowScore: number;
};

export type EQTrigger = {
  id: number;
  name: string;
  interventionType: string;
  avgWowScore: number;
};

export type EQFeature = {
  id: number;
  module: string;
  feature: string;
  description: string;
  wowScore: number;
  phase: string;
};

export const EQ_SCENARIOS: EQScenario[] = [
  { id: 1, category: 'İnşaat & Mimarlık', business: 'İnşaat Şirketi', scenario: 'Şantiyede iş kazası sonrası ekip morali çok düşük, herkes sessiz ve gergin', aiResponse: 'AI ekibin duygusal tonunu mesajlardan algılar → \'Bugün zor bir gün geçirdiniz. Birbirinize destek olmanız en büyük güç. Yarın için birlikte güvenlik toplantısı yapmak ister misiniz?\' önerir + ekip lidere özel \'Kriz sonrası liderlik rehberi\' sunar', trigger: 'Kriz & Travma', impact: 'Ekip Dayanışması', wowScore: 10 },
  { id: 2, category: 'İnşaat & Mimarlık', business: 'İnşaat Şirketi', scenario: 'Ramazan ayında oruç tutan ve tutmayan işçiler arasında gerginlik, yemek molası tartışması', aiResponse: 'AI takvimden Ramazan\'ı bilir → otomatik iftar saati hatırlatması + \'Bugünkü iftarlık kim getiriyor?\' gibi birleştirici sohbet başlatır + oruç tutmayanlara saygılı alan önerir', trigger: 'Kültürel/Dini Hassasiyet', impact: 'Kapsayıcılık', wowScore: 9 },
  { id: 3, category: 'İnşaat & Mimarlık', business: 'Mimarlık Ofisi', scenario: 'Genç mimar ilk büyük projesini sundu ama müşteri sert eleştiri yaptı, çok kırıldı', aiResponse: 'AI özel mesajda \'İlk büyük sunum her zaman zordur. Geri bildirim ≠ başarısızlık. Ekip arkadaşlarından destek almak ister misin?\' + ekip kanalına \'X\'in ilk büyük projesi! 💪 Deneyimlerinizi paylaşır mısınız?\' sorusu atar', trigger: 'Profesyonel Hayal Kırıklığı', impact: 'Mentorluk', wowScore: 9 },
  { id: 4, category: 'İnşaat & Mimarlık', business: 'Peyzaj/Çevre Düzenleme', scenario: 'Yaz sıcağında dış mekanda çalışan ekip bitkin, motivasyon düşük', aiResponse: 'AI hava durumu + çalışma saatlerini analiz eder → \'Bugün 38°C! Serin saatlere kaydırma önerisi: 06:00-11:00 + 16:00-19:00\' + \'En son ne zaman birlikte soğuk bir şey içtiniz? 🍉\' sorusu', trigger: 'Fiziksel Refah', impact: 'Ekip Sağlığı', wowScore: 8 },
  { id: 5, category: 'İnşaat & Mimarlık', business: 'İç Mimarlık / Dekorasyon', scenario: 'Projelerde sürekli müşteri revizyonu, ekip tükenmiş ve \'hiçbir şey yeterli olmuyor\' hissi hakim', aiResponse: 'AI revizyon sayısını tracker\'dan görür → \'Bu projede 12. revizyondasınız. Ekip olarak nefes alma zamanı gelmiş olabilir. Yarın 30 dk kahve molası bloklansın mı?\' + ekibe motivasyon: \'Hatırlatma: İlk 3 projenizin sonuçlarına bakın — harikalar yarattınız 🏆\'', trigger: 'Tükenmişlik (Burnout)', impact: 'Refah & Motivasyon', wowScore: 10 },
  { id: 6, category: 'Sağlık', business: 'Diş Kliniği', scenario: 'Bir hastanın tedavi sırasında olumsuz sonuç, ekip kendini suçluyor', aiResponse: 'AI ekip mesajlarındaki tonu algılar → özel kanalda \'Zor vakalar hepimizi etkiler. Birbirinize destek olun. Vaka değerlendirme toplantısı yapmak ister misiniz? Bu öğrenme sürecinin parçası\' + klinik sahibine \'Ekip desteği önerileri\' sunar', trigger: 'Mesleki Travma', impact: 'Psikolojik Güvenlik', wowScore: 10 },
  { id: 7, category: 'Sağlık', business: 'Veteriner Kliniği', scenario: 'Uzun süredir tedavi edilen hayvan hayatını kaybetti, tüm ekip üzgün', aiResponse: 'AI hassas bir tonda \'Bugün [hayvan adı] için elinizden geleni yaptınız. Kayıp hepimizi etkiler. Birbirinize sarılın 🐾\' + hayvan sahibine taziye mesaj şablonu önerir + ekibe \'güzel anılarınızı paylaşmak ister misiniz?\' sorusu', trigger: 'Kayıp & Yas', impact: 'Empatik Destek', wowScore: 10 },
  { id: 8, category: 'Sağlık', business: 'Eczane', scenario: 'Yoğun grip sezonunda ekip 12 saat mesai yapıyor, bitkinlik had safhada', aiResponse: 'AI mesai saatlerini izler → \'Son 5 gündür ortalama 11 saat çalışıyorsunuz. Bu hafta sonu rotasyonlu izin önerisi hazırladım. Hangisi size uyar?\' + \'Ekip olarak moral yemeği organize etmek ister misiniz? 🍕\'', trigger: 'Aşırı Çalışma', impact: 'Refah Yönetimi', wowScore: 9 },
  { id: 9, category: 'Sağlık', business: 'Fizyoterapi Merkezi', scenario: 'Hasta çok kaba davrandı, terapist ağladı, diğer ekip üyeleri tedirgin', aiResponse: 'AI terapiste özel: \'Zor hastalarla çalışmak duygusal emek gerektirir. Kendinize zaman ayırın\' + ekip lidere bildirim: \'Ekip üyeniz zor bir deneyim yaşadı, destek olmanız önemli\' + sınır koyma rehberi', trigger: 'Duygusal Emek', impact: 'Bireysel Destek', wowScore: 9 },
  { id: 10, category: 'Sağlık', business: 'Psikolojik Danışmanlık', scenario: 'Terapist ağır vakalardan sonra ikincil travma yaşıyor ama kimseye söyleyemiyor', aiResponse: 'AI seanslar arası süreleri ve mesaj tonunu izler → \'Bugün yoğun bir gün geçirdiniz. Süpervizyon seansınıza 2 gün var ama öncesinde nefes egzersizi yapmak ister misiniz?\' + anonim \'bugün nasıl hissediyorsun\' nabız anketi', trigger: 'İkincil Travma / Vicarious Trauma', impact: 'Öz Bakım', wowScore: 10 },
  { id: 11, category: 'Sağlık', business: 'Diyetisyen', scenario: 'Danışan hedefine ulaşamadı ve diyetisyeni suçluyor, ekip motivasyonu düştü', aiResponse: 'AI başarı istatistiklerini çeker → \'Bu ay 23 danışanınız hedefine ulaştı! Bir danışanın zorlanması normaldir. İşte size ilham: [başarı hikayeleri özeti]\' + ekip kanalında \'Bu haftanın en mutlu anı ne oldu?\' sorusu', trigger: 'Olumsuz Geri Bildirim', impact: 'Perspektif', wowScore: 8 },
  { id: 12, category: 'Sağlık', business: 'Optik', scenario: 'Yeni çalışan müşteriye yanlış bilgi verdi, usta çalışan sert çıktı, yeni gelen çok utandı', aiResponse: 'AI ekip dinamiğini algılar → yeni çalışana: \'Hata yapmak öğrenmenin parçası. İlk haftanda harika gidiyorsun!\' + usta çalışana: \'Deneyimin çok değerli. Yeni arkadaşına mentörlük etmek ister misin? Bu seni de geliştirir\' + ikisi için ortak öğrenme kartı oluşturur', trigger: 'Kuşak Çatışması', impact: 'Mentorluk', wowScore: 8 },
  { id: 13, category: 'Teknoloji', business: 'Yazılım Geliştirme', scenario: 'Sprint retrospective\'de herkes \'iyi gidiyor\' diyor ama aslında tükenmiş, kimse gerçeği söylemiyor', aiResponse: 'AI anonim duygu anketi oluşturur → sonuçları görselleştirir: \'Ekibin %70\'i yorgun hissediyor. Bu normalin üstünde. Bir sprint tatili ya da hack day önerisi: oylayın!\' + lider için \'Psikolojik güvenlik nasıl artırılır?\' rehberi', trigger: 'Psikolojik Güvenlik', impact: 'Şeffaflık', wowScore: 10 },
  { id: 14, category: 'Teknoloji', business: 'Dijital Pazarlama Ajansı', scenario: 'Müşteri sunumdan sonra \'berbattı\' dedi, sunum yapan kişi yıkıldı, ekip dondu', aiResponse: 'AI anlık olarak sunum yapana özel destek mesajı gönderir + ekip kanalında \'Sunumlar her zaman kolay değildir. X harika bir iş çıkardı, müşteri geri bildirimi iyileştirme fırsatıdır. Birlikte revize edelim!\' + \'En kötü sunum anılarınız?\' ile gülme terapisi başlatır', trigger: 'Profesyonel Utanç', impact: 'Dayanışma', wowScore: 9 },
  { id: 15, category: 'Teknoloji', business: 'IT Destek / MSP', scenario: 'Gece 3\'te sunucu çöktü, nöbetçi tek başına sabaha kadar uğraştı, sabah kimse teşekkür etmedi', aiResponse: 'AI nöbet loglarını görür → sabah ekip kanalında \'Dün gece [isim] 4 saat boyunca sistemi ayakta tuttu. Kahramanımıza bir ☕ borçluyuz!\' + yöneticiye \'Görünmeyen emek bildirimi\' gönderir + nöbetçiye \'Bu öğleden sonra erken çıkış önerisi\'', trigger: 'Tanınmama / Invisible Labor', impact: 'Takdir Kültürü', wowScore: 10 },
  { id: 16, category: 'Teknoloji', business: 'E-ticaret', scenario: 'Bayram yoğunluğunda kargo ekibi ve müşteri hizmetleri birbirine kızgın, suçlama var', aiResponse: 'AI iki departman arasındaki mesaj tonunu analiz eder → \'İki ekip de inanılmaz efor gösteriyor. Birbirinizin zorluklarını görmek ister misiniz? Mini ekip tanışma: Kargo ekibi ne yaşıyor vs MH ne yaşıyor\' + ortak kutlama hedefi koyar', trigger: 'Departman Çatışması', impact: 'Empati Köprüsü', wowScore: 9 },
  { id: 17, category: 'Eğitim', business: 'Özel Okul / Kurs', scenario: 'Sınav sonuçları kötü geldi, öğretmenler kendini başarısız hissediyor, veli baskısı artıyor', aiResponse: 'AI öğretmen odasına: \'Sonuçlar beklentinin altında ama hatırlayın: geçen dönem %12 artış yaşadınız. Bu bir adım geri, iki adım ileri. Birlikte strateji toplantısı yapalım mı?\' + her öğretmene kendi sınıfının pozitif istatistikleri', trigger: 'Başarısızlık Hissi', impact: 'Veri Bazlı Moral', wowScore: 9 },
  { id: 18, category: 'Eğitim', business: 'Dil Okulu', scenario: 'Yabancı uyruklu öğretmen dışlanmış hissediyor, Türk ekiple kaynaşamıyor', aiResponse: 'AI kültürel köprü kurar: \'Fun fact: [öğretmen]\'in ülkesinde öğretmenler günü [tarih]te kutlanıyor! 🌍\' + \'Birbirimizin dilinde 1 kelime öğrensek? Bu haftanın kelimesi: ...\' + ortak yemek önerisi', trigger: 'Kültürel Dışlanma', impact: 'Kapsayıcılık', wowScore: 9 },
  { id: 19, category: 'Eğitim', business: 'Kreş / Anaokulu', scenario: 'Bakıcılardan biri hamile, diğerleri ek yük bindiriliyor diye kırgın', aiResponse: 'AI iş dağılımını analiz eder → \'Hamilelik hepimiz için heyecanlı bir dönem! İş dağılımını yeniden dengeleyelim: [önerilen plan]. Baby shower planlamak isteyen?\' + hamile çalışana \'Sağlığın öncelik, işte nasıl destek olabiliriz?\'', trigger: 'Yaşam Değişikliği', impact: 'Ekip Uyumu', wowScore: 9 },
  { id: 20, category: 'Eğitim', business: 'Online Eğitim Platformu', scenario: 'Remote çalışan ekip birbirini hiç görmeden 6 ay oldu, aidiyet hissi sıfır', aiResponse: 'AI \'Sanal Kahve\' rastgele eşleştirmesi yapar → \'Bu hafta [isim] ile 15 dk kahve molası! Konu: iş dışı herhangi bir şey ☕\' + aylık \'ekip haritası\': herkesin bulunduğu şehirden 1 fotoğraf paylaşma etkinliği', trigger: 'Remote İzolasyon', impact: 'Aidiyet', wowScore: 10 },
  { id: 21, category: 'Gıda & Restoran', business: 'Restoran / Kafe', scenario: 'Yoğun cumartesi gecesi sonrası herkes kavgalı, garson-şef arası gerilim tavan', aiResponse: 'AI gece yarısı vardiya bitiminde: \'Bu gece 127 müşteriye hizmet verdiniz — süper! 🔥 Herkes yorgun ve gerilim normal. Yarın öğlen buluşma: geceyi konuşalım ve bir sonraki için daha iyi plan yapalım. Kim gelir? 🙋\' + anonim \'dün gece en zor anın ne oldu?\' anketi', trigger: 'Yoğunluk Stresi', impact: 'Çatışma Çözümü', wowScore: 9 },
  { id: 22, category: 'Gıda & Restoran', business: 'Pastane / Fırın', scenario: 'Gece vardiyası ekibi gündüz ekibini görmüyor, iki ayrı dünya gibi, iletişim kopuk', aiResponse: 'AI vardiya geçişine \'günün notu\' ekler: gece ekibinden gündüze emoji + mesaj, gündüzden geceye teşekkür notu → \'Gece ekibi bugün 300 ekmek üretti! Rekora 20 kaldı 🥖🏆\' + ayda 1 ortak kahvaltı önerisi', trigger: 'Vardiya İzolasyonu', impact: 'Ekip Birliği', wowScore: 9 },
  { id: 23, category: 'Gıda & Restoran', business: 'Catering', scenario: 'Düğün organizasyonunda müşteri son dakika her şeyi değiştirdi, ekip patlama noktasında', aiResponse: 'AI kaos anında sakinleştirici: \'Değişiklikler sinir bozucu ama siz daha zorlarını başardınız. İşte yeni plan: [otomatik güncelleme]. Herkes kendi görevine odaklansın. Düğünden sonra kutlama yemeği mi planlayalım? 🎉\'', trigger: 'Son Dakika Krizi', impact: 'Sakinleştirme', wowScore: 9 },
  { id: 24, category: 'Otomotiv', business: 'Oto Servis / Tamir', scenario: 'Usta çırak ilişkisinde sert üslup, genç teknisyen işi bırakmayı düşünüyor', aiResponse: 'AI genç teknisyene: \'İlk yıllar her zaman zorludur. [Usta]\'nın sert görünmesinin altında seni yetiştirme isteği var. Duygularını paylaşmak ister misin?\' + ustaya: \'Bilgi aktarımın harika ama üslup da önemli — mentorluk ipuçları\'', trigger: 'Otoriter Liderlik', impact: 'İletişim Köprüsü', wowScore: 9 },
  { id: 25, category: 'Otomotiv', business: 'Oto Galeri', scenario: 'Satış ekibinde komisyon rekabeti yüzünden arkadaşlıklar bozuldu', aiResponse: 'AI \'Ekip satış rekoru\' hedefi koyar → bireysel yerine kolektif kutlama: \'Bu ay ekip olarak 45 araç sattınız! Geçen aydan %15 fazla 🎯. Birlikte akşam yemeği hak ettiniz!\' + müşteri memnuniyeti bazlı ödül önerisi (sadece satış adedi değil)', trigger: 'Yıkıcı Rekabet', impact: 'İşbirliği Kültürü', wowScore: 8 },
  { id: 26, category: 'Hukuk & Muhasebe', business: 'Avukatlık Bürosu', scenario: 'Kaybedilen dava sonrası avukat çok yıpranmış, ofiste kimse konuyu açamıyor', aiResponse: 'AI ertesi gün özel mesaj: \'Dava sonucu hayal kırıklığı yaratmış olabilir. Hukuk böyledir — her kayıp bir öğrenim. Kıdemli meslektaşlarınızın benzer deneyimleri var. Bir vaka analizi toplantısı yapmak ister misiniz?\' + \'Bu hafta kendinize iyi gelen bir şey yapın\' hatırlatması', trigger: 'Profesyonel Kayıp', impact: 'Normalleştirme', wowScore: 9 },
  { id: 27, category: 'Hukuk & Muhasebe', business: 'Muhasebe Bürosu', scenario: 'Beyanname döneminde 45 gün boyunca hafta sonları dahil çalışma, aileler şikayetçi', aiResponse: 'AI 45. günde: \'Beyanname maratonu bitiyor! Ekip olarak inanılmaz bir iş çıkardınız. Son tarihten sonra: 2 gün telafi izni önerisi + ailelerinize teşekkür kartı göndermek ister misiniz? Şablon hazır 💌\'', trigger: 'İş-Yaşam Dengesi', impact: 'Aile Dahil Etme', wowScore: 10 },
  { id: 28, category: 'Hukuk & Muhasebe', business: 'Mali Müşavirlik', scenario: 'Vergi mevzuatı sürekli değişiyor, ekip \'yetişemiyoruz\' stresinde', aiResponse: 'AI değişim yoğunluğunu ölçer → \'Son 30 günde 8 mevzuat değişikliği oldu — stres normalinizin üstünde olabilir. Birlikte \'ne değişti?\' toplantısı yapmak ister misiniz? Bölelim ve fetihetlim! ⚔️\' + her kişiye özel mevzuat özeti', trigger: 'Bilgi Yoğunluğu Stresi', impact: 'Kolektif Öğrenme', wowScore: 8 },
  { id: 29, category: 'Gayrimenkul', business: 'Emlak Ofisi', scenario: 'Danışman aylar sonra büyük bir satışı son anda kaybetti, moral çöküşü', aiResponse: 'AI: \'Bu satışta 3 ay emek vardı, kayıp acı verici. Ama şunu bilin: son 6 ayda 12 başarılı satış yaptınız. Bu kayıp sizi tanımlamaz. Ekip olarak [isim]\'e destek! 💪\' + kişiye özel: \'Yarın yeni bir gün. Yeni portföy eşleşmeleriniz hazır\'', trigger: 'Uzun Süreli Efor Kaybı', impact: 'Toparlanma', wowScore: 8 },
  { id: 30, category: 'Güzellik & Kişisel Bakım', business: 'Kuaför / Güzellik Salonu', scenario: 'Müşteri sosyal medyada salonu kötülerken çalışanın ismini verdi, çalışan yıkıldı', aiResponse: 'AI sosyal medya entegrasyonundan tespit eder → çalışana özel: \'Online yorumlar acı verebilir ama seni tanımlayan yüzlerce mutlu müşterin var. İşte son ayın pozitif yorumları 🌟\' + ekip kanalında destek kampanyası başlatır + yöneticiye kriz iletişim rehberi', trigger: 'Online Saldırı / Cyberbullying', impact: 'Duygusal Koruma', wowScore: 10 },
  { id: 31, category: 'Güzellik & Kişisel Bakım', business: 'Berber', scenario: 'Yaşlı usta emekli oluyor, 20 yıllık ilişkiler bitiyor, duygusal veda', aiResponse: 'AI: \'Ustamız [isim] 20 yıl sonra yeni bir maceraya çıkıyor. Ona sürpriz hazırlayalım mı? Herkes 1 anısını paylaşsın, biz albüm yapalım 📖\' + son iş gününde özel video mesajları derler', trigger: 'Ayrılık & Geçiş', impact: 'Miras Oluşturma', wowScore: 9 },
  { id: 32, category: 'Üretim & Sanayi', business: 'Mobilya İmalathanesi', scenario: 'Müşteri siparişi beğenmedi, iade geldi, ustalar emeklerinin boşa gittiğini hissediyor', aiResponse: 'AI üretim kanalında: \'İade hayal kırıklığı yaratır ama verilerinize bakın: son 100 siparişte sadece 2 iade. %98 memnuniyet! Bu parçayı yeniden değerlendirip ikinci el mağazaya sunalım mı? Hiçbir emek boşa gitmez ♻️\'', trigger: 'Emek Değersizleşmesi', impact: 'Gurur Koruma', wowScore: 9 },
  { id: 33, category: 'Üretim & Sanayi', business: 'Matbaa / Baskı', scenario: 'Yeni dijital baskı makinesi geldi, eski ustaları \'artık bize gerek yok\' korkusu sardı', aiResponse: 'AI: \'Yeni teknoloji + deneyimli ustalar = en güçlü kombinasyon! [Usta]\'nın renk bilgisi hiçbir makine karşılayamaz. Yeni makinede usta dokunuşunuzu görmek istiyoruz. Eğitim programı: herkes birbirinden öğrensin 🤝\'', trigger: 'Teknoloji Kaygısı', impact: 'Kuşaklararası Bilgi Transferi', wowScore: 9 },
  { id: 34, category: 'Üretim & Sanayi', business: 'Tekstil Atölyesi', scenario: 'Sezon sonu fazla mesailer, kadın çalışanlar çocuklarını göremediğinden şikayetçi', aiResponse: 'AI: \'Bu sezonun bitimine 5 gün! Ekip olarak harika bir iş çıkardınız. Hafta sonu ailece piknik organize etmek ister misiniz? 🌳 Çocuklar da gelsin, emeğinizi görsünler! + sezon sonu teşekkür + çocuklara mini hediye bütçe önerisi\'', trigger: 'Ebeveynlik Suçluluğu', impact: 'Aile Entegrasyonu', wowScore: 9 },
  { id: 35, category: 'Lojistik & Ulaşım', business: 'Kargo / Kurye', scenario: 'Kurye trafik kazası geçirdi (hafif), ama ekip \'bize de olabilir\' korkusuyla tedirgin', aiResponse: 'AI tüm ekibe: \'[İsim] şükür iyi. Bu olay hepimizi etkiledi. Güvenli sürüş hatırlatması + kim endişeli hissediyorsa paylaşsın. Birlikte güvenlik toplantısı yapalım mı? 🙏\' + kazayı geçirene özel: \'Dinlen, acele etme, senin yerine rota düzenlendi\'', trigger: 'Kolektif Korku', impact: 'Güvenlik Duygusu', wowScore: 10 },
  { id: 36, category: 'Lojistik & Ulaşım', business: 'Nakliye Firması', scenario: 'Şoför 10 gündür yolda, ailesini özlüyor, motivasyon diplerde', aiResponse: 'AI şoföre: \'Eve 2 gün kaldı! Ailen seni bekliyor 🏠 Çocuklarından sesli mesaj var mı? Paylaşmak istersen ekip bunu çok sever\' + eve dönüş gününde \'Hoş geldin!\' ekip mesajı otomatik planlanır', trigger: 'Uzun Ayrılık / Yalnızlık', impact: 'Bağ Koruma', wowScore: 10 },
  { id: 37, category: 'Lojistik & Ulaşım', business: 'Araç Kiralama', scenario: 'Müşteri aracı hasarlı iade etti ve tartışma çıktı, çalışan aşağılandı', aiResponse: 'AI çalışana: \'Kaba müşteriler olur ama sen profesyonelce davrandın. Yöneticin bilgilendirildi\' + yöneticiye: \'Ekip üyeniz zor bir müşteri deneyimi yaşadı, 5 dk destek konuşması önemli\' + tüm ekibe: \'Zor müşteri senaryoları eğitimi yararlı olur mu?\'', trigger: 'Müşteri Şiddeti', impact: 'Çalışan Koruması', wowScore: 9 },
  { id: 38, category: 'Lojistik & Ulaşım', business: 'Depo / Antrepo', scenario: 'Depo işçileri monoton işten bunalmış, \'robotlar yerimizi alacak\' söylentisi moral bozuyor', aiResponse: 'AI: \'Bu ay 15.000 paket işlediniz — geçen aydan %8 fazla! 🏆 Teknoloji sizin yerinizi değil, işinizi kolaylaştırmak için var. Hangi süreçte yardım istersiniz? En iyi fikre pizza ödülü! 🍕\'', trigger: 'İş Güvencesi Kaygısı', impact: 'Güçlendirme', wowScore: 9 },
  { id: 39, category: 'Turizm & Konaklama', business: 'Otel / Pansiyon', scenario: 'Bayram yoğunluğunda ekip herkes tatildeyken çalışmak zorunda, motivasyon çok düşük', aiResponse: 'AI bayramın 1. günü: \'Herkes tatildeyken siz hizmet ediyorsunuz — bu gerçek kahramanlık! 🌟 Bayram sonrası telafi programı hazırladım: rotasyonlu 3\'er gün izin. Ayrıca misafirlerden gelen teşekkür mesajlarını derledim, bakın ne güzel şeyler söylemişler!\'', trigger: 'Tatil Fedakarlığı', impact: 'Tanıma & Telafi', wowScore: 9 },
  { id: 40, category: 'Turizm & Konaklama', business: 'Tur Operatörü', scenario: 'Tur rehberi gruba sert eleştiri aldı, online\'da da kötü yorum yazıldı', aiResponse: 'AI: \'Her turda herkesi mutlu etmek imkansız. Son 20 turunuzun puanı: 4.7/5 ⭐ Bu tek yorum sizi tanımlamaz. İşte sevilen yorumlarınız: [kolaj]. Eleştiriden öğrenelim ama içselleştirmeyelim\'', trigger: 'Rating Baskısı', impact: 'Öz Değer Koruma', wowScore: 8 },
  { id: 41, category: 'Tarım & Hayvancılık', business: 'Sera İşletmesi', scenario: 'Don felaketi ürünlerin yarısını yok etti, ekip moral çöküntüsünde', aiResponse: 'AI: \'Doğa bazen çok acımasız olur. Kaybınız büyük ama toprağınız, bilginiz ve ekibiniz hâlâ burada. Birlikte yeniden başlayacağız. İlk adım: hasar tespiti ve sigorta başvurusu. Destek ekibi: kim hangi görevi alır? 💚\'', trigger: 'Doğal Afet / Kayıp', impact: 'Kolektif Toparlanma', wowScore: 10 },
  { id: 42, category: 'Tarım & Hayvancılık', business: 'Çiftlik / Hayvancılık', scenario: 'Çiftlik sahibinin oğlu çiftliği devralmak istemiyor, aile içi gerilim ekibe yansıyor', aiResponse: 'AI nötr bir alan sağlar: \'Ekip olarak işimize odaklanalım. Bu hafta yapılacaklar: [liste]. Aile konuları zordur ama ekip ruhu güçlü 🤝 Bu hafta birlikte başardıklarımız...\' + gerilim artarsa profesyonel arabuluculuk önerisi', trigger: 'Aile İşletmesi Gerilimleri', impact: 'Profesyonel Sınır', wowScore: 8 },
  { id: 43, category: 'Spor & Fitness', business: 'Spor Salonu / Fitness', scenario: 'Eğitmen müşteriden taciz şikayeti aldı, ekip belirsizlik ve endişe içinde', aiResponse: 'AI hassasiyetle: \'Ekip üyemiz zor bir durumla karşılaştı. Gizlilik ve destek en önemli önceliklerimiz. Yönetim süreci yönetiyor. Herkesin güvende olması en önemli şey. İş yerinizde güvende hissetmiyorsanız, bize özel mesaj atabilirsiniz\' + yöneticiye: protokol rehberi', trigger: 'Taciz / İstismar', impact: 'Güvenli Alan', wowScore: 10 },
  { id: 44, category: 'Spor & Fitness', business: 'Halı Saha', scenario: 'Saha müdürü ile part-time çalışan genç personel arasında iletişim uçurumu', aiResponse: 'AI \'Ekip Tanışma Kartı\' oluşturur: herkes hobileri, hayalleri, komik bir anısını paylaşır → \'Meğer Ahmet abi de Galatasaraylıymış! 😄\' + ortak ilgi alanlarına göre mini etkinlik önerileri', trigger: 'Hiyerarşi Duvarı', impact: 'İnsanlaştırma', wowScore: 8 },
  { id: 45, category: 'Temizlik & Hizmet', business: 'Temizlik Şirketi', scenario: 'Temizlik görevlileri \'görünmez\' hissediyor, kimse işlerini takdir etmiyor', aiResponse: 'AI müşteri binasından çıkışta: \'Bugünkü alanı pırıl pırıl bıraktınız! 🌟 Müşteri memnuniyet puanınız: 4.8/5. Bakın ne yazmışlar: [yorum]\' + haftalık \'temizlik kahramanı\' seçimi + müşterilerden otomatik teşekkür toplama', trigger: 'Meslek Saygınlığı', impact: 'Görünürlük & Takdir', wowScore: 10 },
  { id: 46, category: 'Temizlik & Hizmet', business: 'Kuru Temizleme', scenario: 'Ütücü 15 yıldır aynı işi yapıyor, \'hayatımda hiçbir şey ilerlemiyor\' dedi', aiResponse: 'AI: \'Bilir misin? 15 yılda tahminen 100.000+ parça ütüledin. Bu ustalık! Yeni kumaş türleri çıkıyor — bir eğitim ilgini çeker mi? Ya da yeni çalışanlara mentorluk? Senin deneyimin paha biçilmez\'', trigger: 'Kariyer Durağanlığı', impact: 'Anlam Bulma', wowScore: 9 },
  { id: 47, category: 'Medya & Yaratıcı', business: 'Fotoğraf / Video Prodüksiyon', scenario: 'Düğün çekiminde damat kavga etti, ekip travma yaşadı', aiResponse: 'AI çekim sonrası: \'Bugün beklenmedik bir durum yaşandı. Herkes güvende mi? Bu tür olaylar şok etkisi yaratabilir. Yarın ofiste birlikte konuşalım. Bu gece kendinize iyi bakın 🙏\' + lider için: kriz sonrası ekip desteği rehberi', trigger: 'Beklenmedik Şiddet/Kriz', impact: 'Travma Desteği', wowScore: 9 },
  { id: 48, category: 'Medya & Yaratıcı', business: 'Grafik Tasarım Stüdyosu', scenario: 'Tasarımcının projesi bir ödül yarışmasında elendi, çok üzgün', aiResponse: 'AI: \'Ödül yarışmaları subjektiftir — elenemek kalitenizi yansıtmaz. Ekip olarak bu projeyle gurur duyuyoruz. İşte geçen yılın elenip sonra viral olan projeler: [örnekler]. Gelecek yarışma için birlikte daha güçlü döneriz! 🎨\'', trigger: 'Yaratıcı Reddedilme', impact: 'Normalleştirme', wowScore: 8 },
  { id: 49, category: 'Medya & Yaratıcı', business: 'Sosyal Medya Yönetimi', scenario: 'Ekip üyesi viral bir hata yaptı (yanlış hesaptan paylaşım), internet linç başladı', aiResponse: 'AI acil destek: hata yapana \'Herkesin başına gelir. Şu an odaklan: 1) Paylaşımı sil 2) Özür metni hazır 3) Ekibin arkanda. Bu geçecek 💪\' + ekibe: \'Herkes hata yapar. [İsim]\'e destek olalım, suçlama değil çözüm zamanı\' + yöneticiye: kriz iletişim planı', trigger: 'Viral Kriz / Linç', impact: 'Kriz Dayanışması', wowScore: 10 },
  { id: 50, category: 'Enerji & Teknik', business: 'Elektrik Tesisat', scenario: 'Genç kalfa ilk kez tek başına sahaya gidiyor, çok heyecanlı ve endişeli', aiResponse: 'AI sabah: \'İlk solo görevin! Heyecan normal. Checklist hazır ✅ Ustanın telefonu bir arama uzakta. Sen bunu başarırsın! Görev sonrası foto at, ekip seninle gurur duyacak 💪\' + görev sonrası: \'İlk solo görev tamamlandı! 🎉 Ekip, [isim]\'i tebrik edelim!\'', trigger: 'Kariyer İlkleri', impact: 'Kutlama & Cesaret', wowScore: 9 },
  { id: 51, category: 'Enerji & Teknik', business: 'Tesisat (Su/Doğalgaz)', scenario: 'Müşterinin evinde doğalgaz kaçağı, ekip panikte çünkü ciddi risk', aiResponse: 'AI acil protokol: \'Doğalgaz kaçağı tespit edildi! Protokol: 1) Müşteriyi tahliye et 2) İGDAŞ\'ı ara 3) Bölge güvenliğini sağla. Sakin ol, eğitimin var, bunu biliyorsun. Ekip arkanda\' + olay sonrası: \'Bugün hayat kurtardınız. Soğukkanlılığınız müthişti 🙏\'', trigger: 'Acil Durum Paniği', impact: 'Soğukkanlılık Desteği', wowScore: 9 },
  { id: 52, category: 'Enerji & Teknik', business: 'Güneş Enerjisi (Solar)', scenario: 'Çatıda çalışırken bir teknisyen yükseklik korkusu yaşadı, ekipten gizliyor', aiResponse: 'AI güvenlik anketinde fark eder → özel mesaj: \'Yükseklik endişesi normal ve utanılacak bir şey değil. Güvenlik ekipmanları ve eğitim seçenekleri mevcut. Yöneticinle konuşmak istersen yanındayım\' + genel ekibe: \'Güvenlik endişelerinizi paylaşmak cesaret ister\'', trigger: 'Gizli Korku / Fobi', impact: 'Damgasız Destek', wowScore: 9 },
  { id: 53, category: 'Finans & Sigorta', business: 'Sigorta Acentesi', scenario: 'Büyük bir hasar dosyasında müşteri acenteyi dolandırıcılıkla suçladı, ekip şokta', aiResponse: 'AI: \'Asılsız suçlamalar çok yıpratıcı. Tüm işlemleriniz kayıtlı ve şeffaf. Hukuki danışman önerisi hazır. Ekip olarak birbirimize güveniyoruz. Bu süreci birlikte atlatacağız ⚖️\' + çalışana: \'Bu senin hatan değil. Derin nefes al\'', trigger: 'İtibar Tehdidi', impact: 'Dayanışma', wowScore: 9 },
  { id: 54, category: 'Finans & Sigorta', business: 'Finansal Danışmanlık', scenario: 'Piyasa çakıldı, müşteriler panik halinde arıyor, ekip de endişeli', aiResponse: 'AI ekibe: \'Piyasa düşüşleri döngüseldir. Müşterilerinize sakin ve bilgili bir şekilde yaklaşmanız en büyük değeriniz. İşte kriz iletişim rehberi + müşteri sakinleştirme şablonları. Kendiniz de endişeliyseniz normal — ama profesyonelliğiniz fark yaratacak 🛡️\'', trigger: 'Kriz Bulaşması', impact: 'Duygusal Düzenleme', wowScore: 8 },
  { id: 55, category: 'Perakende', business: 'Mağaza (Giyim/Ayakkabı)', scenario: 'Hırsızlık olayı yaşandı, çalışanlar güvensiz hissediyor', aiResponse: 'AI: \'Bugünkü olay hepinizi etkilemiş olabilir. Güvenliğiniz öncelik. İşte yapılanlar: [güvenlik adımları]. Endişelerinizi paylaşın, birlikte çözüm bulalım. Gerekirse güvenlik eğitimi organize edelim 🔒\'', trigger: 'Güvenlik İhlali', impact: 'Güven Yeniden İnşası', wowScore: 9 },
  { id: 56, category: 'Perakende', business: 'Market / Bakkal', scenario: 'Esnaflar arası dedikodu kültürü, ekip içi güven erozyonu', aiResponse: 'AI haftalık \'şeffaflık anı\' başlatır: \'Bu hafta birbirimize söylemek istediğimiz ama söyleyemediğimiz şeyler var mı? Anonim veya açık — güvenli alan 🤝\' + pozitif dedikodu: \'Bu hafta kimin harika bir müşteri anı oldu?\'', trigger: 'Dedikodu & Güven Erozyonu', impact: 'Şeffaf İletişim', wowScore: 8 },
  { id: 57, category: 'Perakende', business: 'Pet Shop', scenario: 'Mağazadaki bir hayvan hastalandı ve öldü, tüm ekip üzgün', aiResponse: 'AI: \'Bugün [hayvan] kaybettik. Bu üzüntü çok doğal — onlara bakan sizdiniz. Birbirinize destek olun. Diğer hayvanların bakımı için birlikte güçlü kalalım 🕊️ Kendilerine zaman ayırmak isteyenler için esneklik var\'', trigger: 'Hayvan Kaybı', impact: 'Yas Alanı', wowScore: 9 },
  { id: 58, category: 'Danışmanlık', business: 'İş / Yönetim Danışmanlığı', scenario: 'Müşteri firmada workshop sırasında yönetim kavga etti, danışman ekibi arada kaldı', aiResponse: 'AI ekibe: \'Workshop\'ta yoğun bir dinamik yaşandı. Bu tür anlar danışmanlığın parçası. Debrief yapalım: ne oldu, nasıl hissettiniz, ne öğrendik? Profesyonel mesafemizi koruyarak empati göstermek en doğrusu 🎯\'', trigger: 'Profesyonel Sınır İhlali', impact: 'Debrief Kültürü', wowScore: 8 },
  { id: 59, category: 'Danışmanlık', business: 'İK Danışmanlığı', scenario: 'Müşteri firma toplu işten çıkarma planlıyor, İK danışmanı etik ikilem yaşıyor', aiResponse: 'AI: \'Toplu çıkarmalar herkes için zor. Senin rolün süreci mümkün olduğunca insancıl yönetmek. İşte: etik karar çerçevesi + çıkış görüşmesi en iyi uygulamaları + kendine bakım rehberi. Bu ağırlığı tek başına taşıma 🤝\'', trigger: 'Etik İkilem', impact: 'Değer Uyumu', wowScore: 9 },
  { id: 60, category: 'Sanat & Eğlence', business: 'Müzik / Dans Okulu', scenario: 'Konser provalarında öğrenci ağladı çünkü solo parçayı çalamadı, öğretmen de duygusallaştı', aiResponse: 'AI öğretmene: \'Öğrencinin gözyaşları ne kadar istediğini gösteriyor. Küçük bir parçayla başlayıp solo\'ya kadar büyütme planı hazırladım. Konsere daha 2 hafta — yetişir! 🎵\' + öğrenciye: \'Her büyük müzisyen sahne korkusu yaşadı. Sen cesursun!\'', trigger: 'Performans Kaygısı', impact: 'Cesaretlendirme', wowScore: 8 },
  { id: 61, category: 'Sanat & Eğlence', business: 'Etkinlik / Organizasyon', scenario: 'Düğün günü yağmur yağdı, tüm plan bozuldu, gelin ağlıyor, ekip panikle koşturuyor', aiResponse: 'AI: \'Yağmur planı devreye! ☔ Herkes kendi görevine: [isim]→ çadır, [isim]→ dekor taşıma, [isim]→ gelin destek. 15 dk\'da hazırız. Hatırlayın: yağmurlu düğünler en unutulmaz olanlar! 🌈\' + geline: \'En güzel gün yağmurla daha da güzel olacak\'', trigger: 'Plan Krizi', impact: 'Acil Durum Liderliği', wowScore: 10 },
  { id: 62, category: 'Teknik Servis', business: 'Beyaz Eşya / Klima Servisi', scenario: 'Müşteri, teknisyeni hırsızlıkla suçladı (asılsız), teknisyen çok kırıldı', aiResponse: 'AI teknisyene: \'Asılsız suçlama çok yıpratıcı. İş fotoğrafların ve raporların mevcut. Yönetimin bilgilendirildi. Senin dürüstlüğüne güveniyoruz ✊\' + yöneticiye: müşteri ile iletişim rehberi + tüm ekibe: \'İş güvenliği için fotoğraf protokolü hatırlatma\'', trigger: 'Asılsız Suçlama', impact: 'Çalışan Koruması', wowScore: 10 },
  { id: 63, category: 'Teknik Servis', business: 'Asansör Bakım', scenario: 'Teknisyen dar asansör boşluğunda panik atak geçirdi', aiResponse: 'AI acil: \'Nefes al. 4 saniye içe, 4 saniye tut, 4 saniye dışa. Güvendesin. En yakın ekip arkadaşın [isim] aranıyor. Yukarı çık, bu an geçecek 🙏\' + sonrasında: klostrofobi desteği ve görev rotasyonu önerisi', trigger: 'Panik Atak / Fobi', impact: 'Anlık Kriz Desteği', wowScore: 10 },
  { id: 64, category: 'Profesyonel Hizmetler', business: 'Tercüme Bürosu', scenario: 'Mükemmeliyetçi tercüman deadline baskısıyla kalite kaygısı yaşıyor, gece uyuyamıyor', aiResponse: 'AI: \'Son 3 gündür gece mesaj atıyorsun. Uyku > mükemmel tercüme. Deadline\'ı 1 gün uzatma talebi göndermek ister misin? İşte şimdiye kadarki kalite skorun: 9.2/10 — mükemmelsin zaten! 💤\'', trigger: 'Mükemmeliyetçilik', impact: 'Sağlıklı Sınır', wowScore: 9 },
  { id: 65, category: 'Profesyonel Hizmetler', business: 'Güvenlik Şirketi', scenario: 'Gece nöbetinde güvenlik görevlisi yalnızlık ve karanlık korkusu yaşıyor', aiResponse: 'AI gece vardiyasında periyodik check-in: \'Saat 02:00 — her şey yolunda mı? 🌙 Bugünün ilginç bilgisi: [fun fact]. Gündüz ekibinden mesaj var: İyi nöbetler [isim]! ☕ Vardiya sonuna 4 saat kaldı, güçlüsün!\'', trigger: 'Gece Vardiyası Yalnızlığı', impact: 'Bağ & Eşlik', wowScore: 10 },
  { id: 66, category: 'Profesyonel Hizmetler', business: 'Reklam Ajansı', scenario: 'Kreatif direktör herkesin fikrini eziyor, ekip fikir üretmeyi bıraktı', aiResponse: 'AI anonim \'fikir kutusu\' açar → \'Bu hafta 12 anonim fikir geldi! İşte en beğenilenler: [liste]. Oy verin! 💡\' + lider için: \'Ekibin fikir üretimi %40 düştü. Psikolojik güvenlik rehberi: nasıl alan açılır?\'', trigger: 'Yaratıcı Baskı', impact: 'Demokratik İnovasyon', wowScore: 9 },
  { id: 67, category: 'Otomotiv Hizmet', business: 'Oto Yıkama', scenario: 'Yaz sıcağında dışarıda çalışan ekip bitkin, toplumsal olarak küçümsenen meslek algısı', aiResponse: 'AI: \'Bugün 40°C\'de 32 araç yıkadınız. Bu bir başarı! 🏆 Serin mola zamanı: 15 dk gölgede. Müşteri yorumlarından: "Araçları yeni gibi yapıyorsunuz, harikasınız!" — işte değerinizin kanıtı ⭐\'', trigger: 'Meslek Onuru', impact: 'Değer Görünürlüğü', wowScore: 10 },
  { id: 68, category: 'Otomotiv Hizmet', business: 'Lastik / Rot Balans', scenario: 'Sezon değişiminde 14 saat mesai, ekip fiziksel olarak tükenmiş', aiResponse: 'AI: \'Son 3 gündür ortalama 13 saat çalışıyorsunuz. Vücudunuz sizi taşıyor — ona iyi bakın. Yarın 1 saat geç başlama önerisi + sezon sonu ekip masajı/hamam organize etmek ister misiniz? Hak ettiniz! 💆\'', trigger: 'Fiziksel Tükenme', impact: 'Bedensel Bakım', wowScore: 9 },
  { id: 69, category: 'Sağlık', business: 'Diyetisyen', scenario: 'Danışan yeme bozukluğu belirtileri gösteriyor ama diyetisyen nasıl yaklaşacağını bilemiyor', aiResponse: 'AI: \'Hassas bir durum fark ettiniz. İşte yeme bozukluğu farkındalık rehberi ve yönlendirme kaynakları. Danışanınızla konuşmak için önerilen yaklaşımlar. Gerekirse uzman desteği önermeniz en doğrusu. Siz yalnız değilsiniz 🤝\'', trigger: 'Uzmanlık Sınırı', impact: 'Etik Rehberlik', wowScore: 9 },
  { id: 70, category: 'İnsan Kaynakları', business: 'İşe Alım / Headhunting', scenario: 'Red edilen aday çok ağladı görüşmede, recruiter duygusal olarak yıprandı', aiResponse: 'AI recruiter\'a: \'İnsanların hayatlarını etkileyen kararlar vermek duygusal olarak ağır. Bugün zor bir görüşme yaşadın. Kendine 10 dk ayır. İşte perspective: bu adaya doğru yönlendirme yaptın, doğru yere ulaşacak 🙏\'', trigger: 'Empati Yorgunluğu', impact: 'Duygusal Bakım', wowScore: 9 },
];

export const EQ_TRIGGERS: EQTrigger[] = [
  { id: 1, name: 'Kriz & Travma', interventionType: 'Acil Empati + Protokol', avgWowScore: 10.0 },
  { id: 2, name: 'Tükenmişlik (Burnout)', interventionType: 'Erken Uyarı + Mola Önerisi', avgWowScore: 10.0 },
  { id: 3, name: 'Mesleki Travma', interventionType: 'Psikolojik Güvenlik', avgWowScore: 10.0 },
  { id: 4, name: 'Kayıp & Yas', interventionType: 'Empatik Destek + Yas Alanı', avgWowScore: 10.0 },
  { id: 5, name: 'İkincil Travma / Vicarious Trauma', interventionType: 'Öz Bakım Rehberliği', avgWowScore: 10.0 },
  { id: 6, name: 'Psikolojik Güvenlik', interventionType: 'Anonim Geri Bildirim', avgWowScore: 10.0 },
  { id: 7, name: 'Tanınmama / Invisible Labor', interventionType: 'Görünürlük + Takdir', avgWowScore: 10.0 },
  { id: 8, name: 'Remote İzolasyon', interventionType: 'Sosyal Bağ Oluşturma', avgWowScore: 10.0 },
  { id: 9, name: 'İş-Yaşam Dengesi', interventionType: 'Aile Dahil Etme', avgWowScore: 10.0 },
  { id: 10, name: 'Online Saldırı / Cyberbullying', interventionType: 'Duygusal Kalkan', avgWowScore: 10.0 },
  { id: 11, name: 'Kolektif Korku', interventionType: 'Güvenlik Duygusu', avgWowScore: 10.0 },
  { id: 12, name: 'Uzun Ayrılık / Yalnızlık', interventionType: 'Bağ Koruma', avgWowScore: 10.0 },
  { id: 13, name: 'Doğal Afet / Kayıp', interventionType: 'Kolektif Toparlanma', avgWowScore: 10.0 },
  { id: 14, name: 'Taciz / İstismar', interventionType: 'Güvenli Alan Protokolü', avgWowScore: 10.0 },
  { id: 15, name: 'Meslek Saygınlığı', interventionType: 'Görünürlük & Takdir', avgWowScore: 10.0 },
  { id: 16, name: 'Viral Kriz / Linç', interventionType: 'Kriz Dayanışması', avgWowScore: 10.0 },
  { id: 17, name: 'Plan Krizi', interventionType: 'Acil Durum Liderliği', avgWowScore: 10.0 },
  { id: 18, name: 'Asılsız Suçlama', interventionType: 'Çalışan Koruması', avgWowScore: 10.0 },
  { id: 19, name: 'Panik Atak / Fobi', interventionType: 'Anlık Kriz Desteği', avgWowScore: 10.0 },
  { id: 20, name: 'Gece Vardiyası Yalnızlığı', interventionType: 'Bağ & Eşlik', avgWowScore: 10.0 },
  { id: 21, name: 'Meslek Onuru', interventionType: 'Değer Görünürlüğü', avgWowScore: 10.0 },
  { id: 22, name: 'Kültürel/Dini Hassasiyet', interventionType: 'Kapsayıcı İletişim', avgWowScore: 9.0 },
  { id: 23, name: 'Profesyonel Hayal Kırıklığı', interventionType: 'Perspektif + Mentorluk', avgWowScore: 9.0 },
  { id: 24, name: 'Aşırı Çalışma', interventionType: 'Refah Yönetimi', avgWowScore: 9.0 },
  { id: 25, name: 'Duygusal Emek', interventionType: 'Bireysel Destek + Sınır Koyma', avgWowScore: 9.0 },
  { id: 26, name: 'Profesyonel Utanç', interventionType: 'Dayanışma Mobilizasyonu', avgWowScore: 9.0 },
  { id: 27, name: 'Departman Çatışması', interventionType: 'Empati Köprüsü', avgWowScore: 9.0 },
  { id: 28, name: 'Başarısızlık Hissi', interventionType: 'Veri Bazlı Moral', avgWowScore: 9.0 },
  { id: 29, name: 'Kültürel Dışlanma', interventionType: 'Kapsayıcılık Aktiviteleri', avgWowScore: 9.0 },
  { id: 30, name: 'Yaşam Değişikliği', interventionType: 'Uyum Desteği', avgWowScore: 9.0 },
  { id: 31, name: 'Yoğunluk Stresi', interventionType: 'Çatışma Çözümü', avgWowScore: 9.0 },
  { id: 32, name: 'Vardiya İzolasyonu', interventionType: 'Ekip Birliği', avgWowScore: 9.0 },
  { id: 33, name: 'Son Dakika Krizi', interventionType: 'Sakinleştirme + Yeniden Planlama', avgWowScore: 9.0 },
  { id: 34, name: 'Otoriter Liderlik', interventionType: 'İletişim Eğitimi', avgWowScore: 9.0 },
  { id: 35, name: 'Profesyonel Kayıp', interventionType: 'Normalleştirme', avgWowScore: 9.0 },
  { id: 36, name: 'Ayrılık & Geçiş', interventionType: 'Miras Oluşturma', avgWowScore: 9.0 },
  { id: 37, name: 'Emek Değersizleşmesi', interventionType: 'Gurur Koruma', avgWowScore: 9.0 },
  { id: 38, name: 'Teknoloji Kaygısı', interventionType: 'Güçlendirme', avgWowScore: 9.0 },
  { id: 39, name: 'Ebeveynlik Suçluluğu', interventionType: 'Aile Entegrasyonu', avgWowScore: 9.0 },
  { id: 40, name: 'Müşteri Şiddeti', interventionType: 'Çalışan Koruması', avgWowScore: 9.0 },
  { id: 41, name: 'İş Güvencesi Kaygısı', interventionType: 'Güçlendirme', avgWowScore: 9.0 },
  { id: 42, name: 'Tatil Fedakarlığı', interventionType: 'Tanıma & Telafi', avgWowScore: 9.0 },
  { id: 43, name: 'Kariyer Durağanlığı', interventionType: 'Anlam Bulma', avgWowScore: 9.0 },
  { id: 44, name: 'Beklenmedik Şiddet/Kriz', interventionType: 'Travma Desteği', avgWowScore: 9.0 },
  { id: 45, name: 'Kariyer İlkleri', interventionType: 'Kutlama & Cesaret', avgWowScore: 9.0 },
  { id: 46, name: 'Acil Durum Paniği', interventionType: 'Soğukkanlılık Desteği', avgWowScore: 9.0 },
  { id: 47, name: 'Gizli Korku / Fobi', interventionType: 'Damgasız Destek', avgWowScore: 9.0 },
  { id: 48, name: 'İtibar Tehdidi', interventionType: 'Dayanışma', avgWowScore: 9.0 },
  { id: 49, name: 'Güvenlik İhlali', interventionType: 'Güven Yeniden İnşası', avgWowScore: 9.0 },
  { id: 50, name: 'Hayvan Kaybı', interventionType: 'Yas Alanı', avgWowScore: 9.0 },
  { id: 51, name: 'Etik İkilem', interventionType: 'Değer Uyumu', avgWowScore: 9.0 },
  { id: 52, name: 'Mükemmeliyetçilik', interventionType: 'Sağlıklı Sınır', avgWowScore: 9.0 },
  { id: 53, name: 'Yaratıcı Baskı', interventionType: 'Demokratik İnovasyon', avgWowScore: 9.0 },
  { id: 54, name: 'Fiziksel Tükenme', interventionType: 'Bedensel Bakım', avgWowScore: 9.0 },
  { id: 55, name: 'Uzmanlık Sınırı', interventionType: 'Etik Rehberlik', avgWowScore: 9.0 },
  { id: 56, name: 'Empati Yorgunluğu', interventionType: 'Duygusal Bakım', avgWowScore: 9.0 },
  { id: 57, name: 'Fiziksel Refah', interventionType: 'Sağlık Koruma', avgWowScore: 8.0 },
  { id: 58, name: 'Olumsuz Geri Bildirim', interventionType: 'Veri ile Perspektif', avgWowScore: 8.0 },
  { id: 59, name: 'Kuşak Çatışması', interventionType: 'Mentorluk Köprüsü', avgWowScore: 8.0 },
  { id: 60, name: 'Yıkıcı Rekabet', interventionType: 'İşbirliği Teşviki', avgWowScore: 8.0 },
  { id: 61, name: 'Bilgi Yoğunluğu Stresi', interventionType: 'Kolektif Öğrenme', avgWowScore: 8.0 },
  { id: 62, name: 'Uzun Süreli Efor Kaybı', interventionType: 'Hızlı Toparlanma', avgWowScore: 8.0 },
  { id: 63, name: 'Rating Baskısı', interventionType: 'Öz Değer Koruma', avgWowScore: 8.0 },
  { id: 64, name: 'Aile İşletmesi Gerilimleri', interventionType: 'Profesyonel Sınır', avgWowScore: 8.0 },
  { id: 65, name: 'Hiyerarşi Duvarı', interventionType: 'İnsanlaştırma', avgWowScore: 8.0 },
  { id: 66, name: 'Yaratıcı Reddedilme', interventionType: 'Normalleştirme', avgWowScore: 8.0 },
  { id: 67, name: 'Kriz Bulaşması', interventionType: 'Duygusal Düzenleme', avgWowScore: 8.0 },
  { id: 68, name: 'Dedikodu & Güven Erozyonu', interventionType: 'Şeffaf İletişim', avgWowScore: 8.0 },
  { id: 69, name: 'Profesyonel Sınır İhlali', interventionType: 'Debrief Kültürü', avgWowScore: 8.0 },
  { id: 70, name: 'Performans Kaygısı', interventionType: 'Cesaretlendirme', avgWowScore: 8.0 },
];

export const EQ_FEATURES: EQFeature[] = [
  { id: 1, module: '🎭 Duygu Algılama', feature: 'Ton Analizi', description: 'Ekip mesajlarındaki duygu tonunu gerçek zamanlı analiz eder (üzgün, kızgın, endişeli, mutlu, nötr)', wowScore: 10, phase: 'Faz 1' },
  { id: 2, module: '🎭 Duygu Algılama', feature: 'Emoji & Kelime Haritası', description: 'Emoji kullanımı, mesaj uzunluğu değişimi ve kelime seçiminden duygu durumu çıkarır', wowScore: 8, phase: 'Faz 1' },
  { id: 3, module: '🎭 Duygu Algılama', feature: 'Sessizlik Dedektörü', description: 'Normalde aktif olan kişinin sessizleşmesini fark eder ve nazikçe check-in yapar', wowScore: 10, phase: 'Faz 1' },
  { id: 4, module: '🎭 Duygu Algılama', feature: 'Gerilim Radarı', description: 'İki kişi/departman arası mesaj tonundaki olumsuz değişimi tespit eder', wowScore: 9, phase: 'Faz 2' },
  { id: 5, module: '💬 Empatik Müdahale', feature: 'Kriz Desteği', description: 'Ani olumsuz olay (kaza, kayıp, şikayet) sonrası otomatik destek mesajları ve protokol önerisi', wowScore: 10, phase: 'Faz 1' },
  { id: 6, module: '💬 Empatik Müdahale', feature: 'Kutlama Motoru', description: 'Doğum günü, iş yıldönümü, ilk başarı gibi anları tespit eder ve ekipçe kutlama önerir', wowScore: 9, phase: 'Faz 1' },
  { id: 7, module: '💬 Empatik Müdahale', feature: 'Tükenmişlik Erken Uyarı', description: 'Mesai saatleri, mesaj tonu, mola sıklığı gibi verilerden tükenmişlik riskini tespit eder', wowScore: 10, phase: 'Faz 2' },
  { id: 8, module: '💬 Empatik Müdahale', feature: 'Çatışma Çözücü', description: 'Gerginlik tespit edildiğinde tarafsız arabulucu rolü üstlenir, yapıcı diyalog önerir', wowScore: 9, phase: 'Faz 2' },
  { id: 9, module: '💬 Empatik Müdahale', feature: 'Kültürel Takvim', description: 'Dini ve kültürel günleri bilerek ekip içi uyum etkinlikleri önerir', wowScore: 8, phase: 'Faz 1' },
  { id: 10, module: '🤝 Bağ Kurma', feature: 'Sanal Kahve Eşleştirme', description: 'Rastgele 2 ekip üyesini 15 dk sohbet için eşleştirir, önerilen konu verir', wowScore: 9, phase: 'Faz 1' },
  { id: 11, module: '🤝 Bağ Kurma', feature: 'Ekip Tanışma Kartları', description: 'Her üye hobileri, hayalleri, komik anılarını paylaşır, ortak ilgi alanları öne çıkar', wowScore: 8, phase: 'Faz 1' },
  { id: 12, module: '🤝 Bağ Kurma', feature: 'Vardiya Köprüsü', description: 'Farklı vardiyalardaki ekipler arasında mesaj, emoji ve meydan okuma ile bağ kurar', wowScore: 9, phase: 'Faz 2' },
  { id: 13, module: '🤝 Bağ Kurma', feature: 'Mentor Eşleştirme', description: 'Deneyimli ve yeni çalışanları otomatik eşleştirir, ilerleme takibi yapar', wowScore: 9, phase: 'Faz 2' },
  { id: 14, module: '🤝 Bağ Kurma', feature: 'Aile/Yakınlar Katılım', description: 'Yoğun dönemlerde ailelere teşekkür kartı, ekip başarılarını paylaşma', wowScore: 8, phase: 'Faz 3' },
  { id: 15, module: '📊 Nabız & Ölçüm', feature: 'Günlük Mood Check-in', description: 'Sabah 1 emoji ile nasıl hissediyorsun anketi, trend takibi', wowScore: 9, phase: 'Faz 1' },
  { id: 16, module: '📊 Nabız & Ölçüm', feature: 'Anonim Duygu Anketi', description: 'Haftalık anonim ekip duygu durumu anketi, sonuçlar görselleştirilir', wowScore: 10, phase: 'Faz 1' },
  { id: 17, module: '📊 Nabız & Ölçüm', feature: 'Psikolojik Güvenlik Skoru', description: 'Ekibin fikir paylaşma, hata kabulü, destek isteme davranışlarından puan üretir', wowScore: 9, phase: 'Faz 2' },
  { id: 18, module: '📊 Nabız & Ölçüm', feature: 'Takdir İstatistikleri', description: 'Kim kimi ne kadar takdir ediyor, görünmeyen emek analizi', wowScore: 8, phase: 'Faz 2' },
  { id: 19, module: '📊 Nabız & Ölçüm', feature: 'Refah Dashboard', description: 'Ekip geneli: enerji, moral, stres, bağlılık grafikleri', wowScore: 10, phase: 'Faz 2' },
  { id: 20, module: '🛡️ Güvenli Alan', feature: 'Anonim Fikir Kutusu', description: 'İsim vermeden fikir, şikayet, öneri paylaşma alanı', wowScore: 10, phase: 'Faz 1' },
  { id: 21, module: '🛡️ Güvenli Alan', feature: 'Hassas Konu Rehberi', description: 'Taciz, ayrımcılık, zorbalık durumlarında ne yapılmalı rehberi + gizli bildirim', wowScore: 10, phase: 'Faz 1' },
  { id: 22, module: '🛡️ Güvenli Alan', feature: 'Gece Vardiyası Eşlikçisi', description: 'Gece yalnız çalışanlarla periyodik check-in, motivasyon mesajları', wowScore: 9, phase: 'Faz 2' },
  { id: 23, module: '🛡️ Güvenli Alan', feature: 'Debrief Kolaylaştırıcı', description: 'Zor bir olay sonrası yapılandırılmış debrief oturumu şablonu + rehberlik', wowScore: 9, phase: 'Faz 2' },
  { id: 24, module: '🌟 Anlam & Amaç', feature: 'Görünmeyen Emek Spotlighter', description: 'Mesai dışı çalışma, ekstra efor gibi görünmeyen katkıları yöneticiye ve ekibe bildirir', wowScore: 10, phase: 'Faz 2' },
  { id: 25, module: '🌟 Anlam & Amaç', feature: 'Etki Hikayesi', description: 'Aylık olarak ekibin toplam etkisini hikayeleştirir: kaç müşteriye ulaştınız, ne başardınız', wowScore: 9, phase: 'Faz 2' },
  { id: 26, module: '🌟 Anlam & Amaç', feature: 'Meslek Onur Kartları', description: 'Toplumda az takdir edilen mesleklere özel motivasyon içerikleri', wowScore: 10, phase: 'Faz 1' },
  { id: 27, module: '🌟 Anlam & Amaç', feature: 'Kariyer Milestone', description: 'İlk solo görev, 100. müşteri, 1 yıl gibi kilometre taşlarını kutlar', wowScore: 9, phase: 'Faz 1' },
];

export function getEQScenariosForCategory(category: string): EQScenario[] {
  const lower = category.toLowerCase();
  return EQ_SCENARIOS.filter(s =>
    s.category.toLowerCase().includes(lower) ||
    s.business.toLowerCase().includes(lower)
  );
}

export type EmotionalTone = 'distress' | 'burnout' | 'conflict' | 'celebration' | 'loneliness' | 'frustration' | 'neutral';

const DISTRESS_KEYWORDS = ['kaza', 'ölüm', 'yaralı', 'yangın', 'panik', 'kriz', 'acil', 'yardım', 'kötü', 'berbat', 'mahvoldu', 'berbattı'];
const BURNOUT_KEYWORDS = ['yorgunum', 'tükendim', 'artık yapamıyorum', 'bitik', 'dayanamıyorum', 'bırakmak istiyorum', 'bıktım', 'çok fazla', 'sürekli mesai'];
const CONFLICT_KEYWORDS = ['kavga', 'tartışma', 'anlaşamıyoruz', 'sinirli', 'kızdı', 'gerginlik', 'sorun var', 'problem', 'şikayet'];
const CELEBRATION_KEYWORDS = ['harika', 'tebrikler', 'başardık', 'muhteşem', 'süper', 'bravo', 'kutlu olsun', 'doğum günü', 'yıldönümü'];
const LONELINESS_KEYWORDS = ['yalnız', 'kimse yok', 'sessiz', 'izole', 'görmüyoruz', 'uzaktan', 'kimse anlamıyor'];
const FRUSTRATION_KEYWORDS = ['tekrar', 'yine', 'bir türlü', 'olmadı', 'revizyon', 'değişiklik', 'iptal', 'gecikti', 'ertelendi'];

export function detectEmotionalTone(text: string): EmotionalTone {
  const lower = text.toLowerCase();
  if (DISTRESS_KEYWORDS.some(k => lower.includes(k))) return 'distress';
  if (BURNOUT_KEYWORDS.some(k => lower.includes(k))) return 'burnout';
  if (CONFLICT_KEYWORDS.some(k => lower.includes(k))) return 'conflict';
  if (CELEBRATION_KEYWORDS.some(k => lower.includes(k))) return 'celebration';
  if (LONELINESS_KEYWORDS.some(k => lower.includes(k))) return 'loneliness';
  if (FRUSTRATION_KEYWORDS.some(k => lower.includes(k))) return 'frustration';
  return 'neutral';
}

export function buildEQSystemContext(industryCategory?: string): string {
  const scenarios = industryCategory
    ? getEQScenariosForCategory(industryCategory).slice(0, 5)
    : EQ_SCENARIOS.slice(0, 10);

  return `DUYGUSAL ZEKA (EQ) PROTOKOLÜ:
Sen sadece görev yönetimi değil, ekip refahını da önemseyen bir asistansın.
Mesajlardaki duygu tonunu algıla ve aşağıdaki kurallara göre yanıt ver:

1. DISTRESS/KRİZ: Olumsuz olay, kaza, kayıp tespit edilirse — önce empati, sonra pratik destek
2. TÜKENMIŞLIK: Yorgunluk, bırakma isteği tespit edilirse — mola öner, yükü hafiflet
3. ÇATIŞMA: Gerginlik, tartışma tespit edilirse — tarafsız arabulucu ol
4. KUTLAMA: Başarı, doğum günü, yıldönümü — ekiple birlikte kutla
5. YALNIZLIK: Sessizlik, izolasyon — bağ kur, check-in yap

ALTIN KURAL: Her zaman ÖNCE insan, SONRA görev.
Birisi zor bir an yaşıyorsa, yapılacaklar listesi bekleyebilir.

SEKTÖRE ÖZEL SENARYOLAR:
${scenarios.map(s => `- ${s.trigger}: ${s.aiResponse.slice(0, 100)}`).join('\n')}`;
}

export const MILESTONE_THRESHOLDS = [
  { count: 1, message: 'İlk görevinizi tamamladınız! 🎉 Harika bir başlangıç!', emoji: '🌱' },
  { count: 5, message: '5 görev tamamlandı! Ritminizi buldunuz. 💪', emoji: '⭐' },
  { count: 10, message: '10 görev! Artık bir uzman gibi çalışıyorsunuz. 🔥', emoji: '🔥' },
  { count: 25, message: '25 görev! İnanılmaz bir performans! 🏆', emoji: '🏆' },
  { count: 50, message: '50 görev tamamlandı! Siz bir süperstarsınız! ⚡', emoji: '⚡' },
  { count: 100, message: '100 görev! Efsane seviyesine ulaştınız! 👑', emoji: '👑' },
  { count: 250, message: '250 görev! Bu sayede kaç ekip arkadaşına destek oldunuz! 🌟', emoji: '🌟' },
  { count: 500, message: '500 görev! VOXI tarihine geçtiniz! 🚀', emoji: '🚀' },
];

export function checkMilestone(completedCount: number): typeof MILESTONE_THRESHOLDS[number] | null {
  return MILESTONE_THRESHOLDS.find(m => m.count === completedCount) || null;
}

export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export const MOOD_OPTIONS: { level: MoodLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: '😢', label: 'Çok kötü' },
  { level: 2, emoji: '😟', label: 'Kötü' },
  { level: 3, emoji: '😐', label: 'Fena değil' },
  { level: 4, emoji: '🙂', label: 'İyi' },
  { level: 5, emoji: '😊', label: 'Harika' },
];

export function getMoodResponse(level: MoodLevel): string {
  const responses: Record<MoodLevel, string> = {
    1: 'Bugün zor görünüyor. Söylemek istediğin bir şey var mı? Dinliyorum. 💙',
    2: 'Zorlu bir gün gibi. Ekibinle paylaşmak ister misin, yoksa sessizce devam mı? 🤝',
    3: 'Orta halli bir gün. Sana yardımcı olabileceğim bir şey var mı?',
    4: 'İyi hissediyorsun, harika! Bugün ne yapacaksın? 🚀',
    5: 'Muhteşem! Bu enerji bulaşıcı 🌟 Ekibinle paylaş!',
  };
  return responses[level];
}