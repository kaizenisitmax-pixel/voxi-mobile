import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { detectReminder, summarizeTask } from '../../lib/ai';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  input: '#F5F3EF',
  chatBg: '#F5F3EF',
  text: '#1A1A1A',
  textSec: '#3C3C43',
  textTer: '#8E8E93',
  accent: '#1A1A1A',
  danger: '#FF3B30',
  bubbleMe: '#E7FFDB',
  bubbleOther: '#FFFFFF',
  border: '#F2F2F7',
  sysMsg: '#FFF8E7',
  blue: '#53BDEB',
  iconColor: '#3C3C43',
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
};

interface Message {
  id: string;
  task_id: string;
  sender_name: string;
  message_type: 'text' | 'voice' | 'image' | 'file' | 'system';
  transcript: string;
  ai_response?: string;
  audio_url?: string;
  file_url?: string;
  created_at: string;
  status?: 'sent' | 'delivered' | 'read';
  read_at?: string;
  is_starred?: boolean;
  reply_to_id?: string;
  reply_to?: Message;
}

interface Task {
  id: string;
  title: string;
  status: 'open' | 'in_progress' | 'done';
  priority: 'urgent' | 'normal' | 'low';
  assigned_to: string;
  created_by: string;
  due_date?: string;
  created_at: string;
  is_group?: boolean;
  group_members?: string[];
}

