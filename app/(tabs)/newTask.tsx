import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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
import { completeTask, processCommand, saveTask } from '../../lib/ai';

const C = {
  bg: '#FAFAF8',
  surface: '#FFFFFF',
  input: '#F0EDE8',
  text: '#212121',
  textSec: '#8E8E93',
  textTer: '#AEAEB2',
  accent: '#25D366',
  border: '#E8E6E1',
  danger: '#FF3B30',
};

const AVATAR_COLORS: Record<string, string> = {
  Ahmet: '#E53935',
  Mehmet: '#FB8C00',
  Ayşe: '#1E88E5',
  Ali: '#8E24AA',
  Volkan: '#43A047',
  default: '#757575',
};

const TEAM = ['Ahmet', 'Mehmet', 'Ayşe', 'Ali', 'Volkan'];

export default function NewTaskScreen() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const inputRef = useRef<TextInput>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationInterval = useRef<any>(null);

  const [attachments, setAttachments] = useState<any[]>([]);
  const [quickMessages, setQuickMessages] = useState<string[]>([]);
  const [showQuickMessages, setShowQuickMessages] = useState(false);

  useEffect(() => {
    loadQuickMessages();
  }, []);

  async function loadQuickMessages() {
    try {
      const stored = await AsyncStorage.getItem('kalfa_quick_messages');
      if (stored) setQuickMessages(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }

  function toggleMember(name: string) {
    setSelectedMembers(prev =>
      prev.includes(name)
        ? prev.filter(m => m !== name)
        : [...prev, name]
    );
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera izni verilmedi');
      return;
    }

    Alert.alert('Fotoğraf', 'Nereden eklemek istersin?', [
      {
        text: 'Kamera',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: 'images',
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setAttachments((prev) => [...prev, { type: 'photo', uri: result.assets[0].uri }]);
          }
        },
      },
      {
        text: 'Galeri',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            quality: 0.7,
            allowsMultipleSelection: true,
            selectionLimit: 5,
          });
          if (!result.canceled) {
            const newPhotos = result.assets.map((a) => ({ type: 'photo', uri: a.uri }));
            setAttachments((prev) => [...prev, ...newPhotos]);
          }
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  }

  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Mikrofon izni verilmedi');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
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
      
      const { recording: rec } = await Audio.Recording.createAsync(recordingOptions);
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Ses kaydı başlatılamadı', err);
    }
  }

  async function stopRecording() {
    if (!recording) return;
    clearInterval(durationInterval.current);
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setAttachments((prev) => [...prev, { type: 'voice', uri, duration: recordingDuration }]);
      }
    } catch (err) {
      console.error('Ses kaydı durdurulamadı', err);
    }
    setRecording(null);
    setRecordingDuration(0);
  }

  function handleVoice() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  function formatDuration(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  async function pickFile() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        setAttachments((prev) => [
          ...prev,
          {
            type: 'file',
            uri: result.assets[0].uri,
            name: result.assets[0].name,
            size: result.assets[0].size,
          },
        ]);
      }
    } catch (err) {
      console.error('Dosya seçilemedi', err);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSend() {
    if (!input.trim() && attachments.length === 0) return;
    setLoading(true);
    try {
      const command = await processCommand(input.trim());
      if (command && command.action === 'create_task') {
        // Eğer UI'dan kişi seçildiyse, onu kullan
        if (selectedMembers.length > 0) {
          command.assignee = selectedMembers;
        }
        const success = await saveTask(command);
        if (success) {
          const assigneeText = Array.isArray(command.assignee) 
            ? command.assignee.join(', ') 
            : command.assignee;
          Alert.alert('✅ Görev Oluşturuldu', `${command.title}\n→ ${assigneeText}`, [
            {
              text: 'Tamam',
              onPress: () => {
                setInput('');
                setSelectedMembers([]);
                setAttachments([]);
                router.navigate('/(tabs)');
              },
            },
          ]);
        }
      } else if (command && command.action === 'complete_task') {
        await completeTask(command.task_title_hint);
        Alert.alert('✅ Tamamlandı', command.task_title_hint, [
          { text: 'Tamam', onPress: () => { setInput(''); router.navigate('/(tabs)'); } },
        ]);
      } else {
        Alert.alert('⚠️', 'Komut anlaşılamadı.\nÖrnek: "Ali yarın montaj yapsın"');
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  function getInitials(name: string) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)')}>
            <Ionicons name="close" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yeni Görev</Text>
          <TouchableOpacity
            onPress={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || loading}
          >
            <Text
              style={[
                styles.sendHeaderBtn,
                ((!input.trim() && attachments.length === 0) || loading) && { opacity: 0.4 },
              ]}
            >
              Gönder
            </Text>
          </TouchableOpacity>
        </View>

        {/* VOXI Banner */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/voxi')}
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#F5F3EF', borderRadius: 10,
            padding: 12, marginHorizontal: 16, marginTop: 8, marginBottom: 12,
            gap: 10,
          }}
        >
          <View style={{
            width: 28, height: 28, borderRadius: 14,
            backgroundColor: '#1A1A1A',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
          </View>
          <Text style={{ fontSize: 14, color: '#3C3C43', flex: 1 }}>
            VOXI'ye söyleyerek de görev oluşturabilirsin
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
        </TouchableOpacity>

        {/* Person Selection */}
        <View style={styles.personSection}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={styles.toLabel}>Kime:</Text>
            {selectedMembers.length > 1 && (
              <View style={{ backgroundColor: '#25D366', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                  Grup ({selectedMembers.length})
                </Text>
              </View>
            )}
          </View>
          {selectedMembers.length > 0 && (
            <TouchableOpacity onPress={() => setSelectedMembers([])} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color="#AEAEB2" />
            </TouchableOpacity>
          )}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.personScroll}
          >
            {TEAM.map((name) => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.personChip,
                  selectedMembers.includes(name) && styles.personChipActive,
                ]}
                onPress={() => toggleMember(name)}
              >
                <View style={[
                  styles.chipAvatar,
                  selectedMembers.includes(name)
                    ? { backgroundColor: '#25D366' }
                    : { backgroundColor: AVATAR_COLORS[name] || AVATAR_COLORS.default },
                ]}>
                  {selectedMembers.includes(name) ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.chipAvatarText}>{getInitials(name)}</Text>
                  )}
                </View>
                <Text style={[
                  styles.chipName,
                  selectedMembers.includes(name) && styles.chipNameActive,
                ]}>
                  {name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Messages */}
        {selectedMembers.length > 0 && quickMessages.length > 0 && (
          <ScrollView
            horizontal
            style={styles.quickMsgBox}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickMsgContent}
          >
            {quickMessages.map((msg, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickMsg}
                onPress={() => setInput(input.trim() + ' ' + msg)}
              >
                <Text style={styles.quickMsgText}>{msg}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {selectedMembers.length > 0 && quickMessages.length === 0 && (
          <View style={styles.emptyQuick}>
            <Text style={styles.emptyQuickText}>Henüz hazır mesaj yok</Text>
            <Text style={styles.emptyQuickHint}>Ayarlar → Hazır Mesajlar'dan ekle</Text>
          </View>
        )}

        {/* Recording Indicator */}
        {isRecording && (
          <View style={styles.recordingBar}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              Kayıt yapılıyor... {formatDuration(recordingDuration)}
            </Text>
            <TouchableOpacity onPress={stopRecording} style={styles.stopBtn}>
              <Text style={styles.stopBtnText}>Durdur</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <ScrollView
            horizontal
            style={styles.attachPreview}
            contentContainerStyle={styles.attachPreviewContent}
            showsHorizontalScrollIndicator={false}
          >
            {attachments.map((att, i) => (
              <View key={i} style={styles.attachItem}>
                {att.type === 'photo' && (
                  <Image source={{ uri: att.uri }} style={styles.attachThumb} />
                )}
                {att.type === 'voice' && (
                  <View style={styles.voiceThumb}>
                    <Ionicons name="mic" size={24} color={C.textSec} />
                    <Text style={styles.voiceDur}>{formatDuration(att.duration)}</Text>
                  </View>
                )}
                {att.type === 'file' && (
                  <View style={styles.fileThumb}>
                    <Ionicons name="document" size={24} color={C.textSec} />
                    <Text style={styles.fileName} numberOfLines={1}>
                      {att.name}
                    </Text>
                  </View>
                )}
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeAttachment(i)}>
                  <Ionicons name="close" size={16} color={C.surface} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Message Input */}
        <View style={styles.inputSection}>
          <TextInput
            ref={inputRef}
            style={styles.mainInput}
            value={input}
            onChangeText={setInput}
            placeholder={
              selectedMembers.length > 0
                ? `${selectedMembers.join(', ')}'e ne yazmak istiyorsun?`
                : 'Kimi seç, ne istediğini yaz...'
            }
            placeholderTextColor={C.textTer}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <View style={styles.attachRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={pickPhoto}>
              <Ionicons name="camera-outline" size={24} color={C.textSec} />
              <Text style={styles.attachLabel}>Fotoğraf</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachBtn, isRecording && styles.attachBtnRecording]}
              onPress={handleVoice}
            >
              <Ionicons
                name={isRecording ? 'stop-circle' : 'mic-outline'}
                size={24}
                color={isRecording ? C.danger : C.textSec}
              />
              <Text style={[styles.attachLabel, isRecording && { color: C.danger }]}>
                {isRecording ? 'Durdur' : 'Ses'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={pickFile}>
              <Ionicons name="attach-outline" size={24} color={C.textSec} />
              <Text style={styles.attachLabel}>Dosya</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.attachBtn, showQuickMessages && styles.quickMsgActive]}
              onPress={() => setShowQuickMessages(!showQuickMessages)}
            >
              <Ionicons name="flash-outline" size={24} color={C.textSec} />
              <Text
                style={[styles.attachLabel, showQuickMessages && { color: C.accent, fontWeight: '700' }]}
              >
                Hazır
              </Text>
            </TouchableOpacity>
          </View>

          {showQuickMessages && (
            <View style={styles.quickMsgBox}>
              {quickMessages.length === 0 && (
                <View style={styles.emptyQuick}>
                  <Text style={styles.emptyQuickText}>Henüz hazır mesaj yok</Text>
                  <Text style={styles.emptyQuickHint}>Ayarlar → Hazır Mesajlar'dan ekle</Text>
                </View>
              )}
              {quickMessages.map((msg, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickMsgBtn}
                  onPress={() => {
                    setInput((prev) => {
                      const base = selectedMembers.length > 0 ? selectedMembers.join(', ') + ' ' : '';
                      return base + msg;
                    });
                    setShowQuickMessages(false);
                  }}
                >
                  <Text style={styles.quickMsgText}>{msg}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.sendBtn,
              ((!input.trim() && attachments.length === 0) || loading) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={(!input.trim() && attachments.length === 0) || loading}
          >
            {loading ? (
              <ActivityIndicator color={C.surface} />
            ) : (
              <Text style={styles.sendBtnText}>Görev Oluştur</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  sendHeaderBtn: { fontSize: 16, fontWeight: '700', color: C.accent },
  personSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  toLabel: { fontSize: 15, color: C.textSec, marginRight: 8 },
  personScroll: { flexDirection: 'row', gap: 8, paddingRight: 20 },
  personChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    paddingLeft: 4,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: C.input,
  },
  personChipActive: { backgroundColor: C.accent, opacity: 0.2, borderWidth: 1.5, borderColor: C.accent },
  chipAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  chipAvatarText: { color: C.surface, fontSize: 13, fontWeight: '700' },
  chipName: { fontSize: 14, fontWeight: '600', color: C.text },
  chipNameActive: { color: C.accent },
  recordingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    gap: 10,
  },
  recordingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger },
  recordingText: { flex: 1, fontSize: 14, color: C.danger, fontWeight: '600' },
  stopBtn: { backgroundColor: C.danger, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  stopBtnText: { color: C.surface, fontSize: 13, fontWeight: '700' },
  attachPreview: { maxHeight: 90, backgroundColor: C.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  attachPreviewContent: { padding: 10, gap: 10 },
  attachItem: { position: 'relative' },
  attachThumb: { width: 70, height: 70, borderRadius: 10 },
  voiceThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: C.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceDur: { fontSize: 11, color: C.textSec, marginTop: 4 },
  fileThumb: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: C.input,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  fileName: { fontSize: 9, color: C.textSec, marginTop: 4, textAlign: 'center' },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: { flex: 1, padding: 20, backgroundColor: C.bg },
  mainInput: { fontSize: 18, color: C.text, lineHeight: 26, flex: 1 },
  bottomBar: {
    paddingHorizontal: 20,
    paddingBottom: 34,
    backgroundColor: C.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  attachRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 14 },
  attachBtn: { alignItems: 'center', gap: 4 },
  attachBtnRecording: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 8 },
  attachLabel: { fontSize: 11, color: C.textSec },
  quickMsgActive: { backgroundColor: C.input, borderRadius: 12, padding: 8 },
  sendBtn: { backgroundColor: C.accent, borderRadius: 24, padding: 16, alignItems: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: C.surface, fontSize: 16, fontWeight: '700' },
  quickMsgBox: { maxHeight: 60, paddingVertical: 10 },
  quickMsgContent: { padding: 10, gap: 8 },
  quickMsg: {
    backgroundColor: C.input,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickMsgBtn: {
    backgroundColor: C.input,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 10,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickMsgText: { fontSize: 13, color: C.text, fontWeight: '600' },
  emptyQuick: { width: '100%', alignItems: 'center', paddingVertical: 12 },
  emptyQuickText: { fontSize: 14, color: C.textSec },
  emptyQuickHint: { fontSize: 12, color: C.textTer, marginTop: 4 },
});
