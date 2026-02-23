import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';

export default function ProfileSetup() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) return;
    setLoading(true);

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user!.id, full_name: fullName.trim(), phone: phone.trim() || null });

    setLoading(false);

    if (error) {
      Alert.alert('Hata', error.message);
    } else {
      await refreshProfile();
      router.replace('/(onboarding)/workspace');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <Text style={styles.step}>1 / 2</Text>
        <Text style={styles.title}>Profilinizi Olusturun</Text>
        <Text style={styles.subtitle}>Ekip arkadaslariniz sizi tanisin.</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Ad Soyad *</Text>
          <TextInput
            style={styles.input}
            placeholder="Volkan Simsirkaya"
            placeholderTextColor={colors.muted}
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Telefon (opsiyonel)</Text>
          <TextInput
            style={styles.input}
            placeholder="0532 111 22 33"
            placeholderTextColor={colors.muted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, (!fullName.trim() || loading) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!fullName.trim() || loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Kaydediliyor...' : 'Devam Et'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  step: { fontSize: 14, color: colors.muted, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: colors.dark, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.text, marginBottom: 32 },
  form: { gap: 16, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    height: 52, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 16, fontSize: 16, color: colors.dark,
  },
  button: {
    height: 52, backgroundColor: colors.dark, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: colors.disabled },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
