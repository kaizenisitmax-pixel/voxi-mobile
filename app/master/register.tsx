import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { startRecording, stopRecording, transcribeAudio } from '../../utils/recording';
import { speakText } from '../../utils/audio';
import * as Haptics from 'expo-haptics';

export default function MasterRegisterScreen() {
  const { session } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState('');
  const recordingRef = useRef<any>(null);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    Animated.timing(pulseAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  // Handle recording
  const handlePressIn = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = await startRecording();
      recordingRef.current = recording;

      setIsRecording(true);
      setStatusText('Dinliyorum...');
      startPulse();

      console.log('🎤 Kayıt başladı');
    } catch (error) {
      console.error('❌ Kayıt başlatılamadı:', error);
      Alert.alert('Hata', 'Mikrofon erişimi sağlanamadı');
    }
  };

  const handlePressOut = async () => {
    try {
      if (!recordingRef.current) return;

      setIsRecording(false);
      stopPulse();
      setStatusText('İşleniyor...');
      setIsProcessing(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Stop recording
      const result = await stopRecording(recordingRef.current);
      recordingRef.current = null;

      if (!result) {
        setIsProcessing(false);
        setStatusText('');
        Alert.alert('Hata', 'Kayıt alınamadı');
        return;
      }

      console.log('📂 Kayıt tamamlandı:', result.uri);

      // Transcribe
      console.log('🔄 Ses metne çevriliyor...');
      const transcript = await transcribeAudio(result.uri, result.duration);

      if (!transcript) {
        setIsProcessing(false);
        setStatusText('');
        Alert.alert('Hata', 'Ses anlaşılamadı');
        return;
      }

      console.log('📝 Transcript:', transcript);

      // AI analysis via Claude
      setStatusText('AI analiz ediyor...');

      const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-voice', {
        body: {
          transcript,
          context: 'master_register',
        },
      });

      if (aiError || !aiResult) {
        console.error('❌ AI analiz hatası:', aiError);
        setIsProcessing(false);
        setStatusText('');
        Alert.alert('Hata', 'AI analizi başarısız');
        return;
      }

      console.log('🧠 AI sonuç:', aiResult);

      // Create master profile
      await createMasterProfile(aiResult.data);
    } catch (error) {
      console.error('❌ İşleme hatası:', error);
      setIsRecording(false);
      setIsProcessing(false);
      setIsSpeaking(false);
      setStatusText('');
      Alert.alert('Hata', 'Bir sorun oluştu');
    }
  };

  const createMasterProfile = async (data: any) => {
    try {
      setStatusText('Profil oluşturuluyor...');

      const { error } = await supabase.from('masters').insert({
        user_id: session?.user?.id,
        name: data.name || session?.user?.user_metadata?.full_name,
        specialties: data.specialties || [],
        service_areas: data.service_areas || [],
        experience_years: data.experience_years || 0,
        bio: data.bio,
      });

      if (error) throw error;

      // Update profile role
      await supabase
        .from('profiles')
        .update({ role: 'both' })
        .eq('id', session?.user?.id);

      console.log('✅ Usta profili oluşturuldu');

      // TTS response
      const response = data.response || 'Usta kaydınız tamamlandı!';
      setStatusText('');
      setIsSpeaking(true);
      setIsProcessing(false);

      await speakText(response);

      setIsSpeaking(false);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Go back to profile
      setTimeout(() => {
        router.back();
      }, 1000);
    } catch (error: any) {
      console.error('❌ Profil oluşturma hatası:', error);
      setIsProcessing(false);
      setStatusText('');

      if (error.code === '23505') {
        Alert.alert('Hata', 'Zaten usta olarak kayıtlısınız');
      } else {
        Alert.alert('Hata', 'Profil oluşturulamadı');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Usta Olarak Kaydol</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <View style={styles.instructionIcon}>
            <Ionicons name="mic" size={40} color="#212121" />
          </View>
          <Text style={styles.instructionsTitle}>Sesli Kayıt ile Hızlıca Kayıt Olun</Text>
          <Text style={styles.instructionsText}>
            Mikrofona basılı tutun ve uzmanlık alanlarınızı, çalıştığınız bölgeleri ve deneyiminizi
            anlatan bir sesli mesaj bırakın.
          </Text>

          <View style={styles.exampleBox}>
            <Text style={styles.exampleTitle}>Örnek:</Text>
            <Text style={styles.exampleText}>
              "Ben Ahmet Yılmaz, 10 yıldır yerden ısıtma ve tadilat işleri yapıyorum. Balıkesir ve
              Bursa bölgelerinde hizmet veriyorum."
            </Text>
          </View>
        </View>

        {/* Pulse Button Container */}
        <View style={styles.pulseContainer}>
          {/* Halo effects */}
          <Animated.View
            style={[
              styles.halo,
              styles.halo1,
              {
                transform: [{ scale: isRecording ? pulseAnim : 1 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.halo,
              styles.halo2,
              {
                transform: [{ scale: isRecording ? pulseAnim : 1 }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.halo,
              styles.halo3,
              {
                transform: [{ scale: isRecording ? pulseAnim : 1 }],
              },
            ]}
          />

          {/* Pulse Button */}
          <TouchableOpacity
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isProcessing || isSpeaking}
            style={[
              styles.pulseButton,
              (isProcessing || isSpeaking) && styles.pulseButtonDisabled,
            ]}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <Ionicons name="mic" size={64} color="#FFFFFF" />
            )}
          </TouchableOpacity>

          {/* Status Text */}
          {statusText && (
            <View style={styles.statusContainer}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <Text style={styles.helpText}>
            {isRecording
              ? 'Konuşun ve butonu bırakın'
              : 'Mikrofona basılı tutun ve konuşun'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
  },
  instructionsContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  instructionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    color: '#3C3C43',
    textAlign: 'center',
    lineHeight: 24,
  },
  exampleBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 22,
    fontStyle: 'italic',
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  halo: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 2,
  },
  halo1: {
    width: 180,
    height: 180,
    borderColor: 'rgba(33, 33, 33, 0.1)',
  },
  halo2: {
    width: 240,
    height: 240,
    borderColor: 'rgba(33, 33, 33, 0.08)',
  },
  halo3: {
    width: 300,
    height: 300,
    borderColor: 'rgba(33, 33, 33, 0.05)',
  },
  pulseButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pulseButtonDisabled: {
    opacity: 0.6,
  },
  statusContainer: {
    position: 'absolute',
    bottom: -40,
    backgroundColor: 'rgba(33, 33, 33, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  helpContainer: {
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
