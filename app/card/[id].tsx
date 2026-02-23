import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, Linking, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useChat, ChatMessage } from '../../hooks/useChat';
import { useDepot } from '../../hooks/useDepot';
import { colors } from '../../lib/colors';
import type { Card } from '../../hooks/useCards';

type Tab = 'chat' | 'depot';

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('chat');
  const [card, setCard] = useState<Card | null>(null);
  const [cardLoading, setCardLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('cards')
        .select('*, customers(id, company_name, contact_name)')
        .eq('id', id)
        .single();
      setCard(data as Card);
      setCardLoading(false);
    })();
  }, [id]);

  if (cardLoading || !card) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>{card.title}</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {card.customers?.company_name || card.status}
            {card.priority === 'urgent' ? ' · Acil' : ''}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'chat' && styles.tabActive]}
          onPress={() => setTab('chat')}
        >
          <Text style={[styles.tabText, tab === 'chat' && styles.tabTextActive]}>Sohbet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'depot' && styles.tabActive]}
          onPress={() => setTab('depot')}
        >
          <Text style={[styles.tabText, tab === 'depot' && styles.tabTextActive]}>Depo</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'chat' ? (
        <ChatTab cardId={id!} userId={user?.id} />
      ) : (
        <DepotTab cardId={id!} card={card} />
      )}
    </SafeAreaView>
  );
}

