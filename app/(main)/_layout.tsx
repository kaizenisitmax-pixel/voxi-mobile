import { Stack, useRouter } from 'expo-router';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../lib/colors';

function HeaderNav() {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.logo}>VOXI</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(main)/search')}>
            <Text style={styles.iconText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/(main)/settings')}>
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/new/')}>
            <Text style={styles.addText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function MainLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <HeaderNav />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="search" options={{ animation: 'fade' }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.card },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  logo: { fontSize: 24, fontWeight: '800', color: colors.dark, letterSpacing: -0.5 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.dark,
    alignItems: 'center', justifyContent: 'center',
  },
  addText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: -1 },
});
