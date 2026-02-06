import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';

type Category = 'all' | 'customers' | 'tasks' | 'team';

interface SearchResult {
  id: string;
  type: 'customer' | 'task' | 'member';
  title: string;
  subtitle: string;
  icon: string;
}

export default function DetailedSearchScreen() {
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.length >= 2) {
      const timer = setTimeout(() => search(), 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query, category]);

  const search = async () => {
    setLoading(true);
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) return;

      const allResults: SearchResult[] = [];
      const searchQuery = `%${query}%`;

      if (category === 'all' || category === 'customers') {
        const { data: customers } = await supabase
          .from('customers')
          .select('id, company_name, contact_person, phone')
          .eq('workspace_id', wsInfo.workspaceId)
          .or(`company_name.ilike.${searchQuery},contact_person.ilike.${searchQuery}`)
          .limit(10);

        customers?.forEach(c => {
          allResults.push({
            id: c.id, type: 'customer',
            title: c.company_name || c.contact_person,
            subtitle: c.phone || 'Müşteri',
            icon: 'person-outline',
          });
        });
      }

      if (category === 'all' || category === 'tasks') {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id, title, assigned_to, status')
          .eq('workspace_id', wsInfo.workspaceId)
          .ilike('title', searchQuery)
          .limit(10);

        tasks?.forEach(t => {
          allResults.push({
            id: t.id, type: 'task',
            title: t.title,
            subtitle: `${t.assigned_to || 'Atanmamış'} • ${t.status}`,
            icon: 'document-text-outline',
          });
        });
      }

      if (category === 'all' || category === 'team') {
        const { data: members } = await supabase
          .from('workspace_members')
          .select('user_id, profiles:user_id(full_name, phone)')
          .eq('workspace_id', wsInfo.workspaceId)
          .eq('is_active', true);

        members?.filter(m => m.profiles?.full_name?.toLowerCase().includes(query.toLowerCase()))
          .forEach(m => {
            allResults.push({
              id: m.user_id, type: 'member',
              title: m.profiles?.full_name || 'İsimsiz',
              subtitle: m.profiles?.phone || 'Ekip üyesi',
              icon: 'people-outline',
            });
          });
      }

      setResults(allResults);
    } catch (err) {
      console.error('Arama hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResultPress = (result: SearchResult) => {
    if (!recentSearches.includes(query)) {
      setRecentSearches(prev => [query, ...prev.slice(0, 4)]);
    }
    switch (result.type) {
      case 'customer': router.push(`/customer/${result.id}`); break;
      case 'task': router.push(`/task/${result.id}`); break;
      case 'member': router.push(`/team/${result.id}`); break;
    }
  };

  const categories = [
    { id: 'all', label: 'Tümü' },
    { id: 'customers', label: 'Müşteriler' },
    { id: 'tasks', label: 'Görevler' },
    { id: 'team', label: 'Ekip' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Ara..."
            placeholderTextColor="#8E8E93"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContainer}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.categoryChip, category === cat.id && styles.categoryChipActive]}
            onPress={() => setCategory(cat.id as Category)}
          >
            <Text style={[styles.categoryText, category === cat.id && styles.categoryTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {loading && <View style={styles.loadingContainer}><ActivityIndicator size="small" color="#1A1A1A" /></View>}

        {!loading && results.length > 0 && (
          <View style={styles.resultsContainer}>
            {results.map(result => (
              <TouchableOpacity key={`${result.type}-${result.id}`} style={styles.resultCard} onPress={() => handleResultPress(result)}>
                <View style={styles.resultIcon}><Ionicons name={result.icon as any} size={20} color="#1A1A1A" /></View>
                <View style={styles.resultContent}>
                  <Text style={styles.resultTitle}>{result.title}</Text>
                  <Text style={styles.resultSubtitle}>{result.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#E5E5EA" />
            <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
          </View>
        )}

        {query.length === 0 && recentSearches.length > 0 && (
          <View style={styles.recentContainer}>
            <Text style={styles.recentTitle}>Son Aramalar</Text>
            {recentSearches.map((term, i) => (
              <TouchableOpacity key={i} style={styles.recentItem} onPress={() => setQuery(term)}>
                <Ionicons name="time-outline" size={18} color="#8E8E93" />
                <Text style={styles.recentText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA', gap: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#1A1A1A' },
  categoryScroll: { maxHeight: 50 },
  categoryContainer: { paddingHorizontal: 16, gap: 8 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA' },
  categoryChipActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  categoryText: { fontSize: 13, fontWeight: '500', color: '#3C3C43' },
  categoryTextActive: { color: '#FFFFFF' },
  content: { flex: 1, paddingTop: 16 },
  loadingContainer: { paddingTop: 40, alignItems: 'center' },
  resultsContainer: { paddingHorizontal: 16 },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  resultIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#F5F3EF', alignItems: 'center', justifyContent: 'center' },
  resultContent: { flex: 1, marginLeft: 12 },
  resultTitle: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  resultSubtitle: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 15, color: '#8E8E93', marginTop: 12 },
  recentContainer: { paddingHorizontal: 16 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F5F3EF' },
  recentText: { fontSize: 15, color: '#3C3C43' },
});
