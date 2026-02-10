// ════════════════════════════════════════════════════════════════
// VOXI — Push Notification Utils
// ════════════════════════════════════════════════════════════════
// Expo Push Notification altyapısı
// Token kaydetme, bildirim gönderme
// ════════════════════════════════════════════════════════════════

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Bildirim davranışı ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ════════════ TOKEN KAYDETME ════════════

export async function registerForPushNotifications(userId: string): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('⚠️ Push notification fiziksel cihaz gerektirir (Expo Go desteklenmiyor)');
    return null;
  }

  try {
    // İzin kontrolü
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('⚠️ Push notification izni verilmedi');
      return null;
    }

    // Token al
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    if (!projectId) {
      console.log('⚠️ EAS projectId bulunamadı (app.json → extra.eas.projectId)');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;

    console.log('✅ Push token alındı:', token);

    // Token'ı DB'ye kaydet (upsert)
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        device_type: Platform.OS,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id,token',
        ignoreDuplicates: false, 
      });

    if (error) {
      console.error('❌ Token kaydetme hatası:', error);
      return null;
    }

    console.log('✅ Token DB'ye kaydedildi');
    return token;

  } catch (error) {
    console.error('❌ Push notification kayıt hatası:', error);
    return null;
  }
}

// ════════════ BİLDİRİM GÖNDERME ════════════

export async function sendPushToUser(
  targetUserId: string,
  title: string,
  body: string,
  data?: object
): Promise<boolean> {
  try {
    // Hedef kullanıcının token'larını al
    const { data: tokens, error } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', targetUserId);

    if (error || !tokens || tokens.length === 0) {
      console.log('⚠️ Kullanıcı için token bulunamadı:', targetUserId);
      return false;
    }

    // Expo Push API'ye gönder
    const messages = tokens.map(t => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: data || {},
      priority: 'high' as const,
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      throw new Error(`Push API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Push gönderildi:', result);

    return true;

  } catch (error) {
    console.error('❌ Push gönderme hatası:', error);
    return false;
  }
}

// ════════════ TOPLU BİLDİRİM ════════════

export async function sendPushToMultipleUsers(
  targetUserIds: string[],
  title: string,
  body: string,
  data?: object
): Promise<void> {
  for (const userId of targetUserIds) {
    await sendPushToUser(userId, title, body, data);
  }
}

// ════════════ YARDIMCI FONKSİYONLAR ════════════

/**
 * Bildirimlerin izinli olup olmadığını kontrol et
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

/**
 * Kullanıcının token'ını sil (logout için)
 */
export async function removePushToken(userId: string, token: string): Promise<void> {
  try {
    await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('token', token);
    
    console.log('✅ Token silindi');
  } catch (error) {
    console.error('❌ Token silme hatası:', error);
  }
}
