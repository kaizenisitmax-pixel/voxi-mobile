import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

const SECTORS = [
  { value: 'agriculture', label: '🌾 Sera/Tarım' },
  { value: 'construction', label: '🏗️ İnşaat' },
  { value: 'manufacturing', label: '🏭 Üretim' },
  { value: 'service', label: '🛎️ Hizmet' },
  { value: 'retail', label: '🛒 Perakende' },
  { value: 'technology', label: '💻 Teknoloji' },
  { value: 'other', label: '📦 Diğer' },
];

export default function CreateWorkspaceScreen() {
  const router = useRouter();
  const { createWorkspace } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [teamName, setTeamName] = useState('Genel');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!companyName.trim()) {
      Alert.alert('Hata', 'Lütfen şirket adını girin');
      return;
    }

    if (!sector) {
      Alert.alert('Hata', 'Lütfen bir sektör seçin');
      return;
    }

    setLoading(true);
    try {
      await createWorkspace(companyName.trim(), sector, teamName.trim() || 'Genel');
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Şirket oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
            <View style={[styles.progressDot, styles.progressDotActive]} />
          </View>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Şirketini oluştur</Text>
            <Text style={styles.subtitle}>
              Ekibini yönetmeye hemen başla
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Şirket Adı *</Text>
              <TextInput
                style={styles.input}
                placeholder="Örn: ABC İnşaat"
                placeholderTextColor="#C7C7CC"
                value={companyName}
                onChangeText={setCompanyName}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Sektör *</Text>
              <View style={styles.sectorGrid}>
                {SECTORS.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.sectorButton,
                      sector === s.value && styles.sectorButtonActive,
                    ]}
                    onPress={() => setSector(s.value)}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.sectorText,
                        sector === s.value && styles.sectorTextActive,
                      ]}
                    >
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>İlk Ekip Adı</Text>
              <TextInput
                style={styles.input}
                placeholder="Varsayılan: Genel"
                placeholderTextColor="#C7C7CC"
                value={teamName}
                onChangeText={setTeamName}
                editable={!loading}
              />
            </View>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Oluştur</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
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
    marginBottom: 30,
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
  },
  form: {
    gap: 24,
    marginBottom: 30,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
  },
  input: {
    backgroundColor: '#F0EDE8',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#212121',
  },
  sectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sectorButton: {
    backgroundColor: '#F0EDE8',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sectorButtonActive: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  sectorText: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500',
  },
  sectorTextActive: {
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
