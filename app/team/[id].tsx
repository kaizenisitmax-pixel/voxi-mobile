import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';

interface MemberProfile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  role: string;
  total_tasks: number;
  completed_tasks: number;
  open_tasks: number;
}

export default function TeamMemberScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => { loadMember(); }, [id]);

  const loadMember = async () => {
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) return;

      setIsAdmin(wsInfo.role === 'owner' || wsInfo.role === 'admin');

      const { data: memberData } = await supabase
        .from('workspace_members')
        .select(`
          id,
          user_id,
          role,
          profiles:user_id (
            full_name,
            phone,
            avatar_url
          )
        `)
        .eq('user_id', id)
        .eq('workspace_id', wsInfo.workspaceId)
        .single();

      if (!memberData) {
        Alert.alert('Hata', 'Üye bulunamadı');
        router.back();
        return;
      }

      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('assigned_to', memberData.profiles?.full_name);

      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('assigned_to', memberData.profiles?.full_name)
        .eq('status', 'done');

      const { count: openTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('assigned_to', memberData.profiles?.full_name)
        .eq('status', 'open');

      setMember({
        id: memberData.id,
        user_id: memberData.user_id,
        full_name: memberData.profiles?.full_name || 'İsimsiz',
        phone: memberData.profiles?.phone || '',
        avatar_url: memberData.profiles?.avatar_url || '',
        role: memberData.role,
        total_tasks: totalTasks || 0,
        completed_tasks: completedTasks || 0,
        open_tasks: openTasks || 0,
      });
    } catch (err) {
      console.error('Üye yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Yönetici';
      case 'admin': return 'Admin';
      case 'member': return 'Üye';
      default: return role;
    }
  };

  const callMember = () => {
    if (member?.phone) Linking.openURL(`tel:${member.phone}`);
  };

  const messageMember = () => {
    if (member?.phone) {
      Linking.openURL(`https://wa.me/90${member.phone.replace(/\D/g, '')}`);
    }
  };

  const Avatar = ({ size = 80 }: { size?: number }) => {
    if (member?.avatar_url) {
      return <Image source={{ uri: member.avatar_url }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
    }
    const initials = member?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
    return (
      <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>{initials}</Text>
      </View>
    );
  };

  if (loading || !member) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Profil Kartı */}
        <View style={styles.profileCard}>
          <Avatar size={80} />
          <Text style={styles.profileName}>{member.full_name}</Text>
          <Text style={styles.profileRole}>{getRoleLabel(member.role)}</Text>
          
          {member.phone && (
            <Text style={styles.profilePhone}>{member.phone}</Text>
          )}

          {/* Hızlı Aksiyonlar */}
          <View style={styles.actionsRow}>
            {member.phone && (
              <>
                <TouchableOpacity style={styles.actionButton} onPress={callMember}>
                  <Ionicons name="call-outline" size={22} color="#1A1A1A" />
                  <Text style={styles.actionText}>Ara</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={messageMember}>
                  <Ionicons name="logo-whatsapp" size={22} color="#1A1A1A" />
                  <Text style={styles.actionText}>Mesaj</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/(tabs)/newTask?assignTo=${member.full_name}`)}
            >
              <Ionicons name="add-circle-outline" size={22} color="#1A1A1A" />
              <Text style={styles.actionText}>Görev</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* İstatistikler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>İstatistikler</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{member.total_tasks}</Text>
              <Text style={styles.statLabel}>Toplam</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{member.completed_tasks}</Text>
              <Text style={styles.statLabel}>Tamamlanan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{member.open_tasks}</Text>
              <Text style={styles.statLabel}>Açık</Text>
            </View>
          </View>
        </View>

        {/* Admin Aksiyonları */}
        {isAdmin && member.role !== 'owner' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Yönetim</Text>
            <TouchableOpacity style={styles.adminAction}>
              <Ionicons name="shield-outline" size={20} color="#1A1A1A" />
              <Text style={styles.adminActionText}>Rolü Değiştir</Text>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminAction}>
              <Ionicons name="person-remove-outline" size={20} color="#FF3B30" />
              <Text style={[styles.adminActionText, { color: '#FF3B30' }]}>Ekipten Çıkar</Text>
              <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 15, color: '#8E8E93' },
  profileCard: { alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 20, padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#E5E5EA' },
  avatarPlaceholder: { backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontWeight: '600', color: '#3C3C43' },
  profileName: { fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginTop: 16 },
  profileRole: { fontSize: 15, color: '#8E8E93', marginTop: 4 },
  profilePhone: { fontSize: 15, color: '#3C3C43', marginTop: 8 },
  actionsRow: { flexDirection: 'row', gap: 24, marginTop: 20 },
  actionButton: { alignItems: 'center', paddingHorizontal: 16 },
  actionText: { fontSize: 12, color: '#3C3C43', marginTop: 4 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5EA' },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  statLabel: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  adminAction: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5EA', gap: 12 },
  adminActionText: { flex: 1, fontSize: 15, color: '#1A1A1A' },
});
