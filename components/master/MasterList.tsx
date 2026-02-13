import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getCurrentLocation, formatDistance } from '../../services/location';
import MasterCard from './MasterCard';

interface Master {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  specialties: string[];
  service_areas: string[];
  experience_years: number;
  rating: number;
  total_jobs: number;
  bio: string | null;
  profile_image_url: string | null;
  latitude: number;
  longitude: number;
  distance_km?: number;
}

interface MasterListProps {
  visible: boolean;
  designId: string;
  onClose: () => void;
  onSelectMaster: (master: Master) => void;
}

export default function MasterList({
  visible,
  designId,
  onClose,
  onSelectMaster,
}: MasterListProps) {
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadNearbyMasters();
    }
  }, [visible]);

  const loadNearbyMasters = async () => {
    setLoading(true);

    try {
      // 1. Kullanıcının konumunu al
      console.log('📍 Konum alınıyor...');
      const location = await getCurrentLocation();

      if (!location) {
        onClose();
        return;
      }

      setUserLocation(location);

      // 2. Supabase'den find_nearby_masters fonksiyonunu çağır
      console.log('🔍 Yakındaki ustalar aranıyor...');
      
      const { data, error } = await supabase.rpc('find_nearby_masters', {
        user_lat: location.latitude,
        user_lon: location.longitude,
        max_distance_km: 50, // 50 km radius
        specialty_filter: null, // Tüm uzmanlıklar
      });

      if (error) {
        console.error('❌ Usta arama hatası:', error);
        // Hata varsa boş liste göster ve kullanıcıyı bilgilendir
        setMasters([]);
        Alert.alert(
          'Usta Bulunamadı',
          'Bölgenizde henüz kayıtlı usta bulunmamaktadır. Lütfen daha sonra tekrar deneyin.',
          [{ text: 'Tamam', onPress: onClose }]
        );
        setLoading(false);
        return;
      }

      console.log(`✅ ${data?.length || 0} usta bulundu`);

      setMasters(data || []);

      if (!data || data.length === 0) {
        Alert.alert(
          'Usta Bulunamadı',
          'Bölgenizde aktif usta bulunamadı. Lütfen daha sonra tekrar deneyin.',
          [{ text: 'Tamam', onPress: onClose }]
        );
      }
    } catch (error) {
      console.error('❌ Usta yükleme hatası:', error);
      setMasters([]);
      Alert.alert(
        'Bağlantı Hatası',
        'Usta listesi yüklenirken bir sorun oluştu. İnternet bağlantınızı kontrol edin.',
        [{ text: 'Tamam', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMasterSelect = async (master: Master) => {
    try {
      // Job request oluştur
      const { data: jobRequest, error } = await supabase
        .from('job_requests')
        .insert({
          customer_id: (await supabase.auth.getUser()).data.user?.id,
          design_id: designId,
          master_id: master.id,
          latitude: userLocation?.latitude,
          longitude: userLocation?.longitude,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Chat oluştur
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          job_request_id: jobRequest.id,
          customer_id: (await supabase.auth.getUser()).data.user?.id,
          master_id: master.id,
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // İlk mesajı gönder (tasarım görseli)
      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          chat_id: chat.id,
          sender_id: (await supabase.auth.getUser()).data.user?.id,
          message: 'Merhaba, bu tasarımı gerçekleştirmek istiyorum.',
          message_type: 'design',
          design_image_url: designId, // Design URL'i
        });

      if (messageError) throw messageError;

      // Send push notification to master
      try {
        await supabase.from('notifications').insert({
          user_id: master.user_id,
          type: 'new_job_request',
          title: 'Yeni İş Talebi',
          body: 'Bir müşteri sizinle iletişime geçmek istiyor',
          data: {
            chat_id: chat.id,
            job_request_id: jobRequest.id,
          },
        });

        console.log('📬 Push notification gönderildi');
      } catch (notifError) {
        console.error('❌ Push notification hatası:', notifError);
      }

      Alert.alert(
        'Başarılı!',
        `${master.name} ile sohbet başlatıldı. Sohbetler sekmesinden devam edebilirsiniz.`,
        [
          {
            text: 'Tamam',
            onPress: () => {
              onSelectMaster(master);
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Usta seçim hatası:', error);
      Alert.alert('Hata', 'Usta ile bağlantı kurulurken bir sorun oluştu');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Yakındaki Ustalar</Text>
            <Text style={styles.headerSubtitle}>
              {masters.length > 0
                ? `${masters.length} usta bulundu`
                : 'Ustalar aranıyor...'}
            </Text>
          </View>
        </View>

        {/* Master List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#212121" />
            <Text style={styles.loadingText}>Ustalar aranıyor...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {masters.map((master) => (
              <MasterCard
                key={master.id}
                master={master}
                onPress={() => handleMasterSelect(master)}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
});
