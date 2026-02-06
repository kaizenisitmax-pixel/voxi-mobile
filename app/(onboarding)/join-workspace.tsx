import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { validateInviteCode, acceptInvitation } from '../../lib/invite';

export default function JoinWorkspaceScreen() {
  const router = useRouter();
  const { joinWorkspace, session } = useAuth();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [validatedWorkspace, setValidatedWorkspace] = useState<any>(null);
  const [validatedTeam, setValidatedTeam] = useState<any>(null);
  const [validatedInvitation, setValidatedInvitation] = useState<any>(null);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleCodeChange = (text: string, index: number) => {
    setError(false);
    
    // Harf ve rakam kabul et, büyük harfe çevir
    const char = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (char.length > 1) return;

    const newCode = [...code];
    newCode[index] = char;
    setCode(newCode);

    // Sonraki input'a geç
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Tüm kutular doluysa otomatik join
    if (index === 5 && char && newCode.every(c => c !== '')) {
      handleJoin(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleJoin = async (inviteCode: string) => {
    setLoading(true);
    try {
      // Önce kodu doğrula
      const validation = await validateInviteCode(inviteCode);
      
      if (!validation.valid) {
        setError(true);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        Alert.alert('Hata', validation.error || 'Geçersiz davet kodu');
        setLoading(false);
        return;
      }

      // Workspace ve Team bilgilerini göster
      setValidatedWorkspace(validation.workspace);
      setValidatedTeam(validation.team);
      setValidatedInvitation(validation.invitation);
      setLoading(false);
      
      // Kullanıcı onayını al
      Alert.alert(
        'Ekibe Katıl',
        `${validation.workspace?.name} - ${validation.team?.name} ekibine katılmak istiyor musunuz?`,
        [
          {
            text: 'İptal',
            style: 'cancel',
            onPress: () => {
              setCode(['', '', '', '', '', '']);
              setValidatedWorkspace(null);
              setValidatedTeam(null);
              setValidatedInvitation(null);
            },
          },
          {
            text: 'Katıl',
            onPress: async () => {
              setLoading(true);
              try {
                const acceptResult = await acceptInvitation(
                  validation.invitation.id,
                  session!.user.id,
                  validation.workspace.id,
                  validation.team.id,
                  validation.invitation.role
                );
                
                if (acceptResult.success) {
                  router.replace('/(tabs)');
                } else {
                  Alert.alert('Hata', acceptResult.error || 'Ekibe katılınamadı');
                }
              } catch (err: any) {
                Alert.alert('Hata', err.message || 'Bir hata oluştu');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    } catch (error: any) {
      setError(true);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      Alert.alert('Hata', error.message || 'Geçersiz veya süresi dolmuş kod');
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
        <View style={styles.content}>
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
            <Text style={styles.title}>Davet kodunu girin</Text>
            <Text style={styles.subtitle}>
              Ekip yöneticinizden aldığınız 6 haneli kodu girin
            </Text>
          </View>

          {/* Code Input */}
          <View style={styles.codeContainer}>
            {code.map((char, index) => (
              <TextInput
                key={index}
                ref={ref => (inputRefs.current[index] = ref)}
                style={[
                  styles.codeInput,
                  error && styles.codeInputError,
                  char && styles.codeInputFilled,
                  validatedWorkspace && { borderColor: '#1A1A1A', borderWidth: 2 },
                ]}
                value={char}
                onChangeText={text => handleCodeChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                maxLength={1}
                selectTextOnFocus
                autoFocus={index === 0}
                autoCapitalize="characters"
                editable={!loading}
              />
            ))}
          </View>

          {/* Validated Workspace Info */}
          {validatedWorkspace && validatedTeam && (
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#E5E5EA',
            }}>
              <Text style={{ fontSize: 20, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>
                {validatedWorkspace.name}
              </Text>
              <Text style={{ fontSize: 15, color: '#8E8E93' }}>
                {validatedTeam.name}
              </Text>
            </View>
          )}

          {/* Loading */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#1A1A1A" />
              <Text style={styles.loadingText}>Katılıyor...</Text>
            </View>
          )}

          {/* Info */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
            <Text style={styles.infoText}>
              Davet kodunuz yoksa ekip yöneticinizden isteyebilirsiniz
            </Text>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#1A1A1A',
  },
  codeInputFilled: {
    backgroundColor: '#FFFFFF',
  },
  codeInputError: {
    borderWidth: 2,
    borderColor: '#FF3B30',
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0EDE8',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
});
