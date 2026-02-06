import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function PhoneVerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputs = useRef<TextInput[]>([]);

  // Geri sayım
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // OTP input — otomatik sonraki kutucuğa geç
  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputs.current[index + 1]?.focus();
    }

    // 6 hane tamamlandıysa otomatik doğrula
    if (index === 5 && text) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        verifyCode(fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (fullCode: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phone, code: fullCode },
      });

      if (error) throw error;

      if (data?.success) {
        // Session varsa AuthContext otomatik yakalar
        // Yeni kullanıcıysa onboarding'e yönlendir
        if (data?.is_new_user) {
          router.replace('/(onboarding)/profile');
        } else {
          // Auth state listener yönlendirecek (onboarded kullanıcı için)
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Hatalı Kod', data?.error || 'Doğrulama kodu yanlış. Tekrar deneyin.');
        setCode(['', '', '', '', '', '']);
        inputs.current[0]?.focus();
      }
    } catch (error) {
      console.error('OTP doğrulama hatası:', error);
      Alert.alert('Hata', 'Doğrulama başarısız. Tekrar deneyin.');
      setCode(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (countdown > 0) return;
    try {
      const { data } = await supabase.functions.invoke('send-otp', {
        body: { phone },
      });
      if (data?.success) {
        setCountdown(60);
        Alert.alert('Gönderildi', 'Yeni doğrulama kodu gönderildi.');
      } else {
        Alert.alert('Hata', data?.error || 'SMS gönderilemedi.');
      }
    } catch (error) {
      Alert.alert('Hata', 'SMS gönderilemedi.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Doğrulama Kodu</Text>
          <Text style={styles.subtitle}>
            {phone} numarasına gönderilen 6 haneli kodu girin
          </Text>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => { if (ref) inputs.current[index] = ref; }}
                style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
              />
            ))}
          </View>

          {loading && <ActivityIndicator color="#1A1A1A" style={{ marginBottom: 16 }} />}

          <TouchableOpacity
            onPress={resendCode}
            disabled={countdown > 0 || loading}
            style={styles.resendButton}
          >
            <Text style={[styles.resendText, (countdown > 0 || loading) && styles.resendDisabled]}>
              {countdown > 0 ? `Tekrar gönder (${countdown}s)` : 'Kodu tekrar gönder'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginTop: 24 }}
          >
            <Text style={{ fontSize: 15, color: '#8E8E93', textAlign: 'center' }}>← Geri</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#8E8E93', textAlign: 'center', marginBottom: 40 },
  codeContainer: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  codeInput: {
    width: 48, height: 56, borderRadius: 12, borderWidth: 1.5,
    borderColor: '#E5E5EA', backgroundColor: '#FFFFFF',
    textAlign: 'center', fontSize: 24, fontWeight: '600', color: '#1A1A1A',
  },
  codeInputFilled: { borderColor: '#1A1A1A' },
  resendButton: { marginTop: 16, padding: 12 },
  resendText: { fontSize: 15, color: '#1A1A1A', fontWeight: '500', textAlign: 'center' },
  resendDisabled: { color: '#C7C7CC' },
});
