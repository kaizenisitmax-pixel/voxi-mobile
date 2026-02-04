import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { supabase } from '../../lib/supabase';

// SUPABASE SQL GEREKLİ:
// ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_group boolean DEFAULT false;
// ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_members text[] DEFAULT '{}';

const C = {
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  input: '#F5F3EF',
  text: '#1A1A1A',
  textSec: '#3C3C43',
  textTer: '#8E8E93',
  accent: '#1A1A1A',
  danger: '#FF3B30',
  border: '#F2F2F7',
  pinnedBg: '#F5F3EF',
  iconColor: '#3C3C43',
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
};

interface Task {
  id: string;
  title: string;
  status: string;
  priority: 'urgent' | 'normal' | 'low';
  assigned_to: string;
  created_by: string;
  workspace_id: string;
  due_date?: string;
  created_at: string;
  is_pinned?: boolean;
  is_group?: boolean;
  group_members?: string[];
  lastMessage?: {
    transcript: string;
    created_at: string;
    sender_name: string;
  } | null;
}

const FILTERS = ['Tümü', 'Acil', 'Normal', 'Bugün'];

export default function HomeScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState('Tümü');
  const [showFilter, setShowFilter] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openCount, setOpenCount] = useState(0);

  const [showSearch, setShowSearch] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);

  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

  function toggleSearch() {
    setShowSearch(!showSearch);
    if (showSearch) setSearch('');
  }

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [])
  );

  async function fetchTasks() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Görevler yüklenirken hata:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setOpenCount(data.length);

        const tasksWithLastMsg = await Promise.all(
          data.map(async (task) => {
            const { data: msgs } = await supabase
              .from('messages')
              .select('transcript, created_at, sender_name')
              .eq('task_id', task.id)
              .order('created_at', { ascending: false })
              .limit(1);
            return { ...task, lastMessage: msgs?.[0] || null };
          })
        );
        setTasks(tasksWithLastMsg);
      }
    } catch (error) {
      console.error('Beklenmeyen hata:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchTasks();
    setRefreshing(false);
  }

  function getFiltered() {
    let filtered = tasks;

    if (search.trim()) {
      filtered = filtered.filter((t) =>
        t.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (filter === 'Acil') {
      filtered = filtered.filter((t) => t.priority === 'urgent');
    } else if (filter === 'Normal') {
      filtered = filtered.filter((t) => t.priority === 'normal' || t.priority === 'low');
    } else if (filter === 'Bugün') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter((t) => t.due_date && t.due_date.startsWith(today));
    }

    return filtered.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
      return 0;
    });
  }

  async function togglePin(taskId: string, currentPinned: boolean) {
    await supabase.from('tasks').update({ is_pinned: !currentPinned }).eq('id', taskId);
    fetchTasks();
  }

  async function startVoiceCommand() {
    setVoiceModal(true);
    setListening(true);
    setVoiceText('Dinliyorum...');
    
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setTimeout(async () => {
        try {
          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();
          setListening(false);
          setVoiceProcessing(true);
          setVoiceText('İşleniyor...');
          
          if (uri) {
            await processVoiceCommand(uri);
          }
        } catch (e) {
          setVoiceText('Hata oluştu');
          setListening(false);
          setVoiceProcessing(false);
        }
      }, 5000);
    } catch (e) {
      setVoiceText('Mikrofon izni gerekli');
      setListening(false);
      setVoiceProcessing(false);
    }
  }

  async function processVoiceCommand(audioUri: string) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice.m4a',
      } as any);
      formData.append('model', 'whisper-large-v3');
      formData.append('language', 'tr');
      
      const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
      
      const sttResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}` },
        body: formData,
      });
      
      const sttData = await sttResponse.json();
      const transcript = sttData.text || '';
      setVoiceText(`"${transcript}"`);
      
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `Sen bir görev yönetim asistanısın. Kullanıcının sesli komutunu analiz et ve JSON döndür.
Desteklenen komutlar:
- Görev oluştur: {"action": "create_task", "title": "görev adı", "assigned_to": "kişi", "priority": "urgent|normal"}
- Görev ara: {"action": "search", "query": "arama terimi"}
- Rapor: {"action": "report"}
- Bilinmeyen: {"action": "unknown", "message": "anlayamadım mesajı"}
Türkçe komutları anlayabilmelisin. Örneğin "Ahmet'e acil montaj görevi ver" → {"action":"create_task","title":"Montaj görevi","assigned_to":"Ahmet","priority":"urgent"}`
            },
            { role: 'user', content: transcript }
          ],
          temperature: 0.1,
        }),
      });
      
      const aiData = await response.json();
      const cmdText = aiData.choices?.[0]?.message?.content || '';
      
      const jsonMatch = cmdText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cmd = JSON.parse(jsonMatch[0]);
        await executeVoiceCommand(cmd);
      } else {
        setVoiceText('Komutu anlayamadım');
      }
      
    } catch (e) {
      console.error('Voice command error:', e);
      setVoiceText('Hata oluştu, tekrar deneyin');
    }
    setVoiceProcessing(false);
  }

  async function executeVoiceCommand(cmd: any) {
    switch (cmd.action) {
      case 'create_task':
        const { error } = await supabase.from('tasks').insert({
          title: cmd.title,
          assigned_to: cmd.assigned_to,
          priority: cmd.priority || 'normal',
          status: 'open',
          created_by: 'Volkan',
          workspace_id: 'd816ca01-3361-4992-8c2d-df50d5f39382',
        });
        if (!error) {
          setVoiceText(`✓ "${cmd.title}" görevi ${cmd.assigned_to}'a atandı`);
          fetchTasks();
        } else {
          setVoiceText('Görev oluşturulamadı');
        }
        break;
      case 'search':
        setVoiceText(`Aranıyor: ${cmd.query}`);
        setSearch(cmd.query);
        setTimeout(() => setVoiceModal(false), 1500);
        break;
      case 'report':
        setVoiceText('Rapor hazırlanıyor...');
        setTimeout(() => setVoiceModal(false), 1500);
        break;
      default:
        setVoiceText(cmd.message || 'Komutu anlayamadım');
    }
  }

  async function completeTask(taskId: string) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId);
    fetchTasks();
  }

  async function deleteTask(taskId: string) {
    await supabase.from('tasks').delete().eq('id', taskId);
    fetchTasks();
  }

  function renderRightActions(
    taskId: string,
    isPinned: boolean,
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeBtn, { backgroundColor: '#8E8E93' }]}
          onPress={() => {
            togglePin(taskId, isPinned || false);
            swipeableRefs.current.get(taskId)?.close();
          }}
        >
          <Ionicons
            name={isPinned ? 'pin' : 'pin-outline'}
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.swipeBtnLabel}>Pin</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.swipeBtn, { backgroundColor: '#34C759' }]}
          onPress={() => {
            completeTask(taskId);
            swipeableRefs.current.get(taskId)?.close();
          }}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <Text style={styles.swipeBtnLabel}>Bitti</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderLeftActions(
    taskId: string,
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) {
    return (
      <TouchableOpacity
        style={[styles.swipeBtn, { backgroundColor: C.danger }]}
        onPress={() => {
          deleteTask(taskId);
          swipeableRefs.current.get(taskId)?.close();
        }}
      >
        <Ionicons name="trash-outline" size={22} color={C.surface} />
        <Text style={styles.swipeBtnLabel}>Sil</Text>
      </TouchableOpacity>
    );
  }

  function timeAgo(date: string) {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'şimdi';
    if (diffMins < 60) return `${diffMins}d`;
    if (diffHours < 24) return `${diffHours}s`;
    if (diffDays < 7) return `${diffDays}g`;
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
  }

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function renderTask({ item }: { item: Task }) {
    return (
      <Swipeable
        ref={(ref) => {
          if (ref) swipeableRefs.current.set(item.id, ref);
        }}
        renderRightActions={(progress, dragX) =>
          renderRightActions(item.id, item.is_pinned || false, progress, dragX)
        }
        renderLeftActions={(progress, dragX) => renderLeftActions(item.id, progress, dragX)}
        overshootRight={false}
        overshootLeft={false}
      >
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 20,
            backgroundColor: '#FFFFFF',
          }}
          onPress={() =>
            router.push({ pathname: '/task/[id]', params: { id: item.id, title: item.title } })
          }
          activeOpacity={0.7}
        >
          {/* Avatar - Group or Single */}
          {item.is_group && item.group_members && item.group_members.length > 0 ? (
            <View style={{ width: 44, height: 44, position: 'relative' }}>
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: '#E5E5EA',
                alignItems: 'center', justifyContent: 'center',
                position: 'absolute', top: 0, left: 0,
                borderWidth: 2, borderColor: '#FFFFFF',
                zIndex: 2,
              }}>
                <Text style={{ color: '#3C3C43', fontSize: 12, fontWeight: '600' }}>
                  {item.group_members[0][0]}
                </Text>
              </View>
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: '#D1D1D6',
                alignItems: 'center', justifyContent: 'center',
                position: 'absolute', bottom: 0, right: 0,
                borderWidth: 2, borderColor: '#FFFFFF',
                zIndex: 1,
              }}>
                <Text style={{ color: '#3C3C43', fontSize: 12, fontWeight: '600' }}>
                  {item.group_members[1] ? item.group_members[1][0] : 'G'}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#E5E5EA',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 14,
            }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: '#3C3C43' }}>
                {item.assigned_to[0]}
              </Text>
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '600', color: '#1A1A1A' }} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }} numberOfLines={1}>
              {item.is_group && item.group_members
                ? item.group_members.slice(0, 2).join(', ')
                : item.assigned_to} · {item.lastMessage
                ? `${item.lastMessage.transcript}`
                : 'Henüz mesaj yok'}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>
              {item.lastMessage
                ? timeAgo(item.lastMessage.created_at)
                : timeAgo(item.created_at)}
            </Text>
            {item.priority === 'urgent' && (
              <View style={{ backgroundColor: '#FF3B30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#FFFFFF' }}>ACİL</Text>
              </View>
            )}
            {item.is_pinned && (
              <Ionicons name="pin" size={14} color="#8E8E93" />
            )}
          </View>
        </TouchableOpacity>

        <View style={{ height: 0.5, backgroundColor: '#F2F2F7', marginLeft: 78 }} />
      </Swipeable>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
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
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12, backgroundColor: '#FFFFFF' }}>
          <View>
            <Text style={{ fontSize: 34, fontWeight: '700', color: '#1A1A1A' }}>Görevler</Text>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>{openCount} açık görev</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <TouchableOpacity onPress={toggleSearch}>
              <Ionicons name="search" size={22} color="#3C3C43" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/newTask')}>
              <Ionicons name="add" size={26} color="#3C3C43" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search */}
        {showSearch && (
          <View style={{ paddingHorizontal: 20, paddingBottom: 8, backgroundColor: '#FFFFFF' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3EF', borderRadius: 10, paddingHorizontal: 12, height: 36 }}>
              <Ionicons name="search" size={16} color="#8E8E93" />
              <TextInput
                style={{ flex: 1, marginLeft: 8, fontSize: 15, color: '#1A1A1A' }}
                placeholder="Görev ara..."
                placeholderTextColor="#8E8E93"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color="#C7C7CC" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Filter Button */}
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 0.5, borderBottomColor: '#F2F2F7' }}>
          <TouchableOpacity
            onPress={() => setShowFilter(true)}
            style={{
              alignSelf: 'flex-start',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: filter !== 'Tümü' ? '#1A1A1A' : '#F5F3EF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="options-outline" size={16} color={filter !== 'Tümü' ? '#FFFFFF' : '#3C3C43'} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: filter !== 'Tümü' ? '#FFFFFF' : '#3C3C43' }}>
                {filter}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Task List */}
        <FlatList
          data={getFiltered()}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1A1A1A"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#8E8E93" />
              <Text style={{ fontSize: 16, color: '#8E8E93', marginTop: 12, marginBottom: 4 }}>Görev yok</Text>
              <Text style={{ fontSize: 14, color: '#C7C7CC' }}>+ butonuyla yeni görev oluştur</Text>
            </View>
          }
          contentContainerStyle={
            getFiltered().length === 0 ? { flex: 1 } : { paddingBottom: 100 }
          }
        />

        {/* Filter Modal */}
        <Modal
          visible={showFilter}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilter(false)}
        >
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}
            activeOpacity={1}
            onPress={() => setShowFilter(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: 40,
              }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 8, marginBottom: 20 }} />
                <View style={{ paddingHorizontal: 20 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#212121', marginBottom: 16 }}>Filtrele</Text>
                  {FILTERS.map((f) => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => { setFilter(f); setShowFilter(false); }}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 14,
                        borderBottomWidth: f !== 'Bugün' ? 0.5 : 0,
                        borderBottomColor: '#F2F2F7',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Ionicons
                          name={f === 'Tümü' ? 'list-outline' : f === 'Acil' ? 'alert-circle-outline' : f === 'Normal' ? 'checkmark-circle-outline' : 'today-outline'}
                          size={22}
                          color="#3C3C43"
                        />
                        <Text style={{ fontSize: 17, color: '#1A1A1A', fontWeight: filter === f ? '600' : '400' }}>{f}</Text>
                      </View>
                      {filter === f && (
                        <Ionicons name="checkmark" size={22} color="#1A1A1A" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* Sesli Komut Modal */}
        <Modal visible={voiceModal} transparent animationType="fade" onRequestClose={() => setVoiceModal(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.7)',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 32,
              alignItems: 'center',
              width: 280,
            }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#F5F3EF',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Ionicons
                  name={listening ? 'mic' : voiceProcessing ? 'hourglass-outline' : 'checkmark-circle'}
                  size={36}
                  color="#3C3C43"
                />
              </View>
              
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#212121',
                textAlign: 'center',
                marginBottom: 8,
              }}>
                {listening ? 'Hey Voxi' : voiceProcessing ? 'Düşünüyorum...' : 'Sonuç'}
              </Text>
              
              <Text style={{
                fontSize: 14,
                color: '#8E8E93',
                textAlign: 'center',
                marginBottom: 20,
                lineHeight: 20,
              }}>
                {voiceText}
              </Text>
              
              {listening && (
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 16 }}>
                  {[0, 1, 2].map(i => (
                    <View
                      key={i}
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#FF3B30',
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </View>
              )}
              
              <TouchableOpacity
                onPress={() => {
                  setVoiceModal(false);
                  setListening(false);
                  setVoiceProcessing(false);
                }}
                style={{
                  paddingHorizontal: 32,
                  paddingVertical: 12,
                  borderRadius: 20,
                  backgroundColor: '#F5F3EF',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                  {listening ? 'İptal' : 'Kapat'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
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
    backgroundColor: C.bg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flex: 1,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBtn: {
    padding: 8,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Task Row
  taskRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: C.surface,
    alignItems: 'flex-start',
  },
  taskRowPinned: {
    backgroundColor: C.pinnedBg,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: C.surface,
    fontSize: 20,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
    marginLeft: 14,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    flex: 1,
  },
  taskTime: {
    fontSize: 12,
    color: C.textSec,
    marginLeft: 8,
  },
  taskTitle: {
    fontSize: 14.5,
    color: C.text,
    fontWeight: '500',
    marginTop: 3,
  },
  taskPreview: {
    fontSize: 13.5,
    color: C.textSec,
    marginTop: 2,
  },
  urgentBadge: {
    backgroundColor: C.danger,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  urgentText: {
    color: C.surface,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  separator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },

  // Swipeable Actions
  swipeActions: {
    flexDirection: 'row',
  },
  swipeBtn: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeBtnLabel: {
    fontSize: 11,
    color: C.surface,
    fontWeight: '500',
    marginTop: 4,
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
    marginBottom: 4,
  },
  emptyHint: {
    fontSize: 14,
    color: C.textTer,
  },
});
