import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { detectReminder, summarizeTask, transcribeAudio, analyzeTaskCommand } from '../../lib/ai';
import { supabase } from '../../lib/supabase';
import { uploadVoiceToStorage } from '../../lib/storage';
import { triggerTaskCompletedPush } from '../../lib/push-trigger';
import { useAuth } from '../../contexts/AuthContext';
import SmartCardPopup, { CardData, CardField } from '../../components/SmartCardPopup';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';

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
  user_id?: string;
  type: 'message' | 'voice_note' | 'system' | 'ai';
  content?: string;
  voice_url?: string;
  voice_duration?: number;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  profiles?: {
    full_name: string;
  };
  // Eski uyumluluk için
  sender_name?: string;
  message_type?: 'text' | 'voice' | 'image' | 'file' | 'system';
  transcript?: string;
  audio_url?: string;
  status?: 'sent' | 'delivered' | 'read';
  read_at?: string;
  is_starred?: boolean;
  reply_to_id?: string;
  reply_to?: Message;
}

interface Task {
  id: string;
  title: string;
  status: 'draft' | 'open' | 'in_progress' | 'done' | 'cancelled'; // VOXI v3: draft eklendi
  priority: 'urgent' | 'normal' | 'low';
  task_type?: 'lead' | 'quote' | 'order' | 'invoice' | 'after_sales' | 'internal'; // VOXI v3
  assigned_to: string;
  assigned_to_user?: string;
  created_by: string;
  workspace_id?: string; // VOXI v3: Sesten Göreve için
  due_date?: string;
  start_date?: string;
  created_at: string;
  updated_at?: string;
  is_group?: boolean;
  group_members?: string[];
  what_description?: string;
  when_details?: string;
  where_location?: string;
  how_expectations?: string;
  why_purpose?: string;
  customer_id?: string;
  order_id?: string;
  scope?: string;
  tags?: string[];
  checklist?: Array<{ id: string; text: string; done: boolean }>;
}

interface CardNote {
  id: string;
  card_type: string;
  card_id: string;
  content: string;
  created_by: string;
  created_at: string;
}

interface CardFile {
  id: string;
  card_type: string;
  card_id: string;
  file_type: 'image' | 'document' | 'audio';
  file_url: string;
  file_name: string;
  created_by: string;
  created_at: string;
}

