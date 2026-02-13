import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Stats {
  totalDesigns: number;
  completedJobs: number;
  rating: number;
  totalJobs: number;
}

export default function ProfileScreen() {
  const { session, profile, signOut } = useAuth();
  const [userRole, setUserRole] = useState<'customer' | 'master' | 'both'>('customer');
  const [stats, setStats] = useState<Stats>({
    totalDesigns: 0,
    completedJobs: 0,
    rating: 0,
    totalJobs: 0,
  });
  const [isMaster, setIsMaster] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (!session?.user?.id) return;

    try {
      // Load user role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      const role = profileData?.role || 'customer';
      setUserRole(role);
      setIsMaster(role === 'master' || role === 'both');

      // Load customer stats
      const { count: designCount } = await supabase
        .from('designs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      // Load master stats if applicable
      if (role === 'master' || role === 'both') {
        const { data: masterData } = await supabase
          .from('masters')
          .select('rating, total_jobs, completed_jobs')
          .eq('user_id', session.user.id)
          .single();

        setStats({
          totalDesigns: designCount || 0,
          completedJobs: masterData?.completed_jobs || 0,
          rating: masterData?.rating || 0,
          totalJobs: masterData?.total_jobs || 0,
        });
      } else {
        setStats({
          totalDesigns: designCount || 0,
          completedJobs: 0,
          rating: 0,
          totalJobs: 0,
        });
      }
    } catch (error) {
      console.error('❌ Kullanıcı verileri yüklenemedi:', error);
    }
  };

  const handleRegisterAsMaster = () => {
    router.push('/master/register');
  };

  const handleSignOut = async () => {
    Alert.alert('Çıkış Yap', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkış Yap',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/(auth)/welcome');
          } catch (error) {
            console.error('❌ Çıkış hatası:', error);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri:
                  session?.user?.user_metadata?.avatar_url ||
                  'https://ui-avatars.com/api/?name=' +
                    encodeURIComponent(profile?.full_name || 'User'),
              }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.profileName}>{profile?.full_name || 'Kullanıcı'}</Text>
          <Text style={styles.profileEmail}>{session?.user?.email}</Text>
          {isMaster && (
            <View style={styles.masterBadge}>
              <Ionicons name="hammer" size={16} color="#FFFFFF" />
              <Text style={styles.masterBadgeText}>Usta</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalDesigns}</Text>
            <Text style={styles.statLabel}>Tasarım</Text>
          </View>
          {isMaster && (
            <>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{stats.totalJobs}</Text>
                <Text style={styles.statLabel}>Toplam İş</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {stats.rating > 0 ? stats.rating.toFixed(1) : '-'}
                </Text>
                <Text style={styles.statLabel}>Puan</Text>
              </View>
            </>
          )}
        </View>

        {/* Register as Master */}
        {!isMaster && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.registerMasterCard}
              onPress={handleRegisterAsMaster}
              activeOpacity={0.8}
            >
              <View style={styles.registerMasterIcon}>
                <Ionicons name="hammer" size={32} color="#212121" />
              </View>
              <View style={styles.registerMasterContent}>
                <Text style={styles.registerMasterTitle}>Usta Olarak Kaydol</Text>
                <Text style={styles.registerMasterSubtitle}>
                  Sesli komutla hızlıca kayıt olun ve iş almaya başlayın
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>
        )}

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ayarlar</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Bildirimler', 'Yakında aktif olacak!');
            }}
          >
            <Ionicons name="notifications-outline" size={24} color="#212121" />
            <Text style={styles.menuItemText}>Bildirimler</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Dil', 'Şu an sadece Türkçe desteklenmektedir');
            }}
          >
            <Ionicons name="language-outline" size={24} color="#212121" />
            <Text style={styles.menuItemText}>Dil</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Tema', 'Yakında aktif olacak!');
            }}
          >
            <Ionicons name="moon-outline" size={24} color="#212121" />
            <Text style={styles.menuItemText}>Tema</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkında</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Gizlilik Politikası', 'Yakında aktif olacak!');
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={24} color="#212121" />
            <Text style={styles.menuItemText}>Gizlilik Politikası</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Kullanım Koşulları', 'Yakında aktif olacak!');
            }}
          >
            <Ionicons name="document-text-outline" size={24} color="#212121" />
            <Text style={styles.menuItemText}>Kullanım Koşulları</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('VOXI', 'Versiyon: 1.0.0\n\nHayal Et · Gör · Yaptır\nAI ile tasarım ve usta bulma platformu');
            }}
          >
            <Ionicons name="information-circle-outline" size={24} color="#212121" />
            <Text style={styles.menuItemText}>Uygulama Hakkında</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
            <Text style={styles.signOutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
    color: '#8E8E93',
  },
  masterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#212121',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
  },
  masterBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 24,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    gap: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F5F3EF',
    borderRadius: 12,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#8E8E93',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  registerMasterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  registerMasterIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerMasterContent: {
    flex: 1,
    marginLeft: 16,
  },
  registerMasterTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  registerMasterSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
});
