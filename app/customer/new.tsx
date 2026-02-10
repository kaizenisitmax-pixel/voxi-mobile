import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';
import { processVoxiChat, processVision } from '../../lib/ai';
import { startRecording, stopRecording, transcribeAudio } from '../../utils/recording';
import { speakText } from '../../utils/audio';

interface CustomerForm {
  company_name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  tax_number: string;
  sector: string;
  notes: string;
}

export default function NewCustomerScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeMethod, setActiveMethod] = useState<'photo' | 'voice' | 'manual' | 'document' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [form, setForm] = useState<CustomerForm>({
    company_name: '', contact_person: '', phone: '', email: '',
    address: '', tax_number: '', sector: '', notes: '',
  });

  const handlePhoto = async () => {
    console.log('📸 Müşteri: Kamera açılıyor');
    setActiveMethod('photo');
    const result = await ImagePicker.launchCameraAsync({ 
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      quality: 0.8 
    });
    
    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      setStatusText('Görsel analiz ediliyor...');
      try {
        const visionResult = await processVision(result.assets[0].uri, 'business_card');
        console.log('🧠 AI Vision sonucu:', visionResult);
        
        if (visionResult?.result && typeof visionResult.result === 'object') {
          setForm(prev => ({ ...prev, ...visionResult.result as any }));
          await speakText('Kartvizit bilgileri başarıyla okundu. Lütfen kontrol edin.');
        }
        setStatusText('');
        setActiveMethod('manual');
      } catch (err) {
        console.error('❌ Görsel analiz hatası:', err);
        Alert.alert('Hata', 'Görsel analiz edilemedi');
        setActiveMethod(null);
      } finally {
        setLoading(false);
      }
    } else {
      setActiveMethod(null);
    }
  };

  const handleVoice = async () => {
    console.log('🎤 Müşteri: Sesli giriş başlatılıyor');
    setActiveMethod('voice');
    setStatusText('Basılı tutun ve konuşun');
  };

  const handleVoiceStart = async () => {
    try {
      console.log('🎤 Müşteri: Kayıt başlıyor');
      setIsRecording(true);
      setStatusText('Dinliyorum...');
      const recording = await startRecording();
      recordingRef.current = recording;
      console.log('🎤 Müşteri: Kayıt başladı');
    } catch (error) {
      console.error('❌ Müşteri: Kayıt başlatma hatası:', error);
      setIsRecording(false);
      setStatusText('');
      Alert.alert('Hata', 'Ses kaydı başlatılamadı');
    }
  };

  const handleVoiceStop = async () => {
    try {
      if (!recordingRef.current) {
        setIsRecording(false);
        setStatusText('');
        return;
      }

      console.log('🎤 Müşteri: Kayıt durduruluyor');
      setIsRecording(false);
      setIsAnalyzing(true);
      setStatusText('Analiz ediliyor...');

      const result = await stopRecording(recordingRef.current);
      recordingRef.current = null;

      if (!result?.uri) {
        setStatusText('');
        setIsAnalyzing(false);
        return;
      }

      const transcript = await transcribeAudio(result.uri);
      
      if (!transcript) {
        setStatusText('');
        setIsAnalyzing(false);
        return;
      }

      console.log('📝 Müşteri: Transcript:', transcript);

      // AI ile müşteri bilgilerini çıkar
      const { data, error } = await supabase.functions.invoke('ai-voice', {
        body: { 
          transcript,
          context: 'customer_extraction',
        }
      });

      if (error || !data) {
        throw new Error('AI analizi başarısız');
      }

      console.log('🧠 Müşteri AI sonucu:', data);

      if (data.data) {
        setForm(prev => ({ ...prev, ...data.data }));
        await speakText(data.response || 'Müşteri bilgileri kaydedildi');
      }

      setStatusText('');
      setIsAnalyzing(false);
      setActiveMethod('manual');
    } catch (error) {
      console.error('❌ Müşteri: Sesli işleme hatası:', error);
      Alert.alert('Hata', 'Sesli komut işlenemedi');
      setIsRecording(false);
      setIsAnalyzing(false);
      setStatusText('');
    }
  };

  const handleDocument = async () => {
    console.log('📁 Müşteri: Dosya seçici açılıyor');
    setActiveMethod('document');
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
    });

    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      setStatusText('Belge analiz ediliyor...');
      try {
        const visionResult = await processVision(result.assets[0].uri, 'document');
        console.log('🧠 Belge AI sonucu:', visionResult);
        
        if (visionResult?.result && typeof visionResult.result === 'object') {
          setForm(prev => ({ ...prev, ...visionResult.result as any }));
          await speakText('Belge bilgileri başarıyla okundu');
        }
        setStatusText('');
        setActiveMethod('manual');
      } catch (err) {
        console.error('❌ Belge analiz hatası:', err);
        Alert.alert('Hata', 'Belge analiz edilemedi');
        setActiveMethod(null);
      } finally {
        setLoading(false);
      }
    } else {
      setActiveMethod(null);
    }
  };

  const handleSave = async () => {
    if (!form.company_name && !form.contact_person) {
      Alert.alert('Hata', 'En az firma adı veya yetkili kişi gerekli');
      return;
    }
    setLoading(true);
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) throw new Error('Workspace bulunamadı');
      const { error } = await supabase.from('customers').insert({
        ...form,
        workspace_id: wsInfo.workspaceId,
        status: 'lead',
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      Alert.alert('Başarılı', 'Müşteri eklendi', [{ text: 'Tamam', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Müşteri Ekle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {!activeMethod && (
          <View style={styles.methodsContainer}>
            <Text style={styles.sectionTitle}>Nasıl eklemek istersin?</Text>
            
            <TouchableOpacity style={styles.methodCard} onPress={handlePhoto}>
              <View style={styles.methodIcon}><Ionicons name="camera-outline" size={28} color="#1A1A1A" /></View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Fotoğraf Çek</Text>
                <Text style={styles.methodDesc}>Kartvizit veya vergi levhası</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.methodCard} onPress={handleVoice}>
              <View style={styles.methodIcon}><Ionicons name="mic-outline" size={28} color="#1A1A1A" /></View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Sesle Gir</Text>
                <Text style={styles.methodDesc}>Firma bilgilerini sesle söyle</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.methodCard} onPress={handleDocument}>
              <View style={styles.methodIcon}><Ionicons name="document-outline" size={28} color="#1A1A1A" /></View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Dosya Yükle</Text>
                <Text style={styles.methodDesc}>PDF veya resim yükle</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.methodCard} onPress={() => setActiveMethod('manual')}>
              <View style={styles.methodIcon}><Ionicons name="create-outline" size={28} color="#1A1A1A" /></View>
              <View style={styles.methodContent}>
                <Text style={styles.methodTitle}>Manuel Gir</Text>
                <Text style={styles.methodDesc}>Formu kendin doldur</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        )}

        {activeMethod === 'voice' && !loading && !isAnalyzing && (
          <View style={styles.voiceContainer}>
            <Text style={styles.sectionTitle}>Sesli Giriş</Text>
            <Text style={styles.voiceInstruction}>
              {statusText || 'Butona basılı tutun ve firma bilgilerini söyleyin'}
            </Text>
            
            <View style={styles.voiceMicContainer}>
              <TouchableOpacity
                onPressIn={handleVoiceStart}
                onPressOut={handleVoiceStop}
                style={[styles.voiceMicButton, isRecording && styles.voiceMicButtonActive]}
                activeOpacity={0.8}
              >
                <Ionicons 
                  name={isRecording ? "mic" : "mic-outline"} 
                  size={48} 
                  color={isRecording ? "#FF3B30" : "#1A1A1A"} 
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.secondaryButton} 
              onPress={() => setActiveMethod(null)}
            >
              <Text style={styles.secondaryButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        )}

        {(loading || isAnalyzing) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A1A1A" />
            <Text style={styles.loadingText}>{statusText || 'İşleniyor...'}</Text>
          </View>
        )}

        {activeMethod === 'manual' && !loading && (
          <View style={styles.formContainer}>
            <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>

            {[
              { key: 'company_name', label: 'Firma Adı', placeholder: 'ABC Ltd.' },
              { key: 'contact_person', label: 'Yetkili Kişi', placeholder: 'Ahmet Yılmaz' },
              { key: 'phone', label: 'Telefon', placeholder: '0532 123 4567', keyboard: 'phone-pad' },
              { key: 'email', label: 'E-posta', placeholder: 'info@firma.com', keyboard: 'email-address' },
              { key: 'address', label: 'Adres', placeholder: 'Adres bilgisi', multiline: true },
              { key: 'tax_number', label: 'Vergi No', placeholder: '1234567890', keyboard: 'number-pad' },
              { key: 'sector', label: 'Sektör', placeholder: 'Isıtma, İnşaat, vb.' },
              { key: 'notes', label: 'Notlar', placeholder: 'Ek notlar...', multiline: true },
            ].map(field => (
              <View key={field.key} style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{field.label}</Text>
                <TextInput
                  style={[styles.input, field.multiline && styles.inputMultiline]}
                  value={form[field.key as keyof CustomerForm]}
                  onChangeText={(t) => setForm(p => ({ ...p, [field.key]: t }))}
                  placeholder={field.placeholder}
                  placeholderTextColor="#8E8E93"
                  keyboardType={field.keyboard as any || 'default'}
                  autoCapitalize={field.key === 'email' ? 'none' : 'sentences'}
                  multiline={field.multiline}
                />
              </View>
            ))}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setActiveMethod(null)}>
                <Text style={styles.secondaryButtonText}>Geri</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={loading}>
                <Text style={styles.primaryButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  content: { flex: 1 },
  methodsContainer: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 },
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  methodIcon: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#F5F3EF', alignItems: 'center', justifyContent: 'center' },
  methodContent: { flex: 1, marginLeft: 14 },
  methodTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  methodDesc: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  loadingContainer: { alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#8E8E93' },
  voiceContainer: { padding: 20, alignItems: 'center' },
  voiceInstruction: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 40 },
  voiceMicContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  voiceMicButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#F5F3EF', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E5E5EA' },
  voiceMicButtonActive: { backgroundColor: '#FFE5E5', borderColor: '#FF3B30' },
  formContainer: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#3C3C43', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1A1A1A' },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  buttonContainer: { flexDirection: 'row', gap: 12, marginTop: 24 },
  primaryButton: { flex: 1, backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  secondaryButtonText: { color: '#1A1A1A', fontSize: 16, fontWeight: '600' },
});
