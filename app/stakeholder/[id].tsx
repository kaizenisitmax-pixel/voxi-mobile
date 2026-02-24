import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';

const ROLE_LABELS: Record<string, string> = {
  decision_maker: '👑 Karar Verici',
  influencer: '💡 Etkileyici',
  gatekeeper: '🔐 Kapı Tutucu',
  user: '👤 Kullanıcı',
};

const CARD_STATUS_LABELS: Record<string, string> = {
  open: 'Açık', in_progress: 'Devam Ediyor', done: 'Tamamlandı',
};

type Stakeholder = {
  id: string;
  full_name: string;
  title: string | null;
  company_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  role: string;
  notes: string | null;
  customer?: { id: string; company_name: string } | null;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function StakeholderDetailScreen() {
  const { id }   = useLocalSearchParams<{ id: string }>();
  const router   = useRouter();
  const [stake, setStake]     = useState<Stakeholder | null>(null);
  const [cards, setCards]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [stakeRes, cardsRes] = await Promise.all([
        supabase.from('stakeholders')
          .select('*, customers:customer_id(id, company_name)')
          .eq('id', id).single(),
        supabase.from('cards')
          .select('id, title, status, priority, last_message_at, customers:customer_id(company_name)')
          .eq('customer_id', (await supabase.from('stakeholders').select('customer_id').eq('id', id).single()).data?.customer_id)
          .neq('status', 'cancelled')
          .order('last_message_at', { ascending: false })
          .limit(10),
      ]);
      setStake(stakeRes.data as Stakeholder);
      setCards(cardsRes.data || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading || !stake) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const initials = stake.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const openWhatsApp = () => {
    if (!stake.phone) return;
    const phone = stake.phone.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${phone}`);
  };

  const openPhone = () => {
    if (!stake.phone) return;
    Linking.openURL(`tel:${stake.phone}`);
  };

  const openEmail = () => {
    if (!stake.email) return;
    Linking.openURL(`mailto:${stake.email}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profil */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{stake.full_name}</Text>
          {stake.title && <Text style={styles.title}>{stake.title}</Text>}
          {stake.company_name && <Text style={styles.company}>{stake.company_name}</Text>}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[stake.role] || stake.role}</Text>
          </View>
          {stake.customer?.company_name && (
            <Text style={styles.customerLink}>Müşteri: {stake.customer.company_name}</Text>
          )}
        </View>

        {/* Hızlı aksiyonlar */}
        <View style={styles.actionsRow}>
          {stake.phone && (
            <TouchableOpacity style={styles.actionBtn} onPress={openWhatsApp}>
              <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
            </TouchableOpacity>
          )}
          {stake.phone && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={openPhone}>
              <Text style={[styles.actionBtnText, styles.actionBtnSecondaryText]}>📞 Ara</Text>
            </TouchableOpacity>
          )}
          {stake.email && (
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={openEmail}>
              <Text style={[styles.actionBtnText, styles.actionBtnSecondaryText]}>📧</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* İletişim bilgileri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İLETİŞİM</Text>
          {stake.phone   && <InfoRow label="Telefon" value={stake.phone} />}
          {stake.email   && <InfoRow label="E-posta" value={stake.email} />}
          {stake.address && <InfoRow label="Adres"   value={stake.address} />}
        </View>

        {/* Notlar */}
        {stake.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTLAR</Text>
            <Text style={styles.notesText}>{stake.notes}</Text>
          </View>
        )}

        {/* Bağlı kartlar */}
        {cards.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BAĞLI KARTLAR ({cards.length})</Text>
            {cards.map(card => (
              <TouchableOpacity
                key={card.id}
                style={[styles.cardRow, card.priority === 'urgent' && styles.urgentCard]}
                onPress={() => router.push(`/card/${card.id}`)}
              >
                <View style={styles.cardRowLeft}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{card.title}</Text>
                  <Text style={styles.cardMeta}>
                    {CARD_STATUS_LABELS[card.status] || card.status}
                    {card.customers?.company_name ? ` · ${card.customers.company_name}` : ''}
                  </Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: colors.bg },
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText:       { fontSize: 14, color: colors.muted, fontWeight: '600' },
  content:        { padding: 16, paddingBottom: 40 },

  profileSection: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  avatar:         { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:     { fontSize: 20, fontWeight: '900', color: colors.text },
  name:           { fontSize: 20, fontWeight: '800', color: colors.dark, textAlign: 'center' },
  title:          { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },
  company:        { fontSize: 13, color: colors.muted, marginTop: 2, textAlign: 'center' },
  roleBadge:      { marginTop: 10, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: colors.bg, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  roleText:       { fontSize: 12, fontWeight: '700', color: colors.dark },
  customerLink:   { fontSize: 12, color: colors.muted, marginTop: 6 },

  actionsRow:     { flexDirection: 'row', gap: 8, marginBottom: 12 },
  actionBtn:      { flex: 1, backgroundColor: colors.dark, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionBtnSecondary:     { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  actionBtnSecondaryText: { color: colors.dark },

  section:        { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  sectionTitle:   { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1, marginBottom: 12 },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLabel:      { fontSize: 13, color: colors.muted },
  infoValue:      { fontSize: 13, fontWeight: '600', color: colors.dark, flex: 1, textAlign: 'right' },
  notesText:      { fontSize: 14, color: colors.text, lineHeight: 20 },

  cardRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  urgentCard:     { borderLeftWidth: 3, borderLeftColor: colors.danger, paddingLeft: 8 },
  cardRowLeft:    { flex: 1 },
  cardTitle:      { fontSize: 13, fontWeight: '700', color: colors.dark },
  cardMeta:       { fontSize: 11, color: colors.muted, marginTop: 2 },
  chevron:        { fontSize: 20, color: colors.muted, marginLeft: 8 },
});
