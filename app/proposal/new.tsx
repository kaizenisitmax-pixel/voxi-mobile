import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';

interface Customer {
  id: string;
  company_name: string;
  contact_person: string;
}

interface ProposalItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export default function NewProposalScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [items, setItems] = useState<ProposalItem[]>([]);
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', unit_price: '' });

  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    const wsInfo = await getWorkspaceInfo();
    if (!wsInfo) return;
    const { data } = await supabase
      .from('customers')
      .select('id, company_name, contact_person')
      .eq('workspace_id', wsInfo.workspaceId)
      .order('company_name');
    setCustomers(data || []);
  };

  const addItem = () => {
    if (!newItem.name || !newItem.unit_price) {
      Alert.alert('Hata', 'Ürün adı ve fiyat gerekli');
      return;
    }
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      name: newItem.name,
      quantity: parseInt(newItem.quantity) || 1,
      unit_price: parseFloat(newItem.unit_price) || 0,
    }]);
    setNewItem({ name: '', quantity: '1', unit_price: '' });
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const getTotal = () => items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

  const handleSave = async () => {
    if (!selectedCustomer) { Alert.alert('Hata', 'Müşteri seçin'); return; }
    if (items.length === 0) { Alert.alert('Hata', 'En az bir ürün ekleyin'); return; }

    setLoading(true);
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) throw new Error('Workspace bulunamadı');

      // Teklif olarak görev oluştur
      const { error } = await supabase.from('tasks').insert({
        title: `Teklif: ${selectedCustomer.company_name || selectedCustomer.contact_person}`,
        workspace_id: wsInfo.workspaceId,
        team_id: wsInfo.teamId,
        assigned_to: wsInfo.fullName,
        created_by: wsInfo.fullName,
        status: 'open',
        priority: 'normal',
        what_description: `Toplam: ${getTotal().toLocaleString('tr-TR')} ₺\nÜrünler:\n${items.map(i => `- ${i.name}: ${i.quantity} x ${i.unit_price.toLocaleString('tr-TR')} ₺`).join('\n')}`,
        why_purpose: notes,
        customer_id: selectedCustomer.id,
      });

      if (error) throw error;
      Alert.alert('Başarılı', 'Teklif oluşturuldu', [{ text: 'Tamam', onPress: () => router.back() }]);
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
        <Text style={styles.headerTitle}>Teklif Hazırla</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveText, loading && { opacity: 0.5 }]}>Kaydet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Müşteri Seçimi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteri</Text>
          <TouchableOpacity style={styles.selectCard} onPress={() => setShowCustomerModal(true)}>
            <Ionicons name="person-outline" size={20} color="#8E8E93" />
            <Text style={selectedCustomer ? styles.selectTextSelected : styles.selectText}>
              {selectedCustomer ? selectedCustomer.company_name || selectedCustomer.contact_person : 'Müşteri seç...'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Ürünler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ürün / Hizmetler</Text>
          
          {items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDetail}>{item.quantity} x {item.unit_price.toLocaleString('tr-TR')} ₺</Text>
              </View>
              <Text style={styles.itemTotal}>{(item.quantity * item.unit_price).toLocaleString('tr-TR')} ₺</Text>
              <TouchableOpacity onPress={() => removeItem(item.id)}>
                <Ionicons name="close-circle" size={22} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addItemForm}>
            <TextInput style={[styles.input, { flex: 2 }]} value={newItem.name} onChangeText={t => setNewItem(p => ({ ...p, name: t }))} placeholder="Ürün adı" placeholderTextColor="#8E8E93" />
            <TextInput style={[styles.input, { width: 60 }]} value={newItem.quantity} onChangeText={t => setNewItem(p => ({ ...p, quantity: t }))} placeholder="Adet" placeholderTextColor="#8E8E93" keyboardType="number-pad" />
            <TextInput style={[styles.input, { flex: 1 }]} value={newItem.unit_price} onChangeText={t => setNewItem(p => ({ ...p, unit_price: t }))} placeholder="Fiyat" placeholderTextColor="#8E8E93" keyboardType="numeric" />
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Toplam */}
        {items.length > 0 && (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Toplam</Text>
            <Text style={styles.totalAmount}>{getTotal().toLocaleString('tr-TR')} ₺</Text>
          </View>
        )}

        {/* Geçerlilik */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Geçerlilik Süresi</Text>
          <View style={styles.validityRow}>
            <TextInput style={[styles.input, { width: 80 }]} value={validDays} onChangeText={setValidDays} keyboardType="number-pad" />
            <Text style={styles.validityText}>gün</Text>
          </View>
        </View>

        {/* Notlar */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notlar</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} value={notes} onChangeText={setNotes} placeholder="Teklif notları..." placeholderTextColor="#8E8E93" multiline />
        </View>
      </ScrollView>

      {/* Müşteri Seçim Modal */}
      <Modal visible={showCustomerModal} animationType="slide">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Müşteri Seç</Text>
            <TouchableOpacity onPress={() => setShowCustomerModal(false)}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={customers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.customerItem} onPress={() => { setSelectedCustomer(item); setShowCustomerModal(false); }}>
                <Text style={styles.customerName}>{item.company_name || item.contact_person}</Text>
                {item.company_name && item.contact_person && <Text style={styles.customerContact}>{item.contact_person}</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyText}>Henüz müşteri yok</Text></View>}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF9F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  content: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  selectCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5EA', gap: 10 },
  selectText: { flex: 1, fontSize: 16, color: '#8E8E93' },
  selectTextSelected: { flex: 1, fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  itemDetail: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginRight: 12 },
  addItemForm: { flexDirection: 'row', gap: 8, marginTop: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#1A1A1A' },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  addButton: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 12, marginBottom: 24 },
  totalLabel: { fontSize: 16, color: '#FFFFFF' },
  totalAmount: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  validityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  validityText: { fontSize: 16, color: '#3C3C43' },
  modalContainer: { flex: 1, backgroundColor: '#FAF9F6' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  customerItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F3EF' },
  customerName: { fontSize: 16, fontWeight: '500', color: '#1A1A1A' },
  customerContact: { fontSize: 14, color: '#8E8E93', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyText: { fontSize: 15, color: '#8E8E93' },
});
