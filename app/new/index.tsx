import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert,
  ActivityIndicator, ScrollView, Animated, Vibration, KeyboardAvoidingView,
  Platform, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../contexts/AuthContext';
import { useCards } from '../../hooks/useCards';
import { supabase } from '../../lib/supabase';
import { smartCreate, SmartCreateResult, WEB_API } from '../../lib/ai';
import { colors } from '../../lib/colors';
import { getSelectedIndustryId } from '../../lib/industryStore';
import TemplateSheet from '../../components/TemplateSheet';


type Mode = 'choose' | 'recording' | 'processing' | 'purpose_ask' | 'purpose_recording' | 'confirm' | 'creating' | 'done' | 'error' | 'text';
type ProcessStep = 'transcribe' | 'analyze' | 'done';

const STEP_LABELS: Record<string, Record<ProcessStep, string>> = {
  voice: {
    transcribe: 'Ses kaydınız yazıya çevriliyor...',
    analyze: 'AI içeriği analiz ediyor...',
    done: 'Analiz tamamlandı!',
  },
  photo: {
    transcribe: 'Görüntü analiz ediliyor...',
    analyze: 'AI detayları çıkarıyor...',
    done: 'Analiz tamamlandı!',
  },
  document: {
    transcribe: 'Belge okunuyor...',
    analyze: 'AI içeriği analiz ediyor...',
    done: 'Analiz tamamlandı!',
  },
  text: {
    transcribe: 'İçerik işleniyor...',
    analyze: 'AI analiz ediyor...',
    done: 'Analiz tamamlandı!',
  },
};

const SOURCE_META: Record<string, { icon: string; label: string }> = {
  voice: { icon: '🎤', label: 'Ses Kaydı' },
  photo: { icon: '📷', label: 'Fotoğraf' },
  document: { icon: '📄', label: 'Belge' },
  text: { icon: '✏️', label: 'Not' },
};

const PRIORITY_OPTIONS = [
  { key: 'low', label: 'Düşük' },
  { key: 'normal', label: 'Normal' },
  { key: 'high', label: 'Yüksek' },
  { key: 'urgent', label: '⚡ Acil' },
] as const;

