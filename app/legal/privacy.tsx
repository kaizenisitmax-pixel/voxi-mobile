import { ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

export default function PrivacyPolicyScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Gizlilik Politikası',
          headerStyle: { backgroundColor: '#F5F3EF' },
          headerTintColor: '#1A1A1A',
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Gizlilik Politikası</Text>
          <Text style={styles.date}>Son güncelleme: 4 Şubat 2026</Text>

          <Text style={styles.heading}>1. Toplanan Veriler</Text>
          <Text style={styles.body}>
            VOXI uygulaması aşağıdaki verileri toplar:{'\n\n'}
            • Hesap bilgileri: ad, soyad, e-posta adresi, telefon numarası{'\n'}
            • Şirket bilgileri: şirket adı, sektör, vergi numarası{'\n'}
            • Görev verileri: oluşturulan görevler, müşteri kartları, paydaş bilgileri{'\n'}
            • Cihaz bilgileri: cihaz türü, işletim sistemi, push notification token{'\n'}
            • Kullanım verileri: uygulama açılış sıklığı, özellik kullanımı
          </Text>

          <Text style={styles.heading}>2. Verilerin Kullanımı</Text>
          <Text style={styles.body}>
            Toplanan veriler yalnızca aşağıdaki amaçlarla kullanılır:{'\n\n'}
            • Uygulama hizmetlerinin sunulması ve iyileştirilmesi{'\n'}
            • Görev yönetimi ve ekip iletişimi sağlanması{'\n'}
            • AI asistan (VOXI) hizmetinin çalıştırılması{'\n'}
            • Bildirim gönderimi (push notification ve SMS){'\n'}
            • Teknik destek sağlanması
          </Text>

          <Text style={styles.heading}>3. AI Veri İşleme</Text>
          <Text style={styles.body}>
            VOXI AI asistanı, Anthropic Claude API kullanmaktadır. AI ile paylaşılan mesajlar,
            görev bağlamı ve müşteri bilgileri yalnızca anlık işleme için Anthropic sunucularına
            gönderilir. Anthropic, API üzerinden gönderilen verileri model eğitimi için kullanmaz.
          </Text>

          <Text style={styles.heading}>4. Veri Saklama</Text>
          <Text style={styles.body}>
            Verileriniz Supabase altyapısı üzerinde şifrelenmiş olarak saklanır.
            Supabase, AWS altyapısını kullanır ve veritabanı seviyesinde Row Level Security (RLS)
            ile korunur. Yalnızca yetkili kullanıcılar kendi verilerine erişebilir.
          </Text>

          <Text style={styles.heading}>5. Üçüncü Taraf Hizmetler</Text>
          <Text style={styles.body}>
            • Supabase: Veritabanı ve kimlik doğrulama{'\n'}
            • Anthropic: AI asistan hizmeti{'\n'}
            • Expo: Push notification altyapısı{'\n'}
            • Netgsm: SMS gönderim hizmeti (yalnızca Türkiye){'\n'}
            • Sentry: Hata takibi ve performans izleme
          </Text>

          <Text style={styles.heading}>6. Veri Silme</Text>
          <Text style={styles.body}>
            Hesabınızı ve tüm verilerinizi silmek için Ayarlar {'>'} Profil {'>'} Hesabımı Sil
            seçeneğini kullanabilir veya destek@voxi.app adresine yazabilirsiniz. Silme talebi
            30 gün içinde işleme alınır.
          </Text>

          <Text style={styles.heading}>7. İletişim</Text>
          <Text style={styles.body}>
            Gizlilik ile ilgili sorularınız için:{'\n'}
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
