import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import MasterList from '../../components/master/MasterList';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with padding

interface Design {
  id: string;
  user_id: string;
  original_image_url: string;
  ai_image_url: string;
  category: string;
  style: string;
  tool: string;
  room_type: string | null;
  processing_status: 'processing' | 'completed' | 'failed';
  is_favorite: boolean;
  created_at: string;
}

export default function LibraryScreen() {
  const { session } = useAuth();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [showMasterList, setShowMasterList] = useState(false);

  // Long press tracking
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Load designs
  const loadDesigns = async () => {
    if (!session?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('processing_status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDesigns(data || []);
    } catch (error) {
      console.error('❌ Tasarımlar yüklenemedi:', error);
      Alert.alert('Hata', 'Tasarımlar yüklenirken bir sorun oluştu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDesigns();
  }, []);

  // Refresh when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadDesigns();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDesigns();
  };

  // Short press: Open before/after view
  const handleCardPress = (design: Design) => {
    // Navigate to design detail page
    router.push(`/design/${design.id}`);
  };

  // Long press start: Show pulse animation + find masters
  const handleLongPressStart = (design: Design) => {
    longPressTimer.current = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsLongPressing(true);
      handleFindMasters(design);
    }, 500); // 500ms for long press
  };

  // Long press end
  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  // Find nearby masters
  const handleFindMasters = async (design: Design) => {
    try {
      setSelectedDesign(design);
      setShowMasterList(true);
    } catch (error) {
      console.error('❌ Usta bulma hatası:', error);
    } finally {
      setIsLongPressing(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = async (design: Design) => {
    try {
      const { error } = await supabase
        .from('designs')
        .update({ is_favorite: !design.is_favorite })
        .eq('id', design.id);

      if (error) throw error;

      // Update local state
      setDesigns(prev =>
        prev.map(d =>
          d.id === design.id ? { ...d, is_favorite: !d.is_favorite } : d
        )
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Favori güncelleme hatası:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kütüphane</Text>
        <Text style={styles.headerSubtitle}>
          {designs.length} tasarım
        </Text>
      </View>

      {/* Designs Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Yükleniyor...</Text>
          </View>
        ) : designs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color="#8E8E93" />
            <Text style={styles.emptyTitle}>Henüz Tasarım Yok</Text>
            <Text style={styles.emptySubtitle}>
              "Tasarla" sekmesinden ilk tasarımınızı oluşturun
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {designs.map((design) => (
              <TouchableOpacity
                key={design.id}
                style={[styles.card, isLongPressing && styles.cardPressing]}
                onPress={() => handleCardPress(design)}
                onLongPress={() => handleLongPressStart(design)}
                onPressOut={handleLongPressEnd}
                activeOpacity={0.8}
              >
                {/* AI Image */}
                <Image
                  source={{ uri: design.ai_image_url }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />

                {/* Favorite Badge */}
                <TouchableOpacity
                  style={styles.favoriteButton}
                  onPress={() => toggleFavorite(design)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={design.is_favorite ? 'heart' : 'heart-outline'}
                    size={20}
                    color={design.is_favorite ? '#FF3B30' : '#FFFFFF'}
                  />
                </TouchableOpacity>

                {/* Style Badge */}
                <View style={styles.styleBadge}>
                  <Text style={styles.styleBadgeText}>{design.style}</Text>
                </View>

                {/* Info */}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardDate}>
                    {new Date(design.created_at).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>

                {/* Long Press Hint */}
                {isLongPressing && (
                  <View style={styles.longPressHint}>
                    <Ionicons name="hammer" size={24} color="#FFFFFF" />
                    <Text style={styles.longPressText}>Usta Bul</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Master List Modal */}
      {selectedDesign && (
        <MasterList
          visible={showMasterList}
          designId={selectedDesign.id}
          onClose={() => setShowMasterList(false)}
          onSelectMaster={(master) => {
            console.log('✅ Usta seçildi:', master.name);
            // TODO: Navigate to chat
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#F5F3EF', // Hafif gri arka plan
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  cardPressing: {
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  cardImage: {
    width: '100%',
    aspectRatio: 3 / 4, // 3:4 aspect ratio (portrait)
  },
  favoriteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  styleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  cardInfo: {
    padding: 12,
  },
  cardDate: {
    fontSize: 13,
    color: '#8E8E93',
  },
  longPressHint: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(33, 33, 33, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  longPressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
});
