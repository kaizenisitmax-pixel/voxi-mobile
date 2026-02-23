import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useCards, Card } from '../../hooks/useCards';
import { colors } from '../../lib/colors';

function getInitials(title: string): string {
  return title
    .split(/[\s\-]+/)
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

function getTimeAgo(date: string): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'simdi';
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'dun';
  if (days < 7) return `${days}g`;
  return new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

function getPriorityDot(priority: string) {
  if (priority === 'urgent') return '#FF3B30';
  if (priority === 'high') return '#8E8E93';
  return null;
}

function CardItem({ card, onPress }: { card: Card; onPress: () => void }) {
  const dotColor = getPriorityDot(card.priority);
  const customerName = card.customers?.company_name;

  return (
    <TouchableOpacity style={styles.cardItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(card.title)}</Text>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={1}>{card.title}</Text>
          <Text style={styles.cardTime}>{getTimeAgo(card.last_message_at)}</Text>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.previewRow}>
            {dotColor && <View style={[styles.priorityDot, { backgroundColor: dotColor }]} />}
            <Text style={styles.cardPreview} numberOfLines={1}>
              {card.last_message_preview || card.description || 'Yeni kart'}
            </Text>
          </View>
          {card.unread_count > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{card.unread_count}</Text>
            </View>
          )}
        </View>

        {customerName && (
          <Text style={styles.customerTag} numberOfLines={1}>{customerName}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { cards, loading, fetchCards } = useCards();

  const openCards = cards.filter(c => c.status !== 'done');
  const doneCards = cards.filter(c => c.status === 'done');

  return (
    <View style={styles.container}>
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
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Henuz kart yok</Text>
              <Text style={styles.emptyDesc}>
                Sag ustteki + butonuna tiklayarak{'\n'}ses kaydi, foto veya metin ile baslaylin.
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={openCards.length === 0 ? styles.emptyContainer : undefined}
      />

      {doneCards.length > 0 && (
        <TouchableOpacity style={styles.doneBar}>
          <Text style={styles.doneText}>
            {doneCards.length} tamamlanan is
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  cardItem: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.card, gap: 14, alignItems: 'center',
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.dark, flex: 1, marginRight: 8 },
  cardTime: { fontSize: 12, color: colors.muted },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  cardPreview: { fontSize: 14, color: colors.muted, flex: 1 },
  badge: {
    backgroundColor: colors.dark, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  customerTag: { fontSize: 12, color: colors.muted, marginTop: 4 },
  separator: { height: 1, backgroundColor: colors.border, marginLeft: 86 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyContainer: { flex: 1 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: 8 },
  emptyDesc: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  doneBar: {
    paddingVertical: 12, paddingHorizontal: 20,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.card,
  },
  doneText: { fontSize: 14, color: colors.muted, textAlign: 'center' },
});
