import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActionSheetIOS,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to: string;
  due_date: string | null;
  created_at: string;
  customer_id: string | null;
  message_count?: number;
  attachment_count?: number;
}

interface GroupedTasks {
  [key: string]: Task[];
}

export default function TasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<string>('member');
  const [urgentCount, setUrgentCount] = useState(0);
  const [showUrgentCard, setShowUrgentCard] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Tümü');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) return;

      setUserRole(wsInfo.role);

      // Sadece bana atanan görevler
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('assigned_to', wsInfo.fullName)
        .neq('status', 'done')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Her görev için mesaj ve dosya sayısı çek
      const tasksWithCounts = await Promise.all(
        (data || []).map(async (task) => {
          const [msgRes, attachRes] = await Promise.all([
            supabase.from('messages').select('id', { count: 'exact', head: true }).eq('task_id', task.id),
            supabase.from('attachments').select('id', { count: 'exact', head: true }).eq('task_id', task.id),
          ]);
          return {
            ...task,
            message_count: msgRes.count || 0,
            attachment_count: attachRes.count || 0,
          };
        })
      );

      setTasks(tasksWithCounts);
      setUrgentCount(tasksWithCounts.filter(t => t.priority === 'urgent').length);
    } catch (err) {
      console.error('Görevler yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTasks();
  };

  const groupTasksByDate = (tasks: Task[]): GroupedTasks => {
    const groups: GroupedTasks = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    tasks.forEach(task => {
      const taskDate = new Date(task.created_at);
      let key: string;

      if (taskDate.toDateString() === today.toDateString()) {
        key = 'Bugün';
      } else if (taskDate.toDateString() === yesterday.toDateString()) {
        key = 'Dün';
      } else {
        const month = taskDate.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        key = month.charAt(0).toUpperCase() + month.slice(1);
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });

    return groups;
  };

  const showTaskMenu = (task: Task) => {
    const isManager = userRole === 'owner' || userRole === 'admin';

    const options = [
      'Tamamla',
      'Not ekle',
      'Dosya ekle',
      'Hatırlatıcı kur',
      'Detaylar',
      'Müşteri kartı',
    ];

    if (isManager) {
      options.push('Düzenle', 'Başkasına aktar');
    }

    options.push('Sorun bildir', 'İptal');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: options.indexOf('Sorun bildir'),
          title: task.title,
        },
        (buttonIndex) => handleMenuAction(task, options[buttonIndex])
      );
    } else {
      Alert.alert(task.title, 'Ne yapmak istiyorsunuz?', 
        options.map(opt => ({
          text: opt,
          onPress: () => handleMenuAction(task, opt),
          style: opt === 'İptal' ? 'cancel' : opt === 'Sorun bildir' ? 'destructive' : 'default',
        }))
      );
    }
  };

  const handleMenuAction = async (task: Task, action: string) => {
    switch (action) {
      case 'Tamamla':
        await supabase.from('tasks').update({ status: 'done' }).eq('id', task.id);
        loadTasks();
        break;
      case 'Detaylar':
        router.push(`/task/${task.id}`);
        break;
      case 'Müşteri kartı':
        if (task.customer_id) router.push(`/customer/${task.customer_id}`);
        break;
      case 'Sorun bildir':
        Alert.alert('Sorun Bildir', 'Yöneticiye bu görevi aktarması için bildirim gönderilsin mi?', [
          { text: 'İptal', style: 'cancel' },
          { text: 'Gönder', onPress: () => reportIssue(task) },
        ]);
        break;
      // Diğer aksiyonlar eklenebilir
    }
  };

  const reportIssue = async (task: Task) => {
    // Yöneticiye bildirim gönder
    const wsInfo = await getWorkspaceInfo();
    if (!wsInfo) return;

    await supabase.from('notifications').insert({
      user_id: wsInfo.userId, // TODO: Yönetici user_id olmalı
      workspace_id: wsInfo.workspaceId,
      type: 'issue',
      title: 'Görev sorunu bildirildi',
      body: `${wsInfo.fullName}: "${task.title}" görevi için yardım istiyor`,
      data: { taskId: task.id },
      is_read: false,
      sent_at: new Date().toISOString(),
    });

    Alert.alert('Gönderildi', 'Yöneticinize bildirim gönderildi.');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    switch (activeFilter) {
      case 'Acil':
        filtered = tasks.filter(t => t.priority === 'urgent');
        break;
      case 'Bugün':
        filtered = tasks.filter(t => t.due_date?.startsWith(todayStr));
        break;
      case 'Bu hafta':
        filtered = tasks.filter(t => {
          if (!t.due_date) return false;
          const taskDate = new Date(t.due_date);
          return taskDate >= weekStart;
        });
        break;
      case 'Bekleyen':
        filtered = tasks.filter(t => t.status === 'open');
        break;
    }
    return filtered;
  };

  const groupedTasks = groupTasksByDate(getFilteredTasks());
  const filters = ['Tümü', 'Acil', 'Bugün', 'Bu hafta', 'Bekleyen'];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Görevler</Text>
          <Text style={styles.headerSubtitle}>{tasks.length} görev</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="swap-vertical-outline" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal" size={22} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtre Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive
            ]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[
              styles.filterChipText,
              activeFilter === filter && styles.filterChipTextActive
            ]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A1A1A" />}
      >
        {/* Acil Görevler Kartı */}
        {urgentCount > 0 && showUrgentCard && (
          <View style={styles.urgentCard}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#FF3B30" style={{ marginRight: 8 }} />
                <Text style={styles.urgentTitle}>Acil Görevler</Text>
              </View>
              <Text style={styles.urgentSubtitle}>{urgentCount} görev bugün bitmeli</Text>
              <TouchableOpacity 
                style={styles.urgentButton}
                onPress={() => setActiveFilter('Acil')}
              >
                <Text style={styles.urgentButtonText}>Şimdi Gör</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => setShowUrgentCard(false)} style={styles.urgentClose}>
              <Ionicons name="close" size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        )}

        {/* Tarihsel Gruplar */}
        {Object.entries(groupedTasks).map(([date, dateTasks]) => (
          <View key={date} style={styles.dateGroup}>
            <Text style={styles.dateTitle}>{date}</Text>
            {dateTasks.map((task) => {
              const initials = (task.assigned_to || '')
                .split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '??';
              
              return (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskCard}
                  onPress={() => router.push(`/task/${task.id}`)}
                  activeOpacity={0.7}
                >
                  {/* Avatar - Baş harfler */}
                  <View style={styles.taskAvatar}>
                    <Text style={styles.taskAvatarText}>{initials}</Text>
                  </View>

                  {/* İçerik */}
                  <View style={styles.taskContent}>
                    {/* Üst satır - Başlık */}
                    <View style={styles.taskTopRow}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{task.title}</Text>
                      <TouchableOpacity 
                        style={styles.taskMenu} 
                        onPress={() => showTaskMenu(task)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={18} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>

                    {/* Alt satır - Açıklama/Alt bilgi */}
                    <Text style={styles.taskSubtitle} numberOfLines={1}>
                      {task.assigned_to || 'Atanmamış'}
                    </Text>

                    {/* Ayırıcı çizgi */}
                    <View style={styles.taskDivider} />

                    {/* Meta bilgiler */}
                    <View style={styles.taskFooter}>
                      {/* Öncelik badge */}
                      {task.priority === 'urgent' ? (
                        <View style={styles.urgentBadge}>
                          <Text style={styles.urgentBadgeText}>ACİL</Text>
                        </View>
                      ) : (
                        <View style={styles.normalBadge}>
                          <Text style={styles.normalBadgeText}>NORMAL</Text>
                        </View>
                      )}

                      {/* Tarih */}
                      {task.due_date && (
                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
                          <Text style={styles.metaText}>
                            {new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                      )}

                      {/* Mesaj sayısı */}
                      {task.message_count && task.message_count > 0 && (
                        <View style={styles.metaItem}>
                          <Ionicons name="chatbubble-outline" size={14} color="#8E8E93" />
                          <Text style={styles.metaText}>{task.message_count}</Text>
                        </View>
                      )}

                      {/* Dosya sayısı */}
                      {task.attachment_count && task.attachment_count > 0 && (
                        <View style={styles.metaItem}>
                          <Ionicons name="attach-outline" size={14} color="#8E8E93" />
                          <Text style={styles.metaText}>{task.attachment_count}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {tasks.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#E5E5EA" />
            <Text style={styles.emptyText}>Tüm görevler tamamlandı</Text>
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
    alignItems: 'flex-start',
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
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  content: {
    flex: 1,
  },
  filterScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    height: 36,
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3C3C43',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  urgentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F5',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFDDDD',
  },
  urgentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  urgentSubtitle: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 2,
    marginBottom: 12,
  },
  urgentButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  urgentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  urgentClose: {
    padding: 4,
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 20,
    marginBottom: 12,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  taskAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taskAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3C3C43',
  },
  taskContent: {
    flex: 1,
  },
  taskTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  taskSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 12,
  },
  taskDivider: {
    height: 1,
    backgroundColor: '#F2F2F7',
    marginBottom: 12,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  urgentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
  },
  urgentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  normalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F5F3EF',
  },
  normalBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3C3C43',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  taskMenu: {
    padding: 4,
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
});
