import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getWorkspaceInfo } from '../lib/workspace';

interface Invitation {
  id: string;
  phone: string;
  status: string;
  created_at: string;
}

export default function InviteScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [sendMethod, setSendMethod] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [loading, setLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<Invitation[]>([]);

  useEffect(() => { loadPendingInvites(); }, []);

  const loadPendingInvites = async () => {
    const wsInfo = await getWorkspaceInfo();
    if (!wsInfo) return;

    const { data } = await supabase
      .from('invitations')
      .select('*')
      .eq('workspace_id', wsInfo.workspaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setPendingInvites(data || []);
  };

  const handleInvite = async () => {
    if (!phone.trim()) {
      Alert.alert('Hata', 'Telefon numarası girin');
      return;
    }

    setLoading(true);
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) throw new Error('Workspace bulunamadı');

      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const inviteLink = `https://voxi.com.tr/join/${inviteCode}`;

      const { error } = await supabase.from('invitations').insert({
        workspace_id: wsInfo.workspaceId,
        phone: phone,
        invite_code: inviteCode,
        status: 'pending',
        created_by: wsInfo.userId,
      });

      if (error) throw error;

      const message = `VOXI ekibine davetlisiniz! Katılmak için: ${inviteLink}`;
      const cleanPhone = phone.replace(/\D/g, '');

      if (sendMethod === 'whatsapp') {
        Linking.openURL(`https://wa.me/90${cleanPhone}?text=${encodeURIComponent(message)}`);
      } else {
        Linking.openURL(`sms:${phone}?body=${encodeURIComponent(message)}`);
      }

      Alert.alert('Başarılı', 'Davet gönderildi');
      setPhone('');
      loadPendingInvites();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelInvite = async (id: string) => {
    Alert.alert('Daveti İptal Et', 'Bu daveti iptal etmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'İptal Et', style: 'destructive',
        onPress: async () => {
          await supabase.from('invitations').delete().eq('id', id);
          loadPendingInvites();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ekibe Davet Et</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.label}>Telefon Numarası</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="0532 123 4567"
            placeholderTextColor="#8E8E93"
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Gönderim Yöntemi</Text>
          <View style={styles.methodContainer}>
            <TouchableOpacity
              style={[styles.methodButton, sendMethod === 'whatsapp' && styles.methodButtonActive]}
              onPress={() => setSendMethod('whatsapp')}
            >
              <Ionicons name="logo-whatsapp" size={20} color={sendMethod === 'whatsapp' ? '#FFFFFF' : '#1A1A1A'} />
              <Text style={[styles.methodText, sendMethod === 'whatsapp' && styles.methodTextActive]}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodButton, sendMethod === 'sms' && styles.methodButtonActive]}
              onPress={() => setSendMethod('sms')}
            >
              <Ionicons name="chatbubble-outline" size={20} color={sendMethod === 'sms' ? '#FFFFFF' : '#1A1A1A'} />
              <Text style={[styles.methodText, sendMethod === 'sms' && styles.methodTextActive]}>SMS</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.inviteButton, loading && styles.inviteButtonDisabled]}
            onPress={handleInvite}
            disabled={loading}
          >
            <Text style={styles.inviteButtonText}>{loading ? 'Gönderiliyor...' : 'Davet Gönder'}</Text>
          </TouchableOpacity>
        </View>

        {pendingInvites.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>Bekleyen Davetler</Text>
            {pendingInvites.map(invite => (
              <View key={invite.id} style={styles.inviteCard}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteContact}>{invite.phone}</Text>
                  <Text style={styles.inviteDate}>{new Date(invite.created_at).toLocaleDateString('tr-TR')}</Text>
                </View>
                <TouchableOpacity onPress={() => cancelInvite(invite.id)}>
                  <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
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
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#E5E5EA' },
  label: { fontSize: 14, fontWeight: '500', color: '#3C3C43', marginBottom: 8 },
  input: { backgroundColor: '#F5F3EF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1A1A1A' },
  methodContainer: { flexDirection: 'row', gap: 12 },
  methodButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 10, backgroundColor: '#F5F3EF' },
  methodButtonActive: { backgroundColor: '#1A1A1A' },
  methodText: { fontSize: 14, fontWeight: '500', color: '#1A1A1A' },
  methodTextActive: { color: '#FFFFFF' },
  inviteButton: { backgroundColor: '#1A1A1A', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  inviteButtonDisabled: { backgroundColor: '#C7C7CC' },
  inviteButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  pendingSection: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  inviteInfo: { flex: 1 },
  inviteContact: { fontSize: 15, fontWeight: '500', color: '#1A1A1A' },
  inviteDate: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
});
