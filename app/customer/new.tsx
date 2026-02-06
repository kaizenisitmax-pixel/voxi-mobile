import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';
import { processVoxiChat } from '../../lib/ai';

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
  const [activeMethod, setActiveMethod] = useState<'photo' | 'voice' | 'manual' | null>(null);
  const [form, setForm] = useState<CustomerForm>({
    company_name: '', contact_person: '', phone: '', email: '',
    address: '', tax_number: '', sector: '', notes: '',
  });

  const handlePhoto = async () => {
    setActiveMethod('photo');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      try {
        const response = await processVoxiChat(
          'Bu görseldeki firma/kişi bilgilerini JSON olarak çıkar: company_name, contact_person, phone, email, address, tax_number, sector',
          [{ type: 'image', uri: result.assets[0].uri, name: 'photo' }]
        );
        if (response?.message) {
          try {
            const parsed = JSON.parse(response.message);
            setForm(prev => ({ ...prev, ...parsed }));
          } catch {
            Alert.alert('Bilgi', response.message);
          }
        }
        setActiveMethod('manual');
      } catch (err) {
        Alert.alert('Hata', 'Görsel analiz edilemedi');
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

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A1A1A" />
            <Text style={styles.loadingText}>İşleniyor...</Text>
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
