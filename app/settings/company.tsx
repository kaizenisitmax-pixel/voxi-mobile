import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
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
  buttonBg: '#1A1A1A',
  buttonText: '#FFFFFF',
  chevron: '#C7C7CC',
};

export default function CompanyScreen() {
  const router = useRouter();
  const { user, workspace: authWorkspace, signOut } = useAuth();
  const [workspace, setWorkspace] = useState<any>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [maxMembers, setMaxMembers] = useState(3);
  const [userRole, setUserRole] = useState<string>('member');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (authWorkspace) {
      setWorkspace(authWorkspace);
    }
    fetchWorkspace();
  }, [authWorkspace]);

  const fetchWorkspace = async () => {
    if (!user) return;

    try {
      // Kullanıcının rolünü öğren
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role, workspace_id, workspaces:workspace_id (id, name, slug, sector, phone, email, address, tax_number, plan, max_members, owner_id)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (membership) {
        setUserRole(membership.role);
        if (membership.workspaces) {
          const ws = membership.workspaces as any;
          setWorkspace(ws);
          setMaxMembers(ws.max_members || 3);
          setIsOwner(ws.owner_id === user.id);
        }
      }

      // Üye sayısı
      const { count } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', membership?.workspace_id)
        .eq('is_active', true);
      setMemberCount(count || 0);
    } catch (error) {
      console.error('Workspace fetch error:', error);
    }
  };

  const updateField = (field: string, label: string, currentValue: string) => {
    if (!isOwner && userRole !== 'admin') {
      Alert.alert('Yetki Yok', 'Sadece workspace sahibi veya yönetici şirket bilgilerini düzenleyebilir.');
      return;
    }

    if (Platform.OS !== 'ios') {
      Alert.alert('Yakında', 'Android için düzenleme ekranı eklenecek.');
      return;
    }

    Alert.prompt(label, `Yeni ${label.toLowerCase()} girin`, async (text) => {
      if (text?.trim()) {
        await supabase
          .from('workspaces')
          .update({ [field]: text.trim() })
          .eq('id', workspace.id);
        fetchWorkspace();
        Alert.alert('Güncellendi', `${label} güncellendi.`);
      }
    }, 'plain-text', currentValue || '');
  };

  const upgradePlan = () => {
    Alert.alert('Yakında', 'Ödeme sistemi yakında aktif olacak.');
  };

  const leaveWorkspace = () => {
    if (isOwner) {
      return; // Owner'lar ayrılamaz
    }

    Alert.alert(
      'Şirketten Ayrıl',
      'Bu workspace\'ten ayrılacaksınız. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ayrıl',
          style: 'destructive',
          onPress: async () => {
            await supabase
              .from('workspace_members')
              .update({ is_active: false })
              .eq('workspace_id', workspace.id)
              .eq('user_id', user?.id);
            
            // Çıkış yap ve welcome'a yönlendir
            await signOut();
          },
        },
      ]
    );
  };

  const getPlanName = (plan?: string) => {
    switch (plan) {
      case 'free':
        return 'Ücretsiz';
      case 'pro':
        return 'Pro';
      case 'enterprise':
        return 'Kurumsal';
      default:
        return 'Ücretsiz';
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Şirket Bilgileri',
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Şirket Bilgileri */}
          <View style={styles.group}>
            <View style={styles.groupContent}>
              <SettingsRow
                label="Şirket Adı"
                value={workspace?.name || 'Belirtilmedi'}
                onPress={() => updateField('name', 'Şirket Adı', workspace?.name || '')}
                disabled={!isOwner && userRole !== 'admin'}
              />
              <View style={styles.separator} />
              <SettingsRow
                label="Sektör"
                value={workspace?.sector || 'Belirtilmedi'}
                onPress={() => updateField('sector', 'Sektör', workspace?.sector || '')}
                disabled={!isOwner && userRole !== 'admin'}
              />
              <View style={styles.separator} />
              <SettingsRow
                label="Vergi No"
                value={workspace?.tax_number || '—'}
                onPress={() => updateField('tax_number', 'Vergi No', workspace?.tax_number || '')}
                disabled={!isOwner && userRole !== 'admin'}
              />
              <View style={styles.separator} />
              <SettingsRow
                label="Telefon"
                value={workspace?.phone || '—'}
                onPress={() => updateField('phone', 'Telefon', workspace?.phone || '')}
                disabled={!isOwner && userRole !== 'admin'}
              />
              <View style={styles.separator} />
              <SettingsRow
                label="E-posta"
                value={workspace?.email || '—'}
                onPress={() => updateField('email', 'E-posta', workspace?.email || '')}
                disabled={!isOwner && userRole !== 'admin'}
              />
              <View style={styles.separator} />
              <SettingsRow
                label="Adres"
                value={workspace?.address || '—'}
                onPress={() => updateField('address', 'Adres', workspace?.address || '')}
                disabled={!isOwner && userRole !== 'admin'}
              />
            </View>
          </View>

          {/* Plan */}
          <View style={styles.group}>
            <Text style={styles.groupTitle}>PLAN</Text>
            <View style={styles.groupContent}>
              <View style={styles.planContainer}>
                <View style={styles.planRow}>
                  <Text style={styles.planLabel}>Mevcut Plan</Text>
                  <Text style={styles.planValue}>{getPlanName(workspace?.plan)}</Text>
                </View>
                <View style={styles.planRow}>
                  <Text style={styles.planLabel}>Üye Limiti</Text>
                  <Text style={styles.planValue}>
                    {memberCount} / {maxMembers} kişi
                  </Text>
                </View>
                <View style={styles.planRow}>
                  <Text style={styles.planLabel}>VOXI Mesaj</Text>
                  <Text style={styles.planValue}>Sınırsız</Text>
                </View>

                {workspace?.plan !== 'pro' && (
                  <TouchableOpacity style={styles.upgradeButton} onPress={upgradePlan}>
                    <Text style={styles.upgradeButtonText}>Pro'ya Yükselt — ₺299/ay</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Şirketten Ayrıl */}
          {!isOwner && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>ŞİRKETTEN AYRIL</Text>
              <View style={styles.groupContent}>
                <TouchableOpacity onPress={leaveWorkspace}>
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, { color: C.danger }]}>Şirketten Ayrıl</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

interface SettingsRowProps {
  label: string;
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
}

const SettingsRow = ({ label, value, onPress, disabled }: SettingsRowProps) => {
  const content = (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, disabled && { color: C.textTer }]}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
      {onPress && !disabled && <Ionicons name="chevron-forward" size={18} color={C.chevron} />}
    </View>
  );

  if (onPress && !disabled) {
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

  // Plan
  planContainer: {
    padding: 16,
  },
  planRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  planLabel: {
    fontSize: 17,
    color: C.textSec,
  },
  planValue: {
    fontSize: 17,
    fontWeight: '500',
    color: C.text,
  },
  upgradeButton: {
    backgroundColor: C.buttonBg,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 16,
  },
  upgradeButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: C.buttonText,
  },
});
