// Share Service for Social Media (TikTok, Instagram, etc.)

import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert } from 'react-native';

/**
 * Share design to social media
 */
export async function shareDesign(imageUrl: string, style: string): Promise<void> {
  try {
    console.log('📤 Paylaşım başlatılıyor...');

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Hata', 'Paylaşım bu cihazda desteklenmiyor');
      return;
    }

    // Download image to local
    const filename = `evim-ai-${Date.now()}.jpg`;
    const localUri = `${FileSystem.cacheDirectory}${filename}`;

    const downloadResult = await FileSystem.downloadAsync(imageUrl, localUri);

    if (!downloadResult.uri) {
      throw new Error('Görsel indirilemedi');
    }

    console.log('✅ Görsel indirildi:', downloadResult.uri);

    // Share
    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'image/jpeg',
      dialogTitle: `evim.ai - ${style} Tasarım`,
      UTI: 'public.jpeg',
    });

    console.log('✅ Paylaşım tamamlandı');
  } catch (error) {
    console.error('❌ Paylaşım hatası:', error);
    Alert.alert('Hata', 'Paylaşım başarısız oldu');
  }
}

/**
 * Create TikTok-style before/after video (future feature)
 */
export async function createBeforeAfterVideo(
  beforeImage: string,
  afterImage: string,
  style: string
): Promise<string | null> {
  // TODO: Video oluşturma (FFmpeg ile)
  // Şimdilik sadece before/after görselleri paylaş
  console.log('🎥 Video oluşturma özelliği yakında aktif olacak');
  return null;
}
