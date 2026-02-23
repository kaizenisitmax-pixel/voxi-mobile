import { Stack } from 'expo-router';
import { colors } from '../../lib/colors';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="profile" />
      <Stack.Screen name="workspace" />
    </Stack>
  );
}
