import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../lib/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, membership, signOut } = useAuth();

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const handleSignOut = () => {
    Alert.alert('Cikis Yap', 'Cikmak istediginizden emin misiniz?', [
      { text: 'Iptal', style: 'cancel' },
      { text: 'Cikis Yap', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ayarlar</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{profile?.full_name || 'Kullanici'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {membership?.workspaces && (
            <Text style={styles.profileWorkspace}>{(membership.workspaces as any).name}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap</Text>
          <SettingItem label="Profil Duzenle" />
          <SettingItem label="Bildirim Tercihleri" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yardim</Text>
          <SettingItem label="Gizlilik Politikasi" />
          <SettingItem label="Kullanim Kosullari" />
          <SettingItem label="Versiyon" value="1.0.0" />
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Cikis Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SettingItem({ label, value }: { label: string; value?: string }) {
  return (
    <TouchableOpacity style={styles.settingItem}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.settingValue}>{value || '→'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backText: { fontSize: 16, color: colors.dark, fontWeight: '500' },
  title: { fontSize: 18, fontWeight: '700', color: colors.dark },
  content: { padding: 20, gap: 24 },
  profileCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  profileAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  profileInitials: { fontSize: 24, fontWeight: '700', color: colors.text },
  profileName: { fontSize: 20, fontWeight: '700', color: colors.dark },
  profileEmail: { fontSize: 14, color: colors.muted, marginTop: 4 },
  profileWorkspace: { fontSize: 14, color: colors.text, marginTop: 8, fontWeight: '500' },
  section: { gap: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  settingLabel: { fontSize: 16, color: colors.dark },
  settingValue: { fontSize: 14, color: colors.muted },
  signOutBtn: {
    backgroundColor: colors.card, borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: colors.danger,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: colors.danger },
});
