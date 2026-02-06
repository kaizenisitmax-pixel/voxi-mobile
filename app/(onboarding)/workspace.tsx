import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function WorkspaceScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.content}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>

        {/* Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Nasıl başlamak istersin?</Text>
          <Text style={styles.subtitle}>
            Yeni bir şirket oluştur veya mevcut bir ekibe katıl
          </Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {/* Create Workspace */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/(onboarding)/create-workspace')}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="business" size={32} color="#1A1A1A" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Yeni şirket oluştur</Text>
              <Text style={styles.cardDescription}>
                Ekibini kur, yönetmeye hemen başla
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
          </TouchableOpacity>

          {/* Join Workspace */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push('/(onboarding)/join-workspace')}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="people" size={32} color="#1A1A1A" />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Ekibe katıl</Text>
              <Text style={styles.cardDescription}>
                Davet kodu ile mevcut bir ekibe katıl
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 40,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E8E6E1',
  },
  progressDotActive: {
    backgroundColor: '#1A1A1A',
    width: 24,
  },
  titleContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
  },
  options: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F0EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});
