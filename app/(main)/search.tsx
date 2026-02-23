import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../lib/colors';

type SearchResult = {
  id: string;
  type: 'card' | 'customer' | 'message';
  title: string;
  subtitle: string;
};

export default function SearchScreen() {
  const router = useRouter();
  const { membership } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const performSearch = useCallback(async (text: string) => {
    if (text.length < 2 || !membership?.workspace_id) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    setError(null);

    try {
      const searchTerm = `%${text}%`;

      const [cardsRes, customersRes] = await Promise.all([
        supabase
          .from('cards')
          .select('id, title, description, status')
          .eq('workspace_id', membership.workspace_id)
          .ilike('title', searchTerm)
          .limit(10),
        supabase
          .from('customers')
          .select('id, company_name, contact_name, status')
          .eq('workspace_id', membership.workspace_id)
          .ilike('company_name', searchTerm)
          .limit(10),
      ]);

      if (cardsRes.error) throw cardsRes.error;
      if (customersRes.error) throw customersRes.error;

      const items: SearchResult[] = [
        ...(cardsRes.data?.map(c => ({
          id: c.id, type: 'card' as const,
          title: c.title, subtitle: c.status,
        })) || []),
        ...(customersRes.data?.map(c => ({
          id: c.id, type: 'customer' as const,
          title: c.company_name, subtitle: c.contact_name || c.status,
        })) || []),
      ];

      setResults(items);
    } catch (err: any) {
      console.error('[Search] Error:', err);
      setError(err.message || 'Arama başarısız');
    } finally {
      setSearching(false);
    }
  }, [membership?.workspace_id]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => performSearch(text), 300);
  }, [performSearch]);

  const handlePress = (item: SearchResult) => {
    if (item.type === 'card') router.push(`/card/${item.id}`);
    else if (item.type === 'customer') router.push(`/customer/${item.id}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Kart, müşteri, mesaj ara..."
          placeholderTextColor={colors.muted}
          value={query}
          onChangeText={handleSearch}
          autoFocus
          autoCorrect={false}
        />
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancel}>İptal</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => `${item.type}-${item.id}`}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => handlePress(item)}>
            <View style={styles.resultIcon}>
              <Text style={styles.resultIconText}>
                {item.type === 'card' ? '📋' : item.type === 'customer' ? '🏢' : '💬'}
              </Text>
            </View>
            <View style={styles.resultContent}>
              <Text style={styles.resultTitle}>{item.title}</Text>
              <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
            </View>
            <Text style={styles.resultType}>
              {item.type === 'card' ? 'Kart' : item.type === 'customer' ? 'Müşteri' : 'Mesaj'}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          query.length >= 2 && !searching ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  input: {
    flex: 1, height: 40, backgroundColor: colors.bg, borderRadius: 10,
    paddingHorizontal: 14, fontSize: 16, color: colors.dark,
  },
  cancel: { fontSize: 16, color: colors.dark, fontWeight: '500' },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  resultIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.avatar, alignItems: 'center', justifyContent: 'center' },
  resultIconText: { fontSize: 18 },
  resultContent: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: '600', color: colors.dark },
  resultSubtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  resultType: { fontSize: 12, color: colors.muted },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: colors.muted },
  errorBanner: {
    backgroundColor: '#FFF3CD', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#FFE69C',
  },
  errorText: { fontSize: 14, color: '#856404' },
});
