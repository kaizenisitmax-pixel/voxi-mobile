import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSec: '#3C3C43',
  textTer: '#8E8E93',
  border: '#F2F2F7',
  iconColor: '#3C3C43',
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
};

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [stakeholders, setStakeholders] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    // Müşteri bilgisi
    const { data: cust } = await supabase
      .from('customers').select('*').eq('id', id).single();
    setCustomer(cust);

    // Bağlı görevler
    const { data: taskList } = await supabase
      .from('tasks').select('id, title, priority, status, due_date')
      .eq('customer_id', id).order('created_at', { ascending: false });
    setTasks(taskList || []);

    // Bağlı paydaşlar
    const { data: stakeList } = await supabase
      .from('stakeholders').select('id, name, role_title, phone')
      .eq('customer_id', id);
    setStakeholders(stakeList || []);

    // Notlar
    const { data: noteList } = await supabase
      .from('card_notes').select('*')
      .eq('card_type', 'customer').eq('card_id', id)
      .order('created_at', { ascending: false });
    setNotes(noteList || []);

    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // İletişim bilgisi düzenleme
  const editField = (field: string, label: string, currentValue: string) => {
    Alert.prompt(label, `Yeni ${label.toLowerCase()} girin`, async (text) => {
      if (text?.trim()) {
        await supabase.from('customers').update({ [field]: text.trim() }).eq('id', id);
        fetchData();
      }
    }, 'plain-text', currentValue || '');
  };

  // Not ekleme
  const addNote = () => {
    Alert.prompt('Not Ekle', 'Notunuzu yazın', async (text) => {
      if (text?.trim()) {
        await supabase.from('card_notes').insert({
          card_type: 'customer', card_id: id,
          content: text.trim(), created_by: 'Volkan',
        });
        fetchData();
      }
    });
  };

  // Müşteri silme
  const deleteCustomer = () => {
    Alert.alert('Müşteriyi Sil', `${customer?.company_name} silinecek. Emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          await supabase.from('customers').delete().eq('id', id);
          router.back();
        },
      },
    ]);
  };

  const callPhone = () => {
    if (customer?.phone) {
      Linking.openURL(`tel:${customer.phone}`);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#F2F2F7', text: '#1A1A1A', label: 'Aktif' };
      case 'lead': return { bg: '#F5F3EF', text: '#1A1A1A', label: 'Lead' };
      case 'inactive': return { bg: '#F2F2F7', text: '#8E8E93', label: 'Pasif' };
      case 'lost': return { bg: '#F2F2F7', text: '#8E8E93', label: 'Kayıp' };
      default: return { bg: '#F2F2F7', text: '#8E8E93', label: 'Bilinmiyor' };
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'normal': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  if (loading || !customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#1A1A1A" size="large" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const badge = getStatusBadge(customer.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: C.surface,
        borderBottomWidth: 0.5,
        borderBottomColor: C.border,
      }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 16, color: '#1A1A1A' }}>Geri</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '600', color: C.text }}>Müşteri Kartı</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
        {/* BÖLÜM 1 - MÜŞTERİ BAŞLIĞI */}
        <View style={{ backgroundColor: C.surface, padding: 20, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            {/* Avatar */}
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: C.avatarBg,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 20, fontWeight: '700', color: C.avatarText }}>
                {customer.company_name.substring(0, 2).toUpperCase()}
              </Text>
            </View>

            {/* Firma adı + badge */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.text }}>
                  {customer.company_name}
                </Text>
                <View style={{
                  backgroundColor: badge.bg,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 6,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: badge.text }}>
                    {badge.label.toUpperCase()}
                  </Text>
                </View>
              </View>
              {customer.contact_person && (
                <Text style={{ fontSize: 15, color: C.textTer, marginTop: 4 }}>
                  {customer.contact_person}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* BÖLÜM 2 - İLETİŞİM */}
        <View style={{ backgroundColor: C.surface, paddingTop: 20, paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.textTer, letterSpacing: 0.5, marginBottom: 12 }}>İLETİŞİM</Text>

          {/* Telefon */}
          <TouchableOpacity onPress={() => editField('phone', 'Telefon', customer.phone || '')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Text style={{ fontSize: 15 }}>📞</Text>
                <Text style={{ fontSize: 15, color: C.text }}>
                  {customer.phone || 'Telefon ekle'}
                </Text>
              </View>
              {customer.phone && (
                <TouchableOpacity
                  onPress={callPhone}
                  style={{
                    backgroundColor: '#1A1A1A',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 6,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>Ara</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>
          <View style={{ height: 0.5, backgroundColor: C.border }} />

          {/* E-posta */}
          <TouchableOpacity onPress={() => editField('email', 'E-posta', customer.email || '')}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 }}>
              <Text style={{ fontSize: 15 }}>✉️</Text>
              <Text style={{ fontSize: 15, color: C.text }}>
                {customer.email || 'E-posta ekle'}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={{ height: 0.5, backgroundColor: C.border }} />

          {/* Adres */}
          <TouchableOpacity onPress={() => editField('address', 'Adres', customer.address || '')}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12 }}>
              <Text style={{ fontSize: 15 }}>📍</Text>
              <Text style={{ fontSize: 15, color: C.text, flex: 1 }}>
                {customer.address || 'Adres ekle'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* BÖLÜM 3 - FİRMA BİLGİLERİ */}
        <View style={{ backgroundColor: C.surface, paddingTop: 20, paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.textTer, letterSpacing: 0.5, marginBottom: 12 }}>FİRMA BİLGİLERİ</Text>

          <TouchableOpacity onPress={() => editField('sector', 'Sektör', customer.sector || '')}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
              <Text style={{ fontSize: 15, color: C.textSec }}>Sektör:</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: C.text }}>
                {customer.sector || 'Belirtilmedi'}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={{ height: 0.5, backgroundColor: C.border }} />

          <TouchableOpacity onPress={() => editField('tax_number', 'Vergi No', customer.tax_number || '')}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 }}>
              <Text style={{ fontSize: 15, color: C.textSec }}>Vergi No:</Text>
              <Text style={{ fontSize: 15, fontWeight: '500', color: C.text }}>
                {customer.tax_number || '—'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* BÖLÜM 4 - GÖREVLER */}
        <View style={{ backgroundColor: C.surface, paddingTop: 20, paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.textTer, letterSpacing: 0.5, marginBottom: 12 }}>
            GÖREVLER ({tasks.length})
          </Text>

          {tasks.length === 0 ? (
            <Text style={{ fontSize: 14, color: C.textTer, textAlign: 'center', paddingVertical: 16 }}>
              Henüz görev bağlı değil
            </Text>
          ) : (
            tasks.map((task, index) => (
              <View key={task.id}>
                {index > 0 && <View style={{ height: 0.5, backgroundColor: C.border, marginVertical: 8 }} />}
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}
                  onPress={() => router.push(`/task/${task.id}`)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, color: C.text }} numberOfLines={1}>
                      {task.title}
                    </Text>
                    {task.due_date && (
                      <Text style={{ fontSize: 13, color: C.textTer, marginTop: 2 }}>
                        {new Date(task.due_date).toLocaleDateString('tr-TR')}
                      </Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 20, marginLeft: 10 }}>
                    {getPriorityIcon(task.priority)}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* BÖLÜM 5 - PAYDAŞLAR */}
        <View style={{ backgroundColor: C.surface, paddingTop: 20, paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.textTer, letterSpacing: 0.5, marginBottom: 12 }}>
            PAYDAŞLAR ({stakeholders.length})
          </Text>

          {stakeholders.length === 0 ? (
            <Text style={{ fontSize: 14, color: C.textTer, textAlign: 'center', paddingVertical: 16 }}>
              Henüz paydaş eklenmedi
            </Text>
          ) : (
            stakeholders.map((stake, index) => (
              <View key={stake.id}>
                {index > 0 && <View style={{ height: 0.5, backgroundColor: C.border, marginVertical: 8 }} />}
                <View style={{ paddingVertical: 8 }}>
                  <Text style={{ fontSize: 15, color: C.text, fontWeight: '500' }}>
                    {stake.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: C.textTer, marginTop: 2 }}>
                    {stake.role_title || 'Rol belirtilmedi'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* BÖLÜM 6 - NOTLAR */}
        <View style={{ backgroundColor: C.surface, padding: 20, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: C.textTer, letterSpacing: 0.5 }}>NOTLAR</Text>
            <TouchableOpacity onPress={addNote}>
              <Ionicons name="add" size={22} color={C.text} />
            </TouchableOpacity>
          </View>

          {notes.length === 0 ? (
            <Text style={{ fontSize: 14, color: C.textTer, textAlign: 'center', paddingVertical: 16 }}>
              Henüz not eklenmedi
            </Text>
          ) : (
            notes.map((note, i) => (
              <View key={note.id}>
                {i > 0 && <View style={{ height: 0.5, backgroundColor: C.border, marginVertical: 12 }} />}
                <Text style={{ fontSize: 15, color: C.text, lineHeight: 22 }}>{note.content}</Text>
                <Text style={{ fontSize: 12, color: C.textTer, marginTop: 4 }}>
                  {note.created_by} · {new Date(note.created_at).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* BÖLÜM 7 - ARAÇLAR */}
        <View style={{ backgroundColor: C.surface, paddingTop: 20, paddingHorizontal: 20, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: C.textTer, letterSpacing: 0.5, marginBottom: 12 }}>ARAÇLAR</Text>

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
            onPress={() => Alert.alert('Yakında', 'AI Özet özelliği yakında eklenecek.')}
          >
            <Ionicons name="sparkles-outline" size={22} color={C.iconColor} style={{ marginRight: 12, width: 24 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: C.text }}>AI Özet</Text>
              <Text style={{ fontSize: 13, color: C.textTer, marginTop: 2 }}>VOXI ile özetle</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
          <View style={{ height: 0.5, backgroundColor: C.border }} />

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
            onPress={() => Alert.alert('Yakında', 'Yıldızlı özelliği yakında eklenecek.')}
          >
            <Ionicons name="star-outline" size={22} color={C.iconColor} style={{ marginRight: 12, width: 24 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: C.text }}>Yıldızla</Text>
              <Text style={{ fontSize: 13, color: C.textTer, marginTop: 2 }}>Önemli müşteriler</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
          <View style={{ height: 0.5, backgroundColor: C.border }} />

          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}
            onPress={() => Alert.alert('Yakında', 'Hatırlatma özelliği yakında eklenecek.')}
          >
            <Ionicons name="alarm-outline" size={22} color={C.iconColor} style={{ marginRight: 12, width: 24 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: C.text }}>Hatırlatma Kur</Text>
              <Text style={{ fontSize: 13, color: C.textTer, marginTop: 2 }}>Bildirim ayarla</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* BÖLÜM 8 - TEHLİKELİ ALAN */}
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <TouchableOpacity onPress={deleteCustomer}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#FF3B30' }}>Müşteriyi Sil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },
  loadingText: { fontSize: 15, color: '#8E8E93', textAlign: 'center', marginTop: 16 },
});
