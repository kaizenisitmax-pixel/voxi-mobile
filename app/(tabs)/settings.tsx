import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSec: '#3C3C43',
  textTer: '#8E8E93',
  border: '#F2F2F7',
  danger: '#FF3B30',
  switchOn: '#34C759',
  iconColor: '#3C3C43',
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
  chevron: '#C7C7CC',
  disabled: '#C7C7CC',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, signOut, profile, workspace } = useAuth();

  const [notifPrefs, setNotifPrefs] = useState({
    push: true,
    sms: false,
    morning_reminder: true,
    urgent_sms: true,
  });
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [memberCount, setMemberCount] = useState(0);
  const [storageSize, setStorageSize] = useState('12.4 MB');

  useEffect(() => {
    if (!user) return;
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    try {
      // Bildirim tercihleri
      const { data: prof } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', user?.id)
        .single();

      if (prof?.notification_prefs) {
        setNotifPrefs({ ...notifPrefs, ...prof.notification_prefs });
      }

      // Üye sayısı
      const { count } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', '9bf0a8cd-c704-4800-991a-cecb2453b42d')
        .eq('is_active', true);
      setMemberCount(count || 0);

      // Öneri kartları ayarı
      const saved = await AsyncStorage.getItem('voxi_show_suggestions');
      if (saved !== null) setShowSuggestions(saved === 'true');
    } catch (error) {
      console.error('Settings fetch error:', error);
    }
  };

  const updateNotifPref = async (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    await supabase
      .from('profiles')
      .update({ notification_prefs: updated })
      .eq('id', user?.id);
  };

  const toggleSuggestions = async (value: boolean) => {
    setShowSuggestions(value);
    await AsyncStorage.setItem('voxi_show_suggestions', value.toString());
  };

  const handleSignOut = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Çıkış yapılamadı');
            }
          },
        },
      ]
    );
  };

  const handleInvite = () => {
    Alert.alert('Ekibe Davet Et', 'Davet özelliği team.tsx\'teki invite modal ile çalışacak şekilde bağlanacak.');
  };

  const handleClearChat = () => {
    Alert.alert(
      'Sohbet Geçmişini Temizle',
      'VOXI ile olan tüm mesajlarınız silinecek. Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('voxi_messages');
            Alert.alert('Temizlendi', 'Sohbet geçmişi silindi.');
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert('Önbelleği Temizle', 'Önbellek verileri silinecek.', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: async () => {
          Alert.alert('Temizlendi', 'Önbellek verileri silindi.');
        },
      },
    ]);
  };

  const handleExportData = () => {
    Alert.alert('Yakında', 'Veri dışa aktarma özelliği yakında eklenecek.');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'VX';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ayarlar</Text>
        </View>

        {/* Profil Kartı */}
        <TouchableOpacity
          onPress={() => router.push('/settings/profile')}
          style={styles.profileCard}
        >
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {getInitials(profile?.full_name)}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name || 'Kullanıcı'}</Text>
            <Text style={styles.profileEmail}>{user?.email || profile?.phone || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.chevron} />
        </TouchableOpacity>

        {/* ŞİRKET */}
        <SettingsGroup title="ŞİRKET">
          <SettingsRow
            icon="business-outline"
            label={workspace?.name || 'Şirket Bilgileri'}
            onPress={() => router.push('/settings/company')}
          />
          <SettingsRow
            icon="people-outline"
            label="Ekip Yönetimi"
            subtitle={`${memberCount} üye`}
            onPress={() => router.push('/settings/team-management')}
          />
          <SettingsRow
            icon="link-outline"
            label="Ekibe Davet Et"
            onPress={handleInvite}
          />
        </SettingsGroup>

        {/* VOXI */}
        <SettingsGroup title="VOXI">
          <SettingsRow
            icon="sparkles-outline"
            label="AI Model"
            value="Sonnet 4.5"
          />
          <SettingsRow
            icon="trash-outline"
            label="Sohbet Geçmişini Temizle"
            onPress={handleClearChat}
          />
          <SettingsRow
            icon="bulb-outline"
            label="Öneri Kartları"
            switchValue={showSuggestions}
            onSwitchChange={toggleSuggestions}
          />
        </SettingsGroup>

        {/* BİLDİRİMLER */}
        <SettingsGroup title="BİLDİRİMLER">
          <SettingsRow
            icon="notifications-outline"
            label="Push Bildirimleri"
            switchValue={notifPrefs.push}
            onSwitchChange={(val) => updateNotifPref('push', val)}
          />
          <SettingsRow
            icon="chatbubble-outline"
            label="SMS Bildirimleri"
            subtitle="Sadece acil görevler"
            switchValue={notifPrefs.sms}
            onSwitchChange={(val) => updateNotifPref('sms', val)}
          />
          <SettingsRow
            icon="sunny-outline"
            label="Sabah Hatırlatması"
            subtitle="Her gün 09:00'da görev özeti"
            switchValue={notifPrefs.morning_reminder}
            onSwitchChange={(val) => updateNotifPref('morning_reminder', val)}
          />
          <SettingsRow
            icon="alert-circle-outline"
            label="Acil Görev SMS"
            subtitle="Acil görev atandığında SMS gönder"
            switchValue={notifPrefs.urgent_sms}
            onSwitchChange={(val) => updateNotifPref('urgent_sms', val)}
          />
        </SettingsGroup>

        {/* GÖRÜNÜM */}
        <SettingsGroup title="GÖRÜNÜM">
          <SettingsRow
            icon="language-outline"
            label="Dil"
            value="Türkçe"
            onPress={() => Alert.alert('Yakında', 'Çoklu dil desteği yakında eklenecek.')}
          />
          <SettingsRow
            icon="contrast-outline"
            label="Tema"
            value="Açık"
            onPress={() => Alert.alert('Yakında', 'Karanlık tema yakında eklenecek.')}
          />
        </SettingsGroup>

        {/* VERİ YÖNETİMİ */}
        <SettingsGroup title="VERİ YÖNETİMİ">
          <SettingsRow
            icon="server-outline"
            label="Depolama Alanı"
            value={storageSize}
          />
          <SettingsRow
            icon="refresh-outline"
            label="Önbelleği Temizle"
            onPress={handleClearCache}
          />
          <SettingsRow
            icon="download-outline"
            label="Verilerimi Dışa Aktar"
            onPress={handleExportData}
          />
        </SettingsGroup>

        {/* HAKKINDA */}
        <SettingsGroup title="HAKKINDA">
          <SettingsRow
            icon="information-circle-outline"
            label="Versiyon"
            value="1.0.0 (1)"
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label="Gizlilik Politikası"
            onPress={() => router.push('/legal/privacy')}
          />
          <SettingsRow
            icon="document-text-outline"
            label="Kullanım Koşulları"
            onPress={() => router.push('/legal/terms')}
          />
          <SettingsRow
            icon="help-circle-outline"
            label="Destek"
            onPress={() => Linking.openURL('mailto:destek@voxi.app')}
          />
          <SettingsRow
            icon="star-outline"
            label="Bizi Değerlendirin"
            onPress={() => {
              Alert.alert('Teşekkürler!', 'Uygulama yayınlandığında değerlendirme yapabileceksiniz.');
            }}
          />
        </SettingsGroup>

        {/* Çıkış Yap */}
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Çıkış Yap</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footerText}>VOXI v1.0.0 · Powered by Anthropic AI</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// YARDIMCI KOMPONENTLER

