import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Chat {
  id: string;
  job_request_id: string;
  customer_id: string;
  master_id: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count_customer: number;
  unread_count_master: number;
  is_active: boolean;
  created_at: string;
  master?: {
    name: string;
    profile_image_url: string | null;
  };
  customer?: {
    full_name: string;
  };
  job_request?: {
    status: string;
  };
}

export default function ChatsScreen() {
  const { session, profile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userRole, setUserRole] = useState<'customer' | 'master' | 'both'>('customer');

  // Load user role
  useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;

      setUserRole(data?.role || 'customer');
    } catch (error) {
      console.error('❌ Rol yükleme hatası:', error);
    }
  };

  // Load chats
  const loadChats = async () => {
    if (!session?.user?.id) return;

    try {
      let query = supabase
        .from('chats')
        .select(`
          *,
          master:masters!chats_master_id_fkey(name, profile_image_url),
          customer:profiles!chats_customer_id_fkey(full_name),
          job_request:job_requests!chats_job_request_id_fkey(status)
        `)
        .eq('is_active', true)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      // Filter by user role
      if (userRole === 'customer' || userRole === 'both') {
        query = query.eq('customer_id', session.user.id);
      } else if (userRole === 'master') {
        // Get master ID for this user
        const { data: masterData } = await supabase
          .from('masters')
          .select('id')
          .eq('user_id', session.user.id)
          .single();

        if (masterData) {
          query = query.eq('master_id', masterData.id);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      setChats(data || []);
    } catch (error) {
      console.error('❌ Sohbetler yüklenemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (userRole) {
      loadChats();
    }
  }, [userRole]);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [userRole])
  );

  // Subscribe to real-time updates
  useEffect(() => {
    if (!session?.user?.id) return;

    console.log('📡 Realtime sohbet dinlemesi başlatıldı');

    const channel = supabase
      .channel('chats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        (payload) => {
          console.log('🔄 Sohbet değişti:', payload);
          loadChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('💬 Yeni mesaj geldi:', payload);
          loadChats();
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Realtime bağlantısı kapatıldı');
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadChats();
  };

  const handleChatPress = (chat: Chat) => {
    router.push(`/chat/${chat.id}`);
  };

  const getUnreadCount = (chat: Chat) => {
    return userRole === 'customer'
      ? chat.unread_count_customer
      : chat.unread_count_master;
  };

  const getChatName = (chat: Chat) => {
    if (userRole === 'customer') {
      return chat.master?.name || 'Usta';
    } else {
      return chat.customer?.full_name || 'Müşteri';
    }
  };

  const getJobStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      open: { label: 'Yeni', color: '#007AFF' },
      contacted: { label: 'Görüşülüyor', color: '#FFB800' },
      accepted: { label: 'Kabul Edildi', color: '#34C759' },
      in_progress: { label: 'Devam Ediyor', color: '#FF9500' },
      completed: { label: 'Tamamlandı', color: '#8E8E93' },
    };

    return statusMap[status] || { label: status, color: '#8E8E93' };
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins}d`;
    if (diffHours < 24) return `${diffHours}s`;
    if (diffDays < 7) return `${diffDays}g`;

    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sohbetler</Text>
        <Text style={styles.headerSubtitle}>
          {chats.length} aktif sohbet
        </Text>
      </View>

      {/* Chat List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Yükleniyor...</Text>
          </View>
        ) : chats.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>Henüz Sohbet Yok</Text>
            <Text style={styles.emptySubtitle}>
              Bir tasarım için usta bulduğunuzda sohbet başlatabilirsiniz
            </Text>
          </View>
        ) : (
          chats.map((chat) => {
            const unreadCount = getUnreadCount(chat);
            const jobStatus = chat.job_request?.status || 'open';
            const statusBadge = getJobStatusBadge(jobStatus);

            return (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatCard}
                onPress={() => handleChatPress(chat)}
                activeOpacity={0.7}
              >
                {/* Profile Image */}
                <View style={styles.profileContainer}>
                  {chat.master?.profile_image_url ? (
                    <Image
                      source={{ uri: chat.master.profile_image_url }}
                      style={styles.profileImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.profilePlaceholder}>
                      <Ionicons name="person" size={28} color="#8E8E93" />
                    </View>
                  )}
                  {unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Chat Info */}
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.chatName}>{getChatName(chat)}</Text>
                    <Text style={styles.chatTime}>
                      {formatTime(chat.last_message_at)}
                    </Text>
                  </View>

                  <View style={styles.chatFooter}>
                    <Text
                      style={[
                        styles.lastMessage,
                        unreadCount > 0 && styles.lastMessageUnread,
                      ]}
                      numberOfLines={1}
                    >
                      {chat.last_message || 'Sohbet başlatıldı'}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusBadge.color },
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {statusBadge.label}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  chatCard: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  profileContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  chatName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  chatTime: {
    fontSize: 13,
    color: '#8E8E93',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 15,
    color: '#8E8E93',
    marginRight: 8,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
