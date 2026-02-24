import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ScrollView, Modal } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback, memo, useEffect, useMemo } from 'react';
import { useCards, Card, CardMember } from '../../hooks/useCards';
import { colors } from '../../lib/colors';
import { getSelectedIndustry } from '../../lib/industryStore';
import type { Industry } from '../../lib/industries';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoodCheckin from '../../components/MoodCheckin';
import EQCelebration from '../../components/EQCelebration';
import { useAuth } from '../../contexts/AuthContext';
import { ONCELIK_RENK, siralaKartlar, type Oncelik } from '../../lib/constants';

// ─── Filtre tanımları ─────────────────────────────────────────────
type FilterKey = 'all' | 'urgent' | 'active' | 'open' | 'done' | 'mine';

const FILTERS: { key: FilterKey; label: string; emoji: string }[] = [
  { key: 'all',    label: 'Tümü',     emoji: '🏠' },
  { key: 'urgent', label: 'Acil',     emoji: '⚡' },
  { key: 'active', label: 'En Son',   emoji: '🕐' },
  { key: 'open',   label: 'Bekleyen', emoji: '⏳' },
  { key: 'done',   label: 'Biten',    emoji: '✅' },
  { key: 'mine',   label: 'Kişisel',  emoji: '👤' },
];

// ─── Filtre Chip'leri ─────────────────────────────────────────────
const FilterChips = memo(function FilterChips({
  activeFilter, onSelect, cards, currentUserId, industry, onTemplatePress,
}: {
  activeFilter: FilterKey;
  onSelect: (f: FilterKey) => void;
  cards: Card[];
  currentUserId?: string | null;
  industry: Industry | null;
  onTemplatePress: () => void;
}) {
  const counts: Record<FilterKey, number> = {
    all:    cards.filter(c => c.status !== 'done' && c.status !== 'cancelled').length,
    urgent: cards.filter(c => c.priority === 'urgent' && c.status !== 'done').length,
    active: Math.min(cards.length, 10),
    open:   cards.filter(c => c.status === 'open' || c.status === 'waiting').length,
    done:   cards.filter(c => c.status === 'done').length,
    mine:   cards.filter(c => currentUserId && c.card_members?.some((m: any) => m.user_id === currentUserId)).length,
  };

  return (
    <View style={chipStyles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={chipStyles.row}
      >
        {FILTERS.map(f => {
          const isActive = activeFilter === f.key;
          const count    = counts[f.key];
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => onSelect(f.key)}
              style={[chipStyles.chip, isActive && chipStyles.chipActive]}
              activeOpacity={0.7}
            >
              <Text style={chipStyles.chipEmoji}>{f.emoji}</Text>
              <Text style={[chipStyles.chipLabel, isActive && chipStyles.chipLabelActive]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[chipStyles.badge, isActive && chipStyles.badgeActive, f.key === 'urgent' && chipStyles.badgeUrgent]}>
                  <Text style={[chipStyles.badgeText, isActive && chipStyles.badgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Şablonlar — sadece sektör seçiliyse göster */}
        {industry && industry.quickActions.length > 0 && (
          <TouchableOpacity
            style={chipStyles.templateBtn}
            onPress={onTemplatePress}
            activeOpacity={0.7}
          >
            <Text style={chipStyles.templateBtnText}>⚡ Şablonlar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
});

const chipStyles = StyleSheet.create({
  wrap:            { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  row:             { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 6, alignItems: 'center' },
  chip:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  chipActive:      { backgroundColor: colors.dark, borderColor: colors.dark },
  chipEmoji:       { fontSize: 14 },
  chipLabel:       { fontSize: 13, fontWeight: '600', color: colors.text },
  chipLabelActive: { color: '#fff' },
  badge:           { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeActive:     { backgroundColor: 'rgba(255,255,255,0.25)' },
  badgeUrgent:     { backgroundColor: '#FFEEEE' },
  badgeText:       { fontSize: 10, fontWeight: '800', color: colors.text },
  badgeTextActive: { color: '#fff' },
  templateBtn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border, marginLeft: 4 },
  templateBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },
});

function getInitials(name: string): string {
  return name
    .split(/[\s\-]+/)
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function getTimeAgo(date: string): string {
  if (!date) return '';
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'şimdi';
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'dün';
  if (days < 7) return `${days}g`;
  return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function getPriorityDot(priority: string): string | null {
  return ONCELIK_RENK[priority as Oncelik] ?? null;
}


// ─── Inline üye avatar satırı ─────────────────────────────────────
const MemberAvatarStrip = memo(function MemberAvatarStrip({ members }: { members?: CardMember[] }) {
  const list = (members || []).filter(m => m.profiles?.full_name);
  if (list.length === 0) return null;

  const MAX = 4;
  const visible = list.slice(0, MAX);
  const extra   = list.length - MAX;
  const AVATAR_SIZE = 18;
  const OVERLAP     = 6;
  const totalWidth  = AVATAR_SIZE + (visible.length - 1) * (AVATAR_SIZE - OVERLAP) + (extra > 0 ? AVATAR_SIZE - OVERLAP : 0);

  const names = list.slice(0, 3).map(m => m.profiles!.full_name!.split(' ')[0]).join(', ')
    + (list.length > 3 ? ` +${list.length - 3}` : '');

  return (
    <View style={styles.memberStrip}>
      {/* Overlapping küçük avatarlar */}
      <View style={[styles.avatarOverlapRow, { width: totalWidth }]}>
        {visible.map((m, i) => (
          <View
            key={m.user_id}
            style={[styles.miniAvatar, { left: i * (AVATAR_SIZE - OVERLAP), zIndex: visible.length - i }]}
          >
            <Text style={styles.miniAvatarText}>
              {getInitials(m.profiles?.full_name || '?')}
            </Text>
          </View>
        ))}
        {extra > 0 && (
          <View style={[styles.miniAvatar, styles.miniAvatarExtra, { left: visible.length * (AVATAR_SIZE - OVERLAP), zIndex: 0 }]}>
            <Text style={styles.miniAvatarExtraText}>+{extra}</Text>
          </View>
        )}
      </View>
      {/* İsimler */}
      <Text style={styles.memberNames} numberOfLines={1}>{names}</Text>
    </View>
  );
});

const CardItem = memo(function CardItem({ card, onPress }: { card: Card; onPress: () => void }) {
  const dotColor = getPriorityDot(card.priority);
  const customerName = card.customers?.company_name;

  const isUrgent     = card.priority === 'urgent';
  const isInProgress = card.status === 'in_progress';
  const hasUnread    = (card.unread_count || 0) > 0;

  return (
    <TouchableOpacity
      style={[styles.cardItem, isUrgent && styles.cardItemUrgent]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityLabel={`${card.title} kartını aç`}
    >
      {/* Sol: Kart avatarı (kart baş harfleri) */}
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarText}>{getInitials(card.title)}</Text>
        {isInProgress && (
          <View style={styles.progressDot} />
        )}
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={styles.cardTitleRow}>
            {dotColor && <View style={[styles.priorityDot, { backgroundColor: dotColor }]} />}
            <Text style={[styles.cardTitle, hasUnread && styles.cardTitleBold]} numberOfLines={1}>
              {card.title}
            </Text>
          </View>
          <Text style={styles.cardTime}>{getTimeAgo(card.last_message_at)}</Text>
        </View>

        <View style={styles.cardBottom}>
          <Text style={[styles.cardPreview, hasUnread && styles.cardPreviewBold]} numberOfLines={1}>
            {customerName
              ? `${customerName}${card.last_message_preview ? '  ·  ' + card.last_message_preview : ''}`
              : (card.last_message_preview || card.description || 'Yeni kart')}
          </Text>
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{card.unread_count}</Text>
            </View>
          )}
        </View>

        {/* Alt meta: badge'ler + üye avatarları */}
        <View style={styles.cardMeta}>
          {isUrgent && (
            <View style={styles.acilBadge}>
              <Text style={styles.acilBadgeText}>⚡ Acil</Text>
            </View>
          )}
          {isInProgress && !isUrgent && (
            <View style={styles.devamBadge}>
              <Text style={styles.devamBadgeText}>⏳ Devam</Text>
            </View>
          )}
          {/* Üye avatar satırı */}
          <MemberAvatarStrip members={card.card_members} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

// QuickActionsModal — sektör aksiyonları hamburger butona taşındı
function QuickActionsModal({ industry, visible, onClose }: { industry: Industry | null; visible: boolean; onClose: () => void }) {
  const router = useRouter();
  if (!industry) return null;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={qaStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={qaStyles.sheet}>
          <View style={qaStyles.handle} />
          <View style={qaStyles.header}>
            <Text style={qaStyles.title}>⚡ {industry.name} Şablonları</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={qaStyles.close}>Kapat</Text>
            </TouchableOpacity>
          </View>
          {industry.quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={qaStyles.item}
              onPress={() => { onClose(); router.push('/new'); }}
              activeOpacity={0.7}
            >
              <Text style={qaStyles.itemText}>{action}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const qaStyles = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet:    { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 40 },
  handle:   { width: 36, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:    { fontSize: 16, fontWeight: '700', color: colors.dark },
  close:    { fontSize: 15, fontWeight: '600', color: colors.muted },
  item:     { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemText: { fontSize: 15, color: colors.dark },
});

type Celebration = { type: 'work_anniversary' | 'milestone' | 'birthday'; name: string; message: string; emoji: string };

export default function HomeScreen() {
  const router = useRouter();
  const { cards, loading, error, fetchCards } = useCards();
  const { membership, user } = useAuth();
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [showMood, setShowMood] = useState(false);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [showCelebrations, setShowCelebrations] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [showTemplates, setShowTemplates] = useState(false);

  // Check if mood check-in was done today
  useEffect(() => {
    const checkMoodToday = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastMood = await AsyncStorage.getItem('voxi_last_mood_date');
      if (lastMood !== today) {
        // Show after 2 seconds delay to not interrupt loading
        setTimeout(() => setShowMood(true), 2000);
      }
    };
    checkMoodToday();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCards();
      getSelectedIndustry().then(setIndustry);
    }, [fetchCards])
  );

  const { acikKartlar, tamamlananKartlar } = siralaKartlar(cards);

  // Filtre uygula
  const filteredOpen = useMemo(() => {
    const currentUserId = user?.id;
    switch (activeFilter) {
      case 'urgent': return acikKartlar.filter(c => c.priority === 'urgent');
      case 'active': return [...cards].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);
      case 'open':   return acikKartlar.filter(c => c.status === 'open' || c.status === 'waiting');
      case 'done':   return tamamlananKartlar;
      case 'mine':   return [...acikKartlar, ...tamamlananKartlar].filter(c =>
        currentUserId && c.card_members?.some((m: any) => m.user_id === currentUserId)
      );
      default:       return acikKartlar;
    }
  }, [acikKartlar, tamamlananKartlar, activeFilter, user?.id]);

  const openCards = filteredOpen;
  const doneCards = activeFilter === 'done' ? [] : tamamlananKartlar;

  const handleMoodClose = async () => {
    const today = new Date().toISOString().split('T')[0];
    await AsyncStorage.setItem('voxi_last_mood_date', today);
    setShowMood(false);
  };

  return (
    <View style={styles.container}>
      {/* EQ: Kompakt mood check-in banner (bugün yapılmadıysa) */}
      {showMood && membership?.workspace_id && (
        <View style={styles.moodBanner}>
          <MoodCheckin
            workspaceId={membership.workspace_id}
            onClose={handleMoodClose}
            compact
          />
        </View>
      )}

      {error && (
        <TouchableOpacity style={styles.errorBanner} onPress={fetchCards}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <Text style={styles.errorRetry}>Tekrar dene</Text>
        </TouchableOpacity>
      )}

      {/* EQ: Kutlamalar */}
      {celebrations.length > 0 && (
        <EQCelebration
          celebrations={celebrations}
          onClose={() => { setCelebrations([]); setShowCelebrations(false); }}
        />
      )}

      {/* Sektör şablonları — hamburger butona taşındı */}
      <QuickActionsModal
        industry={industry}
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
      />

      <FlatList
        data={openCards}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CardItem
            card={item}
            onPress={() => router.push(`/card/${item.id}`)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchCards} tintColor={colors.dark} />
        }
        removeClippedSubviews
        maxToRenderPerBatch={10}
        ListHeaderComponent={
          <FilterChips
            activeFilter={activeFilter}
            onSelect={setActiveFilter}
            cards={cards}
            currentUserId={user?.id}
            industry={industry}
            onTemplatePress={() => setShowTemplates(true)}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Henüz kart yok</Text>
              <Text style={styles.emptyDesc}>
                İlk kartınızı oluşturmak için{'\n'}aşağıdaki butona dokunun.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/new')}
              >
                <Text style={styles.emptyBtnText}>+ Yeni Kart Oluştur</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={openCards.length === 0 ? styles.emptyContainer : undefined}
      />

      {doneCards.length > 0 && activeFilter !== 'done' && (
        <TouchableOpacity
          style={styles.doneBar}
          activeOpacity={0.7}
          onPress={() => setActiveFilter('done')}
        >
          <Text style={styles.doneText}>✓ {doneCards.length} tamamlanan iş</Text>
          <Text style={styles.doneArrow}>›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const MINI_AVATAR = 18;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardItem: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.card, gap: 14, alignItems: 'flex-start',
  },
  cardItemUrgent: { borderLeftWidth: 3, borderLeftColor: '#FF3B30' },

  // Sol avatar (kart baş harfleri)
  cardAvatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  cardAvatarText: { fontSize: 15, fontWeight: '700', color: colors.text },
  progressDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.dark, borderWidth: 2, borderColor: colors.card,
  },

  cardContent: { flex: 1, paddingTop: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 16, fontWeight: '500', color: colors.dark, flex: 1 },
  cardTitleBold: { fontWeight: '700' },
  cardTime: { fontSize: 12, color: colors.muted, flexShrink: 0 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  priorityDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  cardPreview: { fontSize: 14, color: colors.muted, flex: 1 },
  cardPreviewBold: { fontWeight: '600', color: colors.text },
  badge: {
    backgroundColor: colors.dark, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  cardMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  acilBadge: {
    backgroundColor: '#FFF0EE', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: '#FF3B30',
  },
  acilBadgeText: { fontSize: 11, fontWeight: '700', color: '#FF3B30' },
  devamBadge: {
    backgroundColor: '#F5F3EF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1, borderColor: colors.border,
  },
  devamBadgeText: { fontSize: 11, fontWeight: '600', color: colors.text },

  // Üye avatar satırı
  memberStrip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarOverlapRow: { height: MINI_AVATAR, position: 'relative' },
  miniAvatar: {
    position: 'absolute', top: 0,
    width: MINI_AVATAR, height: MINI_AVATAR, borderRadius: MINI_AVATAR / 2,
    backgroundColor: colors.avatar,
    borderWidth: 1.5, borderColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  miniAvatarText: { fontSize: 7, fontWeight: '700', color: colors.text },
  miniAvatarExtra: { backgroundColor: colors.dark },
  miniAvatarExtraText: { fontSize: 7, fontWeight: '700', color: '#FFF' },
  memberNames: { fontSize: 11, color: colors.muted, flex: 1 },

  separator: { height: 1, backgroundColor: colors.border, marginLeft: 82 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyContainer: { flex: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: '#1A1A1A', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14, marginTop: 16 },
  emptyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  doneBar: {
    paddingVertical: 12, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  doneText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  doneArrow: { fontSize: 16, color: colors.muted },
  moodBanner: { borderBottomWidth: 1, borderBottomColor: colors.border },
  errorBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#FFF3CD', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#FFE69C',
  },
  errorText: { fontSize: 14, color: '#856404', flex: 1 },
  errorRetry: { fontSize: 14, fontWeight: '600', color: '#856404', marginLeft: 12 },
});
