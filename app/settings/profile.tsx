import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
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
  iconColor: '#3C3C43',
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
  chevron: '#C7C7CC',
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile: authProfile } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [hasPassword, setHasPassword] = useState(false);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
    }
    // OTP ile giriş yapılmışsa şifre yok
    checkAuthMethod();
  }, [authProfile]);

  const checkAuthMethod = async () => {
    // Basit kontrol: user.app_metadata veya user_metadata'dan anlaşılabilir
    // Şimdilik email varsa şifre var diyoruz
    setHasPassword(!!user?.email);
  };

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data);
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      // Şimdilik URI'yi profile'a kaydet
      // İleride Supabase Storage'a yükle
      await supabase
        .from('profiles')
        .update({ avatar_url: result.assets[0].uri })
        .eq('id', user?.id);
      fetchProfile();
      Alert.alert('Güncellendi', 'Profil fotoğrafınız güncellendi.');
    }
  };

  const updateField = (field: string, label: string, currentValue: string) => {
    if (Platform.OS === 'ios') {
      Alert.prompt(label, `Yeni ${label.toLowerCase()} girin`, async (text) => {
        if (text?.trim()) {
          await supabase
            .from('profiles')
            .update({ [field]: text.trim() })
            .eq('id', user?.id);
          fetchProfile();
          Alert.alert('Güncellendi', `${label} güncellendi.`);
        }
      }, 'plain-text', currentValue || '');
    } else {
      // Android için basit input alert
      Alert.alert(
        label,
        `Yeni ${label.toLowerCase()} girin`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Kaydet',
            onPress: async () => {
              // Android'de text input alamıyoruz, bu yüzden sheet göstermek gerekir
              Alert.alert('Yakında', 'Android için düzenleme ekranı eklenecek.');
            },
          },
        ]
      );
    }
  };

  const changeEmail = () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Yakında', 'Android için e-posta değiştirme ekranı eklenecek.');
      return;
    }
    Alert.prompt('E-posta Değiştir', 'Yeni e-posta adresinizi girin', async (text) => {
      if (text?.trim()) {
        const { error } = await supabase.auth.updateUser({ email: text.trim() });
        if (error) {
          Alert.alert('Hata', error.message);
        } else {
          Alert.alert('Doğrulama Gerekli', 'Yeni e-posta adresinize doğrulama kodu gönderildi.');
        }
      }
    }, 'plain-text', user?.email || '');
  };

  const changePassword = () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Yakında', 'Android için şifre değiştirme ekranı eklenecek.');
      return;
    }
    Alert.prompt('Şifre Değiştir', 'Yeni şifrenizi girin (min. 6 karakter)', async (text) => {
      if (text && text.length >= 6) {
        const { error } = await supabase.auth.updateUser({ password: text });
        if (error) {
          Alert.alert('Hata', error.message);
        } else {
          Alert.alert('Güncellendi', 'Şifreniz başarıyla değiştirildi.');
        }
      } else {
        Alert.alert('Hata', 'Şifre en az 6 karakter olmalı.');
      }
    }, 'secure-text');
  };

  const deleteAccount = () => {
    Alert.alert(
      'Hesabımı Sil',
      'Hesabınız ve tüm verileriniz kalıcı olarak silinecek. Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Hesabımı Sil',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Destek', 'Hesap silme işlemi için destek@voxi.app adresine yazın.');
          },
        },
      ]
    );
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
    <>
      <Stack.Screen
        options={{
          title: 'Profil',
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials(profile?.full_name)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar}>
              <Text style={styles.changePhotoText}>Fotoğraf Değiştir</Text>
            </TouchableOpacity>
          </View>

          {/* Bilgiler */}
          <View style={styles.group}>
            <View style={styles.groupContent}>
              <SettingsRow
                label="Ad Soyad"
                value={profile?.full_name || 'Belirtilmedi'}
                onPress={() => updateField('full_name', 'Ad Soyad', profile?.full_name || '')}
              />
              <View style={styles.separator} />
              <SettingsRow label="E-posta" value={user?.email || 'Belirtilmedi'} />
              <View style={styles.separator} />
              <SettingsRow
                label="Telefon"
                value={profile?.phone || 'Belirtilmedi'}
                onPress={() => updateField('phone', 'Telefon', profile?.phone || '')}
              />
            </View>
          </View>

          {/* Hesap */}
          <View style={styles.group}>
            <Text style={styles.groupTitle}>HESAP</Text>
            <View style={styles.groupContent}>
              <SettingsRow label="E-posta Değiştir" onPress={changeEmail} />
              {hasPassword && (
                <>
                  <View style={styles.separator} />
                  <SettingsRow label="Şifre Değiştir" onPress={changePassword} />
                </>
              )}
            </View>
          </View>

          {/* Tehlikeli Bölge */}
          <View style={styles.group}>
            <Text style={styles.groupTitle}>TEHLİKELİ BÖLGE</Text>
            <View style={styles.groupContent}>
              <SettingsRow label="Hesabımı Sil" danger onPress={deleteAccount} />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

const SettingsRow = ({ label, value, onPress, danger }: SettingsRowProps) => {
  const content = (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, danger && { color: C.danger }]}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {onPress && <Ionicons name="chevron-forward" size={18} color={C.chevron} />}
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress}>{content}</TouchableOpacity>;
  }
  return content;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: C.avatarText,
  },
  changePhotoText: {
    fontSize: 14,
    color: C.text,
    fontWeight: '500',
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
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  rowLabel: {
    fontSize: 17,
    color: C.text,
  },
  rowValue: {
    fontSize: 17,
    color: C.textTer,
    marginRight: 6,
    flex: 1,
    textAlign: 'right',
  },
  separator: {
    height: 0.5,
    backgroundColor: C.border,
    marginLeft: 16,
  },
});