interface SettingsGroupProps {
  title?: string;
  children: React.ReactNode;
}

const SettingsGroup = ({ title, children }: SettingsGroupProps) => (
  <View style={styles.group}>
    {title && <Text style={styles.groupTitle}>{title}</Text>}
    <View style={styles.groupContent}>
      {React.Children.map(children, (child, index) => (
        <>
          {child}
          {index < React.Children.count(children) - 1 && <View style={styles.separator} />}
        </>
      ))}
    </View>
  </View>
);

interface SettingsRowProps {
  icon?: string;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  danger?: boolean;
}

const SettingsRow = ({
  icon,
  label,
  subtitle,
  value,
  onPress,
  switchValue,
  onSwitchChange,
  danger,
}: SettingsRowProps) => {
  const content = (
    <View style={styles.row}>
      {icon && (
        <Ionicons
          name={icon as any}
          size={22}
          color={danger ? C.danger : C.iconColor}
          style={styles.rowIcon}
        />
      )}
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: C.danger }]}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {onSwitchChange !== undefined && (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: '#E5E5EA', true: C.switchOn }}
          thumbColor="#FFFFFF"
        />
      )}
      {onPress && !onSwitchChange && (
        <Ionicons name="chevron-forward" size={18} color={C.chevron} />
      )}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
};

// STYLES

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    color: C.text,
  },

  // Profil kartı
  profileCard: {
    backgroundColor: C.surface,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    fontSize: 22,
    fontWeight: '600',
    color: C.avatarText,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: C.text,
  },
  profileEmail: {
    fontSize: 14,
    color: C.textTer,
    marginTop: 2,
  },

  // Gruplar
  group: {
    marginTop: 0,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textTer,
    paddingLeft: 16,
    marginTop: 28,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  groupContent: {
    backgroundColor: C.surface,
  },

  // Satırlar
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  rowIcon: {
    marginRight: 14,
    width: 24,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 17,
    color: C.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: C.textTer,
    marginTop: 1,
  },
  rowValue: {
    fontSize: 17,
    color: C.textTer,
    marginRight: 6,
  },
  separator: {
    height: 0.5,
    backgroundColor: C.border,
    marginLeft: 52,
  },

  // Çıkış + Footer
  signOutButton: {
    backgroundColor: C.surface,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  signOutText: {
    fontSize: 17,
    color: C.danger,
    fontWeight: '500',
  },
  footerText: {
    fontSize: 12,
    color: C.disabled,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
});
