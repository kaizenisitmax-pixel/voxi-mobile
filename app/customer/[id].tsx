import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { speakText } from '@/utils/audio';
import { startRecording, stopRecording } from '@/utils/recording';
import { analyzeCustomerCommand } from '@/lib/ai';

interface Customer {
  id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  tax_office: string | null;
  tax_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string;
  workspace_id: string;
}

interface Transaction {
  id: string;
  transaction_type: 'debit' | 'credit';
  amount: number;
  description: string;
  transaction_date: string;
  created_at: string;
}

interface Log {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_name: string;
}

export default function CustomerDetail() {
  const { id, taskId } = useLocalSearchParams<{ id: string; taskId?: string }>();
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'detail' | 'accounting'>('detail');

  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  // Transaction modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    type: 'credit' as 'debit' | 'credit',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Voice & AI states
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const recordingRef = useRef<any>(null);

  // Fetch customer data
  const fetchCustomer = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCustomer(data);
      setEditValues(data);
    } catch (error) {
      console.error('❌ Müşteri fetch hatası:', error);
      Alert.alert('Hata', 'Müşteri bilgileri yüklenemedi');
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_transactions')
        .select('*')
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('❌ İşlemler fetch hatası:', error);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('customer_logs')
        .select('*, user:profiles(full_name)')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      const formattedLogs = (data || []).map((log: any) => ({
        ...log,
        user_name: log.user?.full_name || 'Bilinmeyen',
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error('❌ Loglar fetch hatası:', error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchCustomer(), fetchTransactions(), fetchLogs()]);
      setLoading(false);
    };
    loadData();
  }, [id]);

  // Link customer to task if taskId is provided
  useEffect(() => {
    const linkCustomerToTask = async () => {
      if (taskId && customer) {
        try {
          console.log('🔗 Müşteriyi göreve bağlıyorum:', { taskId, customerId: id });
          const { error } = await supabase
            .from('tasks')
            .update({ 
              customer_id: id, 
              customer_name: customer.company_name 
            })
            .eq('id', taskId);

          if (error) throw error;
          console.log('✅ Müşteri göreve bağlandı');
        } catch (error) {
          console.error('❌ Müşteri bağlama hatası:', error);
        }
      }
    };
    linkCustomerToTask();
  }, [taskId, customer?.company_name]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('customer-' + id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'customers',
          filter: `id=eq.${id}`,
        },
        () => {
          console.log('🔄 Müşteri realtime güncelleme');
          fetchCustomer();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      console.log('👁️ Müşteri kartı odaklandı, yenileniyor');
      fetchCustomer();
    }, [id])
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchCustomer(), fetchTransactions(), fetchLogs()]);
    setRefreshing(false);
  };

  // Add transaction
  const handleAddTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.description) {
      Alert.alert('Hata', 'Tutar ve açıklama gereklidir');
      return;
    }

    try {
      const { error } = await supabase.from('customer_transactions').insert({
        customer_id: id,
        transaction_type: transactionForm.type,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description,
        transaction_date: transactionForm.date,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      Alert.alert('Başarılı', 'İşlem eklendi');
      setShowTransactionModal(false);
      setTransactionForm({
        type: 'credit',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      await fetchTransactions();
    } catch (error: any) {
      console.error('❌ İşlem ekleme hatası:', error);
      Alert.alert('Hata', error.message);
    }
  };

  // Auto-save field
  const saveField = async (field: string, value: any) => {
    try {
      console.log('💾 Alan kaydediliyor:', { field, value });
      const { error } = await supabase
        .from('customers')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('system_logs').insert({
        entity_type: 'customer',
        entity_id: id,
        action: 'update',
        details: { field, old_value: customer?.[field as keyof Customer], new_value: value },
      });

      console.log('✅ Alan kaydedildi:', field);
      await fetchCustomer();
      setEditingField(null);
    } catch (error) {
      console.error('❌ Kaydetme hatası:', error);
      Alert.alert('Hata', 'Kaydetme başarısız');
    }
  };

  // Voice input
  const handleVoiceInput = async () => {
    try {
      if (isRecording) {
        // Stop recording
        console.log('🎤 Müşteri: Kayıt durduruluyor');
        setIsRecording(false);
        setStatusText('Analiz ediliyor...');

        const result = await stopRecording(recordingRef.current);
        recordingRef.current = null;

        if (!result?.uri || !result?.transcript) {
          setStatusText('');
          return;
        }

        console.log('📝 Müşteri transcript:', result.transcript);
        setIsAnalyzing(true);

        // AI analysis
        const aiResult = await analyzeCustomerCommand(result.transcript, customer || {});
        console.log('🧠 Müşteri AI sonuç:', JSON.stringify(aiResult));

        // Auto-save updates
        if (aiResult.updates && Object.keys(aiResult.updates).length > 0) {
          const validUpdates: any = {};
          Object.entries(aiResult.updates).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              validUpdates[key] = value;
            }
          });

          if (Object.keys(validUpdates).length > 0) {
            const { error } = await supabase
              .from('customers')
              .update(validUpdates)
              .eq('id', id);

            if (error) throw error;

            console.log('💾 Müşteri güncellendi:', validUpdates);

            await supabase.from('system_logs').insert({
              entity_type: 'customer',
              entity_id: id,
              action: 'voice_update',
              details: { transcript: result.transcript, updates: validUpdates },
            });

            await fetchCustomer();
          }
        }

        // TTS response
        const response = aiResult.spoken_response || 'Tamam';
        console.log('🔊 Müşteri TTS:', response);
        await speakText(response);

        setStatusText('');
        setIsAnalyzing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Start recording
        console.log('🎤 Müşteri: Kayıt başlıyor');
        setIsRecording(true);
        setStatusText('Dinliyorum...');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const recording = await startRecording();
        recordingRef.current = recording;
        console.log('🎤 Müşteri: Kayıt başladı');
      }
    } catch (error) {
      console.error('❌ Ses hatası:', error);
      setIsRecording(false);
      setIsAnalyzing(false);
      setStatusText('');
      Alert.alert('Hata', 'Ses kaydı başarısız');
    }
  };

  // Photo analysis
  const handleTakePhoto = async () => {
    try {
      console.log('📸 Müşteri: Kamera açılıyor');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
      });

      if (result.canceled) return;

      console.log('📸 Base64 boyut:', result.assets[0].base64?.length);
      setIsAnalyzing(true);
      setStatusText('Fotoğraf analiz ediliyor...');

      // AI Vision analysis
      const { analyzeImageForCard } = await import('@/lib/ai');
      const analysis = await analyzeImageForCard(
        result.assets[0].base64!,
        'customer',
        customer || {}
      );

      console.log('🧠 Müşteri görsel analiz:', analysis);

      // Auto-save updates
      if (analysis.updates && Object.keys(analysis.updates).length > 0) {
        const validUpdates: any = {};
        Object.entries(analysis.updates).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            validUpdates[key] = value;
          }
        });

        if (Object.keys(validUpdates).length > 0) {
          const { error } = await supabase
            .from('customers')
            .update(validUpdates)
            .eq('id', id);

          if (error) throw error;

          console.log('💾 Müşteri fotoğraftan güncellendi:', validUpdates);

          await supabase.from('system_logs').insert({
            entity_type: 'customer',
            entity_id: id,
            action: 'photo_analysis',
            details: { updates: validUpdates },
          });

          await fetchCustomer();
        }
      }

      // TTS response
      const response = analysis.spoken_response || 'Bilgiler güncellendi';
      console.log('🔊 Müşteri görsel TTS:', response);
      await speakText(response);

      setStatusText('');
      setIsAnalyzing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Fotoğraf hatası:', error);
      setIsAnalyzing(false);
      setStatusText('');
      Alert.alert('Hata', 'Fotoğraf analizi başarısız');
    }
  };

  // File upload
  const handleFileUpload = async () => {
    try {
      console.log('📁 Müşteri: Dosya seçici açılıyor');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
      });

      if (result.canceled) return;

      console.log('📁 Dosya boyut:', result.assets[0].size);
      setIsAnalyzing(true);
      setStatusText('Dosya analiz ediliyor...');

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('📁 Base64 boyut:', base64.length);

      // AI analysis
      const { analyzeImageForCard } = await import('@/lib/ai');
      const analysis = await analyzeImageForCard(
        base64,
        'customer',
        customer || {}
      );

      console.log('🧠 Müşteri dosya analiz:', analysis);

      // Auto-save updates
      if (analysis.updates && Object.keys(analysis.updates).length > 0) {
        const validUpdates: any = {};
        Object.entries(analysis.updates).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            validUpdates[key] = value;
          }
        });

        if (Object.keys(validUpdates).length > 0) {
          const { error } = await supabase
            .from('customers')
            .update(validUpdates)
            .eq('id', id);

          if (error) throw error;

          console.log('💾 Müşteri dosyadan güncellendi:', validUpdates);

          await supabase.from('system_logs').insert({
            entity_type: 'customer',
            entity_id: id,
            action: 'file_analysis',
            details: { updates: validUpdates },
          });

          await fetchCustomer();
        }
      }

      // TTS response
      const response = analysis.spoken_response || 'Bilgiler güncellendi';
      console.log('🔊 Müşteri dosya TTS:', response);
      await speakText(response);

      setStatusText('');
      setIsAnalyzing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Dosya hatası:', error);
      setIsAnalyzing(false);
      setStatusText('');
      Alert.alert('Hata', 'Dosya analizi başarısız');
    }
  };

  // Calculate balance
  const calculateBalance = () => {
    const totalDebit = transactions
      .filter((t) => t.transaction_type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalCredit = transactions
      .filter((t) => t.transaction_type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalDebit,
      totalCredit,
      balance: totalDebit - totalCredit,
    };
  };

  const balance = calculateBalance();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F3EF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F3EF', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#8E8E93' }}>Müşteri bulunamadı</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F3EF' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Alert.alert('Düzenle', 'Düzenleme özelliği yakında')}>
            <Ionicons name="create-outline" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>
          {customer.company_name}
        </Text>
        <Text style={{ fontSize: 14, color: '#8E8E93' }}>
          {new Date(customer.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} oluşturuldu
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' }}>
        <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 12 }}>
          Firma bilgilerini hızlıca girin
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={handleVoiceInput}
            disabled={isAnalyzing}
            style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA', paddingVertical: 16, alignItems: 'center' }}
          >
            <Ionicons name="mic" size={28} color={isRecording ? '#FF3B30' : '#1A1A1A'} />
            <Text style={{ fontSize: 12, color: '#3C3C43', marginTop: 6 }}>Sesle Gir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleTakePhoto}
            disabled={isAnalyzing}
            style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA', paddingVertical: 16, alignItems: 'center' }}
          >
            <Ionicons name="camera" size={28} color="#1A1A1A" />
            <Text style={{ fontSize: 12, color: '#3C3C43', marginTop: 6 }}>Fotoğraf Çek</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleFileUpload}
            disabled={isAnalyzing}
            style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA', paddingVertical: 16, alignItems: 'center' }}
          >
            <Ionicons name="cloud-upload-outline" size={28} color="#1A1A1A" />
            <Text style={{ fontSize: 12, color: '#3C3C43', marginTop: 6 }}>Dosya Yükle</Text>
          </TouchableOpacity>
        </View>

        {(isAnalyzing || statusText) && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 8 }}>
            {isAnalyzing && <ActivityIndicator size="small" color="#8E8E93" />}
            <Text style={{ fontSize: 13, color: '#8E8E93' }}>{statusText}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E5EA' }}>
        <TouchableOpacity
          onPress={() => setActiveTab('detail')}
          style={{ flex: 1, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: activeTab === 'detail' ? '#1A1A1A' : 'transparent' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: activeTab === 'detail' ? '#1A1A1A' : '#8E8E93', textAlign: 'center' }}>
            Detay
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('accounting')}
          style={{ flex: 1, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: activeTab === 'accounting' ? '#1A1A1A' : 'transparent' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: activeTab === 'accounting' ? '#1A1A1A' : '#8E8E93', textAlign: 'center' }}>
            Muhasebe
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'detail' ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A1A1A" />}
        >
          {/* Contact Info */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>İletişim Bilgileri</Text>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Yetkili Kişi</Text>
              <TextInput
                value={editingField === 'contact_name' ? editValues.contact_name : customer.contact_name || '—'}
                onChangeText={(text) => setEditValues({ ...editValues, contact_name: text })}
                onFocus={() => setEditingField('contact_name')}
                onBlur={() => saveField('contact_name', editValues.contact_name)}
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'contact_name' ? '#1A1A1A' : 'transparent' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Telefon</Text>
              <TextInput
                value={editingField === 'phone' ? editValues.phone : customer.phone || '—'}
                onChangeText={(text) => setEditValues({ ...editValues, phone: text })}
                onFocus={() => setEditingField('phone')}
                onBlur={() => saveField('phone', editValues.phone)}
                keyboardType="phone-pad"
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'phone' ? '#1A1A1A' : 'transparent' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>E-posta</Text>
              <TextInput
                value={editingField === 'email' ? editValues.email : customer.email || '—'}
                onChangeText={(text) => setEditValues({ ...editValues, email: text })}
                onFocus={() => setEditingField('email')}
                onBlur={() => saveField('email', editValues.email)}
                keyboardType="email-address"
                autoCapitalize="none"
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'email' ? '#1A1A1A' : 'transparent' }}
              />
            </View>
          </View>

          {/* Tax Info */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>Vergi Bilgileri</Text>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Vergi Dairesi</Text>
              <TextInput
                value={editingField === 'tax_office' ? editValues.tax_office : customer.tax_office || '—'}
                onChangeText={(text) => setEditValues({ ...editValues, tax_office: text })}
                onFocus={() => setEditingField('tax_office')}
                onBlur={() => saveField('tax_office', editValues.tax_office)}
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'tax_office' ? '#1A1A1A' : 'transparent' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Vergi Numarası</Text>
              <TextInput
                value={editingField === 'tax_number' ? editValues.tax_number : customer.tax_number || '—'}
                onChangeText={(text) => setEditValues({ ...editValues, tax_number: text })}
                onFocus={() => setEditingField('tax_number')}
                onBlur={() => saveField('tax_number', editValues.tax_number)}
                keyboardType="number-pad"
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'tax_number' ? '#1A1A1A' : 'transparent' }}
              />
            </View>
          </View>

          {/* Addresses */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>Adresler</Text>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Fatura Adresi</Text>
              <TextInput
                value={editingField === 'billing_address' ? editValues.billing_address : customer.billing_address || '—'}
                onChangeText={(text) => setEditValues({ ...editValues, billing_address: text })}
                onFocus={() => setEditingField('billing_address')}
                onBlur={() => saveField('billing_address', editValues.billing_address)}
                multiline
                numberOfLines={3}
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'billing_address' ? '#1A1A1A' : 'transparent' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Sevk Adresi</Text>
              <TextInput
                value={editingField === 'shipping_address' ? editValues.shipping_address : customer.shipping_address || '—'}
                onChangeText={(text) => setEditValues({ ...editValues, shipping_address: text })}
                onFocus={() => setEditingField('shipping_address')}
                onBlur={() => saveField('shipping_address', editValues.shipping_address)}
                multiline
                numberOfLines={3}
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'shipping_address' ? '#1A1A1A' : 'transparent' }}
              />
            </View>
          </View>

          {/* Notes */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>Notlar</Text>
            <TextInput
              value={editingField === 'notes' ? editValues.notes : customer.notes || 'Not ekle...'}
              onChangeText={(text) => setEditValues({ ...editValues, notes: text })}
              onFocus={() => setEditingField('notes')}
              onBlur={() => saveField('notes', editValues.notes)}
              multiline
              numberOfLines={4}
              style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'notes' ? '#1A1A1A' : 'transparent' }}
            />
          </View>

          {/* Logs */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 12 }}>Sistem Logları</Text>
            {logs.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 20 }}>
                Henüz log kaydı yok
              </Text>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>{log.action}</Text>
                    <Text style={{ fontSize: 12, color: '#8E8E93' }}>
                      {new Date(log.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, color: '#3C3C43' }}>{log.user_name}</Text>
                  {log.details && (
                    <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }} numberOfLines={2}>
                      {JSON.stringify(log.details)}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A1A1A" />}
        >
          {/* Summary Cards */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Alacak</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A' }}>
                ₺{balance.totalDebit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            <View style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 }}>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Verecek</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: '#1A1A1A' }}>
                ₺{balance.totalCredit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Bakiye</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: balance.balance >= 0 ? '#1A1A1A' : '#1A1A1A' }}>
              ₺{balance.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
            </Text>
          </View>

          {/* Transactions */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>İşlemler</Text>
              <TouchableOpacity
                onPress={() => setShowTransactionModal(true)}
                style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
              >
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>+ Ekle</Text>
              </TouchableOpacity>
            </View>
            {transactions.length === 0 ? (
              <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 20 }}>
                Henüz işlem kaydı yok
              </Text>
            ) : (
              transactions.map((transaction) => (
                <View key={transaction.id} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5E5EA', flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 }}>
                      {transaction.description}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#8E8E93' }}>
                      {new Date(transaction.transaction_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: transaction.transaction_type === 'debit' ? '#34C759' : '#FF3B30' }}>
                    {transaction.transaction_type === 'debit' ? '+' : '-'}₺{transaction.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Transaction Modal */}
          {showTransactionModal && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginBottom: 16 }}>İşlem Ekle</Text>

                {/* Transaction Type */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#3C3C43', marginBottom: 8 }}>İşlem Tipi</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => setTransactionForm(p => ({ ...p, type: 'credit' }))}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: transactionForm.type === 'credit' ? '#FF3B30' : '#F5F3EF', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: transactionForm.type === 'credit' ? '#FFFFFF' : '#1A1A1A' }}>Borç (-)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setTransactionForm(p => ({ ...p, type: 'debit' }))}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: transactionForm.type === 'debit' ? '#34C759' : '#F5F3EF', alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '600', color: transactionForm.type === 'debit' ? '#FFFFFF' : '#1A1A1A' }}>Alacak (+)</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Amount */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#3C3C43', marginBottom: 8 }}>Tutar (₺)</Text>
                  <TextInput
                    value={transactionForm.amount}
                    onChangeText={(t) => setTransactionForm(p => ({ ...p, amount: t }))}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    style={{ backgroundColor: '#F5F3EF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1A1A1A' }}
                  />
                </View>

                {/* Description */}
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#3C3C43', marginBottom: 8 }}>Açıklama</Text>
                  <TextInput
                    value={transactionForm.description}
                    onChangeText={(t) => setTransactionForm(p => ({ ...p, description: t }))}
                    placeholder="İşlem açıklaması"
                    style={{ backgroundColor: '#F5F3EF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1A1A1A' }}
                  />
                </View>

                {/* Date */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontSize: 13, fontWeight: '500', color: '#3C3C43', marginBottom: 8 }}>Tarih</Text>
                  <TextInput
                    value={transactionForm.date}
                    onChangeText={(t) => setTransactionForm(p => ({ ...p, date: t }))}
                    placeholder="YYYY-MM-DD"
                    style={{ backgroundColor: '#F5F3EF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#1A1A1A' }}
                  />
                </View>

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setShowTransactionModal(false)}
                    style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#F5F3EF', alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleAddTransaction}
                    style={{ flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: '#1A1A1A', alignItems: 'center' }}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Kaydet</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
