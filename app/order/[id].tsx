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
  Image,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { decode } from 'base-64';
import { supabase } from '@/lib/supabase';
import { speakText } from '@/utils/audio';
import { startRecording, stopRecording, transcribeAudio } from '@/utils/recording';
import { processVision } from '@/lib/ai';

interface Order {
  id: string;
  order_name: string;
  customer_id: string | null;
  customer_name: string | null;
  status: string;
  priority: string;
  details: string | null;
  total_amount: number | null;
  delivery_date: string | null;
  created_at: string;
  created_by: string;
  workspace_id: string;
}

interface Media {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number;
  created_at: string;
}

interface Log {
  id: string;
  action: string;
  details: any;
  created_at: string;
  user_name: string;
}

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'detail' | 'media'>('detail');

  // Editing states
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

  // Voice & AI states
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState('');
  const recordingRef = useRef<any>(null);

  // Fetch order data
  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setOrder(data);
      setEditValues(data);
    } catch (error) {
      console.error('❌ Sipariş fetch hatası:', error);
      Alert.alert('Hata', 'Sipariş bilgileri yüklenemedi');
    }
  };

  // Fetch media
  const fetchMedia = async () => {
    try {
      const { data, error } = await supabase
        .from('order_media')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMedia(data || []);
    } catch (error) {
      console.error('❌ Medya fetch hatası:', error);
    }
  };

  // Fetch logs
  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('order_logs')
        .select('*, user:profiles(full_name)')
        .eq('order_id', id)
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
      await Promise.all([fetchOrder(), fetchMedia(), fetchLogs()]);
      setLoading(false);
    };
    loadData();
  }, [id]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('order-' + id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${id}`,
        },
        () => {
          console.log('🔄 Sipariş realtime güncelleme');
          fetchOrder();
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
      console.log('👁️ Sipariş kartı odaklandı, yenileniyor');
      fetchOrder();
    }, [id])
  );

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrder(), fetchMedia(), fetchLogs()]);
    setRefreshing(false);
  };

  // Auto-save field
  const saveField = async (field: string, value: any) => {
    try {
      console.log('💾 Alan kaydediliyor:', { field, value });
      const { error } = await supabase
        .from('orders')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;

      await supabase.from('order_logs').insert({
        order_id: id,
        action: 'field_update',
        details: { field, old_value: order?.[field as keyof Order], new_value: value },
        created_at: new Date().toISOString(),
      });

      console.log('✅ Alan kaydedildi:', field);
      await fetchOrder();
      setEditingField(null);
    } catch (error) {
      console.error('❌ Kaydetme hatası:', error);
      Alert.alert('Hata', 'Kaydetme başarısız');
    }
  };

  // Voice input for Detail tab (updates order fields)
  const handleVoiceInputDetail = async () => {
    try {
      if (isRecording) {
        console.log('🎤 Sipariş Detay: Kayıt durduruluyor');
        setIsRecording(false);
        setStatusText('Analiz ediliyor...');

        const result = await stopRecording(recordingRef.current);
        recordingRef.current = null;

        if (!result?.uri) {
          setStatusText('');
          return;
        }

        const transcript = await transcribeAudio(result.uri);
        if (!transcript) {
          setStatusText('');
          return;
        }

        console.log('📝 Sipariş Detay transcript:', transcript);
        setIsAnalyzing(true);

        const { data: aiResult, error: aiError } = await supabase.functions.invoke('ai-voice', {
          body: { transcript, context: 'order_detail', order_data: order }
        });

        if (aiError || !aiResult) throw new Error('AI analizi başarısız');
        console.log('🧠 Sipariş Detay AI:', aiResult);

        if (aiResult.data && Object.keys(aiResult.data).length > 0) {
          const { error } = await supabase
            .from('orders')
            .update(aiResult.data)
            .eq('id', id);

          if (error) throw error;

          await supabase.from('order_logs').insert({
            order_id: id,
            action: 'voice_update_detail',
            details: { transcript, updates: aiResult.data },
            created_at: new Date().toISOString(),
          });

          await fetchOrder();
        }

        await speakText(aiResult.response || 'Sipariş bilgileri güncellendi');
        setStatusText('');
        setIsAnalyzing(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        console.log('🎤 Sipariş Detay: Kayıt başlıyor');
        setIsRecording(true);
        setStatusText('Dinliyorum...');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const recording = await startRecording();
        recordingRef.current = recording;
      }
    } catch (error) {
      console.error('❌ Detay ses hatası:', error);
      setIsRecording(false);
      setIsAnalyzing(false);
      setStatusText('');
      Alert.alert('Hata', 'Ses kaydı başarısız');
    }
  };

  // Voice input for Media tab (creates media entry)
  const handleVoiceInputMedia = async () => {
    try {
      if (isRecording) {
        console.log('🎤 Sipariş Medya: Kayıt durduruluyor');
        setIsRecording(false);
        setStatusText('Ses kaydediliyor...');

        const result = await stopRecording(recordingRef.current);
        recordingRef.current = null;

        if (!result?.uri) {
          setStatusText('');
          return;
        }

        // Upload voice file to storage
        const fileName = `order_voice_${id}_${Date.now()}.wav`;
        const base64 = await FileSystem.readAsStringAsync(result.uri, {
          encoding: 'base64',
        });
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('order-media')
          .upload(fileName, decode(base64), {
            contentType: 'audio/wav',
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('order-media')
          .getPublicUrl(fileName);

        await supabase.from('order_media').insert({
          order_id: id,
          file_name: fileName,
          file_type: 'audio/wav',
          file_url: urlData.publicUrl,
          file_size: result.duration || 0,
        });

        await fetchMedia();
        await speakText('Sesli not kaydedildi');
        setStatusText('');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        console.log('🎤 Sipariş Medya: Kayıt başlıyor');
        setIsRecording(true);
        setStatusText('Sesli not kaydediliyor...');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const recording = await startRecording();
        recordingRef.current = recording;
      }
    } catch (error) {
      console.error('❌ Medya ses hatası:', error);
      setIsRecording(false);
      setStatusText('');
      Alert.alert('Hata', 'Ses kaydı başarısız');
    }
  };

  // Photo analysis for Detail tab
  const handleTakePhotoDetail = async () => {
    try {
      console.log('📸 Sipariş: Kamera açılıyor');
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
        'order',
        order || {}
      );

      console.log('🧠 Sipariş görsel analiz:', analysis);

      // Auto-save updates
      const updates: any = {};

      // Handle details_append
      if (analysis.details_append) {
        const currentDetails = order?.details || '';
        const newDetails = currentDetails
          ? `${currentDetails}\n\n${analysis.details_append}`
          : analysis.details_append;
        updates.details = newDetails;
      }

      // Handle other updates
      if (analysis.updates && Object.keys(analysis.updates).length > 0) {
        Object.entries(analysis.updates).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            updates[key] = value;
          }
        });
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        console.log('💾 Sipariş fotoğraftan güncellendi:', updates);

        await supabase.from('order_logs').insert({
          order_id: id,
          action: 'photo_analysis',
          details: { updates },
          created_at: new Date().toISOString(),
        });

        await fetchOrder();
      }

      // Upload photo to media
      const fileName = `order_${id}_${Date.now()}.jpg`;
      const fileUri = result.assets[0].uri;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-media')
        .upload(fileName, {
          uri: fileUri,
          type: 'image/jpeg',
          name: fileName,
        } as any);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('order-media')
        .getPublicUrl(fileName);

      await supabase.from('order_media').insert({
        order_id: id,
        file_name: fileName,
        file_type: 'image/jpeg',
        file_url: urlData.publicUrl,
        file_size: result.assets[0].fileSize || 0,
      });

      console.log('📸 Sipariş medya kaydedildi:', fileName);
      await fetchMedia();

      // TTS response
      const response = analysis.spoken_response || 'Fotoğraf kaydedildi';
      console.log('🔊 Sipariş görsel TTS:', response);
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

  // Photo for Media tab (just uploads to media)
  const handleTakePhotoMedia = async () => {
    try {
      console.log('📸 Sipariş Medya: Kamera açılıyor');
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (result.canceled) return;

      setStatusText('Fotoğraf yükleniyor...');

      const fileName = `order_${id}_${Date.now()}.jpg`;
      const fileUri = result.assets[0].uri;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-media')
        .upload(fileName, {
          uri: fileUri,
          type: 'image/jpeg',
          name: fileName,
        } as any);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('order-media')
        .getPublicUrl(fileName);

      await supabase.from('order_media').insert({
        order_id: id,
        file_name: fileName,
        file_type: 'image/jpeg',
        file_url: urlData.publicUrl,
        file_size: result.assets[0].fileSize || 0,
      });

      await fetchMedia();
      await speakText('Fotoğraf eklendi');
      setStatusText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Medya fotoğraf hatası:', error);
      setStatusText('');
      Alert.alert('Hata', 'Fotoğraf yüklenemedi');
    }
  };

  // File upload for Detail tab
  const handleFileUploadDetail = async () => {
    try {
      console.log('📁 Sipariş: Dosya seçici açılıyor');
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
        'order',
        order || {}
      );

      console.log('🧠 Sipariş dosya analiz:', analysis);

      // Auto-save updates
      const updates: any = {};

      // Handle details_append
      if (analysis.details_append) {
        const currentDetails = order?.details || '';
        const newDetails = currentDetails
          ? `${currentDetails}\n\n${analysis.details_append}`
          : analysis.details_append;
        updates.details = newDetails;
      }

      // Handle other updates
      if (analysis.updates && Object.keys(analysis.updates).length > 0) {
        Object.entries(analysis.updates).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            updates[key] = value;
          }
        });
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('orders')
          .update(updates)
          .eq('id', id);

        if (error) throw error;

        console.log('💾 Sipariş dosyadan güncellendi:', updates);

        await supabase.from('order_logs').insert({
          order_id: id,
          action: 'file_analysis',
          details: { updates },
          created_at: new Date().toISOString(),
        });

        await fetchOrder();
      }

      // Upload file to media
      const fileName = `order_${id}_${Date.now()}_${result.assets[0].name}`;
      const fileUri = result.assets[0].uri;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-media')
        .upload(fileName, {
          uri: fileUri,
          type: result.assets[0].mimeType,
          name: fileName,
        } as any);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('order-media')
        .getPublicUrl(fileName);

      await supabase.from('order_media').insert({
        order_id: id,
        file_name: fileName,
        file_type: result.assets[0].mimeType || 'application/octet-stream',
        file_url: urlData.publicUrl,
        file_size: result.assets[0].size || 0,
      });

      console.log('📁 Sipariş medya kaydedildi:', fileName);
      await fetchMedia();

      // TTS response
      const response = analysis.spoken_response || 'Dosya kaydedildi';
      console.log('🔊 Sipariş dosya TTS:', response);
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

  // File upload for Media tab (just uploads to media)
  const handleFileUploadMedia = async () => {
    try {
      console.log('📁 Sipariş Medya: Dosya seçici açılıyor');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
      });

      if (result.canceled) return;

      setStatusText('Dosya yükleniyor...');

      const fileName = `order_${id}_${Date.now()}_${result.assets[0].name}`;
      const fileUri = result.assets[0].uri;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-media')
        .upload(fileName, {
          uri: fileUri,
          type: result.assets[0].mimeType,
          name: fileName,
        } as any);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('order-media')
        .getPublicUrl(fileName);

      await supabase.from('order_media').insert({
        order_id: id,
        file_name: fileName,
        file_type: result.assets[0].mimeType || 'application/octet-stream',
        file_url: urlData.publicUrl,
        file_size: result.assets[0].size || 0,
      });

      await fetchMedia();
      await speakText('Dosya eklendi');
      setStatusText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('❌ Medya dosya hatası:', error);
      setStatusText('');
      Alert.alert('Hata', 'Dosya yüklenemedi');
    }
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#8E8E93';
      case 'in_progress':
        return '#1A1A1A';
      case 'completed':
        return '#1A1A1A';
      case 'cancelled':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  // Status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Bekliyor';
      case 'in_progress':
        return 'Devam Ediyor';
      case 'completed':
        return 'Tamamlandı';
      case 'cancelled':
        return 'İptal';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F3EF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F3EF', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#8E8E93' }}>Sipariş bulunamadı</Text>
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
          {order.order_name}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ backgroundColor: '#E5E5EA', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: getStatusColor(order.status) }}>
              {getStatusLabel(order.status)}
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: '#8E8E93' }}>
            {new Date(order.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>

      {/* Action Buttons - Tab Specific */}
      <View style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' }}>
        <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 12 }}>
          {activeTab === 'detail' ? 'Sipariş bilgilerini hızlıca girin' : 'Medya ekleyin'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <TouchableOpacity
            onPress={activeTab === 'detail' ? handleVoiceInputDetail : handleVoiceInputMedia}
            disabled={isAnalyzing}
            style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA', paddingVertical: 16, alignItems: 'center' }}
          >
            <Ionicons name="mic" size={28} color={isRecording ? '#FF3B30' : '#1A1A1A'} />
            <Text style={{ fontSize: 12, color: '#3C3C43', marginTop: 6 }}>
              {activeTab === 'detail' ? 'Sesle Gir' : 'Sesli Not'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={activeTab === 'detail' ? handleTakePhotoDetail : handleTakePhotoMedia}
            disabled={isAnalyzing}
            style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA', paddingVertical: 16, alignItems: 'center' }}
          >
            <Ionicons name="camera" size={28} color="#1A1A1A" />
            <Text style={{ fontSize: 12, color: '#3C3C43', marginTop: 6 }}>Fotoğraf Çek</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={activeTab === 'detail' ? handleFileUploadDetail : handleFileUploadMedia}
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
          onPress={() => setActiveTab('media')}
          style={{ flex: 1, paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: activeTab === 'media' ? '#1A1A1A' : 'transparent' }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: activeTab === 'media' ? '#1A1A1A' : '#8E8E93', textAlign: 'center' }}>
            Medya ({media.length})
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
          {/* Customer */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 8 }}>Müşteri</Text>
            {order.customer_id ? (
              <TouchableOpacity
                onPress={() => router.push(`/customer/${order.customer_id}`)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>
                  {order.customer_name}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </TouchableOpacity>
            ) : (
              <Text style={{ fontSize: 15, color: '#8E8E93' }}>—</Text>
            )}
          </View>

          {/* Order Details */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>Sipariş Bilgileri</Text>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Tutar</Text>
              <TextInput
                value={editingField === 'total_amount' ? editValues.total_amount?.toString() : order.total_amount ? `₺${order.total_amount.toLocaleString('tr-TR')}` : '—'}
                onChangeText={(text) => {
                  const numericValue = parseFloat(text.replace(/[^0-9.]/g, ''));
                  setEditValues({ ...editValues, total_amount: isNaN(numericValue) ? null : numericValue });
                }}
                onFocus={() => setEditingField('total_amount')}
                onBlur={() => saveField('total_amount', editValues.total_amount)}
                keyboardType="decimal-pad"
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'total_amount' ? '#1A1A1A' : 'transparent' }}
              />
            </View>

            <View>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 4 }}>Teslim Tarihi</Text>
              <TextInput
                value={editingField === 'delivery_date' ? editValues.delivery_date : order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('tr-TR') : '—'}
                onChangeText={(text) => setEditValues({ ...editValues, delivery_date: text })}
                onFocus={() => setEditingField('delivery_date')}
                onBlur={() => saveField('delivery_date', editValues.delivery_date)}
                placeholder="GG.AA.YYYY"
                style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'delivery_date' ? '#1A1A1A' : 'transparent' }}
              />
            </View>
          </View>

          {/* Details */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 }}>Detaylar</Text>
            <TextInput
              value={editingField === 'details' ? editValues.details : order.details || 'Detay ekle...'}
              onChangeText={(text) => setEditValues({ ...editValues, details: text })}
              onFocus={() => setEditingField('details')}
              onBlur={() => saveField('details', editValues.details)}
              multiline
              numberOfLines={6}
              style={{ fontSize: 15, color: '#1A1A1A', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: editingField === 'details' ? '#1A1A1A' : 'transparent' }}
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
          {media.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 40, alignItems: 'center' }}>
              <Ionicons name="images-outline" size={48} color="#E5E5EA" />
              <Text style={{ fontSize: 16, color: '#8E8E93', marginTop: 12, textAlign: 'center' }}>
                Henüz medya dosyası yok
              </Text>
              <Text style={{ fontSize: 14, color: '#8E8E93', marginTop: 8, textAlign: 'center' }}>
                Fotoğraf çekin veya dosya yükleyin
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {media.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => Alert.alert('Medya', item.file_name)}
                  style={{ width: '48%', aspectRatio: 1, backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}
                >
                  {item.file_type.startsWith('image/') ? (
                    <Image
                      source={{ uri: item.file_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F3EF' }}>
                      <Ionicons name="document-outline" size={48} color="#8E8E93" />
                      <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 8, textAlign: 'center', paddingHorizontal: 8 }} numberOfLines={2}>
                        {item.file_name}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
