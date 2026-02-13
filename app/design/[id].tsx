import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { supabase } from '../../lib/supabase';
import BeforeAfter from '../../components/design/BeforeAfter';
import PriceQuoteModal from '../../components/design/PriceQuoteModal';
import { shareDesign } from '../../services/share';
import {
  Category,
  ServiceType,
  getEstimatedPrice,
  PriceEstimate,
} from '../../lib/categories';

interface Design {
  id: string;
  user_id: string;
  category: string;
  style: string;
  tool: string;
  service_type?: string;
  original_image_url: string;
  ai_image_url: string;
  prompt: string;
  processing_status: string;
  is_favorite: boolean;
  view_count: number;
  share_count: number;
  created_at: string;
}

export default function DesignDetailScreen() {
  const { id } = useLocalSearchParams();
  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [showPriceQuote, setShowPriceQuote] = useState(false);

  useEffect(() => {
    loadDesign();
    incrementViewCount();
  }, [id]);

  const loadDesign = async () => {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setDesign(data);
    } catch (error) {
      console.error('❌ Tasarım yüklenemedi:', error);
      Alert.alert('Hata', 'Tasarım yüklenemedi');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase.rpc('increment_design_views', { design_id: id });
    } catch (error) {
      console.error('❌ View count güncellenemedi:', error);
    }
  };

  const toggleFavorite = async () => {
    if (!design) return;

    const newFavoriteStatus = !design.is_favorite;

    try {
      const { error } = await supabase
        .from('designs')
        .update({ is_favorite: newFavoriteStatus })
        .eq('id', design.id);

      if (error) throw error;

      setDesign({ ...design, is_favorite: newFavoriteStatus });
      Haptics.notificationAsync(
        newFavoriteStatus
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
    } catch (error) {
      console.error('❌ Favori güncellenemedi:', error);
      Alert.alert('Hata', 'Favori durumu güncellenemedi');
    }
  };

  const handleShare = async () => {
    if (!design) return;

    try {
      await shareDesign(design.ai_image_url);
      
      // Increment share count
      await supabase
        .from('designs')
        .update({ share_count: (design.share_count || 0) + 1 })
        .eq('id', design.id);

      setDesign({ ...design, share_count: (design.share_count || 0) + 1 });
    } catch (error) {
      console.error('❌ Paylaşım hatası:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Tasarımı Sil',
      'Bu tasarımı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('designs')
                .delete()
                .eq('id', id);

              if (error) throw error;

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } catch (error) {
              console.error('❌ Silme hatası:', error);
              Alert.alert('Hata', 'Tasarım silinemedi');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#212121" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!design) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tasarım Detayı</Text>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={toggleFavorite}
          activeOpacity={0.7}
        >
          <Ionicons
            name={design.is_favorite ? 'heart' : 'heart-outline'}
            size={24}
            color={design.is_favorite ? '#FF3B30' : '#212121'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* AI Image */}
        <TouchableOpacity
          style={styles.imageContainer}
          onPress={() => setShowBeforeAfter(true)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: design.ai_image_url }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          <View style={styles.compareOverlay}>
            <View style={styles.compareButton}>
              <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
              <Text style={styles.compareText}>Önce / Sonra</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Info Section */}
        <View style={styles.infoSection}>
          {/* Style & Category */}
          <View style={styles.infoRow}>
            <View style={styles.badge}>
              <Ionicons name="brush-outline" size={16} color="#212121" />
              <Text style={styles.badgeText}>{design.style}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="layers-outline" size={16} color="#212121" />
              <Text style={styles.badgeText}>{design.category}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="construct-outline" size={16} color="#212121" />
              <Text style={styles.badgeText}>{design.tool}</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="eye-outline" size={18} color="#8E8E93" />
              <Text style={styles.statText}>{design.view_count || 0}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="share-outline" size={18} color="#8E8E93" />
              <Text style={styles.statText}>{design.share_count || 0}</Text>
            </View>
            <View style={styles.stat}>
              <Ionicons name="calendar-outline" size={18} color="#8E8E93" />
              <Text style={styles.statText}>
                {new Date(design.created_at).toLocaleDateString('tr-TR')}
              </Text>
            </View>
          </View>

          {/* Prompt */}
          {design.prompt && (
            <View style={styles.promptSection}>
              <Text style={styles.promptLabel}>AI Prompt</Text>
              <Text style={styles.promptText}>{design.prompt}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons Row 1 */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => setShowBeforeAfter(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Önce / Sonra</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={20} color="#212121" />
            <Text style={styles.actionButtonTextSecondary}>Paylaş</Text>
          </TouchableOpacity>
        </View>

        {/* Anahtar Teslim Fiyat Button */}
        <View style={styles.priceSection}>
          <TouchableOpacity
            style={styles.priceButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowPriceQuote(true);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.priceButtonContent}>
              <View style={styles.priceButtonLeft}>
                <View style={styles.priceIconContainer}>
                  <Ionicons name="calculator-outline" size={24} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.priceButtonTitle}>Anahtar Teslim Fiyatı</Text>
                  <Text style={styles.priceButtonSubtitle}>Tahmini maliyet ve detayları görün</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#212121" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Delete Button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          <Text style={styles.deleteButtonText}>Tasarımı Sil</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Before/After Modal */}
      {showBeforeAfter && (
        <BeforeAfter
          beforeImage={design.original_image_url}
          afterImage={design.ai_image_url}
          onClose={() => setShowBeforeAfter(false)}
        />
      )}

      {/* Price Quote Modal */}
      {showPriceQuote && design && (
        <PriceQuoteModal
          visible={showPriceQuote}
          onClose={() => setShowPriceQuote(false)}
          estimate={getEstimatedPrice(
            (design.category as Category) || 'ev',
            (design.service_type as ServiceType) || 'dekorasyon',
            design.style || 'modern',
          )}
          onRequestQuote={() => {
            setShowPriceQuote(false);
            Alert.alert(
              'Teklif Talebi Gönderildi',
              'Uzmanlarımız en kısa sürede sizinle iletişime geçecektir.',
              [{ text: 'Tamam' }]
            );
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  favoriteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#FFFFFF',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  compareOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 24,
  },
  compareText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    marginTop: 1,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121',
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  promptSection: {
    gap: 8,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
  },
  actionSection: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  actionButtonPrimary: {
    backgroundColor: '#212121',
    borderColor: '#212121',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  // Price Section
  priceSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  priceButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#212121',
    overflow: 'hidden',
  },
  priceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  priceButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  priceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  priceButtonSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 32,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
