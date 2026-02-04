import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    RefreshControl,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSec: '#3C3C43',
  textTer: '#8E8E93',
  accent: '#1A1A1A',
  border: '#F2F2F7',
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
};

interface TeamMember {
  name: string;
  role: string;
  openTasks: number;
  completedTasks: number;
  lastActivity?: string;
  thisWeekCompleted?: number;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

const TEAM_CONFIG = [
  { name: 'Volkan', role: 'Admin' },
  { name: 'Ahmet', role: 'Üye' },
  { name: 'Mehmet', role: 'Üye' },
  { name: 'Ayşe', role: 'Üye' },
  { name: 'Ali', role: 'Üye' },
];

export default function TeamScreen() {
  const router = useRouter();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberTasks, setMemberTasks] = useState<{ open: Task[]; completed: Task[] }>({
    open: [],
    completed: [],
  });
  const [modalLoading, setModalLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchTeamStats();
    }, [])
  );

  async function fetchTeamStats() {
    setLoading(true);
    const teamData: TeamMember[] = await Promise.all(
      TEAM_CONFIG.map(async (member) => {
        const { data: openTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', member.name)
          .eq('status', 'open');

        const { data: completedTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', member.name)
          .eq('status', 'done');

        const { data: lastMessage } = await supabase
          .from('messages')
          .select('created_at')
          .eq('sender_name', member.name)
          .order('created_at', { ascending: false })
          .limit(1);

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const { data: thisWeekTasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('assigned_to', member.name)
          .eq('status', 'done')
          .gte('created_at', weekAgo.toISOString());

        return {
          ...member,
          openTasks: openTasks?.length || 0,
          completedTasks: completedTasks?.length || 0,
          lastActivity: lastMessage?.[0]?.created_at,
          thisWeekCompleted: thisWeekTasks?.length || 0,
        };
      })
    );
    setTeam(teamData);
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchTeamStats();
    setRefreshing(false);
  }

  function formatLastSeen(dateString?: string) {
    if (!dateString) return 'Hiç görülmedi';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  async function fetchMemberTasks(memberName: string) {
    setModalLoading(true);
    setSelectedMember(memberName);

    const { data: openTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', memberName)
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', memberName)
      .eq('status', 'done')
      .order('created_at', { ascending: false })
      .limit(10);

    setMemberTasks({
      open: openTasks || [],
      completed: completedTasks || [],
    });
    setModalLoading(false);
  }

  function formatLastSeen(dateString?: string) {
    if (!dateString) return 'Hiç görülmedi';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}d önce`;
    if (diffHours < 24) return `${diffHours}s önce`;

    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Ekip</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ekip</Text>
        <Text style={styles.headerSubtitle}>{team.length} üye</Text>
      </View>

      {/* Team List */}
      <FlatList
        data={team}
        keyExtractor={(item) => item.name}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A1A1A" />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => (
          <>
            <TouchableOpacity
              style={styles.memberRow}
              onPress={() => fetchMemberTasks(item.name)}
              activeOpacity={0.7}
            >
              {/* Avatar */}
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: '#E5E5EA',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14,
              }}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#3C3C43' }}>{item.name[0]}</Text>
              </View>

              {/* Info */}
              <View style={styles.memberInfo}>
                <Text style={{ fontSize: 17, fontWeight: '600', color: '#1A1A1A' }}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>
                  Son: {formatLastSeen(item.lastActivity)} • {item.openTasks} açık görev
                </Text>
              </View>

              {/* Chevron */}
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>

            <View style={{ height: 0.5, backgroundColor: '#F2F2F7', marginLeft: 78 }} />
          </>
        )}
      />

      {/* Member Detail Modal */}
      <Modal
        visible={selectedMember !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedMember(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedMember(null)}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedMember}</Text>
            <View style={{ width: 32 }} />
          </View>

          {modalLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1A1A1A" />
            </View>
          ) : (
            <View style={styles.modalContent}>
              {/* Open Tasks */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Açık Görevler ({memberTasks.open.length})</Text>
                {memberTasks.open.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskItem}
                    onPress={() => {
                      setSelectedMember(null);
                      router.push({ pathname: '/task/[id]', params: { id: task.id, title: task.title } });
                    }}
                  >
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3C3C43', marginRight: 12 }} />
                    <Text style={styles.taskItemText} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))}
                {memberTasks.open.length === 0 && (
                  <Text style={styles.emptyTaskText}>Açık görev yok</Text>
                )}
              </View>

              {/* Completed Tasks */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>
                  Tamamlanan ({memberTasks.completed.length})
                </Text>
                {memberTasks.completed.map((task) => (
                  <TouchableOpacity
                    key={task.id}
                    style={styles.taskItem}
                    onPress={() => {
                      setSelectedMember(null);
                      router.push({ pathname: '/task/[id]', params: { id: task.id, title: task.title } });
                    }}
                  >
                    <Ionicons name="checkmark" size={14} color="#8E8E93" style={{ marginRight: 12 }} />
                    <Text style={[styles.taskItemText, styles.taskItemTextDone]} numberOfLines={1}>
                      {task.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: C.bg,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 2,
  },

  // Member Row
  memberRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: C.surface,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    color: C.surface,
    fontSize: 20,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 14,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  memberStatus: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 2,
  },
  memberSep: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSec,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: C.surface,
    borderRadius: 10,
    marginBottom: 8,
  },
  taskItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginRight: 12,
  },
  taskItemText: {
    fontSize: 15,
    color: C.text,
    flex: 1,
  },
  taskItemTextDone: {
    color: C.textSec,
  },
  emptyTaskText: {
    fontSize: 14,
    color: C.textTer,
    textAlign: 'center',
    paddingVertical: 20,
  },
});
