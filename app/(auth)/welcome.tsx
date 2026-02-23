import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';

export default function WelcomeScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      router.push({ pathname: '/(auth)/verify', params: { email: email.trim() } });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inner}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>VOXI</Text>
          <Text style={styles.subtitle}>Konusarak is yonet</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>E-posta adresiniz</Text>
          <TextInput
            style={styles.input}
            placeholder="ornek@firma.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, (!email.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSendOtp}
            disabled={!email.trim() || loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Gonderiliyor...' : 'Giris Kodu Gonder'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          Giris yaparak kullanim kosullarini kabul edersiniz.
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  header: { alignItems: 'center', marginBottom: 48 },
  logo: { fontSize: 42, fontWeight: '800', color: colors.dark, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: 8 },
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 4 },
  input: {
    height: 52, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 16, fontSize: 16, color: colors.dark,
  },
  button: {
    height: 52, backgroundColor: colors.dark, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  buttonDisabled: { backgroundColor: colors.disabled },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  footer: { textAlign: 'center', fontSize: 12, color: colors.muted, marginTop: 32 },
});
