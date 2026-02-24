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
import AddMemberModal from '../../components/AddMemberModal';
import type { Card, CardMember } from '../../hooks/useCards';
import { ONCELIK_ETIKET, KART_DURUMU_ETIKET, ROL_ETIKET, type Oncelik, type KartDurumu, type Rol } from '../../lib/constants';
import ActionModal, { type ActionType } from '../../components/ActionModal';

type Tab = 'chat' | 'depot';

function getInitials(name: string): string {
  return name.split(/[\s\-]+/).filter(w => w.length > 0).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, membership } = useAuth();
  const [tab, setTab] = useState<Tab>('chat');
  const [card, setCard] = useState<Card | null>(null);
  const [cardLoading, setCardLoading] = useState(true);
  const [cardError, setCardError] = useState<string | null>(null);
  const [members, setMembers] = useState<CardMember[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);

  const fetchCard = async () => {
    setCardError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cards')
        .select(`
          *,
          customers(id, company_name, contact_name, phone, email),
          card_members(user_id, role)
        `)
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('[CardDetail] Fetch error:', fetchError.message);
        setCardError(fetchError.message);
        setCardLoading(false);
        return;
      }

      if (data) {
        const rawMembers: CardMember[] = (data as any).card_members || [];

        const userIds = rawMembers.map(m => m.user_id);
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

          const profileMap = new Map(
            profiles?.map(p => [p.id, { full_name: p.full_name }]) || []
          );
          rawMembers.forEach(m => {
            m.profiles = profileMap.get(m.user_id) || null;
          });
        }

        setCard(data as Card);
        setMembers(rawMembers);
      }
    } catch (err: any) {
      console.error('[CardDetail] Exception:', err);
      setCardError(err.message || 'Kart yüklenemedi');
    } finally {
      setCardLoading(false);
    }
  };

  useEffect(() => { fetchCard(); }, [id]);

  const handleMembersChanged = () => {
    fetchCard();
  };

  if (cardError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: 8 }}>
            Kart yüklenemedi
          </Text>
          <Text style={{ fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 24 }}>
            {cardError}
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: colors.dark, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}
            onPress={() => { setCardLoading(true); fetchCard(); }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFF' }}>Tekrar Dene</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => router.back()}>
            <Text style={{ fontSize: 16, color: colors.muted }}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={styles.headerMeta}>
            <Text style={styles.headerSub} numberOfLines={1}>
              {card.customers?.company_name || KART_DURUMU_ETIKET[card.status as KartDurumu] || card.status}
              {card.priority !== 'normal' && card.priority !== 'low'
                ? ` · ${ONCELIK_ETIKET[card.priority as Oncelik] || card.priority}`
                : ''}
            </Text>
          </View>
          {/* Member avatars row */}
          <View style={styles.memberRow}>
            {members.slice(0, 5).map((m, i) => (
              <View key={m.user_id} style={[styles.miniAvatar, i > 0 && { marginLeft: -6 }]}>
                <Text style={styles.miniAvatarText}>
                  {getInitials(m.profiles?.full_name || '?')}
                </Text>
              </View>
            ))}
            {members.length > 5 && (
              <View style={[styles.miniAvatar, { marginLeft: -6, backgroundColor: colors.dark }]}>
                <Text style={[styles.miniAvatarText, { color: '#FFF' }]}>+{members.length - 5}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddMember(true)}>
              <Text style={styles.addMemberText}>+</Text>
            </TouchableOpacity>
          </View>
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
        <ChatTab cardId={id!} userId={user?.id} members={members} />
      ) : (
        <DepotTab cardId={id!} card={card} />
      )}

      {/* Add Member Modal */}
      <AddMemberModal
        visible={showAddMember}
        onClose={() => setShowAddMember(false)}
        cardId={id!}
        currentMembers={members}
        workspaceId={membership?.workspace_id}
        teamId={membership?.team_id}
        onMembersChanged={handleMembersChanged}
      />
    </SafeAreaView>
  );
}

// ─────── CHAT TAB ───────
function ChatTab({ cardId, userId, members }: { cardId: string; userId?: string; members: CardMember[] }) {
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
    const result = await sendMessage(msg);
    if (result?.error) {
      Alert.alert('Hata', 'Mesaj gonderilemedi. Tekrar deneyin.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <MessageBubble message={item} isMe={item.user_id === userId} />}
        contentContainerStyle={styles.chatList}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        ListEmptyComponent={
          !loading ? (
            <View style={styles.chatEmpty}>
              <Text style={styles.chatEmptyText}>Henuz mesaj yok. Konusmaya basla!</Text>
            </View>
          ) : null
        }
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.card }}>
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
      </SafeAreaView>
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
        <Text style={styles.voiceLabel}>🎤 Ses kaydı {message.duration ? `(${Math.floor(message.duration / 60)}:${String(message.duration % 60).padStart(2, '0')})` : ''}</Text>
        {message.content && <Text style={styles.bubbleText}>{message.content}</Text>}
        <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{time}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
      {!isMe && (
        <View style={styles.senderRow}>
          <View style={styles.senderAvatar}>
            <Text style={styles.senderAvatarText}>
              {senderName.split(/[\s\-]+/).filter(w => w.length > 0).slice(0, 2).map(w => w[0].toUpperCase()).join('')}
            </Text>
          </View>
          <Text style={styles.senderName}>{senderName}</Text>
        </View>
      )}
      <Text style={styles.bubbleText}>{message.content}</Text>
      <Text style={[styles.msgTime, isMe && styles.msgTimeMe]}>{time}</Text>
    </View>
  );
}

