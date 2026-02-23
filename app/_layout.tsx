import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../lib/colors';

function RootLayoutNav() {
  const { session, loading, profile, membership } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/welcome');
    } else if (!profile?.full_name) {
      if (!inOnboarding) router.replace('/(onboarding)/profile');
    } else if (!membership) {
      if (!inOnboarding) router.replace('/(onboarding)/workspace');
    } else {
      if (inAuthGroup || inOnboarding) router.replace('/(main)');
    }
  }, [session, loading, profile, membership, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.dark} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen name="card/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="customer/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="new/index" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
