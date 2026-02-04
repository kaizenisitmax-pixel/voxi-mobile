import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

// Renk sistemi - monokrom
const C = {
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSec: '#8E8E93',
  border: '#F2F2F7',
  accent: '#1A1A1A',
  inputBg: '#F5F3EF',
};

interface Message {
  id: string;
  role: 'user' | 'voxi';
  text: string;
  timestamp: Date;
  actions?: VoxiAction[];
  loading?: boolean;
}

interface VoxiAction {
  type: 'task_created' | 'task_found' | 'message_sent' | 'reminder_set' | 'info';
  label: string;
  data?: any;
}

const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

export default function VoxiChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'voxi',
      text: 'Merhaba! Ben VOXI, ekip asistanınız. Size nasıl yardımcı olabilirim?\n\nGörev atayabilir, ekibi sorgulayabilir, hatırlatma kurabilir veya mesaj gönderebilirim.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Kullanıcı mesajı gönder
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      timestamp: new Date(),
    };
    const loadingMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'voxi',
      text: '',
      timestamp: new Date(),
      loading: true,
    };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await processVoxiCommand(input.trim());
      setMessages(prev =>
        prev.map(m =>
          m.loading ? { ...m, text: response.text, loading: false, actions: response.actions } : m
        )
      );
    } catch (e) {
      setMessages(prev =>
        prev.map(m =>
          m.loading ? { ...m, text: 'Bir hata oluştu, tekrar deneyin.', loading: false } : m
        )
      );
    }
    setLoading(false);
  };

  // VOXI AI motor
  const processVoxiCommand = async (userInput: string): Promise<{ text: string; actions?: VoxiAction[] }> => {
    // 1. Mevcut bağlamı topla
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, status, priority, created_at, due_date, is_group, group_members')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, task_id, sender_name, transcript, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    const openTasks = tasks?.filter(t => t.status === 'open' || t.status === 'in_progress') || [];
    const doneTasks = tasks?.filter(t => t.status === 'done') || [];

    const teamMembers = ['Ahmet', 'Mehmet', 'Ayşe', 'Ali', 'Volkan'];

    const memberSummaries = teamMembers.map(name => {
      const memberTasks = openTasks.filter(t =>
        t.assigned_to?.includes(name) || t.group_members?.includes(name)
      );
      const urgentCount = memberTasks.filter(t => t.priority === 'urgent').length;
      const lastMsg = recentMessages?.find(m => m.sender_name === name);
      return `${name}: ${memberTasks.length} açık görev (${urgentCount} acil)${lastMsg ? `, son mesaj: "${lastMsg.transcript?.slice(0, 50)}"` : ''}`;
    });

    const context = `
BUGÜN: ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
EKİP: ${teamMembers.join(', ')}
AÇIK GÖREVLER (${openTasks.length}):
${openTasks.slice(0, 20).map(t => `- "${t.title}" → ${t.assigned_to} [${t.priority}] [${t.status}]`).join('\n')}
TAMAMLANAN (${doneTasks.length})
EKİP DURUMU:
${memberSummaries.join('\n')}
SON MESAJLAR:
${recentMessages?.slice(0, 10).map(m => `${m.sender_name}: "${m.transcript?.slice(0, 60)}"`).join('\n') || 'yok'}
`;

    // 2. Groq AI çağrısı
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: `Sen VOXI adlı bir ekip asistanısın. Küçük bir iş ekibinin (5 kişi) günlük operasyonlarını yönetiyorsun.

GÖREVLER:
1. Görev oluşturma: Kullanıcı birilerine görev vermek isterse JSON döndür → {"action":"create_task","title":"...","assigned_to":"...","priority":"normal|urgent","due":"YYYY-MM-DD|null"}
2. Görev sorgulama: Kimin ne kadar açık görevi var, hangi görevler acil vs.
3. Mesaj gönderme: Birisine mesaj gönderilmesini isterse → {"action":"send_message","to":"...","message":"...","task_title":"..."}
4. Hatırlatma: → {"action":"set_reminder","to":"...","message":"...","time":"..."}
5. Görev tamamlama: → {"action":"complete_task","title":"..."}
6. Bilgi: Genel soru cevapla, bağlamı kullan

KURALLAR:
- Türkçe konuş, samimi ama profesyonel
- Kısa ve net cevaplar ver
- Eğer bir aksiyon alıyorsan, JSON'u cevabının SONUNA ekle, önce kullanıcıya ne yaptığını anlat
- JSON'u \`\`\`json ... \`\`\` içinde yaz
- Eğer sadece bilgi veriyorsan JSON ekleme
- Ekip üyeleri: ${teamMembers.join(', ')}
- Bağlamı kullanarak akıllı cevaplar ver
- Emin olmadığın şeyleri varsayma, kullanıcıya sor

MEVCUT BAĞLAM:
${context}`,
          },
          { role: 'user', content: userInput },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || 'Anlayamadım, tekrar dener misiniz?';

    // 3. Aksiyonları çıkart ve uygula
    const actions: VoxiAction[] = [];
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonMatch) {
      try {
        const cmd = JSON.parse(jsonMatch[1]);
        const cleanText = reply.replace(/```json[\s\S]*?```/, '').trim();

        switch (cmd.action) {
          case 'create_task': {
            const { error } = await supabase.from('tasks').insert({
              title: cmd.title,
              assigned_to: cmd.assigned_to,
              priority: cmd.priority || 'normal',
              status: 'open',
              created_by: 'Volkan',
              workspace_id: 'd816ca01-3361-4992-8c2d-df50d5f39382',
              due_date: cmd.due || null,
              is_group: false,
              group_members: [cmd.assigned_to],
            });
            if (!error) {
              actions.push({
                type: 'task_created',
                label: `✓ Görev oluşturuldu: "${cmd.title}" → ${cmd.assigned_to}`,
              });
            }
            return { text: cleanText || `"${cmd.title}" görevi ${cmd.assigned_to}'a atandı.`, actions };
          }

          case 'send_message': {
            // İlgili görevi bul veya yeni oluştur
            let taskId: string | null = null;
            if (cmd.task_title) {
              const { data: found } = await supabase
                .from('tasks')
                .select('id')
                .ilike('title', `%${cmd.task_title}%`)
                .eq('status', 'open')
                .limit(1);
              if (found?.[0]) taskId = found[0].id;
            }

            if (taskId) {
              await supabase.from('messages').insert({
                task_id: taskId,
                sender_name: 'VOXI',
                message_type: 'text',
                transcript: `[Volkan'dan]: ${cmd.message}`,
                created_at: new Date().toISOString(),
              });
              actions.push({
                type: 'message_sent',
                label: `✓ ${cmd.to}'a mesaj gönderildi`,
              });
            }
            return { text: cleanText || `${cmd.to}'a mesajınız iletildi.`, actions };
          }

          case 'complete_task': {
            const { data: found } = await supabase
              .from('tasks')
              .select('id, title')
              .ilike('title', `%${cmd.title}%`)
              .eq('status', 'open')
              .limit(1);
            if (found?.[0]) {
              await supabase.from('tasks').update({ status: 'done' }).eq('id', found[0].id);
              actions.push({
                type: 'task_found',
                label: `✓ "${found[0].title}" tamamlandı`,
              });
            }
            return { text: cleanText || 'Görev tamamlandı.', actions };
          }

          case 'set_reminder': {
            actions.push({
              type: 'reminder_set',
              label: `⏰ Hatırlatma kuruldu: ${cmd.to} - ${cmd.message}`,
            });
            return { text: cleanText || `${cmd.to} için hatırlatma kuruldu.`, actions };
          }

          default:
            return { text: reply.replace(/```json[\s\S]*?```/, '').trim() };
        }
      } catch {
        return { text: reply.replace(/```json[\s\S]*?```/, '').trim() };
      }
    }

    return { text: reply };
  };

  // Mesaj balonu render
  const renderMessage = ({ item }: { item: Message }) => {
    const isVoxi = item.role === 'voxi';
    return (
      <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
        {isVoxi && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{
              width: 24, height: 24, borderRadius: 12,
              backgroundColor: '#1A1A1A',
              alignItems: 'center', justifyContent: 'center', marginRight: 8,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>V</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1A1A1A' }}>VOXI</Text>
          </View>
        )}
        <View style={{
          alignSelf: isVoxi ? 'flex-start' : 'flex-end',
          maxWidth: '85%',
          backgroundColor: isVoxi ? '#FFFFFF' : '#1A1A1A',
          borderRadius: 16,
          borderTopLeftRadius: isVoxi ? 4 : 16,
          borderTopRightRadius: isVoxi ? 16 : 4,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}>
          {item.loading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
              <ActivityIndicator size="small" color="#8E8E93" />
              <Text style={{ fontSize: 14, color: '#8E8E93' }}>Düşünüyorum...</Text>
            </View>
          ) : (
            <Text style={{
              fontSize: 15,
              lineHeight: 22,
              color: isVoxi ? '#1A1A1A' : '#FFFFFF',
            }}>
              {item.text}
            </Text>
          )}
        </View>

        {/* Aksiyon kartları */}
        {item.actions?.map((action, i) => (
          <View key={i} style={{
            marginTop: 8,
            marginLeft: 32,
            backgroundColor: '#F5F3EF',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}>
            <Ionicons
              name={
                action.type === 'task_created' ? 'checkmark-circle' :
                action.type === 'message_sent' ? 'paper-plane' :
                action.type === 'reminder_set' ? 'alarm' :
                'information-circle'
              }
              size={16}
              color="#1A1A1A"
            />
            <Text style={{ fontSize: 13, color: '#3C3C43', flex: 1 }}>{action.label}</Text>
          </View>
        ))}

        <Text style={{
          fontSize: 11,
          color: '#C7C7CC',
          marginTop: 4,
          alignSelf: isVoxi ? 'flex-start' : 'flex-end',
          marginLeft: isVoxi ? 32 : 0,
        }}>
          {item.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 0.5, borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4, marginRight: 12 }}>
          <Ionicons name="chevron-back" size={24} color="#3C3C43" />
        </TouchableOpacity>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: '#1A1A1A',
          alignItems: 'center', justifyContent: 'center', marginRight: 10,
        }}>
          <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>V</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1A1A1A' }}>VOXI</Text>
          <Text style={{ fontSize: 12, color: '#8E8E93' }}>Ekip Asistanı · Çevrimiçi</Text>
        </View>
      </View>

      {/* Mesaj listesi */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ paddingVertical: 16 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Hızlı aksiyonlar - mesaj yokken veya boşken */}
      {messages.length <= 1 && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <ScrollableChips
            chips={[
              '📋 Açık görevleri göster',
              '👤 Ahmet ne durumda?',
              '🔴 Acil görevler',
              '📊 Haftalık özet',
            ]}
            onPress={(chip: string) => {
              const cleanChip = chip.replace(/^[^\s]+\s/, '');
              setInput(cleanChip);
            }}
          />
        </View>
      )}

      {/* Input bar */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{
          flexDirection: 'row', alignItems: 'flex-end',
          paddingHorizontal: 12, paddingVertical: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5, borderTopColor: C.border,
        }}>
          <View style={{
            flex: 1, flexDirection: 'row', alignItems: 'center',
            backgroundColor: C.inputBg, borderRadius: 20,
            paddingHorizontal: 14, minHeight: 40,
          }}>
            <TextInput
              style={{ flex: 1, fontSize: 16, color: C.text, maxHeight: 100, paddingVertical: 8 }}
              placeholder="VOXI'ye bir şey sor..."
              placeholderTextColor="#C7C7CC"
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={sendMessage}
            />
          </View>
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: 36, height: 36, borderRadius: 18,
              backgroundColor: input.trim() ? '#1A1A1A' : '#E5E5EA',
              alignItems: 'center', justifyContent: 'center',
              marginLeft: 8,
            }}
          >
            <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Hızlı aksiyon chip'leri
function ScrollableChips({ chips, onPress }: { chips: string[]; onPress: (c: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {chips.map((chip, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => onPress(chip)}
          style={{
            paddingHorizontal: 14, paddingVertical: 8,
            borderRadius: 16, backgroundColor: '#FFFFFF',
            borderWidth: 0.5, borderColor: '#E5E5EA',
          }}
        >
          <Text style={{ fontSize: 13, color: '#3C3C43' }}>{chip}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
