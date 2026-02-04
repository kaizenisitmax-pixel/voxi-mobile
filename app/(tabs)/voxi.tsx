import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

// Zamana göre selamlama
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'İyi geceler';
  if (hour < 12) return 'Günaydın';
  if (hour < 18) return 'İyi günler';
  if (hour < 22) return 'İyi akşamlar';
  return 'İyi geceler';
}

function getSubGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bugün size nasıl yardımcı olabilirim?';
  if (hour < 18) return 'Bu öğleden sonra ne yapabilirim?';
  return 'Bu akşam size nasıl yardımcı olabilirim?';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: { type: string; uri: string; name: string }[];
  actions?: { icon: string; label: string }[];
  isLoading?: boolean;
}

export default function VoxiScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<any[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const hasMessages = messages.length > 0;

  // Mesaj gönder
  const handleSend = async () => {
    const text = input.trim();
    if (!text && attachments.length === 0) return;
    if (isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      attachments: attachments.map(a => ({ type: a.type, uri: a.uri, name: a.name })),
    };

    const loadingMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const result = await callVoxi(text);
      setMessages(prev =>
        prev.map(m =>
          m.isLoading
            ? { ...m, content: result.text, isLoading: false, actions: result.actions }
            : m
        )
      );
    } catch (e) {
      setMessages(prev =>
        prev.map(m =>
          m.isLoading
            ? { ...m, content: 'Bir hata oluştu. Lütfen tekrar deneyin.', isLoading: false }
            : m
        )
      );
    }
    setIsLoading(false);
  };

  // VOXI AI Motor
  const callVoxi = async (userInput: string) => {
    // Bağlam topla
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, assigned_to, status, priority, created_at, due_date, is_group, group_members')
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: recentMsgs } = await supabase
      .from('messages')
      .select('id, task_id, sender_name, transcript, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    const openTasks = tasks?.filter((t: any) => t.status !== 'done') || [];
    const doneTasks = tasks?.filter((t: any) => t.status === 'done') || [];
    const team = ['Ahmet', 'Mehmet', 'Ayşe', 'Ali', 'Volkan'];

    const teamInfo = team.map(name => {
      const mt = openTasks.filter((t: any) => t.assigned_to?.includes(name));
      const urgent = mt.filter((t: any) => t.priority === 'urgent').length;
      return `${name}: ${mt.length} açık görev (${urgent} acil)`;
    }).join('\n');

    const context = `BUGÜN: ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
EKİP: ${team.join(', ')}
AÇIK GÖREVLER (${openTasks.length}):
${openTasks.slice(0, 15).map((t: any) => `- "${t.title}" → ${t.assigned_to} [${t.priority}]`).join('\n')}
TAMAMLANAN: ${doneTasks.length} görev
EKİP DURUMU:
${teamInfo}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
            content: `Sen VOXI, küçük bir iş ekibinin AI asistanısın. 5 kişilik ekibin günlük operasyonlarını yönetiyorsun.

YAPABİLECEKLERİN:
1. Görev oluştur → JSON: {"action":"create_task","title":"...","assigned_to":"...","priority":"normal|urgent"}
2. Görev tamamla → JSON: {"action":"complete_task","title":"..."}  
3. Mesaj gönder → JSON: {"action":"send_message","to":"...","message":"..."}
4. Bilgi ver → bağlamdan cevapla, JSON ekleme

KURALLAR:
- Türkçe, samimi ama profesyonel konuş
- Kısa ve net cevaplar ver, gereksiz uzatma
- Aksiyon alıyorsan önce ne yaptığını açıkla, sonra JSON'u \`\`\`json ... \`\`\` içinde ekle
- Sadece bilgi veriyorsan JSON ekleme
- Ekip üyeleri: ${team.join(', ')}

${context}`,
          },
          ...messages.slice(-10).map((m: any) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          })),
          { role: 'user', content: userInput },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'Anlayamadım.';
    const actions: any[] = [];

    // Aksiyonları uygula
    const jsonMatch = reply.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const cmd = JSON.parse(jsonMatch[1]);
        const cleanText = reply.replace(/```json[\s\S]*?```/, '').trim();

        if (cmd.action === 'create_task') {
          const { error } = await supabase.from('tasks').insert({
            title: cmd.title,
            assigned_to: cmd.assigned_to,
            priority: cmd.priority || 'normal',
            status: 'open',
            created_by: 'Volkan',
            workspace_id: 'd816ca01-3361-4992-8c2d-df50d5f39382',
            is_group: false,
            group_members: [cmd.assigned_to],
          });
          if (!error) actions.push({ icon: 'checkmark-circle', label: `Görev oluşturuldu: "${cmd.title}" → ${cmd.assigned_to}` });
        } else if (cmd.action === 'complete_task') {
          const { data: found } = await supabase.from('tasks').select('id').ilike('title', `%${cmd.title}%`).eq('status', 'open').limit(1);
          if (found?.[0]) {
            await supabase.from('tasks').update({ status: 'done' }).eq('id', found[0].id);
            actions.push({ icon: 'checkmark-circle', label: `"${cmd.title}" tamamlandı` });
          }
        } else if (cmd.action === 'send_message') {
          actions.push({ icon: 'paper-plane', label: `${cmd.to}'a mesaj gönderildi` });
        }

        return { text: cleanText || reply, actions };
      } catch {
        return { text: reply.replace(/```json[\s\S]*?```/, '').trim() };
      }
    }

    return { text: reply, actions: actions.length > 0 ? actions : undefined };
  };

  // Fotoğraf ekle
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAttachments(prev => [...prev, { type: 'image', uri: result.assets[0].uri, name: 'Fotoğraf' }]);
    }
  };

  // Dosya ekle
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets[0]) {
      setAttachments(prev => [...prev, { type: 'file', uri: result.assets[0].uri, name: result.assets[0].name }]);
    }
  };

  // Mesaj render
  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isAssistant = item.role === 'assistant';

    return (
      <View style={{ marginBottom: 24, paddingHorizontal: 20 }}>
        {/* Avatar + isim satırı */}
        {isAssistant && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: '#1A1A1A',
              alignItems: 'center', justifyContent: 'center', marginRight: 8,
            }}>
              <Ionicons name="sparkles" size={13} color="#FFFFFF" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>VOXI</Text>
          </View>
        )}

        {/* Mesaj içeriği */}
        <View style={{
          marginLeft: isAssistant ? 36 : 0,
          alignSelf: isAssistant ? 'flex-start' : 'flex-end',
          maxWidth: isAssistant ? '100%' : '80%',
        }}>
          {item.isLoading ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#C7C7CC' }} />
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D1D6' }} />
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E5EA' }} />
              </View>
            </View>
          ) : isAssistant ? (
            /* VOXI mesajı — Claude tarzı, arka plansız, düz metin */
            <Text style={{
              fontSize: 16,
              lineHeight: 24,
              color: '#1A1A1A',
              letterSpacing: -0.2,
            }}>
              {item.content}
            </Text>
          ) : (
            /* Kullanıcı mesajı — hafif arka planlı balon */
            <View style={{
              backgroundColor: '#F0EDE8',
              borderRadius: 18,
              borderBottomRightRadius: 4,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}>
              {/* Ekler */}
              {item.attachments?.map((att, i) => (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 6,
                  marginBottom: 6, paddingVertical: 4,
                }}>
                  <Ionicons
                    name={att.type === 'image' ? 'image-outline' : 'document-outline'}
                    size={16} color="#8E8E93"
                  />
                  <Text style={{ fontSize: 13, color: '#8E8E93' }}>{att.name}</Text>
                </View>
              ))}
              <Text style={{ fontSize: 16, lineHeight: 22, color: '#1A1A1A' }}>
                {item.content}
              </Text>
            </View>
          )}

          {/* Aksiyon kartları */}
          {item.actions?.map((action: any, i: number) => (
            <View key={i} style={{
              marginTop: 10,
              backgroundColor: '#F5F3EF',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              borderLeftWidth: 3,
              borderLeftColor: '#1A1A1A',
            }}>
              <Ionicons name={action.icon as any} size={16} color="#1A1A1A" />
              <Text style={{ fontSize: 14, color: '#3C3C43', flex: 1 }}>{action.label}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Hızlı öneri chip'leri
  const suggestions = [
    'Açık görevleri göster',
    'Ahmet ne durumda?',
    'Acil görevler',
    'Haftalık özet',
    'Yeni görev oluştur',
    'En son ne yapıldı?',
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F3EF' }}>
      <StatusBar barStyle="dark-content" />

      {/* MESAJ YOKKEN — Claude hoş geldin ekranı */}
      {!hasMessages ? (
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
          {/* VOXI logosu */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 24,
              backgroundColor: '#1A1A1A',
              alignItems: 'center', justifyContent: 'center', marginBottom: 20,
            }}>
              <Ionicons name="sparkles" size={22} color="#FFFFFF" />
            </View>
            <Text style={{
              fontSize: 28,
              fontWeight: '300',
              color: '#1A1A1A',
              textAlign: 'center',
              letterSpacing: -0.5,
              lineHeight: 36,
            }}>
              {getGreeting()},{'\n'}
              {getSubGreeting()}
            </Text>
          </View>

          {/* Öneri chip'leri */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            {suggestions.map((s, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => { setInput(s); }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 20,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 0.5,
                  borderColor: '#E5E5EA',
                }}
              >
                <Text style={{ fontSize: 14, color: '#3C3C43' }}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        /* MESAJLAR VARKEN — sohbet listesi */
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={
            <View style={{ alignItems: 'center', paddingBottom: 16 }}>
              <View style={{
                width: 32, height: 32, borderRadius: 16,
                backgroundColor: '#1A1A1A',
                alignItems: 'center', justifyContent: 'center', marginBottom: 6,
              }}>
                <Ionicons name="sparkles" size={14} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 12, color: '#C7C7CC' }}>
                {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          }
        />
      )}

      {/* Ek dosya önizleme */}
      {attachments.length > 0 && (
        <View style={{
          flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, gap: 8,
          backgroundColor: '#FFFFFF', borderTopWidth: 0.5, borderTopColor: '#F2F2F7',
        }}>
          {attachments.map((att, i) => (
            <View key={i} style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: '#F5F3EF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
            }}>
              <Ionicons
                name={att.type === 'image' ? 'image-outline' : 'document-outline'}
                size={14} color="#8E8E93"
              />
              <Text style={{ fontSize: 12, color: '#3C3C43', maxWidth: 80 }} numberOfLines={1}>
                {att.name}
              </Text>
              <TouchableOpacity onPress={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                <Ionicons name="close-circle" size={14} color="#C7C7CC" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* INPUT BAR — Claude tarzı */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#F2F2F7',
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            backgroundColor: '#F5F3EF',
            borderRadius: 24,
            paddingHorizontal: 6,
            paddingVertical: 4,
            minHeight: 44,
          }}>
            {/* Sol ikonlar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6 }}>
              <TouchableOpacity onPress={pickDocument} style={{ padding: 6 }}>
                <Ionicons name="add" size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            {/* Input */}
            <TextInput
              ref={inputRef}
              style={{
                flex: 1,
                fontSize: 16,
                color: '#1A1A1A',
                maxHeight: 120,
                paddingHorizontal: 8,
                paddingVertical: 8,
              }}
              placeholder="VOXI'ye bir şey sor..."
              placeholderTextColor="#C7C7CC"
              value={input}
              onChangeText={setInput}
              multiline
            />

            {/* Sağ ikonlar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 6 }}>
              {!input.trim() && (
                <>
                  <TouchableOpacity onPress={pickImage} style={{ padding: 6 }}>
                    <Ionicons name="camera-outline" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 6 }}>
                    <Ionicons name="mic-outline" size={20} color="#8E8E93" />
                  </TouchableOpacity>
                </>
              )}
              {input.trim().length > 0 && (
                <TouchableOpacity
                  onPress={handleSend}
                  disabled={isLoading}
                  style={{
                    width: 32, height: 32, borderRadius: 16,
                    backgroundColor: isLoading ? '#E5E5EA' : '#1A1A1A',
                    alignItems: 'center', justifyContent: 'center', margin: 2,
                  }}
                >
                  <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
