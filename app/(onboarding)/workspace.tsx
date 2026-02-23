import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';

export default function WorkspaceSetup() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [companyName, setCompanyName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!companyName.trim()) return;
    setLoading(true);

    const { data, error } = await supabase.rpc('create_workspace_with_team', {
      p_workspace_name: companyName.trim(),
      p_team_name: teamName.trim() || 'Genel',
    });

    if (error) {
      Alert.alert('Hata', error.message);
      setLoading(false);
      return;
    }

    await refreshProfile();
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setLoading(true);

    const { data, error } = await supabase.rpc('join_workspace_with_code', {
      p_invite_code: inviteCode.trim(),
    });

    if (error) {
      Alert.alert('Hata', error.message === 'Invalid or expired invite code'
        ? 'Gecersiz veya suresi dolmus davet kodu.'
        : error.message);
      setLoading(false);
      return;
    }

    await refreshProfile();
    setLoading(false);
  };

  if (mode === 'choose') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.step}>2 / 2</Text>
          <Text style={styles.title}>Calisma Alaniniz</Text>
          <Text style={styles.subtitle}>Yeni bir firma olusturun veya mevcut bir ekibe katillin.</Text>

          <View style={styles.options}>
            <TouchableOpacity style={styles.optionCard} onPress={() => setMode('create')}>
              <Text style={styles.optionIcon}>🏢</Text>
              <Text style={styles.optionTitle}>Yeni Firma Olustur</Text>
              <Text style={styles.optionDesc}>Ekibinizi sifirdan kurun</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionCard} onPress={() => setMode('join')}>
              <Text style={styles.optionIcon}>🤝</Text>
              <Text style={styles.optionTitle}>Ekibe Katil</Text>
              <Text style={styles.optionDesc}>Davet kodu ile katillin</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => setMode('choose')}>
          <Text style={styles.back}>← Geri</Text>
        </TouchableOpacity>

        <Text style={styles.title}>
          {mode === 'create' ? 'Firma Olustur' : 'Ekibe Katil'}
        </Text>

        <View style={styles.form}>
          {mode === 'create' ? (
            <>
              <Text style={styles.label}>Firma Adi *</Text>
              <TextInput
                style={styles.input}
                placeholder="Isitmax A.S."
                placeholderTextColor={colors.muted}
                value={companyName}
                onChangeText={setCompanyName}
              />
              <Text style={styles.label}>Ekip Adi (opsiyonel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Satis Ekibi"
                placeholderTextColor={colors.muted}
                value={teamName}
                onChangeText={setTeamName}
              />
            </>
          ) : (
            <>
              <Text style={styles.label}>Davet Kodu *</Text>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="VX4K8M"
                placeholderTextColor={colors.muted}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                maxLength={6}
              />
            </>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={mode === 'create' ? handleCreate : handleJoin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Isleniyor...' : mode === 'create' ? 'Olustur' : 'Katil'}
          </Text>
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
  back: { fontSize: 16, color: colors.dark, fontWeight: '500', marginBottom: 24 },
  options: { gap: 16 },
  optionCard: {
    backgroundColor: colors.card, borderRadius: 16,
    padding: 24, borderWidth: 1, borderColor: colors.border,
  },
  optionIcon: { fontSize: 32, marginBottom: 12 },
  optionTitle: { fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  optionDesc: { fontSize: 14, color: colors.muted },
  form: { gap: 16, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    height: 52, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 16, fontSize: 16, color: colors.dark,
  },
  codeInput: { fontSize: 24, fontWeight: '700', textAlign: 'center', letterSpacing: 8 },
  button: {
    height: 52, backgroundColor: colors.dark, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  buttonDisabled: { backgroundColor: colors.disabled },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
