import * as Sentry from '@sentry/react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { scheduleDailyTaskReminder } from '../lib/notifications';

// Sentry başlatma
Sentry.init({
  dsn: '', // Sentry hesabı açılınca güncelle
  enabled: !__DEV__, // Development'ta devre dışı
  tracesSampleRate: 0.2, // Performance monitoring %20
  _experiments: {
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  },
});

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, isLoading, isOnboarded } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboardingGroup = segments[0] === '(onboarding)';

    if (!session) {
      // Giriş yapılmamış → Auth ekranlarına yönlendir
      if (!inAuthGroup) {
        router.replace('/(auth)/welcome');
      }
    } else if (!isOnboarded) {
      // Giriş yapılmış ama profil/workspace yok → Onboarding
      if (!inOnboardingGroup) {
        router.replace('/(onboarding)/profile');
      }
    } else {
      // Her şey tamam → Ana uygulamaya yönlendir
      if (inAuthGroup || inOnboardingGroup) {
        router.replace('/(tabs)');
      }
      // Günlük görev hatırlatmasını planla
      scheduleDailyTaskReminder();
    }
  }, [session, isLoading, isOnboarded, segments]);

  // Push notification listeners
  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Bildirim geldi:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.taskId) {
        router.push(`/task/${data.taskId}`);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="task" />
    </Stack>
  );
}

// Root layout'u Sentry ile sar
export default Sentry.wrap(function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) {
      Sentry.captureException(error, { tags: { feature: 'font_loading' } });
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
});