export default function TaskDetail() {
  const { id, title } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [assignedMemberName, setAssignedMemberName] = useState<string | null>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isRespondingVoice, setIsRespondingVoice] = useState(false);
  const [voiceStatusText, setVoiceStatusText] = useState('');
  const [voiceSound, setVoiceSound] = useState<Audio.Sound | null>(null);

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string>(''); // Oluşturan kişinin adı
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [notes, setNotes] = useState<CardNote[]>([]);
  const [files, setFiles] = useState<CardFile[]>([]);
  
  // Smart Card Popup state'leri
  const [showEditCard, setShowEditCard] = useState(false);
  
  // VOXI v3 — Ekip Yönetimi (YENİ SİSTEM - Dropdown)
  const [taskMembers, setTaskMembers] = useState<{ id: string; full_name: string; role_title?: string; status?: string; avatar_url?: string; taskRole?: string }[]>([]); // Bu göreve atanmış
  const [allMembers, setAllMembers] = useState<{ id: string; full_name: string; role_title?: string; status?: string; avatar_url?: string; memberRole?: string }[]>([]); // Workspace'teki tüm üyeler
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Tab yapısı
  const [activeTab, setActiveTab] = useState<'detay' | 'sohbet'>('sohbet');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateField, setDateField] = useState<'due_date' | 'start_date'>('due_date');
  const [tempDate, setTempDate] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState(false);
  const [descText, setDescText] = useState('');
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationText, setLocationText] = useState('');
  const [viewingImage, setViewingImage] = useState<string | null>(null);
  
  // Etiketler, Müşteri, Checklist state'leri
  const [newTag, setNewTag] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string; city?: string }[]>([]);
  const [orderInfo, setOrderInfo] = useState<{ order_number: string; title: string } | null>(null);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newNote, setNewNote] = useState('');
  
  // Ses kaydı state'leri
  const [isRecordingDesc, setIsRecordingDesc] = useState(false);
  const [recordingDesc, setRecordingDesc] = useState<Audio.Recording | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  
  // Modal state'leri
  const [showTagModal, setShowTagModal] = useState(false);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Harita state'leri
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // VOXI v3 — Bağlantılar state'leri
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showStakeholderModal, setShowStakeholderModal] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  
  // Otomatik scroll — mesaj gönderilince en alta kaydır
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (id) {
      fetchTask();
      fetchMessages();
      fetchNotes();
      fetchFiles();
      fetchCustomers();
      fetchTaskMembers(); // VOXI v3 — Bu göreve atanmış ekip
      fetchAllMembers();  // VOXI v3 — Workspace'teki tüm üyeler
      
      // Current user ID'yi al
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setCurrentUserId(user.id);
      });
    }
  }, [id]);

  // ════════════ REALTIME SUBSCRIPTION ════════════
  // Yeni mesajları gerçek zamanlı al
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel('task-messages-' + id)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_messages',
          filter: `task_id=eq.${id}`,
        },
        (payload) => {
          console.log('🔔 Yeni mesaj:', payload);
          // Mesajları yenile
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Sohbet otomatik scroll - yeni mesaj geldiğinde
  useEffect(() => {
    if (messages.length > 0 && activeTab === 'sohbet') {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, activeTab]);

  // VOXI v3 — Ekip 1 veya daha az ise otomatik detay tab'ına geç
  useEffect(() => {
    if (taskMembers.length <= 1 && activeTab === 'sohbet') {
      setActiveTab('detay');
    }
  }, [taskMembers.length]);

  async function fetchTask() {
    const { data } = await supabase.from('tasks').select('*').eq('id', id).single();
    if (data) {
      setTask(data);
      
      // Oluşturan kişinin adını çek
      if (data.created_by) {
        const { data: creator } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', data.created_by)
          .single();
        
        if (creator?.full_name) {
          setCreatorName(creator.full_name);
        }
      }
    }
    setLoading(false);
  }

  // ============ SES KAYIT FONKSİYONLARI ============
  
  const recordingStartTime = useRef<number>(0);
  const recordingRef = useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Mikrofon izni verilmedi');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recordingRef.current = rec;
      setIsRecording(true);
      recordingStartTime.current = Date.now();
      setVoiceStatusText('Dinliyorum...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error('❌ Ses kaydı başlatılamadı:', err);
      Alert.alert('Hata', 'Ses kaydı başlatılamadı');
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    try {
      const duration = Date.now() - recordingStartTime.current;
      
      // Minimum 500ms kontrolü
      if (duration < 500) {
        console.warn('⚠️ Ses kaydı çok kısa (<500ms), iptal edildi');
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
        setIsRecording(false);
        setVoiceStatusText('Basılı Tut ve Söyle');
        return;
      }

      setVoiceStatusText('İşleniyor...');
      setIsRecording(false);
      setIsProcessingVoice(true);

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('Ses dosyası URI bulunamadı');
      }

      console.log('🎤 Transcribe başlıyor...');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const transcript = await transcribeAudio(uri);
      
      if (!transcript) {
        Alert.alert('Hata', 'Ses metne çevrilemedi');
        setVoiceStatusText('Basılı Tut ve Söyle');
        setIsProcessingVoice(false);
        return;
      }

      console.log('📝 Transcript:', transcript);
      setVoiceStatusText('Analiz ediliyor...');

      // Ekip listesini çek
      const { data: members } = await supabase
        .from('workspace_members')
        .select('user_id, profiles(id, full_name)')
        .eq('workspace_id', task?.workspace_id || '');

      const teamList: Array<{ id: string; full_name: string }> = members?.map((m: any) => ({
        id: m.profiles?.id || '',
        full_name: m.profiles?.full_name || '',
      })) || [];

      // Claude AI analiz
      const result = await analyzeTaskCommand(
        transcript,
        task?.title || '',
        {
          status: task?.status,
          assigned_to_name: assignedMemberName || undefined,
          due_date: task?.due_date || undefined,
          customer_name: (task as any)?.customer?.company_name || undefined,
          description: task?.what_description || undefined,
        },
        teamList
      );

      if (result.is_update && result.updates) {
        const updates: any = {};
        
        // assigned_to_name → assigned_to UUID eşleştirme
        if (result.updates.assigned_to_name) {
          const member = teamList.find(m => 
            m.full_name.toLowerCase().includes(result.updates!.assigned_to_name!.toLowerCase())
          );
          if (member) {
            updates.assigned_to = member.id;
          }
        }

        // Diğer alanları direkt kopyala
        if (result.updates.status) updates.status = result.updates.status;
        if (result.updates.due_date) updates.due_date = result.updates.due_date;
        if (result.updates.title) updates.title = result.updates.title;
        if (result.updates.description) updates.what_description = result.updates.description;

        // Müşteri adı → customer_id eşleştirme
        if (result.updates.customer_name) {
          const { data: customerMatch } = await supabase
            .from('customers')
            .select('id')
            .ilike('company_name', `%${result.updates.customer_name}%`)
            .limit(1)
            .single();
          
          if (customerMatch) {
            updates.customer_id = customerMatch.id;
          }
        }

        // Görevi güncelle
        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', id);

          if (error) throw error;

          // System log ekle (task_messages)
          const logMessages = [];
          if (result.updates.status) {
            logMessages.push(`Durum: ${result.updates.status}`);
          }
          if (result.updates.assigned_to_name) {
            logMessages.push(`Atanan: ${result.updates.assigned_to_name}`);
          }
          if (result.updates.due_date) {
            logMessages.push(`Tarih: ${result.updates.due_date}`);
          }

          for (const msg of logMessages) {
            await supabase.from('task_messages').insert({
              task_id: id,
              sender_id: session?.user?.id,
              message_type: 'system',
              content: msg,
            });
          }

          // UI güncelle - task'ı yeniden fetch et
          const { data: updatedTask } = await supabase
            .from('tasks')
            .select('*, customer:customers(company_name)')
            .eq('id', id)
            .single();
          
          if (updatedTask) {
            setTask(updatedTask as any);
          }
          
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }

      // Not ekle
      if (result.note) {
        await supabase.from('task_messages').insert({
          task_id: id,
          sender_id: session?.user?.id,
          message_type: 'text',
          content: result.note,
        });
      }

      // TTS ile yanıt
      speakText(result.spoken_response);

    } catch (err) {
      console.error('❌ Ses işleme hatası:', err);
      Alert.alert('Hata', 'Bir sorun oluştu, lütfen tekrar deneyin');
      setVoiceStatusText('Basılı Tut ve Söyle');
      setIsProcessingVoice(false);
    }
  };

  const speakText = async (text: string) => {
    try {
      setIsRespondingVoice(true);
      setVoiceStatusText('Cevaplıyorum...');

      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          voice: 'nova',
          input: text,
        }),
      });

      if (!response.ok) throw new Error('TTS API hatası');

      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const fileUri = `${FileSystem.documentDirectory}response_${Date.now()}.mp3`;
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

        const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
        setVoiceSound(sound);
        
        await sound.playAsync();
        
        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsRespondingVoice(false);
            setIsProcessingVoice(false);
            setVoiceStatusText('Basılı Tut ve Söyle');
            sound.unloadAsync();
            setVoiceSound(null);
          }
        });
      };
      
      reader.readAsDataURL(blob);

    } catch (err) {
      console.error('❌ TTS hatası:', err);
      setIsRespondingVoice(false);
      setIsProcessingVoice(false);
      setVoiceStatusText('Basılı Tut ve Söyle');
    }
  };
  
  // Team members çek
  // VOXI v3 — YENİ SİSTEM: Bu göreve atanmış ekip üyelerini çek
  const fetchTaskMembers = async () => {
    if (!id) return;
    
    try {
      const { data } = await supabase
        .from('task_members')
        .select('user_id, role')
        .eq('task_id', id);
      
      if (!data || data.length === 0) {
        setTaskMembers([]);
        return;
      }
      
      const members = [];
      for (const tm of data) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, full_name, role_title, status, avatar_url')
          .eq('id', tm.user_id)
          .single();
        
        if (p) {
          members.push({
            id: p.id,
            full_name: p.full_name,
            role_title: p.role_title || '',
            status: p.status || 'available',
            avatar_url: p.avatar_url,
            taskRole: tm.role,
          });
        }
      }
      
      setTaskMembers(members);
      console.log('✅ Task members:', members.length);
    } catch (err) {
      console.error('❌ fetchTaskMembers error:', err);
    }
  };

  // VOXI v3 — YENİ SİSTEM: Workspace'teki tüm üyeleri çek
  const fetchAllMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      
      if (!membership) return;
      
      const { data: workspaceMembers } = await supabase
        .from('workspace_members')
        .select('user_id, role')
        .eq('workspace_id', membership.workspace_id);
      
      if (!workspaceMembers) return;
      
      const members = [];
      for (const wm of workspaceMembers) {
        const { data: p } = await supabase
          .from('profiles')
          .select('id, full_name, role_title, status, avatar_url')
          .eq('id', wm.user_id)
          .single();
        
        if (p?.full_name) {
          members.push({
            id: p.id,
            full_name: p.full_name,
            role_title: p.role_title || '',
            status: p.status || 'available',
            avatar_url: p.avatar_url,
            memberRole: wm.role,
          });
        }
      }
      
      setAllMembers(members);
      console.log('✅ All workspace members:', members.length);
    } catch (err) {
      console.error('❌ fetchAllMembers error:', err);
    }
  };

  // VOXI v3 — Ekip üyesi ekle
  const addTeamMember = async (userId: string) => {
    if (!id) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      console.log('➕ VOXI v3: Adding team member:', userId);
      
      // task_members tablosuna ekle
      const { error } = await supabase
        .from('task_members')
        .insert({
          task_id: id,
          user_id: userId,
          role: 'member',
          added_by: user.id,
          added_at: new Date().toISOString(),
        });
      
      if (error) {
        // Zaten ekliyse hata vermez (UNIQUE constraint)
        if (error.code === '23505') {
          Alert.alert('Uyarı', 'Bu üye zaten ekipte.');
          return;
        }
        throw error;
      }
      
      // Ekip listesini yenile
      await fetchTaskMembers();
      
      // Dropdown'ı kapat
      setShowTeamDropdown(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      console.log('✅ VOXI v3: Team member added');
      
    } catch (err) {
      console.error('❌ VOXI v3: Add team member error:', err);
      Alert.alert('Hata', 'Ekip üyesi eklenemedi.');
    }
  };

  // VOXI v3 — YENİ SİSTEM: Ekip üyesini çıkar
  const removeTaskMember = async (userId: string) => {
    if (!id) return;
    
    Alert.alert(
      'Üyeyi Çıkar',
      'Bu üyeyi görevden çıkarmak istediğinize emin misiniz?',
      [
        { text: 'İptal' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase
                .from('task_members')
                .delete()
                .eq('task_id', id)
                .eq('user_id', userId);
              
              await fetchTaskMembers();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              console.log('✅ Member removed');
            } catch (err) {
              console.error('❌ Remove member error:', err);
              Alert.alert('Hata', 'Ekip üyesi çıkarılamadı.');
            }
          },
        },
      ]
    );
  };
  
  // Müşterileri çek
  async function fetchCustomers() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id, team_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();
      
      if (!membership?.workspace_id) return;
      
      const { data: customerList } = await supabase
        .from('customers')
        .select('id, company_name, contact_name, city')
        .eq('workspace_id', membership.workspace_id)
        .order('company_name');
      
      if (customerList) {
        setCustomers(customerList.map(c => ({ 
          id: c.id, 
          name: c.company_name, 
          city: c.city 
        })));
      }
    } catch (error) {
      console.error('Customers fetch error:', error);
    }
  }
  
  // Sipariş bilgisini çek
  async function fetchOrderInfo() {
    if (!task?.order_id) return;
    try {
      const { data } = await supabase
        .from('orders')
        .select('title, order_number')
        .eq('id', task.order_id)
        .single();
      if (data) {
        setOrderInfo(data);
      }
    } catch (error) {
      console.error('Order fetch error:', error);
    }
  }
  
  // Sayfa odağa geldiğinde müşterileri yenile
  useFocusEffect(
    useCallback(() => {
      fetchCustomers();
    }, [])
  );
  
  // Sipariş ID değiştiğinde bilgileri yenile
  useEffect(() => {
    if (task?.order_id) {
      fetchOrderInfo();
    }
  }, [task?.order_id]);
  
  // ═══ GENEL GÜNCELLEME FONKSİYONU ═══
  const updateField = async (field: string, value: any) => {
    if (!task) return;
    
    // 1. Optimistic UI update
    setTask(prev => prev ? { ...prev, [field]: value } : prev);
    
    // 2. DB update
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) throw error;
      
      console.log(`✅ ${field} güncellendi:`, value);
      
      // VOXI v3: assigned_to_user değişirse task_members'a da ekle
      if (field === 'assigned_to_user' && value && id) {
        console.log('🟢 VOXI v3: Syncing assigned_to_user with task_members');
        
        const { data: { user } } = await supabase.auth.getUser();
        const addedBy = user?.id || null;
        
        const { error: memberError } = await supabase
          .from('task_members')
          .insert({
            task_id: id,
            user_id: value,
            role: 'member',
            added_by: addedBy,
          });
        
        // UNIQUE constraint hatası normal (zaten ekipte)
        if (memberError && memberError.code !== '23505') {
          console.error('❌ task_members sync error:', memberError);
        } else {
          console.log('✅ VOXI v3: task_members synced');
          // Ekip listesini yenile
          await fetchTaskMembers();
        }
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error(`❌ ${field} güncelleme hatası:`, err);
      // Revert
      fetchTask();
      Alert.alert('Hata', 'Güncelleme başarısız. Tekrar deneyin.');
    }
  };
  
  // ═══ TARİH YARDIMCI FONKSİYONLARI ═══
  const today = () => new Date().toISOString().split('T')[0];
  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };
  const endOfWeek = () => {
    const d = new Date();
    d.setDate(d.getDate() + (5 - d.getDay()));
    return d.toISOString().split('T')[0];
  };
  
  // ═══ KONUM FONKSİYONLARI ═══
  const handleGetLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum için izin verin.');
        return;
      }
      
      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      
      const text = address
        ? `${address.district || ''} ${address.city || ''} ${address.region || ''}`.trim()
        : `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;
      
      updateField('where_location', text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Konum hatası:', error);
      Alert.alert('Hata', 'Konum alınamadı');
    }
  };
  
  // Harita: Mevcut konuma git
  const goToMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum izni verilmedi');
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      // Reverse geocode
      const [result] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      const address = [
        result.street,
        result.district,
        result.city,
      ].filter(Boolean).join(', ');
      
      setSelectedAddress(address || `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)}`);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      Alert.alert('Hata', 'Konum alınamadı');
    }
  };
  
  // Harita: Reverse geocode (koordinat → adres)
  const reverseGeocodeLocation = async (coordinate: { latitude: number; longitude: number }) => {
    try {
      const [result] = await Location.reverseGeocodeAsync(coordinate);
      const address = [
        result.street,
        result.district,
        result.city,
      ].filter(Boolean).join(', ');
      
      setSelectedAddress(address || `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
    } catch (err) {
      setSelectedAddress(`${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`);
    }
  };
  
  // Harita: Arama (basit geocoding)
  const handleSearchLocation = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) return;
    
    try {
      const results = await Location.geocodeAsync(query + ', Turkey');
      if (results.length > 0) {
        const loc = results[0];
        setSelectedLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
        reverseGeocodeLocation({ latitude: loc.latitude, longitude: loc.longitude });
      }
    } catch (err) {
      console.log('Arama hatası:', err);
    }
  };
  
  // Task'ı CardData formatına çevir
  const taskToCardData = (): CardData | null => {
    if (!task) return null;
    
    return {
      intent: 'update_task',
      card_type: 'task',
      human_response: '',
      fields: [
        { 
          key: 'title', 
          label: 'Başlık', 
          type: 'text', 
          value: task.title, 
          filled_by: 'user',
          editable: true, 
          voice_editable: true, 
          required: true 
        },
        { 
          key: 'assigned_to', 
          label: 'Atanan', 
          type: 'member_select', 
          value: task.assigned_to,
          filled_by: 'user',
          editable: true 
        },
        { 
          key: 'customer', 
          label: 'Müşteri', 
          type: 'text', 
          value: task.customer_id || null,
          filled_by: 'user',
          editable: true 
        },
        { 
          key: 'priority', 
          label: 'Öncelik', 
          type: 'chip_select', 
          value: task.priority || 'normal',
          filled_by: 'user',
          options: ['low', 'normal', 'urgent'], 
          option_labels: ['Düşük', 'Normal', 'Acil'], 
          editable: true 
        },
        { 
          key: 'status', 
          label: 'Durum', 
          type: 'chip_select', 
          value: task.status || 'open',
          filled_by: 'user',
          options: ['open', 'in_progress', 'done'], 
          option_labels: ['Açık', 'Devam', 'Bitti'], 
          editable: true 
        },
        { 
          key: 'due_date', 
          label: 'Bitiş Tarihi', 
          type: 'date', 
          value: task.due_date || null,
          filled_by: task.due_date ? 'user' : 'none',
          editable: true,
          placeholder: '⚠️ Belirtilmedi', 
          quick_options: ['today', 'tomorrow', 'this_week'], 
          quick_labels: ['Bugün', 'Yarın', 'Bu Hafta'] 
        },
        { 
          key: 'scope', 
          label: 'Kapsam', 
          type: 'chip_select', 
          value: task.scope || null,
          filled_by: task.scope ? 'user' : 'none',
          options: ['montaj', 'servis', 'teslimat', 'bakim', 'diger'], 
          option_labels: ['Montaj', 'Servis', 'Teslimat', 'Bakım', 'Diğer'], 
          editable: true 
        },
        { 
          key: 'location', 
          label: 'Konum', 
          type: 'location', 
          value: task.where_location || null,
          filled_by: task.where_location ? 'user' : 'none',
          editable: true,
          placeholder: '⚠️ Belirtilmedi', 
          gps_enabled: true 
        },
        { 
          key: 'notes', 
          label: 'Notlar', 
          type: 'multiline', 
          value: task.what_description || '',
          filled_by: task.what_description ? 'user' : 'none',
          editable: true, 
          voice_editable: true 
        },
      ],
      inferred_notes: [],
      follow_up_questions: [],
    };
  };
  
  // Kart güncelleme handler
  const handleUpdateTask = async (values: Record<string, any>) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: values.title,
          assigned_to: values.assigned_to,
          customer_id: values.customer,
          priority: values.priority,
          status: values.status,
          due_date: values.due_date,
          scope: values.scope,
          where_location: values.location,
          what_description: values.notes,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Kartı kapat
      setShowEditCard(false);
      
      // Task'ı yeniden çek
      fetchTask();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Task update error:', error);
      Alert.alert('Hata', 'Görev güncellenemedi');
    }
  };
  
  // Status güncelleme (hızlı chip'ler için)
  const updateTaskStatus = async (status: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      // Tamamlandıysa push bildirim gönder
      if (status === 'done' && task) {
        triggerTaskCompletedPush({
          id: task.id,
          title: task.title,
          completed_by: 'Volkan',
          created_by: task.created_by,
        });
      }
      
      fetchTask();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error('Status update error:', error);
    }
  };

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('task_messages')
      .select('*, profiles:user_id(full_name)')
      .eq('task_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Mesajlar yüklenemedi:', error);
      return;
    }

    if (data) {
      // Uyumluluk için sender_name ekle
      const messagesWithSender = data.map(msg => ({
        ...msg,
        sender_name: msg.profiles?.full_name || 'Bilinmeyen',
        transcript: msg.content || '',
        message_type: msg.type === 'voice_note' ? 'voice' : 'text',
        audio_url: msg.voice_url,
      }));
      
      setMessages(messagesWithSender as any);
      
      // Son görülme hesapla
      const otherMessages = messagesWithSender.filter((m) => m.user_id !== session?.user?.id);
      if (otherMessages.length > 0) {
        const lastMsg = otherMessages[otherMessages.length - 1];
        setLastSeen(lastMsg.created_at);
      }
      
      await markMessagesAsRead();
    }
  }

  async function fetchNotes() {
    const { data } = await supabase
      .from('card_notes')
      .select('*')
      .eq('card_type', 'task')
      .eq('card_id', id)
      .order('created_at', { ascending: false });
    if (data) setNotes(data);
  }

  async function fetchFiles() {
    const { data } = await supabase
      .from('card_files')
      .select('*')
      .eq('card_type', 'task')
      .eq('card_id', id)
      .order('created_at', { ascending: false });
    if (data) setFiles(data);
  }

  async function markMessagesAsRead() {
    // task_messages'da read durumu yok, gerekirse eklenebilir
  }

  async function sendMessage() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      const { data: msgData, error } = await supabase
        .from('task_messages')
        .insert({
          task_id: id,
          user_id: session?.user?.id,
          type: 'message',
          content: text,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Mesaj hatası:', error);
        setSending(false);
        return;
      }

      // Mesajları yenile
      await fetchMessages();
      setReplyTo(null);

      // Hatırlatıcı algılama (opsiyonel)
      try {
        const reminder = await detectReminder(text);
        if (reminder && msgData) {
          await supabase.from('reminders').insert({
            task_id: id,
            message_id: msgData.id,
            remind_at: reminder.date,
            note: reminder.note,
            created_by: session?.user?.id,
          });
        }
      } catch (e) {
        console.log('❌ Hatırlatma hatası:', e);
      }

    } catch (err) {
      console.error('❌ Mesaj gönderme hatası:', err);
    } finally {
      setSending(false);
    }
  }

  async function sendImageMessage(uri: string, fileName?: string) {
    try {
      const { error } = await supabase
        .from('task_messages')
        .insert({
          task_id: id,
          user_id: session?.user?.id,
          type: 'message',
          content: 'Fotoğraf paylaşıldı',
          file_url: uri,
          file_name: fileName || 'image.jpg',
        });

      if (error) throw error;
      await fetchMessages();
    } catch (err) {
      console.error('❌ Fotoğraf gönderme hatası:', err);
      Alert.alert('Hata', 'Fotoğraf gönderilemedi');
    }
  }

  async function pickPhoto() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // ← Deprecated fix
        quality: 0.8,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          await sendImageMessage(asset.uri);
        }
        Alert.alert('✅ Eklendi', `${result.assets.length} fotoğraf eklendi.`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Photo picker error:', error);
      Alert.alert('Hata', 'Fotoğraf seçilemedi');
    }
  }

  async function startRecordingChat() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      };
      
      const { recording: rec } = await Audio.Recording.createAsync(recordingOptions);
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

  async function stopRecordingChat() {
    if (!recording) return;
    
    try {
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

      if (!uri) {
        Alert.alert('Hata', 'Ses kaydı başarısız');
        return;
      }

      // Supabase Storage'a upload (task-media bucket)
      const fileName = `${id}/voice_${Date.now()}.wav`;
      const fileData = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-media')
        .upload(fileName, decode(fileData), {
          contentType: 'audio/wav',
        });

      if (uploadError) {
        console.error('❌ Upload hatası:', uploadError);
        // Local URI ile devam et
      }

      const publicUrl = uploadError 
        ? uri 
        : supabase.storage.from('task-media').getPublicUrl(fileName).data.publicUrl;

      // task_messages'a ekle
      await supabase.from('task_messages').insert({
        task_id: id,
        user_id: session?.user?.id,
        type: 'voice_note',
        content: 'Sesli not',
        voice_url: publicUrl,
        voice_duration: duration,
      });

      await fetchMessages();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (err) {
      console.error('❌ Sesli not hatası:', err);
      Alert.alert('Hata', 'Sesli not gönderilemedi');
    }
  }

  // Base64 decode helper (storage upload için)
  function decode(base64: string) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let str = base64.replace(/=+$/, '');
    let output = '';

    if (str.length % 4 === 1) {
      throw new Error('Invalid base64 string');
    }

    for (
      let bc = 0, bs = 0, buffer, i = 0;
      (buffer = str.charAt(i++));
      ~buffer && ((bs = bc % 4 ? bs * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return output;
  }

  async function updateTaskPriority() {
    const newPriority = task?.priority === 'urgent' ? 'normal' : 'urgent';
    await supabase.from('tasks').update({ priority: newPriority }).eq('id', id);
    fetchTask();
  }

  // ════════════ MESAJ RENDER FONKSİYONLARI ════════════

  const getFilteredMessages = () => {
    if (showStarredOnly) {
      return messages.filter((m) => (m as any).is_starred);
    }
    return messages;
  };

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const renderMessage = ({ item: message }: { item: Message }) => {
    const isOwnMessage = message.user_id === session?.user?.id;
    const senderName = message.profiles?.full_name || message.sender_name || 'Bilinmeyen';
    const initials = getInitials(senderName);
    const messageTime = new Date(message.created_at).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    // System mesajları (ortada, gri)
    if (message.type === 'system') {
      return (
        <View style={{ alignItems: 'center', marginVertical: 8 }}>
          <Text style={{ fontSize: 12, color: '#8E8E93', fontStyle: 'italic', textAlign: 'center' }}>
            ⟳ {message.content}
          </Text>
        </View>
      );
    }

    // Sesli not
    if (message.type === 'voice_note' || message.message_type === 'voice') {
      return (
        <View
          style={{
            flexDirection: isOwnMessage ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            marginVertical: 4,
            marginHorizontal: 12,
          }}
        >
          {/* İnisyal */}
          {!isOwnMessage && (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#E5E5EA',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#3C3C43' }}>{initials}</Text>
            </View>
          )}

          <View style={{ maxWidth: '70%' }}>
            {/* İsim + Saat */}
            <Text
              style={{
                fontSize: 11,
                color: '#8E8E93',
                marginBottom: 4,
                textAlign: isOwnMessage ? 'right' : 'left',
                marginHorizontal: 4,
              }}
            >
              {senderName} · {messageTime}
            </Text>

            {/* Sesli not balonu */}
            <TouchableOpacity
              style={{
                backgroundColor: isOwnMessage ? '#1A1A1A' : '#F0EDE8',
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
              onPress={() => {
                // Sesli notu çal
                Alert.alert('Sesli Not', 'Sesli not çalma özelliği yakında eklenecek');
              }}
            >
              <Ionicons name="play" size={16} color={isOwnMessage ? '#FFFFFF' : '#1A1A1A'} />
              <Text style={{ fontSize: 14, color: isOwnMessage ? '#FFFFFF' : '#1A1A1A' }}>
                Sesli not · {message.voice_duration || 0}s
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Dosya eki
    if (message.file_url && message.file_name) {
      return (
        <View
          style={{
            flexDirection: isOwnMessage ? 'row-reverse' : 'row',
            alignItems: 'flex-end',
            marginVertical: 4,
            marginHorizontal: 12,
          }}
        >
          {/* İnisyal */}
          {!isOwnMessage && (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#E5E5EA',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#3C3C43' }}>{initials}</Text>
            </View>
          )}

          <View style={{ maxWidth: '70%' }}>
            {/* İsim + Saat */}
            <Text
              style={{
                fontSize: 11,
                color: '#8E8E93',
                marginBottom: 4,
                textAlign: isOwnMessage ? 'right' : 'left',
                marginHorizontal: 4,
              }}
            >
              {senderName} · {messageTime}
            </Text>

            {/* Dosya balonu */}
            <TouchableOpacity
              style={{
                backgroundColor: isOwnMessage ? '#1A1A1A' : '#F0EDE8',
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
              onPress={() => {
                if (message.file_url) {
                  Linking.openURL(message.file_url);
                }
              }}
            >
              <Ionicons name="document-attach" size={16} color={isOwnMessage ? '#FFFFFF' : '#1A1A1A'} />
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 14, color: isOwnMessage ? '#FFFFFF' : '#1A1A1A' }}
                  numberOfLines={1}
                >
                  {message.file_name}
                </Text>
                {message.file_size && (
                  <Text style={{ fontSize: 11, color: isOwnMessage ? '#CCCCCC' : '#8E8E93' }}>
                    {(message.file_size / 1024 / 1024).toFixed(1)} MB
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Normal metin mesajı
    return (
      <View
        style={{
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          marginVertical: 4,
          marginHorizontal: 12,
        }}
      >
        {/* İnisyal */}
        {!isOwnMessage && (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: '#E5E5EA',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#3C3C43' }}>{initials}</Text>
          </View>
        )}

        <View style={{ maxWidth: '70%' }}>
          {/* İsim + Saat */}
          <Text
            style={{
              fontSize: 11,
              color: '#8E8E93',
              marginBottom: 4,
              textAlign: isOwnMessage ? 'right' : 'left',
              marginHorizontal: 4,
            }}
          >
            {senderName} · {messageTime}
          </Text>

          {/* Mesaj balonu */}
          <TouchableOpacity
            onLongPress={() => handleLongPress(message)}
            style={{
              backgroundColor: isOwnMessage ? '#1A1A1A' : '#F0EDE8',
              borderRadius: 16,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ fontSize: 15, color: isOwnMessage ? '#FFFFFF' : '#1A1A1A' }}>
              {message.content || message.transcript}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  async function toggleStar(messageId: string, currentStarred: boolean) {
    // task_messages'da is_starred kolonu yok, gerekirse eklenebilir
    console.log('toggleStar: task_messages tablosunda desteklenmiyor');
  }

  async function deleteMessage(messageId: string) {
    Alert.alert('Sil', 'Mesaj silinsin mi?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('task_messages').delete().eq('id', messageId);
          if (error) {
            console.error('❌ Mesaj silinemedi:', error);
            Alert.alert('Hata', 'Mesaj silinemedi');
          } else {
            await fetchMessages();
          }
        },
      },
    ]);
  }

  // ════════════ DOSYA EKİ FONKSİYONU ════════════
  
  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/vnd.ms-excel', 
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const fileName = file.name;
      const fileSize = file.size || 0;

      // Supabase Storage'a upload (task-media bucket)
      const uploadFileName = `${id}/doc_${Date.now()}_${fileName}`;
      const fileUri = file.uri;

      // Dosyayı base64'e çevir
      const fileData = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('task-media')
        .upload(uploadFileName, decode(fileData), {
          contentType: file.mimeType || 'application/octet-stream',
        });

      if (uploadError) {
        console.error('❌ Upload hatası:', uploadError);
        Alert.alert('Hata', 'Dosya yüklenemedi');
        return;
      }

      const publicUrl = supabase.storage.from('task-media').getPublicUrl(uploadFileName).data.publicUrl;

      // task_messages'a ekle
      await supabase.from('task_messages').insert({
        task_id: id,
        user_id: session?.user?.id,
        type: 'message',
        content: 'Dosya paylaşıldı',
        file_url: publicUrl,
        file_name: fileName,
        file_size: fileSize,
      });

      await fetchMessages();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    } catch (err) {
      console.error('❌ Dosya seçme hatası:', err);
      Alert.alert('Hata', 'Dosya seçilemedi');
    }
  }

  function handleLongPress(message: Message) {
    Alert.alert('Mesaj', message.transcript?.substring(0, 50) + (message.transcript && message.transcript.length > 50 ? '...' : ''), [
      {
        text: 'Kopyala',
        onPress: () => {
          if (message.transcript) {
            Clipboard.setString(message.transcript);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('✅', 'Mesaj kopyalandı');
          }
        },
      },
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

  async function update5N1K(field: string, currentValue: string, label: string) {
    Alert.prompt(
      label,
      `Mevcut: ${currentValue || 'Belirtilmedi'}`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async (text) => {
            if (text !== undefined) {
              await supabase.from('tasks').update({ [field]: text }).eq('id', id);
              fetchTask();
            }
          },
        },
      ],
      'plain-text',
      currentValue
    );
  }

  async function addNote() {
    Alert.prompt(
      'Not Ekle',
      'Not içeriği',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ekle',
          onPress: async (text) => {
            if (text && text.trim()) {
              await supabase.from('card_notes').insert({
                card_type: 'task',
                card_id: id,
                content: text.trim(),
                created_by: 'Volkan',
              });
              fetchNotes();
            }
          },
        },
      ],
      'plain-text'
    );
  }

  async function addImageFile() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await supabase.from('card_files').insert({
        card_type: 'task',
        card_id: id,
        file_type: 'image',
        file_url: result.assets[0].uri,
        file_name: 'photo.jpg',
        created_by: 'Volkan',
      });
      fetchFiles();
    }
  }

  async function addDocumentFile() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets[0]) {
      await supabase.from('card_files').insert({
        card_type: 'task',
        card_id: id,
        file_type: 'document',
        file_url: result.assets[0].uri,
        file_name: result.assets[0].name,
        created_by: 'Volkan',
      });
      fetchFiles();
    }
  }

  async function deleteTask() {
    Alert.alert(
      'Görevi Sil',
      'Bu görevi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('tasks').delete().eq('id', id);
            router.back();
          },
        },
      ]
    );
  }

  function getMediaMessages() {
    return messages.filter((m) => m.message_type === 'image' || m.file_url);
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
              {task?.is_group && task?.group_members && (
                <Text style={styles.headerSubtitle} numberOfLines={1}>
                  {task.group_members.join(', ')}
                </Text>
              )}
            </View>

            <TouchableOpacity onPress={() => setShowOptionsMenu(true)} style={styles.optionsButton}>
              <Ionicons name="ellipsis-horizontal" size={22} color="#3C3C43" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* ═══ DRAFT ONAY BANNER (VOXI — Sesten Göreve Akış) ═══ */}
        {task?.status === 'draft' && (
          <View style={{
            flexDirection: 'row',
            padding: 16,
            gap: 12,
            backgroundColor: '#FFF9E6',
            borderBottomWidth: 1,
            borderBottomColor: '#E8E5DF',
          }}>
            <TouchableOpacity
              onPress={async () => {
                if (!task?.id) return;
                
                try {
                  // 1. Status'u open yap
                  const { error: updateError } = await supabase
                    .from('tasks')
                    .update({ status: 'open' })
                    .eq('id', task.id);
                  
                  if (updateError) throw updateError;
                  
                  // 2. Atanan kişiye bildirim gönder
                  if (task.assigned_to_user) {
                    await supabase.from('notifications').insert({
                      user_id: task.assigned_to_user,
                      type: 'task_assigned',
                      title: `Sana yeni görev atandı`,
                      body: task.title,
                      reference_type: 'task',
                      reference_id: task.id,
                      workspace_id: task.workspace_id,
                    });
                  }
                  
                  // 3. Task members'a ekle (oluşturan + atanan)
                  await supabase.from('task_members').upsert([
                    { task_id: task.id, user_id: task.created_by, role: 'creator' },
                    ...(task.assigned_to_user ? [{ task_id: task.id, user_id: task.assigned_to_user, role: 'assignee' }] : []),
                  ]);
                  
                  console.log('✅ Görev onaylandı ve bildirim gönderildi');
                  Alert.alert('✅ Onaylandı', 'Görev onaylandı ve bildirim gönderildi');
                  fetchTask(); // Sayfayı yenile
                } catch (err) {
                  console.error('❌ Onay hatası:', err);
                  Alert.alert('Hata', 'Görev onaylanamadı');
                }
              }}
              style={{
                flex: 1,
                padding: 14,
                borderRadius: 12,
                backgroundColor: '#34C759',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>
                ✓ Onayla ve Gönder
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={async () => {
                Alert.alert(
                  'Görevi Sil',
                  'Bu taslak görevi silmek istediğinden emin misin?',
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const { error } = await supabase
                            .from('tasks')
                            .delete()
                            .eq('id', task.id);
                          
                          if (error) throw error;
                          
                          console.log('✅ Taslak görev silindi');
                          router.back();
                        } catch (err) {
                          console.error('❌ Silme hatası:', err);
                          Alert.alert('Hata', 'Görev silinemedi');
                        }
                      },
                    },
                  ]
                );
              }}
              style={{
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FF3B30',
              }}
            >
              <Text style={{ color: '#FF3B30', fontWeight: '600' }}>Sil</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ TAB SWITCHER ═══ */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            onPress={() => {
              setActiveTab('detay');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.tab, activeTab === 'detay' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'detay' && styles.tabTextActive]}>
              Detay
            </Text>
          </TouchableOpacity>
          
          {/* Sohbet tab - her zaman görünür */}
          <TouchableOpacity
            onPress={() => {
              setActiveTab('sohbet');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[styles.tab, activeTab === 'sohbet' && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === 'sohbet' && styles.tabTextActive]}>
              Sohbet
            </Text>
          </TouchableOpacity>
        </View>

        {/* ═══ TAB CONTENT ═══ */}
        {activeTab === 'sohbet' ? (
          /* SOHBET TAB — Mevcut mesajlaşma ekranı */
          <>
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
              {/* Paperclip Button (Dosya Ekle) */}
              <TouchableOpacity style={{ padding: 6 }} onPress={pickDocument}>
                <Ionicons name="attach-outline" size={24} color="#3C3C43" />
              </TouchableOpacity>

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
          </>
        ) : (
          /* DETAY TAB — Yeni evrensel kart tasarımı */
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          >
            <ScrollView 
              ref={scrollViewRef}
              style={styles.detayTab} 
              contentContainerStyle={{ paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
            >
            {/* ════════════════════════════════════════════════════════ */}
            {/* DETAY TAB — SADELEŞTİRİLMİŞ YENİ TASARIM (6 BÖLÜM)      */}
            {/* ════════════════════════════════════════════════════════ */}
            
            {/* 1. BAŞLIK + META */}
            <View style={styles.detaySection}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A', flex: 1 }}>
                  {task?.title || 'Görev'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.prompt(
                      'Başlığı Düzenle',
                      '',
                      [
                        { text: 'İptal', style: 'cancel' },
                        {
                          text: 'Kaydet',
                          onPress: async (newTitle) => {
                            if (newTitle && newTitle.trim()) {
                              await supabase.from('tasks').update({ title: newTitle.trim() }).eq('id', id);
                              fetchTask();
                              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            }
                          }
                        }
                      ],
                      'plain-text',
                      task?.title
                    );
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="pencil" size={20} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 4 }}>
                {task?.created_at ? new Date(task.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) : ''} · {creatorName || 'Bilinmeyen'} oluşturdu
              </Text>
            </View>

            {/* ══════════ 2. DURUM + GÖREV TÜRÜ (tek satır) ══════════ */}
            <View style={styles.detaySection}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {/* Durum Chips */}
                <TouchableOpacity
                  onPress={() => updateTaskStatus('open')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: task?.status === 'open' ? '#1A1A1A' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: task?.status === 'open' ? '#1A1A1A' : '#E5E5EA',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: task?.status === 'open' ? '#FFFFFF' : '#3C3C43' }}>
                    ● Açık
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateTaskStatus('in_progress')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: task?.status === 'in_progress' ? '#1A1A1A' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: task?.status === 'in_progress' ? '#1A1A1A' : '#E5E5EA',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: task?.status === 'in_progress' ? '#FFFFFF' : '#3C3C43' }}>
                    Devam
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => updateTaskStatus('done')}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: task?.status === 'done' ? '#1A1A1A' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: task?.status === 'done' ? '#1A1A1A' : '#E5E5EA',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: task?.status === 'done' ? '#FFFFFF' : '#3C3C43' }}>
                    Bitti
                  </Text>
                </TouchableOpacity>
                
                {/* Tür Dropdown Chip */}
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert(
                      'Görev Türü',
                      '',
                      [
                        { text: 'İptal', style: 'cancel' },
                        { text: 'Ön Görüşme', onPress: () => updateField('task_type', 'lead') },
                        { text: 'Teklif', onPress: () => updateField('task_type', 'quote') },
                        { text: 'Sipariş', onPress: () => updateField('task_type', 'order') },
                        { text: 'Fatura', onPress: () => updateField('task_type', 'invoice') },
                        { text: 'Satış Sonrası', onPress: () => updateField('task_type', 'after_sales') },
                        { text: 'Kurumsal', onPress: () => updateField('task_type', 'internal') }
                      ]
                    );
                  }}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#E5E5EA',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#3C3C43' }}>
                    {task?.task_type === 'lead' ? 'Ön Görüşme' :
                     task?.task_type === 'quote' ? 'Teklif' :
                     task?.task_type === 'order' ? 'Sipariş' :
                     task?.task_type === 'invoice' ? 'Fatura' :
                     task?.task_type === 'after_sales' ? 'Satış Sonrası' : 'Kurumsal'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#8E8E93" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ══════════ 3. BİLGİ SATIRLARI ══════════ */}
            <View style={styles.detaySection}>
              {/* Atanan */}
              <TouchableOpacity
                onPress={() => {
                  const availableMembers = allMembers.filter(
                    m => !taskMembers.some(tm => tm.id === m.id)
                  );
                  
                  if (availableMembers.length === 0) {
                    Alert.alert('Ekip', 'Tüm ekip üyeleri zaten bu görevde');
                    return;
                  }
                  
                  Alert.alert(
                    'Atanan Değiştir',
                    'Görevi kime atamak istersiniz?',
                    [
                      { text: 'İptal', style: 'cancel' },
                      ...availableMembers.slice(0, 8).map(m => ({
                        text: m.full_name,
                        onPress: () => {
                          updateField('assigned_to', m.full_name);
                          updateField('assigned_to_user', m.id);
                        }
                      }))
                    ]
                  );
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' }}
              >
                <Ionicons name="person-outline" size={20} color="#3C3C43" style={{ marginRight: 12, width: 24 }} />
                <Text style={{ flex: 1, fontSize: 15, color: '#1A1A1A' }}>
                  {task?.assigned_to || 'Atanmadı'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
              </TouchableOpacity>
              
              {/* Tarih */}
              <TouchableOpacity
                onPress={() => {
                  setDateField('due_date');
                  setShowDatePicker(true);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' }}
              >
                <Ionicons name="calendar-outline" size={20} color="#3C3C43" style={{ marginRight: 12, width: 24 }} />
                <Text style={{ flex: 1, fontSize: 15, color: '#1A1A1A' }}>
                  {task?.due_date ? new Date(task.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Tarih ekle'}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
              </TouchableOpacity>
              
              {/* Müşteri */}
              <TouchableOpacity
                onPress={() => {
                  if (task?.customer_id) {
                    console.log('🔗 Müşteri kartı açılıyor:', task.customer_id);
                    router.push(`/customer/${task.customer_id}` as any);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F2F2F7' }}
              >
                <Ionicons name="business-outline" size={20} color="#3C3C43" style={{ marginRight: 12, width: 24 }} />
                <Text style={{ flex: 1, fontSize: 15, color: task?.customer_id ? '#1A1A1A' : '#8E8E93' }}>
                  {task?.customer_id ? customers.find(c => c.id === task.customer_id)?.name || 'Müşteri' : '—'}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    if (task?.customer_id) {
                      console.log('🔗 Müşteri kartı açılıyor:', task.customer_id);
                      router.push(`/customer/${task.customer_id}` as any);
                    } else {
                      // Boş müşteri kartı oluştur ve aç
                      console.log('🔗 Yeni müşteri kartı oluşturuluyor');
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        console.log('👤 User:', user?.id);
                        if (!user) {
                          Alert.alert('Hata', 'Kullanıcı bulunamadı');
                          return;
                        }
                        
                        const { data: membership } = await supabase
                          .from('workspace_members')
                          .select('workspace_id, team_id')
                          .eq('user_id', user.id)
                          .eq('is_active', true)
                          .limit(1)
                          .single();
                        
                        console.log('🏢 Workspace ID:', membership?.workspace_id);
                        if (!membership?.workspace_id) {
                          Alert.alert('Hata', 'Workspace bulunamadı');
                          return;
                        }

                        console.log('💾 Insert ediliyor...');
                        const { data: newCustomer, error } = await supabase
                          .from('customers')
                          .insert({
                            company_name: 'Yeni Müşteri',
                            workspace_id: membership.workspace_id,
                            created_by: user.id,
                            owner: user.id,
                            status: 'active',
                          })
                          .select()
                          .single();

                        console.log('✅ Insert sonucu:', { newCustomer, error });
                        if (error) throw error;

                        if (newCustomer) {
                          console.log('🚀 Yönlendiriliyor:', newCustomer.id);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          router.push(`/customer/${newCustomer.id}` as any);
                        } else {
                          Alert.alert('Hata', 'Müşteri oluşturuldu ama data boş');
                        }
                      } catch (err: any) {
                        console.error('❌ Müşteri oluşturma hatası:', err);
                        Alert.alert('Hata', err.message || 'Müşteri oluşturulamadı');
                      }
                    }
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#53BDEB', fontWeight: '500' }}>
                    {task?.customer_id ? 'Aç' : '+ Ekle'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
              
              {/* Sipariş */}
              <TouchableOpacity
                onPress={() => {
                  if (task?.order_id) {
                    console.log('🔗 Sipariş kartı açılıyor:', task.order_id);
                    router.push(`/order/${task.order_id}` as any);
                  }
                }}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }}
              >
                <Ionicons name="cube-outline" size={20} color="#3C3C43" style={{ marginRight: 12, width: 24 }} />
                <Text style={{ flex: 1, fontSize: 15, color: task?.order_id ? '#1A1A1A' : '#8E8E93' }}>
                  {task?.order_id && orderInfo ? `${orderInfo.order_number} · ${orderInfo.title}` : task?.order_id ? 'Sipariş yükleniyor...' : '—'}
                </Text>
                <TouchableOpacity
                  onPress={async () => {
                    if (task?.order_id) {
                      console.log('🔗 Sipariş kartı açılıyor:', task.order_id);
                      router.push(`/order/${task.order_id}` as any);
                    } else {
                      // Boş sipariş kartı oluştur ve aç
                      console.log('🔗 Yeni sipariş kartı oluşturuluyor');
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        console.log('👤 User:', user?.id);
                        if (!user) {
                          Alert.alert('Hata', 'Kullanıcı bulunamadı');
                          return;
                        }
                        
                        const { data: membership } = await supabase
                          .from('workspace_members')
                          .select('workspace_id, team_id')
                          .eq('user_id', user.id)
                          .eq('is_active', true)
                          .limit(1)
                          .single();
                        
                        console.log('🏢 Workspace ID:', membership?.workspace_id);
                        if (!membership?.workspace_id) {
                          Alert.alert('Hata', 'Workspace bulunamadı');
                          return;
                        }

                        // Sipariş numarası oluştur
                        const orderNumber = `SIP-${Date.now().toString().slice(-6)}`;
                        console.log('📦 Order number:', orderNumber);

                        console.log('💾 Insert ediliyor...');
                        const { data: newOrder, error } = await supabase
                          .from('orders')
                          .insert({
                            title: 'Yeni Sipariş',
                            order_number: orderNumber,
                            status: 'draft',
                            customer_id: task?.customer_id || null,
                            workspace_id: membership.workspace_id,
                            created_by_user: user.id,
                          })
                          .select()
                          .single();

                        console.log('✅ Insert sonucu:', { newOrder, error });
                        if (error) throw error;

                        if (newOrder) {
                          console.log('🔗 Göreve sipariş ID atanıyor...');
                          // Göreve sipariş ID'sini ata
                          await supabase
                            .from('tasks')
                            .update({ order_id: newOrder.id })
                            .eq('id', task?.id);
                          
                          setTask(prev => prev ? { ...prev, order_id: newOrder.id } : prev);
                          setOrderInfo({ order_number: newOrder.order_number, title: newOrder.title });
                          
                          console.log('🚀 Yönlendiriliyor:', newOrder.id);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          router.push(`/order/${newOrder.id}` as any);
                        } else {
                          Alert.alert('Hata', 'Sipariş oluşturuldu ama data boş');
                        }
                      } catch (err: any) {
                        console.error('❌ Sipariş oluşturma hatası:', err);
                        Alert.alert('Hata', err.message || 'Sipariş oluşturulamadı');
                      }
                    }
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#53BDEB', fontWeight: '500' }}>
                    {task?.order_id ? 'Aç' : '+ Ekle'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </View>

            {/* ══════════ 4. AÇIKLAMA ══════════ */}
            {task?.what_description && (
              <View style={styles.detaySection}>
                <Text style={{ fontSize: 15, color: '#3C3C43', lineHeight: 22 }}>
                  {task.what_description}
                </Text>
              </View>
            )}

            {/* ══════════ 5. BÜYÜK MİKROFON — SESLİ KOMUT ══════════ */}
            <View style={[styles.detaySection, { paddingVertical: 32, alignItems: 'center' }]}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: '#8E8E93', textAlign: 'center', marginBottom: 20 }}>
                Basılı Tut ve Söyle
              </Text>
              
              <View style={{ alignItems: 'center', justifyContent: 'center', width: 140, height: 140 }}>
                <View style={{
                  position: 'absolute',
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(0,0,0,0.03)',
                }} />
                <View style={{
                  position: 'absolute',
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: 'rgba(0,0,0,0.02)',
                }} />
                
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPressIn={startRecording}
                  onPressOut={stopRecording}
                  disabled={isProcessingVoice || isRespondingVoice}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: '#1A1A1A',
                    alignItems: 'center',
                    justifyContent: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 6,
                    opacity: (isProcessingVoice || isRespondingVoice) ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="mic" size={36} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Durum metni */}
              {(isRecording || isProcessingVoice || isRespondingVoice) ? (
                <Text style={{ fontSize: 13, color: '#1A1A1A', fontWeight: '500', marginTop: 16, textAlign: 'center' }}>
                  {voiceStatusText}
                </Text>
              ) : (
                <Text style={{ fontSize: 12, color: '#C7C7CC', marginTop: 16, textAlign: 'center', paddingHorizontal: 20, fontStyle: 'italic' }}>
                  "Cihat'a ata, acil yap, Toyo bağla"
                </Text>
              )}
            </View>

            {/* ══════════ 6. SİSTEM LOGLARI (Kompakt, minimal) ══════════ */}
            <View style={[styles.detaySection, { paddingVertical: 12 }]}>
              <View style={{ gap: 6 }}>
                {task?.assigned_to && (
                  <Text style={{ fontSize: 12, color: '#8E8E93', lineHeight: 18 }}>
                    ⟳ {task.assigned_to}'e atandı · {task?.updated_at ? new Date(task.updated_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </Text>
                )}
                <TouchableOpacity 
                  onPress={async () => {
                    try {
                      const { data: history } = await supabase
                        .from('activity_feed')
                        .select('*')
                        .eq('reference_type', 'task')
                        .eq('reference_id', task?.id)
                        .order('created_at', { ascending: false })
                        .limit(3);
                      
                      if (!history || history.length === 0) {
                        Alert.alert('Geçmiş', 'Henüz aktivite kaydı yok');
                        return;
                      }
                      
                      const historyText = history
                        .map((h: any) => {
                          const date = new Date(h.created_at).toLocaleString('tr-TR', { 
                            day: '2-digit', 
                            month: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          });
                          return `${date} · ${h.action_type || 'Değişiklik'}`;
                        })
                        .join('\n\n');
                      
                      Alert.alert('Geçmiş', historyText, [{ text: 'Kapat' }]);
                    } catch (err) {
                      Alert.alert('Hata', 'Geçmiş yüklenemedi');
                    }
                  }}
                >
                  <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>Tümünü gör</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SCROLL VIEW SONU (DETAY TAB) */}
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* MODALLER VE MENÜLER                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* 3 Nokta Menüsü — Action Sheet */}
        <Modal
          visible={showOptionsMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOptionsMenu(false)}
        >
          <TouchableOpacity 
            style={styles.menuOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          >
            <View style={styles.menuContainer}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setActiveTab('detay');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="pencil-outline" size={20} color={C.text} />
                <Text style={styles.menuItemText}>Düzenle</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  setActiveTab('sohbet');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Ionicons name="chatbubble-outline" size={20} color={C.text} />
                <Text style={styles.menuItemText}>Sohbete Git</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  Alert.alert('Durum Değiştir', 'Açık / Devam / Bitti seçebilirsiniz');
                }}
              >
                <Ionicons name="ellipse-outline" size={20} color={C.text} />
                <Text style={styles.menuItemText}>Durumu Değiştir</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  Alert.alert('Kopyala', 'Görev kopyalama yakında aktif olacak');
                }}
              >
                <Ionicons name="copy-outline" size={20} color={C.text} />
                <Text style={styles.menuItemText}>Kopyala</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  Alert.alert('Paylaş', 'Link kopyalama yakında aktif olacak');
                }}
              >
                <Ionicons name="share-outline" size={20} color={C.text} />
                <Text style={styles.menuItemText}>Paylaş</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  Alert.alert('Yıldızla', 'Yıldız sistemi yakında aktif olacak');
                }}
              >
                <Ionicons name="star-outline" size={20} color={C.text} />
                <Text style={styles.menuItemText}>Yıldızla</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  Alert.alert('Hatırlatma', 'Hatırlatma sistemi yakında aktif olacak');
                }}
              >
                <Ionicons name="alarm-outline" size={20} color={C.text} />
                <Text style={styles.menuItemText}>Hatırlatma Kur</Text>
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />
              
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                onPress={() => {
                  setShowOptionsMenu(false);
                  Alert.alert(
                    'Görevi Sil',
                    `"${task?.title}" silinecek. Emin misin?`,
                    [
                      { text: 'İptal', style: 'cancel' },
                      {
                        text: 'Sil',
                        style: 'destructive',
                        onPress: async () => {
                          await supabase.from('tasks').delete().eq('id', id);
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          router.back();
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                <Text style={[styles.menuItemText, { color: '#FF3B30' }]}>Görevi Sil</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
        
        {/* Eski 5N1K Modal Kaldırıldı — Detay Tab Kullanıyoruz */}
        
        {/* ══════════ Diğer Modal'lar (showSummary, showMediaGallery) ══════════ */}
        
        {/* ESKİ 5N1K MODAL TAMAMEN KALDIRILDI — Artık Detay Tab Kullanıyoruz */}
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
        
        {/* ═══ DATE PICKER ═══ */}
        {/* ═══ TARİH SEÇİCİ MODAL ═══ */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal visible={true} transparent animationType="fade">
            <TouchableOpacity 
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}
              activeOpacity={1}
              onPress={() => setShowDatePicker(false)}
            >
              <View 
                style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 }}
                onStartShouldSetResponder={() => true}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#E8E5DF' }}>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Text style={{ fontSize: 16, color: '#8E8E93' }}>İptal</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 17, fontWeight: '600', color: '#1A1A1A' }}>
                    {dateField === 'due_date' ? 'Bitiş Tarihi' : 'Başlangıç Tarihi'}
                  </Text>
                  <TouchableOpacity onPress={() => {
                    updateField(dateField, tempDate);
                    setShowDatePicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>Tamam</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDate ? new Date(tempDate) : new Date()}
                  mode="date"
                  display="spinner"
                  locale="tr-TR"
                  onChange={(event, date) => {
                    if (date) {
                      setTempDate(date.toISOString().split('T')[0]);
                    }
                  }}
                  style={{ backgroundColor: '#FFF' }}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}
        
        {/* Android için eski davranış */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={task?.[dateField] ? new Date(task[dateField]) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate && event.type === 'set') {
                updateField(dateField, selectedDate.toISOString().split('T')[0]);
              }
            }}
          />
        )}
        
        {/* ═══ IMAGE VIEWER (Fullscreen) ═══ */}
        {viewingImage && (
          <Modal visible={true} transparent animationType="fade">
            <TouchableOpacity
              style={styles.imageViewerOverlay}
              activeOpacity={1}
              onPress={() => setViewingImage(null)}
            >
              <Image
                source={{ uri: viewingImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.closeImageBtn}
                onPress={() => setViewingImage(null)}
              >
                <Text style={styles.closeImageText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        )}
        
        {/* ═══ MÜŞTERİ MODAL (TAM EKRAN) ═══ */}
        <Modal visible={showCustomerDropdown} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#F5F3EF', paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#D4D0C8', backgroundColor: '#FFF' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A' }}>Müşteri Seç</Text>
              <TouchableOpacity onPress={() => setShowCustomerDropdown(false)} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, color: '#8E8E93' }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Bağlantıyı Kaldır */}
            {task?.customer_id && (
              <TouchableOpacity
                onPress={() => {
                  updateField('customer_id', null);
                  setShowCustomerDropdown(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{ padding: 16, borderBottomWidth: 1, borderColor: '#E8E5DF', backgroundColor: '#FFF' }}
              >
                <Text style={{ fontSize: 16, color: '#FF3B30', fontWeight: '600' }}>Bağlantıyı Kaldır</Text>
              </TouchableOpacity>
            )}
            
            {/* Yeni Müşteri Ekle Butonu */}
            <TouchableOpacity
              onPress={async () => {
                setShowCustomerDropdown(false);
                
                // Boş müşteri kartı oluştur ve aç
                console.log('🔗 Yeni müşteri kartı oluşturuluyor (modal)');
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  console.log('👤 User:', user?.id);
                  if (!user) {
                    Alert.alert('Hata', 'Kullanıcı bulunamadı');
                    return;
                  }
                  
                  const { data: membership } = await supabase
                    .from('workspace_members')
                    .select('workspace_id, team_id')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .limit(1)
                    .single();
                  
                  console.log('🏢 Workspace ID:', membership?.workspace_id);
                  if (!membership?.workspace_id) {
                    Alert.alert('Hata', 'Workspace bulunamadı');
                    return;
                  }

                  console.log('💾 Insert ediliyor...');
                  const { data: newCustomer, error } = await supabase
                    .from('customers')
                    .insert({
                      company_name: 'Yeni Müşteri',
                      workspace_id: membership.workspace_id,
                      created_by: user.id,
                      owner: user.id,
                      status: 'active',
                    })
                    .select()
                    .single();

                  console.log('✅ Insert sonucu:', { newCustomer, error });
                  if (error) throw error;

                  if (newCustomer) {
                    console.log('🚀 Yönlendiriliyor:', newCustomer.id);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    router.push(`/customer/${newCustomer.id}` as any);
                  } else {
                    Alert.alert('Hata', 'Müşteri oluşturuldu ama data boş');
                  }
                } catch (err: any) {
                  console.error('❌ Müşteri oluşturma hatası:', err);
                  Alert.alert('Hata', err.message || 'Müşteri oluşturulamadı');
                }
              }}
              style={{
                margin: 16,
                padding: 16,
                backgroundColor: '#1A1A1A',
                borderRadius: 12,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>+ Yeni Müşteri Ekle</Text>
            </TouchableOpacity>

            {/* Müşteri Listesi */}
            <ScrollView>
              {customers.length === 0 ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, marginBottom: 12 }}>👥</Text>
                  <Text style={{ textAlign: 'center', color: '#8E8E93', fontSize: 16, lineHeight: 24 }}>
                    Henüz müşteri yok.{'\n'}
                    Yukarıdaki butona basarak{'\n'}
                    ilk müşteriyi ekleyin.
                  </Text>
                </View>
              ) : (
                customers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    onPress={() => {
                      updateField('customer_id', customer.id);
                      setShowCustomerDropdown(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', padding: 16,
                      borderBottomWidth: 1, borderColor: '#E8E5DF',
                      backgroundColor: task?.customer_id === customer.id ? '#E8E5DF' : '#FFF'
                    }}
                  >
                    {/* İkon */}
                    <View style={{
                      width: 48, height: 48, borderRadius: 24,
                      backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', marginRight: 12
                    }}>
                      <Text style={{ fontSize: 20 }}>🏢</Text>
                    </View>
                    
                    {/* Müşteri Bilgileri */}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '600', color: '#1A1A1A' }}>{customer.name}</Text>
                      {customer.city && (
                        <Text style={{ fontSize: 14, color: '#8E8E93', marginTop: 2 }}>
                          {customer.city}
                        </Text>
                      )}
                    </View>
                    
                    {/* Seçili ise check */}
                    {task?.customer_id === customer.id && (
                      <Text style={{ fontSize: 20, color: '#1A1A1A', marginLeft: 4 }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </Modal>
        
        {/* ═══ ETİKET INPUT MODAL (Bottom Sheet) ═══ */}
        <Modal visible={showTagModal} animationType="slide" transparent>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => {
              setNewTag('');
              setShowTagModal(false);
              Keyboard.dismiss();
            }}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </TouchableOpacity>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Etiket Ekle</Text>
              <TextInput
                autoFocus
                value={newTag}
                onChangeText={setNewTag}
                placeholder="Etiket adı yazın..."
                placeholderTextColor="#8E8E93"
                onSubmitEditing={() => {
                  if (newTag.trim()) {
                    updateField('tags', [...(task?.tags || []), newTag.trim()]);
                    setNewTag('');
                    setShowTagModal(false);
                    Keyboard.dismiss();
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={{
                  fontSize: 18, padding: 16,
                  borderWidth: 1, borderColor: '#D4D0C8', borderRadius: 12,
                  backgroundColor: '#F5F3EF'
                }}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (newTag.trim()) {
                      updateField('tags', [...(task?.tags || []), newTag.trim()]);
                      setNewTag('');
                      setShowTagModal(false);
                      Keyboard.dismiss();
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={{ flex: 1, backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Ekle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setNewTag('');
                    setShowTagModal(false);
                    Keyboard.dismiss();
                  }}
                  style={{ flex: 1, backgroundColor: '#F5F3EF', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D4D0C8' }}
                >
                  <Text style={{ fontSize: 16, color: '#8E8E93' }}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        
        {/* ═══ CHECKLIST MODAL (Bottom Sheet - Ardarda Ekleme) ═══ */}
        <Modal visible={showChecklistModal} animationType="slide" transparent>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => {
              setNewChecklistItem('');
              setShowChecklistModal(false);
              Keyboard.dismiss();
            }}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </TouchableOpacity>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Madde Ekle</Text>
              <TextInput
                autoFocus
                value={newChecklistItem}
                onChangeText={setNewChecklistItem}
                placeholder="Yapılacak adımı yazın... (ör: Malzeme kontrol)"
                placeholderTextColor="#8E8E93"
                onSubmitEditing={() => {
                  if (newChecklistItem.trim()) {
                    const newItem = {
                      id: Date.now().toString(),
                      text: newChecklistItem.trim(),
                      done: false
                    };
                    const updatedList = [...(task?.checklist || []), newItem];
                    updateField('checklist', updatedList);
                    setNewChecklistItem('');
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={{
                  fontSize: 18, padding: 16,
                  borderWidth: 1, borderColor: '#D4D0C8', borderRadius: 12,
                  backgroundColor: '#F5F3EF'
                }}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (newChecklistItem.trim()) {
                      const newItem = {
                        id: Date.now().toString(),
                        text: newChecklistItem.trim(),
                        done: false
                      };
                      const updatedList = [...(task?.checklist || []), newItem];
                      updateField('checklist', updatedList);
                      setNewChecklistItem('');
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  style={{ flex: 1, backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Ekle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setNewChecklistItem('');
                    setShowChecklistModal(false);
                    Keyboard.dismiss();
                  }}
                  style={{ flex: 1, backgroundColor: '#F5F3EF', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D4D0C8' }}
                >
                  <Text style={{ fontSize: 16, color: '#8E8E93' }}>Bitti</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        
        {/* ═══ NOT MODAL (Bottom Sheet + Mikrofon) ═══ */}
        <Modal visible={showNoteModal} animationType="slide" transparent>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => {
              setNewNote('');
              setShowNoteModal(false);
              Keyboard.dismiss();
            }}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </TouchableOpacity>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Not Ekle</Text>
              
              <TextInput
                autoFocus
                multiline
                numberOfLines={4}
                value={newNote}
                onChangeText={setNewNote}
                placeholder="Notunuzu yazın veya sesle söyleyin..."
                placeholderTextColor="#8E8E93"
                style={{
                  fontSize: 16, padding: 16, minHeight: 120,
                  borderWidth: 1, borderColor: '#D4D0C8', borderRadius: 12,
                  backgroundColor: '#F5F3EF', textAlignVertical: 'top'
                }}
              />
              
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                {/* Sesle Not */}
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      const { status } = await Audio.requestPermissionsAsync();
                      if (status !== 'granted') {
                        Alert.alert('İzin Gerekli', 'Mikrofon izni verilmedi');
                        return;
                      }
                      
                      await Audio.setAudioModeAsync({
                        allowsRecordingIOS: true,
                        playsInSilentModeIOS: true,
                      });
                      
                      const { recording } = await Audio.Recording.createAsync(
                        Audio.RecordingOptionsPresets.HIGH_QUALITY
                      );
                      
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      
                      Alert.alert(
                        '🎤 Ses Kaydı',
                        'Konuşun, bitince Durdur basın',
                        [
                          {
                            text: 'Durdur',
                            onPress: async () => {
                              await recording.stopAndUnloadAsync();
                              const uri = recording.getURI();
                              
                              if (uri) {
                                try {
                                  Alert.alert('🎤', 'Transcribe ediliyor...');
                                  const transcript = await transcribeAudio(uri);
                                  if (transcript) {
                                    setNewNote(prev => prev ? `${prev}\n\n${transcript}` : transcript);
                                    Alert.alert('✅', 'Nota eklendi');
                                  }
                                } catch (err) {
                                  Alert.alert('Hata', 'Transcribe edilemedi');
                                }
                              }
                            }
                          }
                        ]
                      );
                    } catch (err) {
                      Alert.alert('Hata', 'Ses kaydı başlatılamadı');
                    }
                  }}
                  style={{
                    width: 52, height: 52, borderRadius: 26,
                    backgroundColor: '#1A1A1A',
                    justifyContent: 'center', alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 22 }}>🎤</Text>
                </TouchableOpacity>
                
                {/* Kaydet */}
                <TouchableOpacity
                  onPress={async () => {
                    if (newNote.trim() && task) {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;
                        
                        const { error } = await supabase
                          .from('activity_notes')
                          .insert({
                            context_type: 'task',
                            context_id: task.id,
                            content: newNote.trim(),
                            created_by: user.id
                          });
                        
                        if (!error) {
                          fetchNotes();
                          setNewNote('');
                          setShowNoteModal(false);
                          Keyboard.dismiss();
                          Alert.alert('✅', 'Not eklendi');
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      } catch (err) {
                        Alert.alert('Hata', 'Not eklenemedi');
                      }
                    }
                  }}
                  style={{ flex: 1, backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Kaydet</Text>
                </TouchableOpacity>
                
                {/* İptal */}
                <TouchableOpacity
                  onPress={() => {
                    setNewNote('');
                    setShowNoteModal(false);
                    Keyboard.dismiss();
                  }}
                  style={{ padding: 16, justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 16, color: '#8E8E93' }}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        
        {/* ═══ AÇIKLAMA MODAL (Bottom Sheet) ═══ */}
        <Modal visible={showDescriptionModal} animationType="slide" transparent>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => {
              setDescText('');
              setShowDescriptionModal(false);
              Keyboard.dismiss();
            }}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} />
          </TouchableOpacity>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Açıklama Düzenle</Text>
              <TextInput
                autoFocus
                multiline
                numberOfLines={6}
                value={descText}
                onChangeText={setDescText}
                placeholder="Görev açıklamasını yazın..."
                placeholderTextColor="#8E8E93"
                style={{
                  fontSize: 16, padding: 16, minHeight: 150,
                  borderWidth: 1, borderColor: '#D4D0C8', borderRadius: 12,
                  backgroundColor: '#F5F3EF', textAlignVertical: 'top'
                }}
              />
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await supabase.from('tasks').update({ what_description: descText }).eq('id', id);
                      fetchTask();
                      setShowDescriptionModal(false);
                      Keyboard.dismiss();
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      Alert.alert('✅', 'Açıklama güncellendi');
                    } catch (err) {
                      Alert.alert('Hata', 'Açıklama güncellenemedi');
                    }
                  }}
                  style={{ flex: 1, backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Kaydet</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setDescText('');
                    setShowDescriptionModal(false);
                    Keyboard.dismiss();
                  }}
                  style={{ flex: 1, backgroundColor: '#F5F3EF', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#D4D0C8' }}
                >
                  <Text style={{ fontSize: 16, color: '#8E8E93' }}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
        
        {/* ═══ HARİTA MODAL (Konum Seçimi) ═══ */}
        <Modal visible={showMapModal} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#F5F3EF', paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderColor: '#E8E5DF' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A' }}>Konum Seç</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowMapModal(false);
                  setSelectedLocation(null);
                  setSelectedAddress('');
                  setSearchQuery('');
                }}
                style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 24, color: '#8E8E93' }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Arama */}
            <View style={{ padding: 16, backgroundColor: '#FFF' }}>
              <TextInput
                placeholder="Şehir veya adres ara... (ör: Ankara, İstanbul)"
                value={searchQuery}
                onChangeText={handleSearchLocation}
                placeholderTextColor="#8E8E93"
                style={{
                  padding: 14,
                  borderWidth: 1,
                  borderColor: '#D4D0C8',
                  borderRadius: 12,
                  fontSize: 16,
                  backgroundColor: '#F5F3EF'
                }}
              />
            </View>
            
            {/* Harita */}
            <MapView
              style={{ flex: 1 }}
              initialRegion={{
                latitude: 39.0,
                longitude: 35.0,
                latitudeDelta: 8,
                longitudeDelta: 8,
              }}
              region={selectedLocation ? {
                latitude: selectedLocation.latitude,
                longitude: selectedLocation.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              } : undefined}
              onPress={(e) => {
                const coord = e.nativeEvent.coordinate;
                setSelectedLocation(coord);
                reverseGeocodeLocation(coord);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              {selectedLocation && (
                <Marker
                  coordinate={selectedLocation}
                  pinColor="#FF3B30"
                />
              )}
            </MapView>
            
            {/* Mevcut Konum butonu */}
            <TouchableOpacity
              onPress={goToMyLocation}
              style={{
                position: 'absolute',
                bottom: selectedAddress ? 180 : 120,
                left: 16,
                backgroundColor: '#FFF',
                padding: 14,
                borderRadius: 30,
                elevation: 3,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Ionicons name="navigate" size={20} color="#1A1A1A" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>Konumum</Text>
            </TouchableOpacity>
            
            {/* Seçilen adres + onayla */}
            {selectedAddress && (
              <View style={{ padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderColor: '#E8E5DF' }}>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <Ionicons name="location" size={20} color="#E8B347" />
                  <Text style={{ fontSize: 15, color: '#3C3C43', flex: 1, lineHeight: 22 }}>
                    {selectedAddress}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    updateField('where_location', selectedAddress);
                    setShowMapModal(false);
                    setSelectedLocation(null);
                    setSelectedAddress('');
                    setSearchQuery('');
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }}
                  style={{ backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '600' }}>Bu Konumu Seç</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>

        {/* ═══ VOXI v3 — MÜŞTERİ MODAL ═══ */}
        <Modal visible={showCustomerModal} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#F5F3EF', paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#D4D0C8', backgroundColor: '#FFF' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A' }}>Müşteri Seç</Text>
              <TouchableOpacity onPress={() => setShowCustomerModal(false)} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, color: '#8E8E93' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {/* Arama */}
              <View style={{ padding: 16 }}>
                <TextInput
                  placeholder="Müşteri ara..."
                  style={{
                    backgroundColor: '#FFF',
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: '#E8E5DF',
                  }}
                />
              </View>

              {/* Son Müşteriler */}
              <View style={{ padding: 16, paddingTop: 0 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 12, textTransform: 'uppercase' }}>
                  SON MÜŞTERİLER
                </Text>
                
                {customers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    onPress={() => {
                      updateField('customer_id', customer.id);
                      setShowCustomerModal(false);
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }}
                    style={{
                      backgroundColor: '#FFF',
                      borderRadius: 12,
                      padding: 14,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: task?.customer_id === customer.id ? '#1A1A1A' : '#E8E5DF',
                    }}
                  >
                    <Text style={{ fontSize: 17, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>
                      {customer.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#8E8E93' }}>
                      {customer.city || 'Şehir belirtilmemiş'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Yeni Müşteri Oluştur */}
              <View style={{ padding: 16 }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#1A1A1A',
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                  onPress={() => {
                    setShowCustomerModal(false);
                    Alert.alert('Yakında', 'Yeni müşteri oluşturma özelliği yakında eklenecek.');
                  }}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#FFF" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>
                    Yeni Müşteri Oluştur
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ═══ VOXI v3 — SİPARİŞ MODAL ═══ */}
        <Modal visible={showOrderModal} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#F5F3EF', paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#D4D0C8', backgroundColor: '#FFF' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A' }}>Sipariş Seç</Text>
              <TouchableOpacity onPress={() => setShowOrderModal(false)} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, color: '#8E8E93' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              <View style={{ padding: 16, alignItems: 'center', paddingTop: 60 }}>
                <Ionicons name="document-text-outline" size={64} color="#8E8E93" />
                <Text style={{ fontSize: 16, color: '#8E8E93', marginTop: 16, textAlign: 'center' }}>
                  Müşteriye ait siparişler burada listelenecek
                </Text>
                
                <TouchableOpacity
                  style={{
                    backgroundColor: '#1A1A1A',
                    borderRadius: 12,
                    padding: 16,
                    alignItems: 'center',
                    marginTop: 24,
                    flexDirection: 'row',
                    gap: 8,
                  }}
                  onPress={() => {
                    setShowOrderModal(false);
                    Alert.alert('Yakında', 'Sipariş oluşturma özelliği yakında eklenecek.');
                  }}
                >
                  <Ionicons name="add-circle-outline" size={22} color="#FFF" />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>Yeni Sipariş Oluştur</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* ═══ VOXI v3 — PAYDAŞ MODAL ═══ */}
        <Modal visible={showStakeholderModal} animationType="slide">
          <View style={{ flex: 1, backgroundColor: '#F5F3EF', paddingTop: Platform.OS === 'ios' ? 50 : 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#D4D0C8', backgroundColor: '#FFF' }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A' }}>Paydaş Ekle</Text>
              <TouchableOpacity onPress={() => setShowStakeholderModal(false)} style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24, color: '#8E8E93' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }}>
              {/* Türler */}
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 12, textTransform: 'uppercase' }}>
                  PAYDAŞ TÜRÜ SEÇ
                </Text>
                
                {[
                  { value: 'supplier', label: 'Tedarikçi', icon: '📦' },
                  { value: 'subcontractor', label: 'Taşeron', icon: '🔧' },
                  { value: 'consultant', label: 'Danışman', icon: '💡' },
                  { value: 'logistics', label: 'Nakliye', icon: '🚚' },
                  { value: 'accounting', label: 'Muhasebe', icon: '💼' },
                  { value: 'other', label: 'Diğer', icon: '👥' },
                ].map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={{
                      backgroundColor: '#FFF',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      borderWidth: 1,
                      borderColor: '#E8E5DF',
                    }}
                    onPress={() => {
                      setShowStakeholderModal(false);
                      Alert.alert('Yakında', `${type.label} ekleme özelliği yakında eklenecek.`);
                    }}
                  >
                    <Text style={{ fontSize: 32 }}>{type.icon}</Text>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: '#1A1A1A' }}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </Modal>
        
        {/* ═══ SMART CARD POPUP (Düzenleme) ═══ */}
        <SmartCardPopup
          visible={showEditCard}
          cardData={taskToCardData()}
          onSave={handleUpdateTask}
          onCancel={() => {
            setShowEditCard(false);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          teamMembers={taskMembers.map(m => ({ id: m.id, name: m.full_name }))}
          customers={[]}
        />
        
        {/* ═══ SES KAYDI OVERLAY (TAM EKRAN FEEDBACK) ═══ */}
        {isRecordingVoice && (
          <Modal visible={true} transparent animationType="fade">
            <View style={{
              flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
              justifyContent: 'center', alignItems: 'center'
            }}>
              {/* Pulse animasyonu */}
              <View style={{
                width: 180, height: 180, borderRadius: 90,
                backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center',
                opacity: 0.8
              }}>
                <Text style={{ fontSize: 80 }}>🎤</Text>
              </View>
              
              {/* Süre */}
              <Text style={{
                fontSize: 56, fontWeight: '700', color: '#FFF',
                marginTop: 32, fontVariant: ['tabular-nums']
              }}>
                {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
              </Text>
              
              <Text style={{
                fontSize: 18, color: '#FFF', marginTop: 12, opacity: 0.8
              }}>
                Konuşun...
              </Text>
              
              {/* Durdur butonu */}
              <TouchableOpacity
                onPress={async () => {
                  if (recording) {
                    clearInterval((recording as any)._timer);
                    await recording.stopAndUnloadAsync();
                    const uri = recording.getURI();
                    setIsRecordingVoice(false);
                    setRecordingDuration(0);
                    
                    if (uri && task) {
                      try {
                        Alert.alert('📤', 'Yükleniyor...');
                        const url = await uploadVoiceToStorage(uri, task.id);
                        
                        if (url) {
                          const { data: { user } } = await supabase.auth.getUser();
                          await supabase.from('card_attachments').insert({
                            card_type: 'task',
                            card_id: task.id,
                            file_type: 'audio',
                            file_url: url,
                            uploaded_by: user?.id
                          });
                          
                          fetchFiles();
                          Alert.alert('✅', 'Ses kaydı eklendi');
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }
                      } catch (err) {
                        Alert.alert('Hata', 'Ses kaydı yüklenemedi');
                      }
                    }
                  }
                }}
                style={{
                  marginTop: 48, width: 88, height: 88, borderRadius: 44,
                  backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center'
                }}
              >
                <Text style={{ fontSize: 42 }}>⏹️</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        )}
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
  
  // ESKİ: Bottom Sheet Menu style'ları kaldırıldı (duplicate)
  
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
  
  // ═══ TAB SWITCHER ═══
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: C.text,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.textTer,
  },
  tabTextActive: {
    color: C.text,
  },
  
  // ═══ DETAY TAB ═══
  detayTab: {
    flex: 1,
    backgroundColor: C.bg,
  },
  detaySection: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textTer,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  
  // Başlık
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  metaText: {
    fontSize: 13,
    color: C.textTer,
    marginTop: 6,
  },
  
  // Field Row
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  fieldRowVertical: {
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  fieldLabel: {
    fontSize: 15,
    color: C.textSec,
    width: 100,
  },
  fieldValue: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fieldValueText: {
    fontSize: 15,
    color: C.text,
    marginRight: 8,
  },
  
  // Chips
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  statusChipDetay: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#D4D0C8',
    minWidth: 80,
    alignItems: 'center',
  },
  statusChipDetayActive: {
    backgroundColor: C.text,
    borderColor: C.text,
  },
  statusChipDetayText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  statusChipDetayTextActive: {
    color: '#FFFFFF',
  },
  detailChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#D4D0C8',
  },
  detailChipActive: {
    backgroundColor: C.text,
    borderColor: C.text,
  },
  detailChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  detailChipTextActive: {
    color: '#FFFFFF',
  },
  
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  
  // Description
  descriptionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    padding: 14,
    minHeight: 80,
  },
  descriptionText: {
    fontSize: 15,
    color: C.text,
    flex: 1,
    lineHeight: 22,
  },
  
  // Files
  fileGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  fileThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  fileThumbImage: {
    width: '100%',
    height: '100%',
  },
  fileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  fileActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  fileActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3C3C43',
  },
  
  // Notes
  noteItem: {
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  emptyNote: {
    fontSize: 14,
    color: C.textTer,
    fontStyle: 'italic',
  },
  
  // Tools
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  toolButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toolButtonIcon: {
    fontSize: 20,
  },
  toolButtonText: {
    fontSize: 16,
    color: C.text,
  },
  
  // History
  historyItem: {
    paddingVertical: 8,
  },
  historyText: {
    fontSize: 14,
    color: C.textSec,
    lineHeight: 20,
  },
  
  // Delete
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  
  // ═══ 3 NOKTA MENÜSÜ ═══
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  menuItemText: {
    fontSize: 16,
    color: C.text,
  },
  menuDivider: {
    height: 8,
    backgroundColor: C.bg,
  },
  
  // ═══ DROPDOWN (Assignee) ═══
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 20,
    maxHeight: '70%',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  dropdownItemActive: {
    backgroundColor: '#F5F3EF',
  },
  dropdownItemText: {
    fontSize: 16,
    color: C.text,
  },
  dropdownItemSubtext: {
    fontSize: 13,
    color: C.textTer,
    marginTop: 2,
  },
  dropdownCheck: {
    fontSize: 18,
    color: C.text,
    fontWeight: '600',
  },
  dropdownCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  dropdownCancelText: {
    fontSize: 16,
    color: C.textTer,
  },
  
  // ═══ QUICK DATE BUTTONS ═══
  quickDateRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  quickDateBtn: {
    flex: 1,
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E5DF',
  },
  quickDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  
  // ═══ IMAGE VIEWER (Fullscreen) ═══
  imageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: width,
    height: width * 1.5,
  },
  closeImageBtn: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageText: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  
  // ═══ ETİKET CHIP ═══
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8B347',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  tagChipRemove: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  
  // ═══ CHECKLIST ═══
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checklistCheckbox: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistText: {
    flex: 1,
    fontSize: 15,
    color: C.text,
  },
  checklistTextDone: {
    textDecorationLine: 'line-through',
    color: C.textTer,
  },
  
  // ═══ TEXT INPUT MODAL ═══
  textInputModal: {
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: C.text,
    marginVertical: 12,
    minHeight: 44,
  },
  
  // ═══ VOXI v3 — GÖREV TÜRÜ CHIPS ═══
  taskTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F5F3EF',
    borderWidth: 1,
    borderColor: '#E8E5DF',
    marginRight: 8,
    marginBottom: 8,
  },
  taskTypeChipActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  taskTypeEmoji: {
    fontSize: 16,
  },
  taskTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  taskTypeTextActive: {
    color: '#FFFFFF',
  },
  
  // ═══ VOXI v3 — BAĞLANTILAR ═══
  connectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 10,
  },
  connectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E5DF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginBottom: 2,
  },
  connectionDetail: {
    fontSize: 13,
    color: C.textTer,
  },
  connectionButton: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addConnectionButton: {
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D4D0C8',
    borderStyle: 'dashed',
    paddingVertical: 14,
    alignItems: 'center',
  },
  addConnectionText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSec,
  },
  connectionHint: {
    fontSize: 12,
    color: C.textTer,
    fontStyle: 'italic',
    marginTop: 6,
  },
});
