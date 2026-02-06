import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export default function WelcomeScreen() {
  const router = useRouter();
  const { signInWithOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'email' | 'phone'>('email');

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi girin');
      return;
    }

    setLoading(true);
    try {
      await signInWithOtp(email.toLowerCase().trim());
      router.push({
        pathname: '/(auth)/verify',
        params: { email: email.toLowerCase().trim() },
      });
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneLogin = async () => {
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Hata', 'Geçerli bir telefon numarası girin.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phone: phone.replace(/\s/g, '') },
      });
      if (error) throw error;
      if (data?.success) {
        router.push({ pathname: '/(auth)/phone-verify', params: { phone: phone.replace(/\s/g, '') } });
      } else {
        Alert.alert('Hata', data?.error || 'SMS gönderilemedi. Tekrar deneyin.');
      }
    } catch (error) {
      console.error('OTP gönderme hatası:', error);
      Alert.alert('Hata', 'Bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo ve Başlık */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="sparkles" size={40} color="#1A1A1A" />
            </View>
            <Text style={styles.title}>VOXI</Text>
            <Text style={styles.subtitle}>İş ekibiniz için AI asistan</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'email' ? (
              <>
                <Text style={styles.label}>E-posta Adresi</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ornek@sirket.com"
                  placeholderTextColor="#C7C7CC"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handleContinue}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>E-posta ile Giriş Yap</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Telefon Numarası</Text>
                <TextInput
                  style={styles.input}
                  placeholder="05XX XXX XX XX"
                  placeholderTextColor="#C7C7CC"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!loading}
                />

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={handlePhoneLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.buttonText}>Doğrulama Kodu Gönder</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E5EA' }} />
              <Text style={{ marginHorizontal: 16, fontSize: 13, color: '#8E8E93' }}>veya</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: '#E5E5EA' }} />
            </View>

            {/* Mode Switch Button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#E5E5EA',
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                paddingVertical: 14,
              }}
              onPress={() => setMode(mode === 'email' ? 'phone' : 'email')}
              disabled={loading}
            >
              <Ionicons name={mode === 'email' ? 'call-outline' : 'mail-outline'} size={20} color="#3C3C43" />
              <Text style={{ fontSize: 17, color: '#1A1A1A' }}>
                {mode === 'email' ? 'Telefon ile Giriş Yap' : 'E-posta ile Giriş Yap'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Giriş yaparak{' '}
              <Text style={styles.footerLink}>kullanım koşullarını</Text>{' '}
              kabul edersiniz
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 100,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F0EDE8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#212121',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  footerLink: {
    color: '#1A1A1A',
    fontWeight: '600',
  },
});
