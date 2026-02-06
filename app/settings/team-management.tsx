import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
  badgeOwner: '#1A1A1A',
  badgeAdmin: '#1A1A1A',
  badgeManager: '#F5F3EF',
  badgeMember: '#F2F2F7',
  chevron: '#C7C7CC',
};

interface Member {
  id: string;
  user_id: string;
  role: string;
  profile: {
    full_name: string;
    phone?: string;
    avatar_url?: string;
  };
}

interface Invitation {
  id: string;
  code: string;
  phone?: string;
  email?: string;
  expires_at: string;
  created_at: string;
}

export default function TeamManagementScreen() {
  const router = useRouter();
  const { user, workspace } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [userRole, setUserRole] = useState<string>('member');
  const [isOwner, setIsOwner] = useState(false);
  const [teamName, setTeamName] = useState('PROMAX');

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    if (!user) return;

    try {
      // Kullanıcının rolünü öğren
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role, workspace_id, team_id, teams:team_id (name)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      if (membership) {
        setUserRole(membership.role);
        const ws: any = workspace;
        setIsOwner(ws?.owner_id === user.id);
        if (membership.teams) {
          const t: any = membership.teams;
          setTeamName(t.name?.toUpperCase() || 'PROMAX');
        }

        // Üye listesi
        const { data: memberList } = await supabase
          .from('workspace_members')
          .select('id, user_id, role, profiles:user_id (full_name, phone, avatar_url)')
          .eq('workspace_id', membership.workspace_id)
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (memberList) {
          setMembers(
            memberList.map((m: any) => ({
              id: m.id,
              user_id: m.user_id,
              role: m.role,
              profile: m.profiles || { full_name: 'Bilinmeyen' },
            }))
          );
        }

        // Bekleyen davetler
        const { data: inviteList } = await supabase
          .from('invitations')
          .select('*')
          .eq('workspace_id', membership.workspace_id)
          .eq('status', 'pending')
          .gte('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        if (inviteList) {
          setInvitations(inviteList);
        }
      }
    } catch (error) {
      console.error('Team data fetch error:', error);
    }
  };

  const updateRole = async (memberId: string, newRole: string) => {
    await supabase
      .from('workspace_members')
      .update({ role: newRole })
      .eq('id', memberId);
    fetchData();
    Alert.alert('Güncellendi', 'Üye rolü güncellendi.');
  };

  const removeMember = async (memberId: string, memberName: string) => {
    Alert.alert('Üyeyi Çıkar', `${memberName} ekipten çıkarılsın mı?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkar',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('workspace_members')
            .update({ is_active: false })
            .eq('id', memberId);
          fetchData();
          Alert.alert('Çıkarıldı', `${memberName} ekipten çıkarıldı.`);
        },
      },
    ]);
  };

  const handleMemberPress = (member: Member) => {
    // Owner ise tıklanmaz
    if (member.user_id === workspace?.owner_id) return;

    // Sadece owner ve admin düzenleyebilir
    if (!isOwner && userRole !== 'admin') {
      return;
    }

    Alert.alert(member.profile.full_name, 'Ne yapmak istiyorsunuz?', [
      {
        text: 'Yönetici Yap',
        onPress: () => updateRole(member.id, 'admin'),
      },
      {
        text: 'Müdür Yap',
        onPress: () => updateRole(member.id, 'manager'),
      },
      {
        text: 'Üye Yap',
        onPress: () => updateRole(member.id, 'member'),
      },
      {
        text: 'Ekipten Çıkar',
        style: 'destructive',
        onPress: () => removeMember(member.id, member.profile.full_name),
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const cancelInvitation = async (inviteId: string) => {
    Alert.alert('Daveti İptal Et', 'Bu davet iptal edilsin mi?', [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'İptal Et',
        style: 'destructive',
        onPress: async () => {
          await supabase
            .from('invitations')
            .update({ status: 'cancelled' })
            .eq('id', inviteId);
          fetchData();
        },
      },
    ]);
  };

  const inviteNewMember = () => {
    Alert.alert('Ekibe Davet Et', 'Davet özelliği team.tsx\'teki modal ile entegre edilecek.');
  };

  const getRoleBadge = (role: string, ownerId?: string, userId?: string) => {
    const isOwnerUser = ownerId === userId;

    if (isOwnerUser) {
      return { bg: C.badgeOwner, text: C.buttonText, label: 'Sahip' };
    }

    switch (role) {
      case 'admin':
        return { bg: C.badgeAdmin, text: C.buttonText, label: 'Yönetici' };
      case 'manager':
        return { bg: C.badgeManager, text: C.text, label: 'Müdür' };
      default:
        return { bg: C.badgeMember, text: C.textTer, label: 'Üye' };
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'VX';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getDaysLeft = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Ekip Yönetimi',
          headerStyle: { backgroundColor: C.bg },
          headerTintColor: C.text,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Üye Listesi */}
          <View style={styles.group}>
            <Text style={styles.groupTitle}>
              {teamName} — {members.length} ÜYE
            </Text>
            <View style={styles.groupContent}>
              {members.map((member, index) => {
                const badge = getRoleBadge(member.role, workspace?.owner_id, member.user_id);
                const isOwnerUser = member.user_id === workspace?.owner_id;
                const canEdit = (isOwner || userRole === 'admin') && !isOwnerUser;

                return (
                  <React.Fragment key={member.id}>
                    {index > 0 && <View style={styles.separator} />}
                    <TouchableOpacity
                      onPress={() => handleMemberPress(member)}
                      disabled={!canEdit}
                    >
                      <View style={styles.memberRow}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {getInitials(member.profile.full_name)}
                          </Text>
                        </View>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberName}>{member.profile.full_name}</Text>
                        </View>
                        <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.roleBadgeText, { color: badge.text }]}>
                            {badge.label}
                          </Text>
                        </View>
                        {canEdit && (
                          <Ionicons name="chevron-forward" size={18} color={C.chevron} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </View>

          {/* Bekleyen Davetler */}
          {invitations.length > 0 && (
            <View style={styles.group}>
              <Text style={styles.groupTitle}>BEKLEYEN DAVETLER</Text>
              <View style={styles.groupContent}>
                {invitations.map((invite, index) => (
                  <React.Fragment key={invite.id}>
                    {index > 0 && <View style={styles.separator} />}
                    <TouchableOpacity
                      onPress={() => cancelInvitation(invite.id)}
                      style={styles.inviteRow}
                    >
                      <View>
                        <Text style={styles.inviteCode}>{invite.code}</Text>
                        <Text style={styles.inviteDetail}>
                          {invite.phone || invite.email || 'Link'} · {getDaysLeft(invite.expires_at)} gün kaldı
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}

          {/* Davet Et Butonu */}
          <TouchableOpacity style={styles.inviteButton} onPress={inviteNewMember}>
            <Ionicons name="add" size={20} color={C.buttonText} style={{ marginRight: 8 }} />
            <Text style={styles.inviteButtonText}>Yeni Üye Davet Et</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

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
  separator: {
    height: 0.5,
    backgroundColor: C.border,
    marginLeft: 64,
  },

  // Üye Satırı
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.avatarText,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    color: C.text,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Davet Satırı
  inviteRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inviteCode: {
    fontSize: 17,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  inviteDetail: {
    fontSize: 13,
    color: C.textTer,
  },

  // Davet Butonu
  inviteButton: {
    backgroundColor: C.buttonBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 32,
  },
  inviteButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: C.buttonText,
  },
});
