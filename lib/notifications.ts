import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Varsayılan',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1A1A1A',
    sound: 'default',
  });
  Notifications.setNotificationChannelAsync('urgent', {
    name: 'Acil Görevler',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 500, 250, 500],
    lightColor: '#FF3B30',
    sound: 'default',
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications fiziksel cihaz gerektirir');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification izni verilmedi');
    return null;
  }

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.warn('EAS projectId bulunamadı, push token alınamaz');
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (error) {
    console.error('Push token alınamadı:', error);
    return null;
  }
}

export async function savePushToken(userId: string, token: string): Promise<void> {
  try {
    const { data: existing } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('token', token)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase
        .from('push_tokens')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('token', token);
    } else {
      await supabase.from('push_tokens').update({ is_active: false }).eq('user_id', userId);
      await supabase.from('push_tokens').insert({
        user_id: userId, token, platform: Platform.OS, is_active: true,
      });
    }
  } catch (error) {
    console.error('Push token kayıt hatası:', error);
  }
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export async function scheduleDailyTaskReminder() {
  try {
    // Mevcut planlanmış bildirimleri temizle (tekrar oluşturmak için)
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Bugünkü görevleri çek
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { data: todayTasks } = await supabase
      .from('tasks')
      .select('id, title, priority')
      .eq('team_id', 'e843b87c-b3e9-4740-8f63-fde6bdaf9640')
      .eq('status', 'open')
      .lte('due_date', today + 'T23:59:59');

    const taskCount = todayTasks?.length || 0;
    const urgentCount = todayTasks?.filter((t: any) => t.priority === 'urgent').length || 0;

    if (taskCount === 0) return;

    // Yarın sabah 09:00 için hatırlatma planla
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: urgentCount > 0 ? `🔴 ${taskCount} görev bekliyor!` : `${taskCount} görev bekliyor`,
        body: urgentCount > 0
          ? `${urgentCount} acil görev dahil. VOXI'yi aç ve günü planla.`
          : `Bugün ${taskCount} görevin var. Günaydın!`,
        data: { screen: 'tasks' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });

    if (__DEV__) console.log(`Hatırlatma planlandı: ${taskCount} görev, yarın 09:00`);
  } catch (error) {
    console.error('Hatırlatma planlama hatası:', error);
  }
}
