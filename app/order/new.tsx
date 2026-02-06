import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';
import { processVoxiChat } from '../../lib/ai';

type OrderSource = 'trendyol' | 'hepsiburada' | 'whatsapp' | 'phone' | 'website' | 'other';

interface OrderForm {
  source: OrderSource | null;
  customer_name: string;
  customer_phone: string;
  product: string;
  quantity: string;
  price: string;
  address: string;
  notes: string;
}

export default function NewOrderScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'source' | 'input' | 'form'>('source');
  const [form, setForm] = useState<OrderForm>({
    source: null, customer_name: '', customer_phone: '',
    product: '', quantity: '1', price: '', address: '', notes: '',
  });

  const sources = [
    { id: 'trendyol', label: 'Trendyol', icon: 'cart-outline' },
    { id: 'hepsiburada', label: 'Hepsiburada', icon: 'cart-outline' },
    { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
    { id: 'phone', label: 'Telefon', icon: 'call-outline' },
    { id: 'website', label: 'Web Sitesi', icon: 'globe-outline' },
    { id: 'other', label: 'Diğer', icon: 'ellipsis-horizontal' },
  ];

  const handleSourceSelect = (source: OrderSource) => {
    setForm(prev => ({ ...prev, source }));
    setStep('input');
  };

  const handlePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setLoading(true);
      try {
        const response = await processVoxiChat(
          'Bu sipariş ekran görüntüsünden bilgileri JSON olarak çıkar: customer_name, customer_phone, product, quantity, price, address',
          [{ type: 'image', uri: result.assets[0].uri, name: 'order' }]
        );
        if (response?.message) {
          try {
            const parsed = JSON.parse(response.message);
            setForm(prev => ({ ...prev, ...parsed }));
          } catch { /* parse edilemezse devam */ }
        }
        setStep('form');
      } catch (err) {
        Alert.alert('Hata', 'Görsel analiz edilemedi');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSave = async () => {
    if (!form.customer_name || !form.product) {
      Alert.alert('Hata', 'Müşteri adı ve ürün gerekli');
      return;
    }

    setLoading(true);
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) throw new Error('Workspace bulunamadı');

      const { error } = await supabase.from('tasks').insert({
        title: `Sipariş: ${form.customer_name} - ${form.product}`,
        workspace_id: wsInfo.workspaceId,
        team_id: wsInfo.teamId,
        assigned_to: wsInfo.fullName,
        created_by: wsInfo.fullName,
        status: 'open',
        priority: 'normal',
        what_description: `Kaynak: ${form.source}\nÜrün: ${form.product}\nAdet: ${form.quantity}\nFiyat: ${form.price}`,
        where_location: form.address,
        why_purpose: form.notes,
      });

      if (error) throw error;
      Alert.alert('Başarılı', 'Sipariş kaydedildi', [{ text: 'Tamam', onPress: () => router.back() }]);
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
        <Text style={styles.headerTitle}>Sipariş Gir</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {step === 'source' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sipariş Nereden?</Text>
            <View style={styles.sourceGrid}>
              {sources.map(source => (
                <TouchableOpacity key={source.id} style={styles.sourceCard} onPress={() => handleSourceSelect(source.id as OrderSource)}>
                  <Ionicons name={source.icon as any} size={28} color="#1A1A1A" />
                  <Text style={styles.sourceLabel}>{source.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {step === 'input' && !loading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nasıl girmek istersin?</Text>

            <TouchableOpacity style={styles.inputMethodCard} onPress={handlePhoto}>
              <View style={styles.inputMethodIcon}><Ionicons name="camera-outline" size={28} color="#1A1A1A" /></View>
              <View style={styles.inputMethodContent}>
                <Text style={styles.inputMethodTitle}>Ekran Görüntüsü</Text>
                <Text style={styles.inputMethodDesc}>Sipariş ekranının fotoğrafını çek</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.inputMethodCard} onPress={() => setStep('form')}>
              <View style={styles.inputMethodIcon}><Ionicons name="create-outline" size={28} color="#1A1A1A" /></View>
              <View style={styles.inputMethodContent}>
                <Text style={styles.inputMethodTitle}>Manuel Gir</Text>
                <Text style={styles.inputMethodDesc}>Formu kendin doldur</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1A1A1A" />
            <Text style={styles.loadingText}>Analiz ediliyor...</Text>
          </View>
        )}

        {step === 'form' && !loading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sipariş Detayları</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Müşteri Adı *</Text>
              <TextInput style={styles.input} value={form.customer_name} onChangeText={t => setForm(p => ({ ...p, customer_name: t }))} placeholder="Ahmet Yılmaz" placeholderTextColor="#8E8E93" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefon</Text>
              <TextInput style={styles.input} value={form.customer_phone} onChangeText={t => setForm(p => ({ ...p, customer_phone: t }))} placeholder="0532 123 4567" placeholderTextColor="#8E8E93" keyboardType="phone-pad" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Ürün *</Text>
              <TextInput style={styles.input} value={form.product} onChangeText={t => setForm(p => ({ ...p, product: t }))} placeholder="Ürün adı" placeholderTextColor="#8E8E93" />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Adet</Text>
                <TextInput style={styles.input} value={form.quantity} onChangeText={t => setForm(p => ({ ...p, quantity: t }))} keyboardType="number-pad" />
              </View>
              <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                <Text style={styles.inputLabel}>Fiyat</Text>
                <TextInput style={styles.input} value={form.price} onChangeText={t => setForm(p => ({ ...p, price: t }))} placeholder="1.500 TL" placeholderTextColor="#8E8E93" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Teslimat Adresi</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={form.address} onChangeText={t => setForm(p => ({ ...p, address: t }))} placeholder="Adres" placeholderTextColor="#8E8E93" multiline />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notlar</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={form.notes} onChangeText={t => setForm(p => ({ ...p, notes: t }))} placeholder="Ek notlar..." placeholderTextColor="#8E8E93" multiline />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Kaydet</Text>
            </TouchableOpacity>
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
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 },
  sourceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sourceCard: { width: '47%', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  sourceLabel: { fontSize: 14, fontWeight: '500', color: '#1A1A1A', marginTop: 8 },
  inputMethodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  inputMethodIcon: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#F5F3EF', alignItems: 'center', justifyContent: 'center' },
  inputMethodContent: { flex: 1, marginLeft: 14 },
  inputMethodTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  inputMethodDesc: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  loadingContainer: { alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#8E8E93' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#3C3C43', marginBottom: 6 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1A1A1A' },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  saveButton: { backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
