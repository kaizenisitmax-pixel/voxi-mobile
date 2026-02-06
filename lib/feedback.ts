import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

export const Feedback = {
  // Görev tamamlandı
  async taskCompleted() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Opsiyonel ses (varsayılan sistem sesi kullanılabilir)
    // Ses dosyası assets/sounds/complete.mp3 eklenirse:
    // const { sound } = await Audio.Sound.createAsync(
    //   require('../assets/sounds/complete.mp3')
    // );
    // await sound.playAsync();
  },

  // Hata
  async error() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },

  // Hafif dokunuş (buton vs)
  async light() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },

  // Orta dokunuş (önemli aksiyon)
  async medium() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },

  // Güçlü dokunuş (kritik aksiyon)
  async heavy() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  },

  // Seçim değişti (picker, slider)
  async selection() {
    await Haptics.selectionAsync();
  },

  // Uyarı
  async warning() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};
