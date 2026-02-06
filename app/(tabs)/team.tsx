import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Linking,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  avatar_url?: string;
  phone?: string;
  last_seen?: string;
  is_online?: boolean;
  active_task_count?: number;
  completed_today?: number;
}

interface Activity {
  id: string;
  user_name: string;
  user_avatar?: string;
  action: string;
  target: string;
  time: string;
  created_at: string;
}

export default function TeamScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');
  const [userRole, setUserRole] = useState<string>('member');

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) return;

      setUserRole(wsInfo.role);

      // Ekip üyelerini çek
      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            id,
            full_name,
            avatar_url,
            phone,
            last_seen_at
          )
        `)
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('is_active', true);

      if (memberError) throw memberError;

      // Her üye için aktif görev sayısı
      const membersWithStats = await Promise.all(
        (memberData || []).map(async (m: any) => {
          const { count: activeCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', wsInfo.workspaceId)
            .eq('assigned_to', m.profiles?.full_name)
            .neq('status', 'done');

          const { count: completedCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', wsInfo.workspaceId)
            .eq('assigned_to', m.profiles?.full_name)
            .eq('status', 'done')
            .gte('created_at', new Date().toISOString().split('T')[0]);

          return {
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            full_name: m.profiles?.full_name || 'İsimsiz',
            avatar_url: m.profiles?.avatar_url,
            phone: m.profiles?.phone,
            last_seen: m.profiles?.last_seen_at ? formatTimeAgo(m.profiles.last_seen_at) : null,
            active_task_count: activeCount || 0,
            completed_today: completedCount || 0,
          };
        })
      );

      setMembers(membersWithStats);

      // Son aktiviteler (notifications tablosundan)
      const { data: activityData } = await supabase
        .from('notifications')
        .select('*')
        .eq('workspace_id', wsInfo.workspaceId)
        .order('sent_at', { ascending: false })
        .limit(20);

      const formattedActivities = (activityData || []).map((a: any) => ({
        id: a.id,
        user_name: a.title?.split(':')[0] || 'Ekip',
        action: a.type,
        target: a.body || '',
        time: formatTimeAgo(a.sent_at),
        created_at: a.sent_at,
      }));

      setActivities(formattedActivities);
    } catch (err) {
      console.error('Ekip verisi yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
    return `${Math.floor(diff / 86400)} gün önce`;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTeamData();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Yönetici';
      case 'admin': return 'Admin';
      case 'member': return 'Üye';
      default: return role;
    }
  };

  const callMember = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const sendMessage = (member: TeamMember) => {
    // TODO: In-app mesajlaşma veya WhatsApp
    if (member.phone) {
      Linking.openURL(`https://wa.me/90${member.phone.replace(/\D/g, '')}`);
    }
  };

  const showMemberMenu = (member: TeamMember) => {
    const options = ['Profili Gör', 'Görevlerini Gör', 'İptal'];
    
    // Yönetici ise ek seçenekler
    if (userRole === 'owner' || userRole === 'admin') {
      options.splice(2, 0, 'Rolü Değiştir', 'Ekipten Çıkar');
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.indexOf('Ekipten Çıkar'),
          title: member.full_name,
        },
        (buttonIndex) => handleMemberMenuAction(member, options[buttonIndex])
      );
    } else {
      Alert.alert(member.full_name, 'Ne yapmak istiyorsunuz?',
        options.map(opt => ({
          text: opt,
          onPress: () => handleMemberMenuAction(member, opt),
          style: opt === 'İptal' ? 'cancel' : opt === 'Ekipten Çıkar' ? 'destructive' : 'default',
        }))
      );
    }
  };

  const handleMemberMenuAction = (member: TeamMember, action: string) => {
    switch (action) {
      case 'Profili Gör':
        router.push(`/team/${member.user_id}`);
        break;
      case 'Görevlerini Gör':
        router.push(`/tasks?assignedTo=${member.full_name}`);
        break;
      case 'Ekipten Çıkar':
        Alert.alert(
          'Ekipten Çıkar',
          `${member.full_name} ekipten çıkarılsın mı?`,
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Çıkar', style: 'destructive', onPress: () => removeMember(member) },
          ]
        );
        break;
    }
  };

  const removeMember = async (member: TeamMember) => {
    await supabase
      .from('workspace_members')
      .update({ is_active: false })
      .eq('id', member.id);
    loadTeamData();
  };

  const Avatar = ({ name, imageUrl, size = 48 }: { name: string; imageUrl?: string; size?: number }) => {
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    if (imageUrl) {
      return (
        <Image 
          source={{ uri: imageUrl }} 
          style={{ width: size, height: size, borderRadius: size / 2 }} 
        />
      );
    }

    return (
      <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarInitials, { fontSize: size * 0.4 }]}>{initials}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ekip</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/invite')}>
          <Ionicons name="person-add-outline" size={22} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Üyeler ({members.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
          onPress={() => setActiveTab('activity')}
        >
          <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>
            Aktivite
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A1A1A" />}
      >
        {activeTab === 'members' ? (
          /* Üyeler Listesi */
          <View style={styles.memberList}>
            {members.map((member) => (
              <View key={member.id} style={styles.memberCard}>
                {/* Üst: Avatar + İsim + Menü */}
                <View style={styles.memberHeader}>
                  <Avatar name={member.full_name} imageUrl={member.avatar_url} size={48} />
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.full_name}</Text>
                    <Text style={styles.memberMeta}>
                      {getRoleLabel(member.role)} • Son görülme: {member.last_seen || 'Bilinmiyor'}
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.memberMenu}
                    onPress={() => showMemberMenu(member)}
                  >
                    <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E93" />
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.memberDivider} />

                {/* Ortası: İstatistikler */}
                <View style={styles.memberStatsRow}>
                  <View style={styles.memberStatItem}>
                    <Ionicons name="document-text-outline" size={14} color="#8E8E93" />
                    <Text style={styles.memberStatText}>{member.active_task_count} aktif görev</Text>
                  </View>
                  <View style={styles.memberStatItem}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#8E8E93" />
                    <Text style={styles.memberStatText}>{member.completed_today} bugün tamamladı</Text>
                  </View>
                </View>

                {/* Telefon (varsa) */}
                {member.phone && (
                  <TouchableOpacity style={styles.memberPhone} onPress={() => callMember(member.phone!)}>
                    <Ionicons name="call-outline" size={14} color="#8E8E93" />
                    <Text style={styles.memberPhoneText}>{member.phone}</Text>
                  </TouchableOpacity>
                )}

                {/* Divider */}
                <View style={styles.memberDivider} />

                {/* Alt: Aksiyonlar */}
                <View style={styles.memberActions}>
                  <TouchableOpacity 
                    style={styles.memberActionButton}
                    onPress={() => router.push(`/task/new?assignTo=${member.full_name}`)}
                  >
                    <Text style={styles.memberActionText}>Görev Ata</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.memberActionButton}
                    onPress={() => sendMessage(member)}
                  >
                    <Text style={styles.memberActionText}>Mesaj Gönder</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {members.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={48} color="#E5E5EA" />
                <Text style={styles.emptyText}>Henüz ekip üyesi yok</Text>
                <TouchableOpacity style={styles.inviteButton} onPress={() => router.push('/invite')}>
                  <Text style={styles.inviteButtonText}>Davet Gönder</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Aktivite Listesi */
          <View style={styles.activityList}>
            {activities.map((activity) => (
              <View key={activity.id} style={styles.activityItem}>
                <View style={styles.activityDot} />
                <View style={styles.activityContent}>
                  <Text style={styles.activityText}>
                    <Text style={styles.activityUser}>{activity.user_name}</Text>
                    {' '}{activity.target}
                  </Text>
                  <Text style={styles.activityTime}>{activity.time}</Text>
                </View>
              </View>
            ))}

            {activities.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Ionicons name="pulse-outline" size={48} color="#E5E5EA" />
                <Text style={styles.emptyText}>Henüz aktivite yok</Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#1A1A1A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  memberList: {
    paddingHorizontal: 20,
  },
  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontWeight: '600',
    color: '#3C3C43',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 14,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  memberMeta: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  memberMenu: {
    padding: 8,
  },
  memberDivider: {
    height: 1,
    backgroundColor: '#F5F3EF',
    marginHorizontal: 16,
  },
  memberStatsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
  },
  memberStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberStatText: {
    fontSize: 13,
    color: '#3C3C43',
  },
  memberPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 6,
  },
  memberPhoneText: {
    fontSize: 13,
    color: '#8E8E93',
  },
  memberActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
  },
  memberActionButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
  },
  memberActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  activityList: {
    paddingHorizontal: 20,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1A1A1A',
    marginTop: 6,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  activityUser: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  activityTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
  },
  inviteButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
  },
  inviteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
