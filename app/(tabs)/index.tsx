import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { createAIDesign } from '../../services/replicate';
import CategorySelector from '../../components/design/CategorySelector';
import ServiceTypeSelector from '../../components/design/ServiceTypeSelector';
import StylePicker from '../../components/design/StylePicker';
import ToolSelector from '../../components/design/ToolSelector';
import {
  Category,
  ServiceType,
  ToolId,
  getToolsByCategory,
  getToolInfo,
  getPhotoHint,
} from '../../lib/categories';
import { useAuth } from '../../contexts/AuthContext';

export default function DesignScreen() {
  const { session } = useAuth();

  // Design state - HIERARCHY: Category → ServiceType → Style → Photo → Tool
  const [selectedCategory, setSelectedCategory] = useState<Category>('ev');
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType>('dekorasyon');
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<ToolId | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentDesigns, setRecentDesigns] = useState<any[]>([]);

  // Derived data
  const availableTools = getToolsByCategory(selectedCategory);
  const currentTool = selectedTool ? getToolInfo(selectedTool) : null;
  const photoHint = getPhotoHint(selectedCategory, selectedServiceType, selectedStyle || undefined);

  // Step tracking for visual feedback
  const currentStep = !selectedStyle ? 2 : !selectedImage ? 3 : !selectedTool ? 4 : 5;

  // Load recent designs
  useEffect(() => {
    loadRecentDesigns();
  }, []);

  const loadRecentDesigns = async () => {
    if (!session?.user?.id) return;
    try {
      const { data, error } = await supabase
        .from('designs')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      setRecentDesigns(data || []);
    } catch (error) {
      console.error('❌ Son tasarımlar yüklenemedi:', error);
    }
  };

  // Pick image from camera
  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Kamerayı kullanmak için izin vermelisiniz');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Fotoğraf çekilemedi:', error);
      Alert.alert('Hata', 'Fotoğraf çekilirken bir sorun oluştu');
    }
  };

  // Pick image from library
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişmek için izin vermelisiniz');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ Fotoğraf seçilemedi:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir sorun oluştu');
    }
  };

  // Start AI design
  const handleStartDesign = async () => {
    if (!selectedTool) {
      Alert.alert('Araç Gerekli', 'Lütfen bir araç seçin');
      return;
    }
    if (!session?.user?.id) {
      Alert.alert('Hata', 'Oturum bulunamadı');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await createAIDesign({
        imageUri: selectedImage!,
        category: selectedCategory,
        style: selectedStyle || 'modern',
        tool: selectedTool,
        serviceType: selectedServiceType,
        userId: session.user.id,
      });

      console.log('✅ Tasarım tamamlandı:', result.id);
      await loadRecentDesigns();

      Alert.alert(
        'Tasarım Hazır!',
        'AI tasarımınız başarıyla oluşturuldu',
        [
          { text: 'Tamam', style: 'default' },
          {
            text: 'Detayları Gör',
            style: 'default',
            onPress: () => router.push(`/design/${result.id}`),
          },
        ]
      );

      setSelectedImage(null);
      setSelectedTool(null);
    } catch (error: any) {
      console.error('❌ Tasarım hatası:', error);
      Alert.alert(
        'Tasarım Başarısız',
        error.message || 'Tasarım oluşturulurken bir sorun oluştu.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset selections
  const handleCategoryChange = (category: Category) => {
    setSelectedCategory(category);
    setSelectedStyle(null);
    setSelectedTool(null);
    setSelectedImage(null);
  };

  const handleServiceTypeChange = (serviceType: ServiceType) => {
    setSelectedServiceType(serviceType);
    setSelectedStyle(null);
    setSelectedTool(null);
  };

  const canStartDesign = selectedImage && selectedTool && selectedStyle && !isProcessing;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>evim.ai</Text>
            <Text style={styles.tagline}>Hayal Et  ·  Gör  ·  Yaptır</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => Alert.alert('Bildirimler', 'Yakında aktif olacak')}
          >
            <Ionicons name="notifications-outline" size={24} color="#212121" />
          </TouchableOpacity>
        </View>

        {/* STEP 1: Category */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, styles.stepBadgeActive]}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Kategori Seçin</Text>
          </View>
          <CategorySelector
            selected={selectedCategory}
            onSelect={handleCategoryChange}
          />
        </View>

        {/* STEP 1A: Service Type */}
        <ServiceTypeSelector
          selected={selectedServiceType}
          onSelect={handleServiceTypeChange}
        />

        {/* STEP 2: Style */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={[styles.stepBadge, currentStep >= 2 && styles.stepBadgeActive]}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Stil Seçin</Text>
          </View>
          <StylePicker
            category={selectedCategory}
            serviceType={selectedServiceType}
            selected={selectedStyle}
            onSelect={setSelectedStyle}
          />
        </View>

        {/* STEP 3: Photo */}
        {selectedStyle && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, currentStep >= 3 && styles.stepBadgeActive]}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <Text style={styles.stepTitle}>Fotoğraf Yükleyin</Text>
            </View>

            <View style={styles.heroContainer}>
              {selectedImage ? (
                <TouchableOpacity
                  style={styles.imagePreview}
                  onPress={handlePickImage}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlayVisible}>
                    <View style={styles.changePhotoButton}>
                      <Ionicons name="camera" size={20} color="#FFFFFF" />
                      <Text style={styles.changePhotoText}>Değiştir</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={styles.imagePlaceholder}>
                  <View style={styles.placeholderContent}>
                    <View style={styles.hintBox}>
                      <Ionicons name="information-circle-outline" size={20} color="#212121" />
                      <Text style={styles.hintText}>{photoHint}</Text>
                    </View>

                    <Ionicons name="camera-outline" size={48} color="#8E8E93" />

                    <View style={styles.buttonRow}>
                      <TouchableOpacity
                        style={styles.cameraButton}
                        onPress={handleTakePhoto}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="camera" size={20} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Fotoğraf Çek</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.galleryButton}
                        onPress={handlePickImage}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="images" size={20} color="#212121" />
                        <Text style={styles.galleryButtonText}>Galeriden Seç</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* STEP 4: Tool Selector */}
        {selectedImage && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, currentStep >= 4 && styles.stepBadgeActive]}>
                <Text style={styles.stepBadgeText}>4</Text>
              </View>
              <Text style={styles.stepTitle}>Ne Yapmak İstersiniz?</Text>
            </View>
            <View style={styles.toolSection}>
              <ToolSelector
                selected={selectedTool}
                onSelect={setSelectedTool}
                tools={availableTools}
              />
            </View>
          </View>
        )}

        {/* AI Design Button */}
        <View style={styles.designButtonContainer}>
          <TouchableOpacity
            style={[
              styles.designButton,
              !canStartDesign && styles.designButtonDisabled,
            ]}
            onPress={handleStartDesign}
            disabled={!canStartDesign}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.designButtonText}>AI Tasarlıyor...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                <Text style={styles.designButtonText}>
                  {currentTool?.buttonText || 'AI ile Tasarla'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {!canStartDesign && !isProcessing && (
            <Text style={styles.designHelpText}>
              {!selectedStyle
                ? 'Lütfen bir stil seçin'
                : !selectedImage
                ? 'Lütfen fotoğraf yükleyin'
                : !selectedTool
                ? 'Lütfen bir araç seçin'
                : ''}
            </Text>
          )}
        </View>

        {/* Recent Designs */}
        {recentDesigns.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentTitle}>Son Tasarımlar</Text>
              <TouchableOpacity onPress={() => router.push('/tasks')}>
                <Text style={styles.seeAllText}>Tümünü Gör</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recentDesigns.map((design) => (
                <TouchableOpacity
                  key={design.id}
                  style={styles.recentCard}
                  onPress={() => router.push(`/design/${design.id}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.recentThumbnail}>
                    {design.ai_image_url ? (
                      <Image
                        source={{ uri: design.ai_image_url }}
                        style={styles.thumbnailImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.thumbnailPlaceholder}>
                        <ActivityIndicator size="small" color="#8E8E93" />
                      </View>
                    )}
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentStyle} numberOfLines={1}>{design.style}</Text>
                    <Text style={styles.recentDate}>
                      {new Date(design.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  tagline: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Steps
  stepContainer: {
    marginBottom: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: '#212121',
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  // Photo Area
  heroContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  imagePlaceholder: {
    minHeight: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderContent: {
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0EDE8',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'stretch',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#3C3C43',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#212121',
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  galleryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  galleryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  imagePreview: {
    height: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlayVisible: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
  },
  changePhotoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Tool Section
  toolSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Design Button
  designButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  designButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    backgroundColor: '#212121',
    borderRadius: 12,
  },
  designButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  designButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  designHelpText: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
  },
  // Recent Designs
  recentSection: {
    paddingVertical: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212121',
  },
  recentScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  recentCard: {
    width: 140,
  },
  recentThumbnail: {
    width: 140,
    height: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3EF',
  },
  recentInfo: {
    gap: 4,
  },
  recentStyle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textTransform: 'capitalize',
  },
  recentDate: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