// ─────── DEPOT TAB ───────
function DepotTab({ cardId, card }: { cardId: string; card: Card }) {
  const { items, mediaItems, loading, addItem } = useDepot(cardId);
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);

  const customer = card.customers;

  return (
    <ScrollView style={styles.depotContainer} contentContainerStyle={styles.depotContent}>
      {/* Customer Section */}
      {customer && (
        <View style={styles.depotSection}>
          <Text style={styles.depotSectionTitle}>MÜŞTERİ</Text>
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
          <Text style={styles.depotEmpty}>Henüz medya yok</Text>
        )}
      </View>

      {/* Actions Section */}
      <View style={styles.depotSection}>
        <Text style={styles.depotSectionTitle}>AKSİYONLAR</Text>
        <View style={styles.actionGrid}>
          <ActionButton
            icon="📋" label="Teklif Oluştur"
            sub="AI ile hazırla"
            onPress={() => setActiveAction('proposal')}
          />
          <ActionButton
            icon="⏰" label="Hatırlatma Kur"
            sub="Bildirim planla"
            onPress={() => setActiveAction('reminder')}
          />
          <ActionButton
            icon="📧" label="E-posta"
            sub={customer?.email || 'Adres ekle'}
            onPress={() => setActiveAction('email')}
          />
          <ActionButton
            icon="💬" label="WhatsApp"
            sub={customer?.phone || 'Numara ekle'}
            onPress={() => setActiveAction('whatsapp')}
          />
          <ActionButton
            icon="📱" label="SMS"
            sub={customer?.phone || 'Numara ekle'}
            onPress={() => setActiveAction('sms')}
          />
        </View>
      </View>

      {/* Action Modal */}
      {activeAction && (
        <ActionModal
          visible={!!activeAction}
          actionType={activeAction}
          card={card}
          onClose={() => setActiveAction(null)}
          onSaved={() => addItem({ type: 'reminder', title: 'Hatırlatma kuruldu', metadata: {} })}
        />
      )}

      {/* History Section */}
      <View style={styles.depotSection}>
        <Text style={styles.depotSectionTitle}>GEÇMİŞ</Text>
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
        {items.length === 0 && <Text style={styles.depotEmpty}>Henüz geçmiş yok</Text>}
      </View>

      {/* Card Info */}
      <View style={styles.depotSection}>
        <Text style={styles.depotSectionTitle}>KART BİLGİSİ</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Durum</Text>
          <Text style={styles.infoValue}>
            {KART_DURUMU_ETIKET[card.status as KartDurumu] || card.status}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Öncelik</Text>
          <Text style={styles.infoValue}>
            {ONCELIK_ETIKET[card.priority as Oncelik] || card.priority}
          </Text>
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
            <Text style={styles.summaryLabel}>AI Özet</Text>
            <Text style={styles.summaryText}>{card.ai_summary}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function ActionButton({ icon, label, sub, onPress }: { icon: string; label: string; sub?: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.actionIconWrap}>
        <Text style={styles.actionIcon}>{icon}</Text>
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={styles.actionLabel}>{label}</Text>
        {sub && <Text style={styles.actionSub} numberOfLines={1}>{sub}</Text>}
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: 4, marginTop: 2 },
  backText: { fontSize: 22, color: colors.dark, fontWeight: '500' },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.dark },
  headerMeta: { marginTop: 2 },
  headerSub: { fontSize: 13, color: colors.muted },
  memberRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  miniAvatar: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.card,
  },
  miniAvatarText: { fontSize: 8, fontWeight: '700', color: colors.text },
  addMemberBtn: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.borderLight, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginLeft: 4,
  },
  addMemberText: { fontSize: 14, fontWeight: '600', color: colors.muted },
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
  senderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  senderAvatar: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center',
  },
  senderAvatarText: { fontSize: 7, fontWeight: '700', color: colors.text },
  senderName: { fontSize: 12, fontWeight: '600', color: colors.dark },
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
  actionGrid: { gap: 8 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  actionIconWrap: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  actionIcon: { fontSize: 20 },
  actionTextWrap: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: colors.dark },
  actionSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
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
