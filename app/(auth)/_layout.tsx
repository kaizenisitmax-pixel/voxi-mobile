import { Stack } from 'expo-router';
import { colors } from '../../lib/colors';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="verify" />
    </Stack>
  );
}