// ─────── CHAT TAB ───────
function ChatTab({ cardId, userId }: { cardId: string; userId?: string }) {
  const { messages, loading, sendMessage } = useChat(cardId);
  const [text, setText] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const msg = text.trim();
    setText('');
    await sendMessage(msg);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <MessageBubble message={item} isMe={item.user_id === userId} />}
        contentContainerStyle={styles.chatList}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.chatEmpty}>
              <Text style={styles.chatEmptyText}>Henuz mesaj yok. Konusmaya basla!</Text>
            </View>
          ) : null
        }
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.chatInput}
          placeholder="Mesaj yaz..."
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim()}
        >
          <Text style={styles.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageBubble({ message, isMe }: { message: ChatMessage; isMe: boolean }) {
  const isSystem = message.message_type === 'system' || message.message_type === 'ai';
  const senderName = message.profiles?.full_name || 'VOXI';
  const time = new Date(message.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  if (isSystem) {
    return (
      <View style={styles.systemMsg}>
        <Text style={styles.systemSender}>VOXI</Text>
        <Text style={styles.systemText}>{message.content}</Text>
        <Text style={styles.msgTime}>{time}</Text>
      </View>
    );
  }

  if (message.message_type === 'voice') {
    return (
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
        {!isMe && <Text style={styles.senderName}>{senderName}</Text>}
        <Text style={styles.voiceLabel}>🎤 Ses kaydi {message.duration ? `(${Math.floor(message.duration / 60)}:${String(message.duration % 60).padStart(2, '0')})` : ''}</Text>
        {message.content && <Text style={styles.bubbleText}>{message.content}</Text>}
        <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{time}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
      {!isMe && <Text style={styles.senderName}>{senderName}</Text>}
      <Text style={styles.bubbleText}>{message.content}</Text>
      <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{time}</Text>
    </View>
  );
}

// ─────── DEPOT TAB ───────
function DepotTab({ cardId, card }: { cardId: string; card: Card }) {
  const { items, mediaItems, loading, addItem } = useDepot(cardId);
  const router = useRouter();

  const customer = card.customers;

  return (
    <ScrollView style={styles.depotContainer} contentContainerStyle={styles.depotContent}>
      {/* Customer Section */}
      {customer && (
        <View style={styles.depotSection}>
          <Text style={styles.depotSectionTitle}>MUSTERI</Text>
          <TouchableOpacity
            style={styles.customerCard}
            onPress={() => router.push(`/customer/${customer.id}`)}
          >
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitials}>
                {customer.company_name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>{customer.company_name}</Text>
              {customer.contact_name && <Text style={styles.customerContact}>{customer.contact_name}</Text>}
            </View>
            <Text style={styles.chevron}>→</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Media Section */}
      <View style={styles.depotSection}>
        <Text style={styles.depotSectionTitle}>MEDYA ({mediaItems.length})</Text>
        {mediaItems.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaRow}>
            {mediaItems.map(item => (
              <View key={item.id} style={styles.mediaItem}>
                <Text style={styles.mediaIcon}>
                  {item.file_type?.startsWith('image') ? '📷' :
                   item.file_type?.startsWith('audio') ? '🎤' : '📄'}
                </Text>
                <Text style={styles.mediaName} numberOfLines={1}>{item.file_name || item.title || 'Dosya'}</Text>
              </View>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.depotEmpty}>Henuz medya yok</Text>
        )}
      </View>

      {/* Actions Section */}
      <View style={styles.depotSection}>
        <Text style={styles.depotSectionTitle}>AKSIYONLAR</Text>
        <ActionButton icon="📋" label="Teklif Olustur" onPress={() => Alert.alert('Bilgi', 'Web uzerinden teklif olusturabilirsiniz. voxi.com.tr')} />
        <ActionButton icon="📅" label="Hatirlatma Kur" onPress={() => {
          addItem({ type: 'reminder', title: 'Hatirlatma', metadata: { date: new Date().toISOString() } });
        }} />
        <ActionButton icon="📧" label="E-posta Gonder" onPress={() => Linking.openURL('mailto:')} />
        <ActionButton icon="💬" label="WhatsApp Gonder" onPress={() => Linking.openURL('whatsapp://')} />
        <ActionButton icon="📱" label="SMS Gonder" onPress={() => Linking.openURL('sms:')} />
      </View>

      {/* History Section */}
      <View style={styles.depotSection}>
        <Text style={styles.depotSectionTitle}>GECMIS</Text>
        {items.slice(0, 10).map(item => (
          <View key={item.id} style={styles.historyItem}>
            <Text style={styles.historyTime}>
              {new Date(item.created_at).toLocaleString('tr-TR', {
                hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short',
              })}
            </Text>
            <Text style={styles.historyText}>{item.title || item.type}</Text>
          </View>
        ))}
        {items.length === 0 && <Text style={styles.depotEmpty}>Henuz gecmis yok</Text>}
      </View>

      {/* Card Info */}
      <View style={styles.depotSection}>
        <Text style={styles.depotSectionTitle}>KART BILGISI</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Durum</Text>
          <Text style={styles.infoValue}>{card.status}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Oncelik</Text>
          <Text style={styles.infoValue}>{card.priority}</Text>
        </View>
        {card.due_date && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Son Tarih</Text>
            <Text style={styles.infoValue}>
              {new Date(card.due_date).toLocaleDateString('tr-TR')}
            </Text>
          </View>
        )}
        {card.ai_summary && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>AI Ozet</Text>
            <Text style={styles.summaryText}>{card.ai_summary}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ActionButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.chevron}>→</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4 },
  backText: { fontSize: 22, color: colors.dark, fontWeight: '500' },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.dark },
  headerSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.dark },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.muted },
  tabTextActive: { color: colors.dark },

  // Chat
  chatList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chatEmpty: { padding: 40, alignItems: 'center' },
  chatEmptyText: { fontSize: 14, color: colors.muted },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 4 },
  bubbleMe: { backgroundColor: colors.bubble, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: colors.card, alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.border },
  senderName: { fontSize: 12, fontWeight: '600', color: colors.dark, marginBottom: 4 },
  bubbleText: { fontSize: 15, color: colors.dark, lineHeight: 21 },
  voiceLabel: { fontSize: 14, color: colors.muted, marginBottom: 4 },
  msgTime: { fontSize: 11, color: colors.muted, marginTop: 4 },
  msgTimeMe: { textAlign: 'right' },
  systemMsg: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 10, marginBottom: 4 },
  systemSender: { fontSize: 12, fontWeight: '700', color: colors.dark, marginBottom: 2 },
  systemText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
  chatInput: {
    flex: 1, minHeight: 40, maxHeight: 120, backgroundColor: colors.bg,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 16, color: colors.dark,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.disabled },
  sendText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  // Depot
  depotContainer: { flex: 1 },
  depotContent: { padding: 16, gap: 24 },
  depotSection: { gap: 8 },
  depotSectionTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  depotEmpty: { fontSize: 14, color: colors.muted, paddingVertical: 8 },
  customerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  customerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center',
  },
  customerInitials: { fontSize: 14, fontWeight: '700', color: colors.text },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 16, fontWeight: '600', color: colors.dark },
  customerContact: { fontSize: 13, color: colors.muted, marginTop: 2 },
  chevron: { fontSize: 16, color: colors.muted },
  mediaRow: { paddingVertical: 4 },
  mediaItem: {
    width: 80, height: 80, borderRadius: 12, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  mediaIcon: { fontSize: 24, marginBottom: 4 },
  mediaName: { fontSize: 10, color: colors.muted, paddingHorizontal: 4 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: { fontSize: 20 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: colors.dark },
  historyItem: { flexDirection: 'row', gap: 12, paddingVertical: 6 },
  historyTime: { fontSize: 12, color: colors.muted, width: 80 },
  historyText: { fontSize: 14, color: colors.text, flex: 1 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  infoLabel: { fontSize: 14, color: colors.muted },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.dark },
  summaryBox: {
    backgroundColor: colors.card, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 8 },
  summaryText: { fontSize: 14, color: colors.text, lineHeight: 20 },
});