export default function NewEntryScreen() {
  const router = useRouter();
  const { membership, user } = useAuth();
  const { createCard } = useCards();

  const [mode, setMode] = useState<Mode>('choose');
  const [sourceType, setSourceType] = useState<'voice' | 'photo' | 'text' | 'document'>('voice');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [currentStep, setCurrentStep] = useState<ProcessStep>('transcribe');
  const [transcript, setTranscript] = useState('');
  const [aiResult, setAiResult] = useState<SmartCreateResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [text, setText] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdCardTitle, setCreatedCardTitle] = useState('');
  const [createdVoiceResponse, setCreatedVoiceResponse] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  // Seçili takip görevleri (insight index'leri)
  const [selectedInsights, setSelectedInsights] = useState<Set<number>>(new Set());
  const [industryId, setIndustryId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState('');

  const [purposeRecordingSeconds, setPurposeRecordingSeconds] = useState(0);
  const [isPurposeRecording, setIsPurposeRecording] = useState(false);
  const [isPurposeTranscribing, setIsPurposeTranscribing] = useState(false);
  const lastPayloadRef = useRef<{ type: 'voice' | 'photo' | 'text' | 'document'; payload: { fileUri?: string; text?: string; fileType?: string; fileName?: string } } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const purposeRecordingRef = useRef<Audio.Recording | null>(null);
  const purposeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getSelectedIndustryId().then(setIndustryId);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    if (mode === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [mode, pulseAnim]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // TTS — OpenAI echo (premium erkek ses), başarısız olursa expo-speech fallback
  const speak = (text: string): Promise<void> => {
    return new Promise(resolve => {
      (async () => {
        let soundRef: Audio.Sound | null = null;

        // Oynatma moduna geç
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        }).catch(() => {});

        try {
          const session = await supabase.auth.getSession();
          const accessToken = session.data.session?.access_token;
          if (!accessToken) throw new Error('oturum-yok');

          // OpenAI TTS isteği
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 15_000);
          let ttsRes: Response;
          try {
            ttsRes = await fetch(`${WEB_API}/api/tts`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({ text }),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(tid);
          }

          if (!ttsRes.ok) {
            const body = await ttsRes.text().catch(() => '');
            throw new Error(`HTTP-${ttsRes.status}: ${body.slice(0, 120)}`);
          }

          const data = await ttsRes.json() as { audioBase64?: string };
          if (!data.audioBase64) throw new Error('bos-ses-verisi');

          // MP3 dosyasını cache'e yaz
          const tempUri = `${FileSystem.cacheDirectory}voxi_tts_${Date.now()}.mp3`;
          await FileSystem.writeAsStringAsync(tempUri, data.audioBase64, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // Yükle, sonra ayrıca çal (shouldPlay:true yerine explicit playAsync)
          const { sound } = await Audio.Sound.createAsync({ uri: tempUri });
          soundRef = sound;

          let finished = false;
          const finish = () => {
            if (finished) return;
            finished = true;
            soundRef?.unloadAsync().catch(() => {});
            soundRef = null;
            FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
            resolve();
          };

          sound.setOnPlaybackStatusUpdate(s => {
            if (s.isLoaded && s.didJustFinish) finish();
          });

          await sound.playAsync();
          setTimeout(finish, 20_000); // güvenlik timeout
          return; // expo-speech'e düşme

        } catch (err) {
          soundRef?.unloadAsync().catch(() => {});
          soundRef = null;
          // Hata mesajını kullanıcıya göster (debug)
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('[speak] OpenAI TTS hata:', msg);
          Alert.alert(
            'Ses Hatası (Debug)',
            `OpenAI TTS başarısız:\n${msg}\n\nCihaz sesi kullanılıyor.`,
            [{ text: 'Tamam' }],
          );
        }

        // expo-speech fallback
        await new Promise(r => setTimeout(r, 300));
        Speech.stop();
        const tryLocal = (lang?: string) => {
          Speech.speak(text, {
            language: lang,
            rate: 1.0,
            pitch: 0.85,
            onDone: resolve,
            onStopped: resolve,
            onError: () => (lang ? tryLocal(undefined) : resolve()),
          });
        };
        tryLocal('tr-TR');
      })();
    });
  };

  // ═══════════════════════════
  //     VOICE RECORDING
  // ═══════════════════════════

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Mikrofon İzni', 'Ses kaydı için mikrofon izni gerekli.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      recordingRef.current = rec;
      setRecordingSeconds(0);
      setMode('recording');
      setSourceType('voice');

      timerRef.current = setInterval(async () => {
        setRecordingSeconds(prev => prev + 1);
        const currentRec = recordingRef.current;
        if (currentRec) {
          try {
            const status = await currentRec.getStatusAsync();
            if (!status.isRecording && status.isDoneRecording) {
              console.log('[recording] Stopped unexpectedly');
            }
          } catch {}
        }
      }, 1000);
    } catch (err) {
      console.error('[recording] Start error:', err);
      Alert.alert('Hata', 'Ses kaydı başlatılamadı');
    }
  };

  const stopRecording = async () => {
    const rec = recordingRef.current;
    if (!rec) {
      console.warn('[stopRecording] rec is null — no active recording');
      setMode('choose');
      return;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Anında processing ekranını göster — kullanıcı "hiçbirşey olmadı" demesin
    setMode('processing');
    setSourceType('voice');
    setCurrentStep('transcribe');
    setTranscript('');

    try {
      // URI'yi durdurmadan ÖNCE al (iOS compat)
      const uri = rec.getURI();
      const status = await rec.getStatusAsync();
      const actualDurationMs = status.durationMillis || 0;
      console.log('[recording] Duration:', actualDurationMs, 'ms, uri:', !!uri);

      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      setRecording(null);
      recordingRef.current = null;

      if (!uri) {
        setMode('choose');
        Alert.alert('Kayıt Hatası', 'Ses dosyası oluşturulamadı. Tekrar deneyin.');
        return;
      }

      if (actualDurationMs < 300) {
        setMode('choose');
        Alert.alert('Çok Kısa', 'Daha uzun konuşun ve tekrar deneyin.');
        return;
      }

      if (!membership?.workspace_id) {
        setMode('choose');
        Alert.alert('Oturum Hatası', 'Lütfen uygulamayı yeniden başlatın.');
        return;
      }

      processInput('voice', { fileUri: uri, fileType: 'audio/m4a', fileName: 'recording.m4a' });
    } catch (err) {
      console.error('[recording] Stop error:', err);
      setRecording(null);
      recordingRef.current = null;
      setMode('choose');
      Alert.alert('Hata', 'Ses kaydı durdurulamadı. Tekrar deneyin.');
    }
  };

  const cancelRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const rec = recordingRef.current;
    if (rec) {
      try { await rec.stopAndUnloadAsync(); } catch {}
      setRecording(null);
      recordingRef.current = null;
    }
    setMode('choose');
  };

  // ═══════════════════════════
  //   UNIFIED PROCESSING → CONFIRM
  // ═══════════════════════════

  const processInput = async (
    type: 'voice' | 'photo' | 'text' | 'document',
    payload: { fileUri?: string; text?: string; fileType?: string; fileName?: string },
    userPurpose?: string,
  ) => {
    setMode('processing');
    setSourceType(type);
    setCurrentStep('transcribe');
    setTranscript('');

    try {
      const result = await smartCreate(type, payload, membership!.workspace_id, industryId, userPurpose);
      console.log('[processInput] AI result:', JSON.stringify(result).slice(0, 400));

      setAiResult(result);
      setSelectedInsights(new Set()); // Yeni analiz → seçimleri sıfırla
      setTranscript(result.transcript || payload.text || payload.fileName || '');
      setCurrentStep('analyze');

      await new Promise(r => setTimeout(r, 600));
      setCurrentStep('done');
      await new Promise(r => setTimeout(r, 400));
      setMode('confirm');
    } catch (err: any) {
      console.error('[processInput] Error:', err);
      setErrorMessage(err.message || 'Bir hata oluştu');
      setMode('error');
    }
  };

  // ═══════════════════════════
  //   PURPOSE VOICE RECORDING
  // ═══════════════════════════

  const startPurposeRecording = async () => {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      purposeRecordingRef.current = rec;
      setPurposeRecordingSeconds(0);
      setIsPurposeRecording(true);
      purposeTimerRef.current = setInterval(() => setPurposeRecordingSeconds(p => p + 1), 1000);
    } catch {
      Alert.alert('Hata', 'Ses kaydı başlatılamadı');
    }
  };

  const stopPurposeRecording = async () => {
    if (purposeTimerRef.current) { clearInterval(purposeTimerRef.current); purposeTimerRef.current = null; }
    const rec = purposeRecordingRef.current;
    if (!rec) return;
    try {
      // URI'yi durdurmadan ÖNCE al
      const uri = rec.getURI();
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      purposeRecordingRef.current = null;
      setIsPurposeRecording(false);

      if (!uri) {
        Alert.alert('Hata', 'Ses kaydedilemedi, tekrar deneyin.');
        return;
      }

      // Transkripsiyon loading göster
      setIsPurposeTranscribing(true);
      try {
        const session = await supabase.auth.getSession();
        const accessToken = session.data.session?.access_token;
        if (!accessToken) throw new Error('no session');

        const formData = new FormData();
        formData.append('file', { uri, type: 'audio/m4a', name: 'purpose.m4a' } as any);

        const res = await fetch(`${WEB_API}/api/transcribe`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          // API { text: "..." } döndürüyor
          const t = data.text || data.transcript || '';
          if (t) setPurpose(t);
          else Alert.alert('Anlaşılamadı', 'Ses net gelmedi, yazarak girin.');
        } else {
          const err = await res.json().catch(() => ({}));
          Alert.alert('Hata', (err as any).error || 'Ses tanıma başarısız.');
        }
      } finally {
        setIsPurposeTranscribing(false);
      }
    } catch (err) {
      console.error('[purposeRecording] Error:', err);
      setIsPurposeRecording(false);
      setIsPurposeTranscribing(false);
      Alert.alert('Hata', 'Ses kaydı işlenemedi.');
    }
  };

  // ═══════════════════════════
  //      PICKERS
  // ═══════════════════════════

  // Foto/belge için: dosyayı kaydet, hemen "Bu ne için?" ekranını aç
  const showPurposeFor = (
    type: 'photo' | 'document',
    payload: { fileUri: string; fileType: string; fileName: string },
  ) => {
    lastPayloadRef.current = { type, payload };
    setSourceType(type);
    setPurpose('');
    setMode('purpose_ask');
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Kamera İzni', 'Fotoğraf çekmek için kamera izni gerekli.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      showPurposeFor('photo', { fileUri: result.assets[0].uri, fileType: 'image/jpeg', fileName: 'photo.jpg' });
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      showPurposeFor('photo', { fileUri: result.assets[0].uri, fileType: 'image/jpeg', fileName: 'photo.jpg' });
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'],
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mime = asset.mimeType || 'application/octet-stream';
      const type = mime.startsWith('image/') ? 'photo' : 'document';
      showPurposeFor(type, { fileUri: asset.uri, fileType: mime, fileName: asset.name });
    }
  };

  const handleTextSubmit = () => {
    if (!text.trim() || !membership?.workspace_id) return;
    processInput('text', { text: text.trim() });
  };

  // ═══════════════════════════
  //    CONFIRM → CREATE CARD
  // ═══════════════════════════

  const handleCreateCard = async () => {
    if (!aiResult || creating) return;
    setCreating(true);
    setMode('creating');

    try {
      let customerId: string | undefined;

      if (aiResult.customerName && membership?.workspace_id) {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('workspace_id', membership.workspace_id)
          .ilike('company_name', aiResult.customerName)
          .limit(1)
          .maybeSingle();

        if (existing) {
          customerId = existing.id;
        } else {
          const { data: newCust } = await supabase
            .from('customers')
            .insert({
              workspace_id: membership.workspace_id,
              company_name: aiResult.customerName,
              status: 'lead',
            })
            .select('id')
            .single();
          customerId = newCust?.id;
        }
      }

      const cardResult = await createCard({
        title: aiResult.title,
        description: aiResult.description,
        source_type: sourceType,
        customer_id: customerId,
        priority: aiResult.priority,
        labels: aiResult.labels,
        ai_summary: aiResult.description,
      });

      if (cardResult?.card) {
        // Seçili insight'lardan takip görevleri oluştur
        const insights = aiResult.insights || [];
        const followUps = insights.filter((_, i) => selectedInsights.has(i));
        for (const insight of followUps) {
          await createCard({
            title: insight.length > 75 ? insight.slice(0, 72) + '...' : insight,
            description: `Takip görevi — ${aiResult.title} kartından oluşturuldu.\n\n${insight}`,
            source_type: 'text',
            customer_id: customerId,
            priority: 'normal',
            labels: ['takip'],
          }).catch(() => {}); // Takip görevi başarısız olsa ana kart etkilenmesin
        }

        const followUpMsg = followUps.length > 0
          ? ` ${followUps.length} takip görevi de eklendi.`
          : '';
        const msg = (aiResult.voiceResponse || `${aiResult.title} kartı oluşturuldu`) + followUpMsg;
        setCreatedCardTitle(aiResult.title);
        setCreatedVoiceResponse(msg);
        setMode('done');
        Vibration.vibrate(100);

        // Max 8 saniye bekle — uzun cümlelere de yeter
        const navTimeout = setTimeout(() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }, 8000);

        speak(msg).then(() => {
          clearTimeout(navTimeout);
          setTimeout(() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }, 800);
        });
      } else {
        throw new Error('Kart oluşturulamadı');
      }
    } catch (err: any) {
      console.error('[handleCreateCard] Error:', err);
      setMode('confirm');
      Alert.alert('Hata', err.message || 'Kart oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  const removeLabel = (label: string) => {
    if (!aiResult) return;
    setAiResult({ ...aiResult, labels: aiResult.labels.filter(l => l !== label) });
  };

  // ═══════════════════════════
  //          RENDERS
  // ═══════════════════════════

  // ─── RECORDING ───
  if (mode === 'recording') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.recordingContainer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecording}>
            <Text style={styles.cancelBtnText}>İptal</Text>
          </TouchableOpacity>

          <View style={styles.recordingCenter}>
            <Animated.View style={[styles.micPulse, { transform: [{ scale: pulseAnim }] }]}>
              <View style={styles.micCircle}>
                <Text style={styles.micEmoji}>🎤</Text>
              </View>
            </Animated.View>

            <Text style={styles.timerText}>{formatTime(recordingSeconds)}</Text>
            <Text style={styles.listeningText}>Dinliyorum...</Text>
            <Text style={styles.listeningHint}>Konuşmanız bitince aşağıdaki butona basın</Text>
          </View>

          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <View style={styles.stopIcon} />
            <Text style={styles.stopText}>Kaydı Bitir</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── PROCESSING ───
  if (mode === 'processing') {
    const labels = STEP_LABELS[sourceType] || STEP_LABELS.text;
    const steps: ProcessStep[] = ['transcribe', 'analyze', 'done'];
    const currentIdx = steps.indexOf(currentStep);
    const meta = SOURCE_META[sourceType];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.processingContainer}>
          <View style={styles.processingIconWrap}>
            <Text style={styles.processingIcon}>{meta.icon}</Text>
          </View>
          <Text style={styles.processingTitle}>{meta.label} İşleniyor</Text>

          <View style={styles.stepsContainer}>
            {steps.map((step, idx) => {
              const isDone = currentIdx > idx;
              const isActive = currentIdx === idx;

              return (
                <View key={step} style={[styles.stepRow, { opacity: idx <= currentIdx ? 1 : 0.3 }]}>
                  <View style={[styles.stepDot, isDone && styles.stepDotDone, isActive && styles.stepDotActive]}>
                    {isDone ? (
                      <Text style={styles.stepCheck}>✓</Text>
                    ) : isActive ? (
                      <ActivityIndicator size="small" color={colors.dark} />
                    ) : null}
                  </View>
                  <Text style={[styles.stepText, isDone && styles.stepTextDone, isActive && styles.stepTextActive]}>
                    {labels[step]}
                  </Text>
                </View>
              );
            })}
          </View>

          {sourceType === 'voice' && currentStep === 'transcribe' && (
            <Text style={styles.processingHint}>Ses metne çevriliyor, 15–30 saniye sürebilir</Text>
          )}

          <TouchableOpacity
            style={styles.cancelProcessingBtn}
            onPress={() => { setMode('choose'); setCurrentStep('transcribe'); }}
          >
            <Text style={styles.cancelProcessingText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── PURPOSE ASK ───
  if (mode === 'purpose_ask') {
    const meta = SOURCE_META[sourceType];
    const fileName = lastPayloadRef.current?.payload?.fileName;

    const runWithPurpose = (finalPurpose?: string) => {
      Keyboard.dismiss();
      if (!lastPayloadRef.current) { setMode('choose'); return; }
      processInput(lastPayloadRef.current.type, lastPayloadRef.current.payload, finalPurpose);
    };

    return (
      <SafeAreaView style={styles.container}>
        {/* Header — klavye etkisinde kalmaz */}
        <View style={styles.purposeHeader}>
          <View style={{ width: 60 }} />
          <Text style={styles.purposeHeaderTitle}>Bu ne için?</Text>
          <TouchableOpacity onPress={() => runWithPurpose(undefined)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.purposeSkip}>Atla</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            contentContainerStyle={styles.purposeScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Dosya/kaynak önizleme */}
            <View style={styles.purposeIconWrap}>
              <Text style={styles.purposeIcon}>{meta.icon}</Text>
            </View>
            {fileName && (
              <View style={styles.purposeTranscriptBox}>
                <Text style={styles.purposeTranscriptText} numberOfLines={1}>{fileName}</Text>
              </View>
            )}
            <Text style={styles.purposeSubtitle}>
              Bu içeriği ne amaçla ekliyorsunuz?{'\n'}Belirtirseniz daha doğru kart oluştururum.
            </Text>

            {/* Metin girişi */}
            <TextInput
              style={styles.purposeInput}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="Fatura, müşteri belgesi, kargo takibi..."
              placeholderTextColor={colors.muted}
              multiline
              returnKeyType="done"
              blurOnSubmit
              autoFocus
            />
          </ScrollView>

          {/* Alt buton çubuğu — her zaman aktif */}
          <View style={styles.purposeFooter}>
            <TouchableOpacity
              style={[
                styles.purposeMicBtn,
                isPurposeRecording && styles.purposeMicBtnActive,
                isPurposeTranscribing && styles.purposeMicBtnTranscribing,
              ]}
              onPress={isPurposeRecording ? stopPurposeRecording : startPurposeRecording}
              disabled={isPurposeTranscribing}
              activeOpacity={0.8}
            >
              {isPurposeTranscribing ? (
                <ActivityIndicator size="small" color={colors.dark} />
              ) : (
                <Text style={styles.purposeMicIcon}>{isPurposeRecording ? '⏹' : '🎤'}</Text>
              )}
              {isPurposeRecording && !isPurposeTranscribing && (
                <Text style={styles.purposeMicSecs}>{purposeRecordingSeconds}s</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.purposeSubmitBtn, isPurposeTranscribing && { opacity: 0.5 }]}
              onPress={() => !isPurposeTranscribing && runWithPurpose(purpose.trim() || undefined)}
              activeOpacity={0.8}
            >
              <Text style={styles.purposeSubmitText}>
                {purpose.trim() ? 'Analiz Et →' : 'Atla →'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ─── CONFIRM (Rich, Interactive) ───
  if (mode === 'confirm' && aiResult) {
    const meta = SOURCE_META[sourceType];
    const details = aiResult.extractedDetails || {};
    const detailKeys = Object.keys(details);
    const insights = aiResult.insights || [];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmHeader}>
          <TouchableOpacity onPress={() => { setMode('choose'); setAiResult(null); setTranscript(''); }}>
            <Text style={styles.confirmHeaderBtn}>← İptal</Text>
          </TouchableOpacity>
          <Text style={styles.confirmHeaderTitle}>Kart Önizleme</Text>
          <View style={{ width: 60 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={44}
        >
          <ScrollView
            contentContainerStyle={styles.confirmScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Source & Transcript */}
            {transcript ? (
              <View style={styles.sourceSection}>
                <View style={styles.sourceBadge}>
                  <Text style={styles.sourceIcon}>{meta.icon}</Text>
                  <Text style={styles.sourceLabel}>{meta.label}</Text>
                </View>
                <View style={styles.transcriptBox}>
                  <Text style={styles.transcriptText}>
                    {sourceType === 'voice' ? `"${transcript}"` : transcript}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Divider */}
            <View style={styles.divider} />

            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>BAŞLIK</Text>
              <TextInput
                style={styles.fieldInput}
                value={aiResult.title}
                onChangeText={t => setAiResult({ ...aiResult, title: t })}
                placeholder="Kart başlığı"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>AÇIKLAMA</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldMulti]}
                value={aiResult.description}
                onChangeText={t => setAiResult({ ...aiResult, description: t })}
                multiline
                placeholder="Detaylı açıklama"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Customer */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>MÜŞTERİ</Text>
              <TextInput
                style={styles.fieldInput}
                value={aiResult.customerName || ''}
                onChangeText={t => setAiResult({ ...aiResult, customerName: t || null })}
                placeholder="Firma adı (opsiyonel)"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Priority */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>ÖNCELİK</Text>
              <View style={styles.priorityRow}>
                {PRIORITY_OPTIONS.map(p => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.priorityBtn, aiResult.priority === p.key && styles.priorityActive]}
                    onPress={() => setAiResult({ ...aiResult, priority: p.key })}
                  >
                    <Text style={[styles.priorityText, aiResult.priority === p.key && styles.priorityTextActive]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Labels */}
            {aiResult.labels.length > 0 && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>ETİKETLER</Text>
                <View style={styles.labelsWrap}>
                  {aiResult.labels.map(label => (
                    <View key={label} style={styles.labelTag}>
                      <Text style={styles.labelText}>{label}</Text>
                      <TouchableOpacity onPress={() => removeLabel(label)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.labelRemove}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Extracted Details */}
            {detailKeys.length > 0 && (
              <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>📋 Tespit Edilen Bilgiler</Text>
                {detailKeys.map(key => (
                  <View key={key} style={styles.detailRow}>
                    <Text style={styles.detailKey}>{key}</Text>
                    <Text style={styles.detailValue}>{details[key]}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Takip Görevleri — seçilenler kart oluşturulunca ayrı görev olarak eklenir */}
            {insights.length > 0 && (
              <View style={styles.insightsSection}>
                <View style={styles.insightsHeader}>
                  <Text style={styles.sectionTitle}>📌 Takip Görevi Ekle</Text>
                  <Text style={styles.insightsHint}>
                    {selectedInsights.size > 0
                      ? `${selectedInsights.size} görev seçildi`
                      : 'İşaretledikleriniz görev olarak oluşturulur'}
                  </Text>
                </View>
                {insights.map((insight, i) => {
                  const selected = selectedInsights.has(i);
                  return (
                    <TouchableOpacity
                      key={i}
                      style={[styles.insightRow, selected && styles.insightRowSelected]}
                      onPress={() => {
                        setSelectedInsights(prev => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i); else next.add(i);
                          return next;
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.insightCheck, selected && styles.insightCheckSelected]}>
                        {selected && <Text style={styles.insightCheckMark}>✓</Text>}
                      </View>
                      <Text style={[styles.insightText, selected && styles.insightTextSelected]}>
                        {insight}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Fixed Create Button */}
        <View style={styles.confirmFooter}>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreateCard} activeOpacity={0.8}>
            <Text style={styles.createBtnText}>
              {selectedInsights.size > 0
                ? `🚀 Kart + ${selectedInsights.size} Görev Oluştur`
                : '🚀 Kart Oluştur'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── CREATING ───
  if (mode === 'creating') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color={colors.dark} />
          <Text style={styles.creatingText}>Kartınız oluşturuluyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── DONE ───
  if (mode === 'done') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <View style={styles.doneCircle}>
            <Text style={styles.doneCheck}>✓</Text>
          </View>
          <Text style={styles.doneTitle}>{createdCardTitle}</Text>
          <Text style={styles.doneSubtitle}>Kartınız başarıyla oluşturuldu!</Text>

          {/* Sesli yanıt metni — TTS çalışsa da çalışmasa da kullanıcı okuyabilir */}
          {createdVoiceResponse ? (
            <View style={styles.doneVoiceBox}>
              <Text style={styles.doneVoiceIcon}>🔊</Text>
              <Text style={styles.doneVoiceText}>{createdVoiceResponse}</Text>
            </View>
          ) : null}

          <Text style={styles.doneRedirect}>Ana sayfaya dönülüyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── ERROR ───
  if (mode === 'error') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredContainer}>
          <View style={[styles.doneCircle, { backgroundColor: colors.danger + '15' }]}>
            <Text style={[styles.doneCheck, { color: colors.danger }]}>!</Text>
          </View>
          <Text style={styles.doneTitle}>Bir Sorun Oluştu</Text>
          <Text style={styles.errorDetail}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { setMode('choose'); setErrorMessage(''); }}
          >
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── TEXT INPUT ───
  if (mode === 'text') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.textHeader}>
          <TouchableOpacity onPress={() => { setMode('choose'); setText(''); }}>
            <Text style={styles.confirmHeaderBtn}>İptal</Text>
          </TouchableOpacity>
          <Text style={styles.confirmHeaderTitle}>Not Yaz</Text>
          <TouchableOpacity onPress={handleTextSubmit} disabled={!text.trim()}>
            <Text style={[styles.confirmHeaderBtn, !text.trim() && { color: colors.disabled }]}>
              Gönder
            </Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.textArea}
          placeholder="Müşteri ile görüşme notları, yapılacak işler..."
          placeholderTextColor={colors.muted}
          value={text}
          onChangeText={setText}
          multiline
          autoFocus
          textAlignVertical="top"
        />
      </SafeAreaView>
    );
  }

  // ═══════════════════════════
  //     CHOOSE MODE (Main)
  // ═══════════════════════════
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chooseHeader}>
        <Text style={styles.chooseTitle}>Yeni Ekle</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.confirmHeaderBtn}>Kapat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chooseCenter}>
        <TouchableOpacity style={styles.bigMicButton} onPress={startRecording} activeOpacity={0.7}>
          <Text style={styles.bigMicEmoji}>🎤</Text>
        </TouchableOpacity>
        <Text style={styles.bigMicLabel}>Konuşarak Kart Oluştur</Text>
        <Text style={styles.bigMicHint}>Mikrofona basın ve konuşun</Text>
      </View>

      <View style={styles.secondaryRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={takePhoto}>
          <Text style={styles.secondaryIcon}>📷</Text>
          <Text style={styles.secondaryLabel}>Kamera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={pickImage}>
          <Text style={styles.secondaryIcon}>🖼️</Text>
          <Text style={styles.secondaryLabel}>Galeri</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={pickDocument}>
          <Text style={styles.secondaryIcon}>📄</Text>
          <Text style={styles.secondaryLabel}>Dosya</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('text')}>
          <Text style={styles.secondaryIcon}>✏️</Text>
          <Text style={styles.secondaryLabel}>Yaz</Text>
        </TouchableOpacity>

        {/* Şablonlar — hamburger */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowTemplates(true)}>
          <Text style={styles.secondaryIcon}>📋</Text>
          <Text style={styles.secondaryLabel}>Şablon</Text>
        </TouchableOpacity>
      </View>

      <TemplateSheet
        visible={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelect={(template) => {
          setText(template.content);
          setMode('text');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // ─── Choose ───
  chooseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  chooseTitle: { fontSize: 24, fontWeight: '800', color: colors.dark },
  chooseCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
  bigMicButton: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: colors.dark,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  bigMicEmoji: { fontSize: 56 },
  bigMicLabel: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: 6 },
  bigMicHint: { fontSize: 14, color: colors.muted },
  secondaryRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 32 },
  secondaryBtn: { alignItems: 'center', gap: 6, width: 64 },
  secondaryIcon: {
    fontSize: 24, width: 52, height: 52, lineHeight: 52, textAlign: 'center',
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  secondaryLabel: { fontSize: 12, fontWeight: '600', color: colors.text },

  // ─── Recording ───
  recordingContainer: { flex: 1, padding: 24 },
  cancelBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  cancelBtnText: { fontSize: 16, fontWeight: '600', color: colors.dark },
  recordingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  micPulse: {
    width: 160, height: 160, borderRadius: 80, backgroundColor: colors.danger + '12',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  micCircle: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.danger + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  micEmoji: { fontSize: 48 },
  timerText: {
    fontSize: 48, fontWeight: '300', color: colors.dark, fontVariant: ['tabular-nums'], marginBottom: 8,
  },
  listeningText: { fontSize: 22, fontWeight: '700', color: colors.dark, marginBottom: 4 },
  listeningHint: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: 40 },
  stopButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: colors.danger, paddingVertical: 18, borderRadius: 16, marginBottom: 16,
  },
  stopIcon: { width: 18, height: 18, borderRadius: 3, backgroundColor: '#FFF' },
  stopText: { fontSize: 18, fontWeight: '700', color: '#FFF' },

  // ─── Processing ───
  processingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  processingIconWrap: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  processingIcon: { fontSize: 36 },
  processingTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, marginBottom: 32 },
  stepsContainer: { width: '100%', gap: 20, marginBottom: 32 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.disabled,
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotDone: { borderColor: colors.dark, backgroundColor: colors.dark },
  stepDotActive: { borderColor: colors.dark },
  stepCheck: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  stepText: { fontSize: 16, color: colors.disabled, fontWeight: '500' },
  stepTextDone: { color: colors.dark, fontWeight: '600' },
  stepTextActive: { color: colors.dark, fontWeight: '600' },
  processingHint: { fontSize: 13, color: colors.muted, textAlign: 'center', marginBottom: 16 },
  cancelProcessingBtn: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24 },
  cancelProcessingText: { fontSize: 16, fontWeight: '600', color: colors.muted },

  // ─── Confirm (Rich) ───
  confirmHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  confirmHeaderBtn: { fontSize: 16, fontWeight: '600', color: colors.dark },
  confirmHeaderTitle: { fontSize: 17, fontWeight: '700', color: colors.dark },
  confirmScroll: { padding: 20, paddingBottom: 40 },
  sourceSection: { gap: 10 },
  sourceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  sourceIcon: { fontSize: 16 },
  sourceLabel: { fontSize: 13, fontWeight: '600', color: colors.text },
  transcriptBox: {
    backgroundColor: colors.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  transcriptText: { fontSize: 15, color: colors.text, lineHeight: 22, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1, marginBottom: 8 },
  fieldInput: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.dark,
  },
  fieldMulti: { minHeight: 100, textAlignVertical: 'top' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  priorityActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  priorityText: { fontSize: 13, fontWeight: '600', color: colors.text },
  priorityTextActive: { color: '#FFF' },
  labelsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  labelTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
  },
  labelText: { fontSize: 14, fontWeight: '500', color: colors.text },
  labelRemove: { fontSize: 18, fontWeight: '500', color: colors.muted, marginTop: -1 },

  // ─── Details & Insights ───
  detailsSection: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.dark, marginBottom: 12 },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  detailKey: { fontSize: 14, color: colors.muted, fontWeight: '500' },
  detailValue: { fontSize: 14, color: colors.dark, fontWeight: '600', flexShrink: 1, textAlign: 'right', maxWidth: '60%' },
  insightsSection: {
    backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  insightsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  insightsHint: { fontSize: 12, color: colors.muted },
  insightRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingVertical: 10, paddingHorizontal: 10, marginBottom: 6,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  insightRowSelected: {
    backgroundColor: colors.dark, borderColor: colors.dark,
  },
  insightCheck: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.disabled,
    alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0,
  },
  insightCheckSelected: { backgroundColor: '#FFF', borderColor: '#FFF' },
  insightCheckMark: { fontSize: 11, fontWeight: '800', color: colors.dark },
  insightText: { fontSize: 14, color: colors.text, lineHeight: 20, flex: 1 },
  insightTextSelected: { color: '#FFF' },

  // ─── Confirm Footer ───
  confirmFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36,
    backgroundColor: colors.bg,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  createBtn: {
    height: 56, backgroundColor: colors.dark, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  createBtnText: { fontSize: 17, fontWeight: '700', color: '#FFF' },

  // ─── Creating / Done / Error ───
  centeredContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  creatingText: { fontSize: 18, fontWeight: '600', color: colors.dark, marginTop: 20 },
  doneCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: colors.dark,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  doneCheck: { fontSize: 36, fontWeight: '700', color: '#FFF' },
  doneTitle: { fontSize: 20, fontWeight: '700', color: colors.dark, textAlign: 'center', marginBottom: 8 },
  doneSubtitle: { fontSize: 16, color: colors.text, marginBottom: 16 },
  doneVoiceBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.card, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    marginHorizontal: 24, marginBottom: 20, maxWidth: 320,
  },
  doneVoiceIcon: { fontSize: 18, marginTop: 1 },
  doneVoiceText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 22 },
  doneRedirect: { fontSize: 13, color: colors.muted },
  errorDetail: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  retryButton: { backgroundColor: colors.dark, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  retryText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

  // ─── Text Input ───
  textHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
  },
  textArea: { flex: 1, padding: 20, fontSize: 16, color: colors.dark, lineHeight: 24 },

  // ─── Purpose Ask ───
  purposeHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  purposeHeaderTitle: { fontSize: 16, fontWeight: '700', color: colors.dark },
  purposeSkip: { fontSize: 15, fontWeight: '600', color: colors.muted },
  purposeScroll: { padding: 24, alignItems: 'center' },
  purposeIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  purposeIcon: { fontSize: 28 },
  purposeSubtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  purposeTranscriptBox: {
    backgroundColor: colors.card, borderRadius: 12, padding: 12, width: '100%',
    borderWidth: 1, borderColor: colors.border, marginBottom: 16,
  },
  purposeTranscriptText: { fontSize: 13, color: colors.text, lineHeight: 18, fontStyle: 'italic' },
  purposeInput: {
    width: '100%', backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: colors.dark, minHeight: 90, textAlignVertical: 'top',
  },
  purposeFooter: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border,
  },
  purposeMicBtn: {
    width: 52, height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border,
  },
  purposeMicBtnActive: { backgroundColor: colors.danger + '15', borderColor: colors.danger },
  purposeMicBtnTranscribing: { backgroundColor: colors.border, borderColor: colors.border },
  purposeMicIcon: { fontSize: 22 },
  purposeMicSecs: { fontSize: 10, fontWeight: '700', color: colors.danger, marginTop: 2 },
  purposeSubmitBtn: {
    flex: 1, height: 52, backgroundColor: colors.dark, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  purposeSubmitBtnDisabled: { backgroundColor: colors.disabled },
  purposeSubmitText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
