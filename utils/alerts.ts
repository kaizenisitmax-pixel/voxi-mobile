/**
 * Alert Utilities
 * Centralized, consistent alert/confirm dialogs
 */

import { Alert, AlertButton } from 'react-native';

/**
 * Show success message
 */
export function showSuccess(message: string, title: string = 'Başarılı') {
  Alert.alert(title, message, [{ text: 'Tamam', style: 'default' }]);
}

/**
 * Show error message
 */
export function showError(message: string, title: string = 'Hata') {
  Alert.alert(title, message, [{ text: 'Tamam', style: 'cancel' }]);
}

/**
 * Show info message
 */
export function showInfo(message: string, title: string = 'Bilgi') {
  Alert.alert(title, message, [{ text: 'Tamam', style: 'default' }]);
}

/**
 * Show warning message
 */
export function showWarning(message: string, title: string = 'Uyarı') {
  Alert.alert(title, message, [{ text: 'Tamam', style: 'default' }]);
}

/**
 * Show coming soon message
 */
export function showComingSoon(feature: string = 'Bu özellik') {
  Alert.alert('Yakında', `${feature} yakında eklenecek.`, [{ text: 'Tamam' }]);
}

/**
 * Confirm action with Yes/No
 */
export function confirm(
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  title: string = 'Onayla'
): void {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'İptal',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: 'Tamam',
        style: 'default',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
}

/**
 * Confirm destructive action (like delete)
 */
export function confirmDestruct(
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  title: string = 'Emin misiniz?',
  confirmText: string = 'Sil'
): void {
  Alert.alert(
    title,
    message,
    [
      {
        text: 'İptal',
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ],
    { cancelable: true }
  );
}

/**
 * Show permission denied message
 */
export function showPermissionDenied(permission: string = 'İzin') {
  Alert.alert('İzin Gerekli', `${permission} verilmedi. Lütfen ayarlardan izin verin.`, [
    { text: 'Tamam', style: 'cancel' },
  ]);
}

/**
 * Show custom alert with multiple buttons
 */
export function showAlert(title: string, message: string, buttons: AlertButton[]) {
  Alert.alert(title, message, buttons, { cancelable: true });
}

/**
 * Ask for text input (using prompt-style alert)
 */
export function askInput(
  title: string,
  message: string,
  onConfirm: (text: string) => void,
  placeholder?: string
): void {
  Alert.prompt(
    title,
    message,
    [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Tamam',
        onPress: (text) => {
          if (text) onConfirm(text);
        },
      },
    ],
    'plain-text',
    '',
    'default',
    placeholder
  );
}
