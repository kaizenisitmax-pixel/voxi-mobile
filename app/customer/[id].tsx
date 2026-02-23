import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';

type Customer = {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  status: string;
  notes: string | null;
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [relatedCards, setRelatedCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [custRes, cardsRes] = await Promise.all([
        supabase.from('customers').select('*').eq('id', id).single(),
        supabase.from('cards').select('id, title, status, priority, last_message_at').eq('customer_id', id).order('last_message_at', { ascending: false }).limit(20),
      ]);
      setCustomer(custRes.data as Customer);
      setRelatedCards(cardsRes.data || []);
      setLoading(false);
    })();
  }, [id]);

  if (loading || !customer) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const initials = customer.company_name.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.companyName}>{customer.company_name}</Text>
          {customer.contact_name && <Text style={styles.contactName}>{customer.contact_name}</Text>}
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{customer.status}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ILETISIM</Text>
          {customer.phone && <InfoRow label="Telefon" value={customer.phone} />}
          {customer.email && <InfoRow label="E-posta" value={customer.email} />}
          {customer.address && <InfoRow label="Adres" value={customer.address} />}
        </View>

        {customer.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTLAR</Text>
            <Text style={styles.notesText}>{customer.notes}</Text>
          </View>
        )}

        {/* Related Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BAGLI KARTLAR ({relatedCards.length})</Text>
          {relatedCards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={styles.relatedCard}
              onPress={() => router.push(`/card/${card.id}`)}
            >
              <Text style={styles.relatedTitle}>{card.title}</Text>
              <Text style={styles.relatedStatus}>{card.status}</Text>
            </TouchableOpacity>
          ))}
          {relatedCards.length === 0 && (
            <Text style={styles.emptyText}>Henuz bagli kart yok</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText: { fontSize: 16, color: colors.dark, fontWeight: '500' },
  content: { padding: 20, gap: 24 },
  profileSection: { alignItems: 'center', gap: 8 },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700', color: colors.text },
  companyName: { fontSize: 22, fontWeight: '800', color: colors.dark },
  contactName: { fontSize: 16, color: colors.text },
  statusBadge: { backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  section: { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: colors.card, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  infoLabel: { fontSize: 14, color: colors.muted },
  infoValue: { fontSize: 14, fontWeight: '500', color: colors.dark },
  notesText: { fontSize: 14, color: colors.text, lineHeight: 20, backgroundColor: colors.card, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  relatedCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.card, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  relatedTitle: { fontSize: 15, fontWeight: '500', color: colors.dark, flex: 1 },
  relatedStatus: { fontSize: 13, color: colors.muted },
  emptyText: { fontSize: 14, color: colors.muted, paddingVertical: 8 },
});
