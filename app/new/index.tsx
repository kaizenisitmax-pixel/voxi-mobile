import { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../../contexts/AuthContext';
import { useCards } from '../../hooks/useCards';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/colors';

type EntryMode = 'choose' | 'voice' | 'text' | 'processing' | 'confirm';
type SourceType = 'voice' | 'photo' | 'document' | 'text';

export default function NewEntryScreen() {
  const router = useRouter();
  const { membership } = useAuth();
  const { createCard } = useCards();
  const [mode, setMode] = useState<EntryMode>('choose');
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [text, setText] = useState('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [aiResult, setAiResult] = useState<{
    title: string;
    description: string;
    customerName: string | null;
    labels: string[];
    priority: string;
    isNewBusiness: boolean;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  // ─── Voice Recording ───
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Hata', 'Mikrofon izni gerekli');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      setMode('voice');
      setSourceType('voice');
    } catch (err) {
      Alert.alert('Hata', 'Ses kaydi baslatlamadi');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);

      if (uri) {
        processWithAI('Ses kaydi alindi. Islem bekleniyor...', 'voice');
      }
    } catch (err) {
      Alert.alert('Hata', 'Ses kaydi durdurulamadi');
    }
  };

  // ─── Photo Picker ───
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSourceType('photo');
      processWithAI('Fotograf secildi. Islem bekleniyor...', 'photo');
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Hata', 'Kamera izni gerekli');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setSourceType('photo');
      processWithAI('Fotograf cekildi. Islem bekleniyor...', 'photo');
    }
  };

  // ─── Document Picker ───
  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });

    if (!result.canceled && result.assets[0]) {
      setSourceType('document');
      processWithAI(`Dosya: ${result.assets[0].name}`, 'document');
    }
  };

  // ─── AI Processing ───
  const processWithAI = async (input: string, type: SourceType) => {
    setMode('processing');
    setProcessing(true);

    try {
      const response = await fetch('https://blckiefpjkuytdraokwn.supabase.co/functions/v1/ai-process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ input, type, workspace_id: membership?.workspace_id }),
      });

      if (response.ok) {
        const data = await response.json();
        setAiResult(data);
        setMode('confirm');
      } else {
        // Fallback: manual entry
        setAiResult({
          title: input.slice(0, 80),
          description: input,
          customerName: null,
          labels: [],
          priority: 'normal',
          isNewBusiness: true,
        });
        setMode('confirm');
      }
    } catch {
      setAiResult({
        title: input.slice(0, 80),
        description: input,
        customerName: null,
        labels: [],
        priority: 'normal',
        isNewBusiness: true,
      });
      setMode('confirm');
    } finally {
      setProcessing(false);
    }
  };

  const handleTextSubmit = () => {
    if (!text.trim()) return;
    setSourceType('text');
    processWithAI(text.trim(), 'text');
  };

  // ─── Create Card ───
  const handleCreateCard = async () => {
    if (!aiResult) return;
    setProcessing(true);

    let customerId: string | undefined;

    if (aiResult.customerName) {
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .eq('workspace_id', membership?.workspace_id)
        .ilike('company_name', aiResult.customerName)
        .limit(1)
        .maybeSingle();

      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCust } = await supabase
          .from('customers')
          .insert({
            workspace_id: membership?.workspace_id,
            company_name: aiResult.customerName,
            status: 'lead',
          })
          .select('id')
          .single();
        customerId = newCust?.id;
      }
    }

    const result = await createCard({
      title: aiResult.title,
      description: aiResult.description,
      source_type: sourceType,
      customer_id: customerId,
      priority: aiResult.priority,
      labels: aiResult.labels,
      ai_summary: aiResult.description,
    });

    setProcessing(false);

    if (result?.card) {
      router.replace(`/card/${result.card.id}`);
    } else {
      Alert.alert('Hata', 'Kart olusturulamadi');
    }
  };

  // ─── RENDER ───

  if (mode === 'processing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.dark} />
          <Text style={styles.processingText}>AI analiz ediyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'confirm' && aiResult) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmHeader}>
          <TouchableOpacity onPress={() => { setMode('choose'); setAiResult(null); }}>
            <Text style={styles.cancelText}>Iptal</Text>
          </TouchableOpacity>
          <Text style={styles.confirmTitle}>Yeni Kart</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView contentContainerStyle={styles.confirmContent}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>BASLIK</Text>
            <TextInput
              style={styles.fieldInput}
              value={aiResult.title}
              onChangeText={t => setAiResult({ ...aiResult, title: t })}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ACIKLAMA</Text>
            <TextInput
              style={[styles.fieldInput, styles.fieldMulti]}
              value={aiResult.description}
              onChangeText={t => setAiResult({ ...aiResult, description: t })}
              multiline
            />
          </View>

          {aiResult.customerName && (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>MUSTERI</Text>
              <View style={styles.customerPreview}>
                <Text style={styles.customerPreviewText}>{aiResult.customerName}</Text>
                <Text style={styles.customerNewBadge}>Yeni</Text>
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ONCELIK</Text>
            <View style={styles.priorityRow}>
              {['low', 'normal', 'high', 'urgent'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, aiResult.priority === p && styles.priorityActive]}
                  onPress={() => setAiResult({ ...aiResult, priority: p })}
                >
                  <Text style={[styles.priorityText, aiResult.priority === p && styles.priorityTextActive]}>
                    {p === 'low' ? 'Dusuk' : p === 'normal' ? 'Normal' : p === 'high' ? 'Yuksek' : 'Acil'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createBtn, processing && styles.createBtnDisabled]}
            onPress={handleCreateCard}
            disabled={processing}
          >
            <Text style={styles.createBtnText}>
              {processing ? 'Olusturuluyor...' : 'Kart Olustur'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (mode === 'voice') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <View style={styles.recordingPulse}>
            <Text style={styles.recordingIcon}>🎤</Text>
          </View>
          <Text style={styles.recordingText}>Dinliyorum...</Text>
          <Text style={styles.recordingHint}>Telefonu kapattiktan sonra aklinizdakileri anlatin.</Text>

          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
            <Text style={styles.stopText}>Kaydi Bitir</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { recording?.stopAndUnloadAsync(); setRecording(null); setMode('choose'); }}>
            <Text style={styles.cancelSmall}>Iptal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (mode === 'text') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.textHeader}>
          <TouchableOpacity onPress={() => setMode('choose')}>
            <Text style={styles.cancelText}>Iptal</Text>
          </TouchableOpacity>
          <Text style={styles.textTitle}>Not Yaz</Text>
          <TouchableOpacity onPress={handleTextSubmit} disabled={!text.trim()}>
            <Text style={[styles.sendLabel, !text.trim() && { color: colors.disabled }]}>Gonder</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.textArea}
          placeholder="Musteri ile gorusme notlari, yapilacak isler..."
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

  // ─── CHOOSE MODE ───
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.chooseHeader}>
        <Text style={styles.chooseTitle}>Yeni Ekle</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Kapat</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.options}>
        <TouchableOpacity style={styles.optionCard} onPress={startRecording}>
          <Text style={styles.optionIcon}>🎤</Text>
          <Text style={styles.optionTitle}>Ses Kaydi</Text>
          <Text style={styles.optionDesc}>Konusarak not al</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={takePhoto}>
          <Text style={styles.optionIcon}>📷</Text>
          <Text style={styles.optionTitle}>Fotograf Cek</Text>
          <Text style={styles.optionDesc}>Kamera ile cek</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={pickImage}>
          <Text style={styles.optionIcon}>🖼️</Text>
          <Text style={styles.optionTitle}>Galeriden Sec</Text>
          <Text style={styles.optionDesc}>WhatsApp SS, e-posta vb.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={pickDocument}>
          <Text style={styles.optionIcon}>📄</Text>
          <Text style={styles.optionTitle}>Dosya Ekle</Text>
          <Text style={styles.optionDesc}>PDF, Word, Excel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionCard} onPress={() => setMode('text')}>
          <Text style={styles.optionIcon}>✏️</Text>
          <Text style={styles.optionTitle}>Manuel Yaz</Text>
          <Text style={styles.optionDesc}>Metin ile not al</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  processingText: { fontSize: 18, fontWeight: '600', color: colors.dark, marginTop: 24 },

  chooseHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
  },
  chooseTitle: { fontSize: 22, fontWeight: '800', color: colors.dark },
  cancelText: { fontSize: 16, color: colors.dark, fontWeight: '500' },

  options: { paddingHorizontal: 24, gap: 12 },
  optionCard: {
    backgroundColor: colors.card, borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  optionIcon: { fontSize: 28 },
  optionTitle: { fontSize: 17, fontWeight: '700', color: colors.dark },
  optionDesc: { fontSize: 13, color: colors.muted },

  // Voice
  recordingPulse: {
    width: 120, height: 120, borderRadius: 60, backgroundColor: colors.danger + '15',
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  recordingIcon: { fontSize: 48 },
  recordingText: { fontSize: 22, fontWeight: '700', color: colors.dark, marginBottom: 8 },
  recordingHint: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 32 },
  stopBtn: {
    backgroundColor: colors.danger, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 12, marginBottom: 16,
  },
  stopText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cancelSmall: { fontSize: 14, color: colors.muted },

  // Text
  textHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.card,
  },
  textTitle: { fontSize: 17, fontWeight: '700', color: colors.dark },
  sendLabel: { fontSize: 16, fontWeight: '600', color: colors.dark },
  textArea: {
    flex: 1, padding: 20, fontSize: 16, color: colors.dark, lineHeight: 24,
  },

  // Confirm
  confirmHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  confirmTitle: { fontSize: 17, fontWeight: '700', color: colors.dark },
  confirmContent: { padding: 20, gap: 20 },
  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  fieldInput: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: colors.dark,
  },
  fieldMulti: { minHeight: 80, textAlignVertical: 'top' },
  customerPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  customerPreviewText: { fontSize: 16, fontWeight: '600', color: colors.dark, flex: 1 },
  customerNewBadge: { fontSize: 12, fontWeight: '600', color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  priorityActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  priorityText: { fontSize: 13, fontWeight: '600', color: colors.text },
  priorityTextActive: { color: '#FFFFFF' },
  createBtn: {
    height: 52, backgroundColor: colors.dark, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  createBtnDisabled: { backgroundColor: colors.disabled },
  createBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
