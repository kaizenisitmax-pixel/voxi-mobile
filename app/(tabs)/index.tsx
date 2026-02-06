import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { transcribeAudio, processVoxiChat } from '../../lib/ai';

export default function HomeScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("VOXI'ye bir şey söyle");
  const [teamNews, setTeamNews] = useState([
    { id: '1', text: 'Cihat montajı tamamladı', time: '15 dk önce', icon: 'checkmark-circle' },
    { id: '2', text: 'Yeni görev: Kablo çekimi', time: '1 saat önce', icon: 'add-circle' },
    { id: '3', text: 'Ahmet Bey aradı', time: '2 saat önce', icon: 'call' },
  ]);

  const recordingRef = useRef<Audio.Recording | null>(null);
  
  // Animasyonlar
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;

  // Idle pulse animasyonu
  useEffect(() => {
    if (!isRecording && !isProcessing) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isRecording, isProcessing]);

  // Recording ripple animasyonu
  useEffect(() => {
    if (isRecording) {
      const createRipple = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 1500,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
      };
      const r1 = createRipple(ripple1, 0);
      const r2 = createRipple(ripple2, 500);
      const r3 = createRipple(ripple3, 1000);
      r1.start(); r2.start(); r3.start();
      return () => { r1.stop(); r2.stop(); r3.stop(); };
    } else {
      ripple1.setValue(0);
      ripple2.setValue(0);
      ripple3.setValue(0);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.wav',
          outputFormat: Audio.AndroidOutputFormat.DEFAULT,
          audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/wav',
          bitsPerSecond: 128000,
        },
      };
      
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = recording;
      setIsRecording(true);
      setStatusText('Dinliyorum...');
    } catch (err) {
      console.error('Kayıt başlatılamadı:', err);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsProcessing(true);
    setStatusText('İşleniyor...');

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setStatusText('Ses kaydedilemedi');
        setIsProcessing(false);
        return;
      }

      // Timeout ile transcribe (30 saniye)
      setStatusText('Sesinizi anlıyorum...');
      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 30000)
      );

      let transcript: string | null = null;
      try {
        transcript = (await Promise.race([
          transcribeAudio(uri),
          timeoutPromise,
        ])) as string | null;
      } catch (err) {
        console.error('Transcribe failed:', err);
        setStatusText('Ses tanınamadı, tekrar deneyin');
        setIsProcessing(false);
        return;
      }

      if (!transcript) {
        setStatusText('Ses tanınamadı, tekrar deneyin');
        setIsProcessing(false);
        return;
      }

      // AI işleme
      setStatusText('Yapılıyor...');
      const result = await processVoxiChat(transcript);

      if (result) {
        setStatusText(
          result.message.length > 80
            ? result.message.slice(0, 80) + '...'
            : result.message
        );
      } else {
        setStatusText('Komut anlaşılamadı');
      }
    } catch (err) {
      console.error('stopRecording error:', err);
      setStatusText('Bir hata oluştu');
    } finally {
      setIsProcessing(false);
      // 6 saniye sonra status'u sıfırla
      setTimeout(() => setStatusText("VOXI'ye bir şey söyle"), 6000);
    }
  };

  const renderRipple = (anim: Animated.Value) => (
    <Animated.View
      style={[
        styles.ripple,
        {
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] }),
          transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }],
        },
      ]}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>VOXI</Text>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      {/* Ana Alan - Mikrofon */}
      <View style={styles.mainArea}>
        <Text style={styles.statusText}>{statusText}</Text>

        <View style={styles.buttonContainer}>
          {isRecording && (
            <>
              {renderRipple(ripple1)}
              {renderRipple(ripple2)}
              {renderRipple(ripple3)}
            </>
          )}

          <Pressable onPressIn={startRecording} onPressOut={stopRecording} disabled={isProcessing}>
            <Animated.View
              style={[
                styles.mainButton,
                isRecording && styles.mainButtonActive,
                isProcessing && styles.mainButtonProcessing,
                { transform: [{ scale: isRecording ? 1.1 : pulseAnim }] },
              ]}
            >
              {isProcessing ? (
                <Animated.View style={styles.spinner}>
                  <Ionicons name="sync-outline" size={40} color="#FFFFFF" />
                </Animated.View>
              ) : (
                <Ionicons 
                  name={isRecording ? "radio" : "radio-outline"} 
                  size={40} 
                  color="#FFFFFF" 
                />
              )}
            </Animated.View>
          </Pressable>
        </View>

        {!isRecording && !isProcessing && (
          <Text style={styles.hintText}>Basılı tut ve konuş</Text>
        )}
      </View>

      {/* Ekipten Haberler */}
      <View style={styles.newsSection}>
        <Text style={styles.newsTitle}>Ekipten Haberler</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newsScroll}>
          {teamNews.map((item) => (
            <View key={item.id} style={styles.newsCard}>
              <Ionicons name={item.icon as any} size={20} color="#1A1A1A" />
              <Text style={styles.newsText} numberOfLines={2}>{item.text}</Text>
              <Text style={styles.newsTime}>{item.time}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLogo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 2,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  ripple: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1A1A1A',
  },
  mainButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  mainButtonActive: {
    backgroundColor: '#000000',
  },
  mainButtonProcessing: {
    backgroundColor: '#3C3C43',
  },
  spinner: {
    // Animasyon eklenebilir
  },
  hintText: {
    marginTop: 24,
    fontSize: 14,
    color: '#8E8E93',
  },
  newsSection: {
    paddingBottom: 20,
  },
  newsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 20,
    marginBottom: 12,
  },
  newsScroll: {
    paddingLeft: 20,
  },
  newsCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  newsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    marginTop: 8,
    lineHeight: 18,
  },
  newsTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 6,
  },
});
