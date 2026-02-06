import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Share, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { processVoxiChat } from '../../lib/ai';

export default function NewResearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const suggestions = [
    'Türkiye sera ısıtma pazarı 2026',
    'Rakip firma fiyat karşılaştırması',
    'Doğalgaz fiyatları trendi',
    'Jeotermal ısıtma sistemleri',
    'Isıtma sektörü büyüme tahminleri',
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const response = await processVoxiChat(
        `Detaylı araştırma yap: ${query}. Türkçe, profesyonel ve kapsamlı yanıt ver. Varsa güncel veriler ve kaynaklar ekle.`
      );
      setResult(response?.message || 'Sonuç bulunamadı. Farklı bir arama deneyin.');
    } catch (err) {
      setResult('Araştırma sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (result) {
      await Clipboard.setStringAsync(result);
      Alert.alert('Kopyalandı', 'Sonuç panoya kopyalandı');
    }
  };

  const handleShare = async () => {
    if (result) {
      await Share.share({ message: result, title: `Araştırma: ${query}` });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Araştır</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Arama */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Ne araştırmak istiyorsun?"
            placeholderTextColor="#8E8E93"
            multiline
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity
            style={[styles.searchButton, !query.trim() && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={!query.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="search" size={22} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Öneriler */}
        {!result && !loading && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.suggestionsTitle}>Öneriler</Text>
            {suggestions.map((suggestion, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionCard}
                onPress={() => setQuery(suggestion)}
              >
                <Ionicons name="bulb-outline" size={18} color="#8E8E93" />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A1A1A" />
            <Text style={styles.loadingText}>Araştırılıyor...</Text>
            <Text style={styles.loadingSubtext}>Bu işlem birkaç saniye sürebilir</Text>
          </View>
        )}

        {/* Sonuç */}
        {result && !loading && (
          <View style={styles.resultSection}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Sonuç</Text>
              <TouchableOpacity onPress={() => { setResult(null); setQuery(''); }}>
                <Text style={styles.clearText}>Temizle</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultText}>{result}</Text>
            </View>

            {/* Aksiyonlar */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
                <Ionicons name="copy-outline" size={18} color="#1A1A1A" />
                <Text style={styles.actionText}>Kopyala</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={18} color="#1A1A1A" />
                <Text style={styles.actionText}>Paylaş</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="bookmark-outline" size={18} color="#1A1A1A" />
                <Text style={styles.actionText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  content: { flex: 1, padding: 20 },
  searchContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  searchInput: { flex: 1, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#1A1A1A', minHeight: 52 },
  searchButton: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  searchButtonDisabled: { backgroundColor: '#C7C7CC' },
  suggestionsSection: {},
  suggestionsTitle: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  suggestionCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  suggestionText: { fontSize: 15, color: '#3C3C43' },
  loadingContainer: { alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500', color: '#1A1A1A' },
  loadingSubtext: { marginTop: 4, fontSize: 14, color: '#8E8E93' },
  resultSection: {},
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultTitle: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  clearText: { fontSize: 14, color: '#1A1A1A' },
  resultCard: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  resultText: { fontSize: 15, color: '#1A1A1A', lineHeight: 24 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#F5F3EF', paddingVertical: 12, borderRadius: 10 },
  actionText: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
});
