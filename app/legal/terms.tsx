import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function TermsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Kullanım Koşulları',
          headerStyle: { backgroundColor: '#F5F3EF' },
          headerTintColor: '#1A1A1A',
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Kullanım Koşulları</Text>
          <Text style={styles.date}>Son güncelleme: 4 Şubat 2026</Text>

          <Text style={styles.heading}>1. Hizmet Kapsamı</Text>
          <Text style={styles.body}>
            VOXI, küçük ve orta ölçekli işletmeler için AI destekli ekip yönetimi, görev takibi ve
            müşteri ilişkileri yönetimi uygulamasıdır. Hizmet, mobil uygulama üzerinden sunulmaktadır.
          </Text>

          <Text style={styles.heading}>2. Hesap Sorumluluğu</Text>
          <Text style={styles.body}>
            Kullanıcı, hesap bilgilerinin gizliliğinden ve güvenliğinden sorumludur.
            Hesabınızda gerçekleşen tüm faaliyetlerden siz sorumlusunuz. Şüpheli bir
            aktivite fark ederseniz derhal destek@voxi.app adresine bildiriniz.
          </Text>

          <Text style={styles.heading}>3. Kabul Edilebilir Kullanım</Text>
          <Text style={styles.body}>
            VOXI hizmeti yalnızca yasal amaçlarla kullanılabilir. Aşağıdaki kullanımlar yasaktır:{'\n\n'}
            • Yasa dışı faaliyetler için kullanım{'\n'}
            • Kötü amaçlı yazılım, spam veya zararlı içerik paylaşımı{'\n'}
            • Başkalarının gizlilik haklarını ihlal etme{'\n'}
            • Sistemi manipüle etme veya çökertme girişimleri
          </Text>

          <Text style={styles.heading}>4. AI Kullanımı</Text>
          <Text style={styles.body}>
            VOXI AI asistanı, görev yönetimi ve iş akışı optimizasyonu için tasarlanmıştır.
            AI tarafından verilen tavsiyeler bilgi amaçlıdır ve kesin doğruluk garanti edilmez.
            Kritik iş kararlarında mutlaka insan onayı alınmalıdır.
          </Text>

          <Text style={styles.heading}>5. Ücretlendirme ve Planlar</Text>
          <Text style={styles.body}>
            • Ücretsiz Plan: 3 kişiye kadar, temel özellikler{'\n'}
            • Pro Plan: Aylık ₺299, 10 kişiye kadar, gelişmiş özellikler{'\n'}
            • Business Plan: Özel fiyatlandırma, sınırsız kullanıcı{'\n\n'}
            Ücretler aylık olarak tahsil edilir. İstediğiniz zaman iptal edebilirsiniz.
          </Text>

          <Text style={styles.heading}>6. Hizmet Değişiklikleri</Text>
          <Text style={styles.body}>
            VOXI, hizmeti geliştirmek ve iyileştirmek amacıyla önceden bildirimde bulunarak
            değişiklik yapma hakkını saklı tutar. Önemli değişiklikler e-posta veya
            uygulama içi bildirimle duyurulacaktır.
          </Text>

          <Text style={styles.heading}>7. Sorumluluk Sınırı</Text>
          <Text style={styles.body}>
            VOXI, hizmetin kesintisiz ve hatasız çalışacağını garanti etmez. Dolaylı,
            arızi veya sonuç olarak ortaya çıkan zararlardan sorumlu değildir. Maksimum
            sorumluluk, son 12 ayda ödenen ücret tutarı ile sınırlıdır.
          </Text>

          <Text style={styles.heading}>8. İptal ve İade</Text>
          <Text style={styles.body}>
            Aylık planlar istediğiniz zaman iptal edilebilir. İptal sonrasında mevcut
            faturalandırma döneminin sonuna kadar hizmete erişiminiz devam eder.
            İade, yalnızca teknik sorunlar nedeniyle hizmet kullanılamaz durumda ise
            uygulanır.
          </Text>

          <Text style={styles.heading}>9. Uygulanacak Hukuk</Text>
          <Text style={styles.body}>
            Bu koşullar Türkiye Cumhuriyeti yasalarına tabidir. Uyuşmazlıklar
            İstanbul mahkemelerinde çözülecektir.
          </Text>

          <Text style={styles.heading}>10. İletişim</Text>
          <Text style={styles.body}>
            Sorularınız için:{'\n'}
            E-posta: destek@voxi.app{'\n'}
            Web: voxi.app
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  date: { fontSize: 13, color: '#8E8E93', marginBottom: 28 },
  heading: { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginTop: 24, marginBottom: 8 },
  body: { fontSize: 15, color: '#3C3C43', lineHeight: 22 },
});
