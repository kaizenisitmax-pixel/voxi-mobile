import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(d => d !== '') && index === 5) {
      verifyCode(newOtp.join(''));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const verifyCode = async (code: string) => {
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email!,
      token: code,
      type: 'email',
    });
    setVerifying(false);

    if (error) {
      Alert.alert('Hata', 'Kod gecersiz veya suresi dolmus.');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    const { error } = await supabase.auth.signInWithOtp({
      email: email!,
      options: { shouldCreateUser: true },
    });
    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      setCooldown(60);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.icon}>📧</Text>
          <Text style={styles.title}>Dogrulama Kodu</Text>
          <Text style={styles.subtitle}>
            <Text style={styles.emailText}>{email}</Text> adresine 6 haneli kod gonderdik.
          </Text>
        </View>

        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={el => { inputRefs.current[i] = el; }}
              style={[styles.otpInput, digit ? styles.otpFilled : null]}
              value={digit}
              onChangeText={v => handleChange(i, v)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              editable={!verifying}
              selectTextOnFocus
            />
          ))}
        </View>

        {verifying && <Text style={styles.verifyingText}>Dogrulaniyor...</Text>}

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Kod gelmedi mi?</Text>
          <TouchableOpacity onPress={handleResend} disabled={cooldown > 0}>
            <Text style={[styles.resendBtn, cooldown > 0 && styles.resendDisabled]}>
              {cooldown > 0 ? `Tekrar gonder (${cooldown}s)` : 'Tekrar gonder'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  backBtn: { position: 'absolute', top: 16, left: 0 },
  backText: { fontSize: 16, color: colors.dark, fontWeight: '500' },
  header: { alignItems: 'center', marginBottom: 32 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.dark, marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.text, textAlign: 'center', lineHeight: 20 },
  emailText: { fontWeight: '600' },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  otpInput: {
    width: 48, height: 56, borderRadius: 12, borderWidth: 2,
    borderColor: colors.borderLight, backgroundColor: colors.card,
    textAlign: 'center', fontSize: 24, fontWeight: '700', color: colors.dark,
  },
  otpFilled: { borderColor: colors.dark },
  verifyingText: { textAlign: 'center', fontSize: 14, color: colors.muted, marginBottom: 16 },
  resendRow: { alignItems: 'center', gap: 8 },
  resendLabel: { fontSize: 14, color: colors.muted },
  resendBtn: { fontSize: 14, fontWeight: '600', color: colors.dark },
  resendDisabled: { color: colors.muted },
});
