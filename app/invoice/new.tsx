import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';

type TransactionType = 'invoice' | 'payment' | 'balance';
type PaymentMethod = 'cash' | 'transfer' | 'card' | 'check';

export default function NewInvoiceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
  const [notes, setNotes] = useState('');

  const transactionTypes = [
    { id: 'invoice', label: 'Fatura Kes', icon: 'document-text-outline', desc: 'Yeni fatura oluştur' },
    { id: 'payment', label: 'Tahsilat Kaydet', icon: 'card-outline', desc: 'Ödeme girişi yap' },
    { id: 'balance', label: 'Bakiye Sorgula', icon: 'calculator-outline', desc: 'Müşteri bakiyesi' },
  ];

  const paymentMethods = [
    { id: 'cash', label: 'Nakit', icon: 'cash-outline' },
    { id: 'transfer', label: 'Havale/EFT', icon: 'swap-horizontal-outline' },
    { id: 'card', label: 'Kredi Kartı', icon: 'card-outline' },
    { id: 'check', label: 'Çek', icon: 'document-outline' },
  ];

  const handleSave = async () => {
    if (!customerSearch) { Alert.alert('Hata', 'Müşteri girin'); return; }
    if (!amount && transactionType !== 'balance') { Alert.alert('Hata', 'Tutar girin'); return; }

    setLoading(true);
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) throw new Error('Workspace bulunamadı');

      // Görev olarak kaydet
      const { error } = await supabase.from('tasks').insert({
        title: `${transactionType === 'invoice' ? 'Fatura' : 'Tahsilat'}: ${customerSearch} - ${parseFloat(amount).toLocaleString('tr-TR')} ₺`,
        workspace_id: wsInfo.workspaceId,
        team_id: wsInfo.teamId,
        assigned_to: wsInfo.fullName,
        created_by: wsInfo.fullName,
        status: 'done',
        priority: 'normal',
        what_description: `İşlem: ${transactionType}\nTutar: ${amount} ₺\nÖdeme: ${paymentMethod}`,
        why_purpose: notes,
      });

      if (error) throw error;
      Alert.alert('Başarılı', 'Kayıt oluşturuldu', [{ text: 'Tamam', onPress: () => router.back() }]);
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
        <Text style={styles.headerTitle}>Fatura / Tahsilat</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {!transactionType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ne yapmak istiyorsun?</Text>
            {transactionTypes.map(type => (
              <TouchableOpacity key={type.id} style={styles.typeCard} onPress={() => setTransactionType(type.id as TransactionType)}>
                <View style={styles.typeIcon}><Ionicons name={type.icon as any} size={24} color="#1A1A1A" /></View>
                <View style={styles.typeContent}>
                  <Text style={styles.typeTitle}>{type.label}</Text>
                  <Text style={styles.typeDesc}>{type.desc}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {transactionType && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Müşteri</Text>
              <TextInput style={styles.input} value={customerSearch} onChangeText={setCustomerSearch} placeholder="Müşteri adı..." placeholderTextColor="#8E8E93" />
            </View>

            {transactionType !== 'balance' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tutar</Text>
                <View style={styles.amountContainer}>
                  <TextInput style={styles.amountInput} value={amount} onChangeText={setAmount} placeholder="0" placeholderTextColor="#C7C7CC" keyboardType="numeric" />
                  <Text style={styles.amountCurrency}>₺</Text>
                </View>
              </View>
            )}

            {transactionType === 'payment' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Ödeme Yöntemi</Text>
                <View style={styles.methodGrid}>
                  {paymentMethods.map(method => (
                    <TouchableOpacity key={method.id} style={[styles.methodCard, paymentMethod === method.id && styles.methodCardActive]} onPress={() => setPaymentMethod(method.id as PaymentMethod)}>
                      <Ionicons name={method.icon as any} size={22} color={paymentMethod === method.id ? '#FFFFFF' : '#1A1A1A'} />
                      <Text style={[styles.methodLabel, paymentMethod === method.id && styles.methodLabelActive]}>{method.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notlar</Text>
              <TextInput style={[styles.input, styles.inputMultiline]} value={notes} onChangeText={setNotes} placeholder="Açıklama..." placeholderTextColor="#8E8E93" multiline />
            </View>

            <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]} onPress={handleSave} disabled={loading}>
              <Text style={styles.saveButtonText}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </>
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
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  typeIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F5F3EF', alignItems: 'center', justifyContent: 'center' },
  typeContent: { flex: 1, marginLeft: 14 },
  typeTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  typeDesc: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1A1A1A' },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  amountContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 14 },
  amountInput: { flex: 1, fontSize: 32, fontWeight: '700', color: '#1A1A1A', paddingVertical: 16 },
  amountCurrency: { fontSize: 24, fontWeight: '600', color: '#8E8E93' },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  methodCard: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA' },
  methodCardActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  methodLabel: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  methodLabelActive: { color: '#FFFFFF' },
  saveButton: { backgroundColor: '#1A1A1A', paddingVertical: 16, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  saveButtonDisabled: { backgroundColor: '#C7C7CC' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
