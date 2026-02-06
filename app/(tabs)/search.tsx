import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getWorkspaceInfo } from '../../lib/workspace';

interface Tool {
  id: string;
  icon: string;
  title: string;
  description: string;
  route: string;
  adminOnly?: boolean;
}

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [userRole, setUserRole] = useState<string>('member');

  React.useEffect(() => {
    loadUserRole();
  }, []);

  const loadUserRole = async () => {
    const wsInfo = await getWorkspaceInfo();
    if (wsInfo) setUserRole(wsInfo.role);
  };

  const tools: Tool[] = [
    {
      id: 'search',
      icon: 'search-outline',
      title: 'Detaylı Arama',
      description: 'Müşteri, görev, belge, fotoğraf, ekip...',
      route: '/search/detailed',
    },
    {
      id: 'customer',
      icon: 'person-add-outline',
      title: 'Müşteri Ekle',
      description: 'Kartvizit, vergi levhası, sesle veya manuel',
      route: '/customer/new',
    },
    {
      id: 'order',
      icon: 'cube-outline',
      title: 'Sipariş Gir',
      description: 'Trendyol, Hepsiburada, WhatsApp, telefon',
      route: '/order/new',
    },
    {
      id: 'proposal',
      icon: 'document-text-outline',
      title: 'Teklif Hazırla',
      description: 'Müşteriye fiyat teklifi oluştur ve gönder',
      route: '/proposal/new',
    },
    {
      id: 'invoice',
      icon: 'receipt-outline',
      title: 'Fatura / Tahsilat',
      description: 'Fatura kes, ödeme kaydet, bakiye sorgula',
      route: '/invoice/new',
    },
    {
      id: 'research',
      icon: 'globe-outline',
      title: 'Araştır',
      description: 'Rakip, pazar, fiyat araştırması',
      route: '/research/new',
    },
    {
      id: 'report',
      icon: 'stats-chart-outline',
      title: 'Rapor Al',
      description: 'Satış, ekip, performans raporları',
      route: '/reports',
      adminOnly: true,
    },
  ];

  const filteredTools = tools.filter(tool => {
    // Admin only kontrolü
    if (tool.adminOnly && userRole !== 'owner' && userRole !== 'admin') {
      return false;
    }
    // Arama filtresi
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        tool.title.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleToolPress = (tool: Tool) => {
    router.push(tool.route as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Araçlar</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hızlı Arama */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Araç ara..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#8E8E93" />
            </TouchableOpacity>
          )}
        </View>

        {/* Araçlar Listesi */}
        <View style={styles.toolsContainer}>
          {filteredTools.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.toolCard}
              onPress={() => handleToolPress(tool)}
              activeOpacity={0.7}
            >
              <View style={styles.toolIconContainer}>
                <Ionicons name={tool.icon as any} size={24} color="#1A1A1A" />
              </View>
              <View style={styles.toolContent}>
                <View style={styles.toolTitleRow}>
                  <Text style={styles.toolTitle}>{tool.title}</Text>
                  {tool.adminOnly && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#8E8E93" />
                    </View>
                  )}
                </View>
                <Text style={styles.toolDescription}>{tool.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          ))}
        </View>

        {filteredTools.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#E5E5EA" />
            <Text style={styles.emptyText}>Araç bulunamadı</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  toolsContainer: {
    paddingHorizontal: 20,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  toolIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolContent: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  toolTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  adminBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolDescription: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 12,
  },
});