export default function TaskDetail() {
  const { id, title } = useLocalSearchParams();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (id) {
      fetchTask();
      fetchMessages();
    }
  }, [id]);

  async function fetchTask() {
    const { data } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (data) setTask(data);
    setLoading(false);
  }

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select('*, reply_to:reply_to_id(*)')
      .eq('task_id', id)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data);
      
      // Son görülme hesapla
      const otherMessages = data.filter((m) => m.sender_name !== 'Volkan');
      if (otherMessages.length > 0) {
        const lastMsg = otherMessages[otherMessages.length - 1];
        setLastSeen(lastMsg.created_at);
      }
      
      await markMessagesAsRead();
    }
  }

  async function markMessagesAsRead() {
    await supabase
      .from('messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('task_id', id)
      .eq('sender_name', task?.assigned_to || '')
      .neq('status', 'read');
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    const { data: msgData, error } = await supabase
      .from('messages')
      .insert([
        {
          task_id: id,
          sender_name: 'Volkan',
          message_type: 'text',
          transcript: text,
          ai_response: '',
          status: 'sent',
          reply_to_id: replyTo?.id || null,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('Mesaj hatası:', error);
      return;
    }

    setReplyTo(null);

    try {
      const reminder = await detectReminder(text);
      if (reminder) {
        await supabase.from('reminders').insert([
          {
            task_id: id,
            message_id: msgData?.[0]?.id || null,
            remind_at: reminder.date,
            note: reminder.note,
            created_by: 'Volkan',
          },
        ]);
      }
    } catch (e) {
      console.log('Hatırlatma hatası:', e);
    }

    fetchMessages();
  }

  async function sendImageMessage(uri: string) {
    const { data: msgData } = await supabase
      .from('messages')
      .insert([
        {
          task_id: id,
          sender_name: 'Volkan',
          message_type: 'image',
          transcript: 'Fotoğraf gönderdi',
          file_url: uri,
          ai_response: '',
          status: 'sent',
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    fetchMessages();
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await sendImageMessage(result.assets[0].uri);
    }
  }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Duration tracking
      const interval = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
      (rec as any)._durationInterval = interval;
    } catch (err) {
      console.error('Recording error:', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    
    // Duration interval'ı durdur
    if ((recording as any)._durationInterval) {
      clearInterval((recording as any)._durationInterval);
    }
    
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const duration = recordingDuration;
    setRecording(null);
    setRecordingDuration(0);

    if (uri) {
      await supabase.from('messages').insert([
        {
          task_id: id,
          sender_name: 'Volkan',
          message_type: 'voice',
          transcript: 'Ses mesajı gönderdi',
          audio_url: uri,
          ai_response: '',
          status: 'sent',
          created_at: new Date().toISOString(),
        },
      ]);
      fetchMessages();
    }
  }

  async function updateTaskStatus(newStatus: 'open' | 'in_progress' | 'done') {
    await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
    fetchTask();
  }

  async function updateTaskPriority() {
    const newPriority = task?.priority === 'urgent' ? 'normal' : 'urgent';
    await supabase.from('tasks').update({ priority: newPriority }).eq('id', id);
    fetchTask();
  }

  async function toggleStar(messageId: string, currentStarred: boolean) {
    await supabase.from('messages').update({ is_starred: !currentStarred }).eq('id', messageId);
    fetchMessages();
  }

  async function deleteMessage(messageId: string) {
    Alert.alert('Sil', 'Mesaj silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('messages').delete().eq('id', messageId);
          fetchMessages();
        },
      },
    ]);
  }

  function handleLongPress(message: Message) {
    Alert.alert('Mesaj', '', [
      { text: 'Kopyala', onPress: () => {} },
      {
        text: message.is_starred ? 'Yıldızı Kaldır' : 'Yıldızla',
        onPress: () => toggleStar(message.id, message.is_starred || false),
      },
      { text: 'Yanıtla', onPress: () => setReplyTo(message) },
      { text: 'Sil', style: 'destructive', onPress: () => deleteMessage(message.id) },
      { text: 'İptal', style: 'cancel' },
    ]);
  }

  async function generateSummary() {
    setLoadingSummary(true);
    setShowSummary(true);
    const result = await summarizeTask(messages);
    setSummary(result);
    setLoadingSummary(false);
  }

  function getFilteredMessages() {
    if (showStarredOnly) {
      return messages.filter((m) => m.is_starred);
    }
    return messages;
  }

  function getMediaMessages() {
    return messages.filter((m) => m.message_type === 'image');
  }

  function formatTime(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
  }

  function getStatusIcon(status?: string) {
    if (!status) return '';
    if (status === 'sent') return '✓';
    if (status === 'delivered') return '✓✓';
    if (status === 'read') return '✓✓';
    return '';
  }

  function getStatusColor(status?: string, read_at?: string) {
    if (status === 'read' && read_at) return C.blue;
    return C.textTer;
  }

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  function formatDuration(ms: number) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }

  function formatLastSeen(dateString: string | null) {
    if (!dateString) return 'bilinmiyor';
    const diff = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'çevrimiçi';
    if (mins < 60) return `${mins} dk önce`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} saat önce`;
    const days = Math.floor(hours / 24);
    return `${days} gün önce`;
  }

  function VoiceMessage({ uri, duration }: { uri?: string; duration?: number }) {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const soundRef = useRef<Audio.Sound | null>(null);

    const togglePlay = async () => {
      if (!uri) return;
      
      if (playing && soundRef.current) {
        await soundRef.current.pauseAsync();
        setPlaying(false);
      } else {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync({ uri });
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.isLoaded) {
              setProgress(status.positionMillis / (status.durationMillis || 1));
              if (status.didJustFinish) {
                setPlaying(false);
                setProgress(0);
                soundRef.current = null;
              }
            }
          });
        }
        await soundRef.current!.playAsync();
        setPlaying(true);
      }
    };

    useEffect(() => {
      return () => {
        soundRef.current?.unloadAsync();
      };
    }, []);

    const barHeights = [8, 15, 12, 18, 10, 20, 14, 16, 11, 19, 13, 17, 9, 21, 15, 12, 18, 14, 16, 10, 20, 13, 17, 11, 19, 15, 14, 12, 16, 18];

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 180 }}>
        <TouchableOpacity onPress={togglePlay}>
          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={playing ? 'pause' : 'play'} size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1, height: 30, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1.5, height: 30 }}>
            {barHeights.map((height, i) => {
              const isActive = i / barHeights.length <= progress;
              return (
                <View
                  key={i}
                  style={{
                    width: 2.5,
                    height: height,
                    borderRadius: 1.5,
                    backgroundColor: isActive ? '#1A1A1A' : '#D1D5DB',
                  }}
                />
              );
            })}
          </View>
        </View>
        <Text style={{ fontSize: 11, color: C.textSec, minWidth: 35 }}>
          {duration ? formatDuration(duration) : '0:05'}
        </Text>
      </View>
    );
  }

  function renderMessage({ item, index }: { item: Message; index: number }) {
    const isMe = item.sender_name === 'Volkan';
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const showAvatar = !prevMsg || prevMsg.sender_name !== item.sender_name;
    const marginTop = !prevMsg || prevMsg.sender_name !== item.sender_name ? 10 : 3;

    if (item.message_type === 'system') {
      return (
        <View style={styles.systemMsgContainer}>
          <View style={styles.systemMsgBubble}>
            <Text style={styles.systemText}>{item.transcript}</Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.messageContainer,
          isMe ? styles.messageContainerMe : styles.messageContainerOther,
          { marginTop },
        ]}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        {!isMe && showAvatar && (
          <View style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#E5E5EA',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
            marginTop: 4,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#3C3C43' }}>
              {item.sender_name[0]}
            </Text>
          </View>
        )}
        {!isMe && !showAvatar && <View style={styles.messageAvatarSpacer} />}

        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          {/* Grup mesajında gönderen ismi */}
          {task?.is_group && !isMe && (
            <Text style={{
              fontSize: 12,
              fontWeight: '600',
              color: '#3C3C43',
              marginBottom: 2,
            }}>
              {item.sender_name}
            </Text>
          )}

          {item.reply_to && (
            <View style={styles.replyReference}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={styles.replyName}>{item.reply_to.sender_name}</Text>
                <Text style={styles.replyText} numberOfLines={1}>
                  {item.reply_to.transcript}
                </Text>
              </View>
            </View>
          )}

          {item.message_type === 'image' && item.file_url && (
            <Image source={{ uri: item.file_url }} style={styles.messageImage} />
          )}

          {item.message_type === 'voice' && (
            <VoiceMessage uri={item.audio_url} duration={5000} />
          )}

          {item.message_type === 'text' && (
            <Text style={styles.bubbleText}>{item.transcript}</Text>
          )}

          <View style={styles.bubbleFooter}>
            <Text style={styles.bubbleTime}>{formatTime(item.created_at)}</Text>
            {isMe && (
              <Text style={[styles.statusIcon, { color: getStatusColor(item.status, item.read_at) }]}>
                {getStatusIcon(item.status)}
              </Text>
            )}
            {item.is_starred && <Text style={styles.starIcon}>⭐</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A1A1A" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

        {/* Header */}
        <TouchableOpacity activeOpacity={1} onPress={Keyboard.dismiss}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={28} color={C.text} />
            </TouchableOpacity>

            <View style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: '#E5E5EA',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#3C3C43' }}>
                {task?.assigned_to?.[0] || ''}
              </Text>
            </View>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {task?.title || title}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {task?.is_group && task?.group_members
                  ? task.group_members.join(', ')
                  : lastSeen ? formatLastSeen(lastSeen) : 'çevrimiçi'}
              </Text>
            </View>

            <TouchableOpacity onPress={() => setShowOptionsMenu(true)} style={styles.optionsButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#3C3C43" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={getFilteredMessages()}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            showStarredOnly ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="star-outline" size={48} color={C.textSec} />
                <Text style={styles.emptyText}>Yıldızlı mesaj yok</Text>
              </View>
            ) : null
          }
        />

        {/* Reply Reference */}
        {replyTo && (
          <View style={styles.replyContainer}>
            <View style={styles.replyBarLeft} />
            <View style={styles.replyContentContainer}>
              <Text style={styles.replyToName}>Yanıtlanıyor: {replyTo.sender_name}</Text>
              <Text style={styles.replyToText} numberOfLines={1}>
                {replyTo.transcript}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyCancelBtn}>
              <Ionicons name="close" size={20} color={C.textSec} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar - Claude iOS Style */}
        <View style={styles.inputContainer}>
          {isRecording ? (
            /* Recording Mode */
            <View style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFEBEE',
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingVertical: 10,
              gap: 8,
            }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.danger }} />
              <Text style={{ fontSize: 15, color: C.danger, flex: 1 }}>
                {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (recording) {
                    if ((recording as any)._durationInterval) {
                      clearInterval((recording as any)._durationInterval);
                    }
                    recording.stopAndUnloadAsync();
                    setRecording(null);
                    setIsRecording(false);
                    setRecordingDuration(0);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={22} color={C.danger} />
              </TouchableOpacity>
              <TouchableOpacity onPress={stopRecording}>
                <Ionicons name="send" size={22} color="#34C759" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Camera Button */}
              <TouchableOpacity style={{ padding: 6 }} onPress={pickPhoto}>
                <Ionicons name="camera-outline" size={24} color="#3C3C43" />
              </TouchableOpacity>

              {/* Input Field */}
              <View style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#F5F3EF',
                borderRadius: 20,
                paddingHorizontal: 14,
                marginHorizontal: 8,
                minHeight: 36,
              }}>
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: '#1A1A1A', maxHeight: 100 }}
                  placeholder="Mesaj yaz..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  value={input}
                  onChangeText={setInput}
                />
              </View>

              {/* Send or Mic Button */}
              {input.trim().length > 0 ? (
                <TouchableOpacity onPress={sendMessage} style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#1A1A1A',
                  alignItems: 'center',
                  justifyContent: 'center',
                }} disabled={sending}>
                  {sending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onLongPress={startRecording} style={{ padding: 6 }}>
                  <Ionicons name="mic-outline" size={24} color="#3C3C43" />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Bottom Sheet Menu */}
        <Modal
          visible={showOptionsMenu}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowOptionsMenu(false)}
        >
          <TouchableOpacity
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          >
            <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
              <View style={styles.menuContainer}>
                <View style={styles.dragIndicator} />

                {/* Task Info */}
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>GÖREV BİLGİLERİ</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Atanan:</Text>
                    <Text style={styles.infoValue}>{task?.assigned_to}</Text>
                  </View>
                  <View style={styles.infoSep} />
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Durum:</Text>
                    <Text style={styles.infoValue}>
                      {task?.status === 'open'
                        ? 'Açık'
                        : task?.status === 'done'
                        ? 'Tamamlandı'
                        : 'Devam ediyor'}
                    </Text>
                  </View>
                  {task?.due_date && (
                    <>
                      <View style={styles.infoSep} />
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Termin:</Text>
                        <Text style={styles.infoValue}>
                          {new Date(task.due_date).toLocaleDateString('tr-TR')}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Status Buttons */}
                {task?.status !== 'done' && (
                  <View style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle}>DURUMU DEĞİŞTİR</Text>
                    <View style={styles.statusBtnRow}>
                      {task?.status !== 'in_progress' && (
                        <TouchableOpacity
                          style={[styles.statusBtn, { backgroundColor: '#F5F3EF' }]}
                          onPress={() => {
                            updateTaskStatus('in_progress');
                            setShowOptionsMenu(false);
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>Başladım</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.statusBtn, { backgroundColor: '#1A1A1A' }]}
                        onPress={() => {
                          updateTaskStatus('done');
                          setShowOptionsMenu(false);
                        }}
                      >
                        <Text style={styles.statusBtnText}>Tamamla</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Tools */}
                <View style={styles.menuSection}>
                  <Text style={styles.menuSectionTitle}>ARAÇLAR</Text>
                  <View style={styles.toolsRow}>
                    <TouchableOpacity
                      style={styles.toolBtn}
                      onPress={() => {
                        setShowOptionsMenu(false);
                        generateSummary();
                      }}
                    >
                      <Ionicons name="sparkles-outline" size={18} color={C.text} style={styles.toolIcon} />
                      <Text style={styles.toolLabel}>AI Özet</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.toolBtn}
                      onPress={() => {
                        setShowStarredOnly(!showStarredOnly);
                        setShowOptionsMenu(false);
                      }}
                    >
                      <Ionicons
                        name={showStarredOnly ? 'star' : 'star-outline'}
                        size={18}
                        color={C.text}
                        style={styles.toolIcon}
                      />
                      <Text style={styles.toolLabel}>Yıldızlı</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.toolBtn}
                      onPress={() => {
                        setShowOptionsMenu(false);
                        setShowMediaGallery(true);
                      }}
                    >
                      <Ionicons name="images-outline" size={18} color={C.text} style={styles.toolIcon} />
                      <Text style={styles.toolLabel}>Medya</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* AI Summary Modal */}
        <Modal
          visible={showSummary}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowSummary(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowSummary(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>AI Özet</Text>
              <View style={{ width: 32 }} />
            </View>
            <View style={styles.modalContent}>
              {loadingSummary ? (
                <ActivityIndicator size="large" color="#1A1A1A" />
              ) : (
                <Text style={styles.summaryText}>{summary}</Text>
              )}
            </View>
          </SafeAreaView>
        </Modal>

        {/* Media Gallery Modal */}
        <Modal
          visible={showMediaGallery}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowMediaGallery(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowMediaGallery(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Medya</Text>
              <View style={{ width: 32 }} />
            </View>
            <View style={styles.mediaGrid}>
              {getMediaMessages().map((msg) => (
                <TouchableOpacity key={msg.id} style={styles.mediaGridItem}>
                  <Image source={{ uri: msg.file_url }} style={styles.mediaGridImage} />
                </TouchableOpacity>
              ))}
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.chatBg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  backButton: {
    paddingRight: 8,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  headerAvatarText: {
    color: C.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  headerCenter: {
    flex: 1,
    marginLeft: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 1,
  },
  optionsButton: {
    padding: 8,
  },

  // Messages List
  messagesList: {
    flex: 1,
    backgroundColor: C.chatBg,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Message Container
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  messageContainerMe: {
    justifyContent: 'flex-end',
  },
  messageContainerOther: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  messageAvatarText: {
    color: C.surface,
    fontSize: 12,
    fontWeight: '700',
  },
  messageAvatarSpacer: {
    width: 36,
  },

  // Bubble
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMe: {
    backgroundColor: C.bubbleMe,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: C.bubbleOther,
    borderBottomLeftRadius: 6,
  },
  bubbleText: {
    fontSize: 15,
    color: C.text,
    lineHeight: 21,
  },
  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  bubbleTime: {
    fontSize: 11,
    color: C.textSec,
  },
  statusIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  starIcon: {
    fontSize: 10,
  },

  // System Message
  systemMsgContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMsgBubble: {
    backgroundColor: C.sysMsg,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  systemText: {
    fontSize: 12,
    color: C.textSec,
    textAlign: 'center',
  },

  // Reply Reference
  replyReference: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 8,
  },
  replyBar: {
    width: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 1.5,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  replyText: {
    fontSize: 12,
    color: C.textSec,
    marginTop: 2,
  },

  // Voice Message
  voiceMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voicePlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 24,
  },
  voiceBar: {
    width: 2.5,
    backgroundColor: C.accent,
    borderRadius: 1.5,
  },
  voiceDuration: {
    fontSize: 11,
    color: C.textSec,
  },

  // Message Image
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },

  // Reply Container
  replyContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  replyBarLeft: {
    width: 3,
    backgroundColor: '#1A1A1A',
    borderRadius: 1.5,
    marginRight: 12,
  },
  replyContentContainer: {
    flex: 1,
  },
  replyToName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  replyToText: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 2,
  },
  replyCancelBtn: {
    padding: 4,
  },

  // Input Bar (Claude iOS Style)
  inputContainer: {
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  leftIcons: {
    flexDirection: 'row',
    gap: 4,
    paddingBottom: 6,
  },
  iconBtn: {
    padding: 6,
  },
  inputField: {
    flex: 1,
    backgroundColor: C.input,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    maxHeight: 120,
    minHeight: 40,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micBtnPlaceholder: {
    padding: 6,
    paddingBottom: 8,
  },

  // Bottom Sheet Menu
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  menuSection: {
    marginTop: 16,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textSec,
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: C.textSec,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: C.text,
  },
  infoSep: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  statusBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statusBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.surface,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: C.input,
    borderRadius: 12,
    alignItems: 'center',
  },
  toolIcon: {
    marginBottom: 4,
  },
  toolLabel: {
    fontSize: 12,
    color: C.textSec,
  },

  // Modals
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
  summaryText: {
    fontSize: 15,
    lineHeight: 22,
    color: C.text,
  },

  // Media Grid
  mediaGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  mediaGridItem: {
    width: (width - 32) / 3,
    height: (width - 32) / 3,
    padding: 4,
  },
  mediaGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
