import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../lib/colors';
import { getSelectedIndustry } from '../../lib/industryStore';
import { Industry } from '../../lib/industries';
import IndustryPicker from '../../components/IndustryPicker';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, membership, signOut } = useAuth();
  const [showIndustryPicker, setShowIndustryPicker] = useState(false);
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);

  useEffect(() => {
    getSelectedIndustry().then(setSelectedIndustry);
  }, []);

  const initials = profile?.full_name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  const handleSignOut = () => {
    Alert.alert('Çıkış Yap', 'Çıkmak istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
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
          <Text style={styles.profileName}>{profile?.full_name || 'Kullanıcı'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          {membership?.workspaces && (
            <Text style={styles.profileWorkspace}>{(membership.workspaces as any).name}</Text>
          )}
        </View>

        {/* Industry Selection - Prominent */}
        <TouchableOpacity
          style={styles.industryCard}
          onPress={() => setShowIndustryPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.industryLeft}>
            <Text style={styles.industryIcon}>🏢</Text>
            <View>
              <Text style={styles.industryLabel}>Sektör</Text>
              <Text style={styles.industryValue}>
                {selectedIndustry ? selectedIndustry.name : 'Seçilmedi — dokunun'}
              </Text>
              {selectedIndustry && (
                <Text style={styles.industryCategory}>{selectedIndustry.category}</Text>
              )}
            </View>
          </View>
          <Text style={styles.industryArrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap</Text>
          <SettingItem label="Profil Düzenle" onPress={() => Alert.alert('Profil Düzenle', 'Bu özellik yakında gelecek.')} />
          <SettingItem label="Bildirim Tercihleri" onPress={() => Alert.alert('Bildirim Tercihleri', 'Bu özellik yakında gelecek.')} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VOXI AI</Text>
          <SettingItem
            label="Sektör Şablonları"
            value={selectedIndustry ? `${selectedIndustry.templates.length} şablon` : 'Sektör seçin'}
          />
          <SettingItem
            label="Hızlı Aksiyonlar"
            value={selectedIndustry ? `${selectedIndustry.quickActions.length} aksiyon` : 'Sektör seçin'}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yardım</Text>
          <SettingItem label="Gizlilik Politikası" onPress={() => Linking.openURL('https://voxi.com.tr/privacy')} />
          <SettingItem label="Kullanım Koşulları" onPress={() => Linking.openURL('https://voxi.com.tr/terms')} />
          <SettingItem label="Versiyon" value="1.0.0" />
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>

      <IndustryPicker
        visible={showIndustryPicker}
        onClose={() => setShowIndustryPicker(false)}
        onSelect={(industry) => setSelectedIndustry(industry)}
      />
    </View>
  );
}

function SettingItem({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
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
  industryCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: colors.border,
  },
  industryLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  industryIcon: { fontSize: 32 },
  industryLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase' },
  industryValue: { fontSize: 16, fontWeight: '600', color: colors.dark, marginTop: 2 },
  industryCategory: { fontSize: 12, color: colors.muted, marginTop: 2 },
  industryArrow: { fontSize: 18, color: colors.muted },
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
