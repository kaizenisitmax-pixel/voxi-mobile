import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
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
  completedBg: '#E5E5EA',
  completedIcon: '#3C3C43',
};

interface CompletedTask {
  id: string;
  title: string;
  assigned_to: string;
  created_at: string;
  completed_at?: string;
  priority: string;
}

export default function CompletedScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'done')
      .order('created_at', { ascending: false });

    if (data) {
      const tasksWithCompletedDate = data.map((task) => ({
        ...task,
        completed_at: task.completed_at || task.created_at,
      }));
      setTasks(tasksWithCompletedDate);
    }
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const today = new Date();
    const diffMs = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Bugün'de tamamlandı";
    if (diffDays === 1) return "Dün'de tamamlandı";
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) + "'ta tamamlandı";
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tamamlanan</Text>
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
        <Text style={styles.headerTitle}>Tamamlanan</Text>
        <Text style={styles.headerSubtitle}>{tasks.length} görev tamamlandı</Text>
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A1A1A" />
        }
        contentContainerStyle={tasks.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color={C.textSec} />
            <Text style={styles.emptyText}>Henüz tamamlanan görev yok</Text>
          </View>
        }
        renderItem={({ item }) => (
          <>
            <TouchableOpacity
              style={styles.taskRow}
              onPress={() =>
                router.push({ pathname: '/task/[id]', params: { id: item.id, title: item.title } })
              }
              activeOpacity={0.7}
            >
              {/* Checkmark Avatar */}
              <View style={styles.checkAvatar}>
                <Ionicons name="checkmark" size={24} color={C.completedIcon} />
              </View>

              {/* Content */}
              <View style={styles.taskContent}>
                <Text style={styles.taskName}>{item.assigned_to}</Text>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.taskDate}>{formatDate(item.completed_at!)}</Text>
              </View>
            </TouchableOpacity>

            <View style={{ height: 0.5, backgroundColor: '#F2F2F7', marginLeft: 78 }} />
          </>
        )}
      />
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

  // Task Row
  taskRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
    alignItems: 'flex-start',
  },
  checkAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: C.completedBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
    marginLeft: 14,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textSec,
  },
  taskTitle: {
    fontSize: 14.5,
    color: C.textSec,
    marginTop: 3,
  },
  taskDate: {
    fontSize: 12,
    color: C.textTer,
    marginTop: 2,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: C.textSec,
    marginTop: 12,
  },
});
