import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { getWorkspaceInfo } from '../../lib/workspace';

interface Stats {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  totalCustomers: number;
  newCustomersThisWeek: number;
  teamMembers: number;
}

export default function ReportsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0, completedTasks: 0, openTasks: 0,
    totalCustomers: 0, newCustomersThisWeek: 0, teamMembers: 0,
  });
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    checkAccess();
    loadStats();
  }, [dateRange]);

  const checkAccess = async () => {
    const wsInfo = await getWorkspaceInfo();
    if (!wsInfo || (wsInfo.role !== 'owner' && wsInfo.role !== 'admin')) {
      Alert.alert('Erişim Engellendi', 'Bu sayfayı görüntüleme yetkiniz yok.', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    }
  };

  const loadStats = async () => {
    try {
      const wsInfo = await getWorkspaceInfo();
      if (!wsInfo) return;

      const now = new Date();
      let startDate = new Date();
      if (dateRange === 'week') startDate.setDate(now.getDate() - 7);
      else if (dateRange === 'month') startDate.setMonth(now.getMonth() - 1);
      else startDate = new Date(0);

      const { count: totalTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId)
        .gte('created_at', startDate.toISOString());

      const { count: completedTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('status', 'done')
        .gte('created_at', startDate.toISOString());

      const { count: openTasks } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('status', 'open');

      const { count: totalCustomers } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: newCustomersThisWeek } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId)
        .gte('created_at', weekAgo.toISOString());

      const { count: teamMembers } = await supabase
        .from('workspace_members')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', wsInfo.workspaceId)
        .eq('is_active', true);

      setStats({
        totalTasks: totalTasks || 0,
        completedTasks: completedTasks || 0,
        openTasks: openTasks || 0,
        totalCustomers: totalCustomers || 0,
        newCustomersThisWeek: newCustomersThisWeek || 0,
        teamMembers: teamMembers || 0,
      });
    } catch (err) {
      console.error('Stats yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Raporlar</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Tarih Filtresi */}
        <View style={styles.dateFilterRow}>
          {(['week', 'month', 'all'] as const).map(range => (
            <TouchableOpacity
              key={range}
              style={[styles.dateChip, dateRange === range && styles.dateChipActive]}
              onPress={() => setDateRange(range)}
            >
              <Text style={[styles.dateChipText, dateRange === range && styles.dateChipTextActive]}>
                {range === 'week' ? 'Bu Hafta' : range === 'month' ? 'Bu Ay' : 'Tümü'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Görev İstatistikleri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Görevler</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalTasks}</Text>
              <Text style={styles.statLabel}>Toplam</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.completedTasks}</Text>
              <Text style={styles.statLabel}>Tamamlanan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.openTasks}</Text>
              <Text style={styles.statLabel}>Açık</Text>
            </View>
            <View style={[styles.statCard, styles.statCardHighlight]}>
              <Text style={[styles.statNumber, styles.statNumberHighlight]}>{completionRate}%</Text>
              <Text style={[styles.statLabel, styles.statLabelHighlight]}>Tamamlanma</Text>
            </View>
          </View>
        </View>

        {/* Müşteri İstatistikleri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müşteriler</Text>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.statNumber}>{stats.totalCustomers}</Text>
              <Text style={styles.statLabel}>Toplam Müşteri</Text>
            </View>
            <View style={[styles.statCard, { flex: 1 }]}>
              <Text style={styles.statNumber}>+{stats.newCustomersThisWeek}</Text>
              <Text style={styles.statLabel}>Bu Hafta Yeni</Text>
            </View>
          </View>
        </View>

        {/* Ekip */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ekip</Text>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.teamMembers}</Text>
            <Text style={styles.statLabel}>Aktif Üye</Text>
          </View>
        </View>

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
  content: { flex: 1, padding: 20 },
  dateFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E5EA' },
  dateChipActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  dateChipText: { fontSize: 13, fontWeight: '500', color: '#3C3C43' },
  dateChipTextActive: { color: '#FFFFFF' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#8E8E93', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { width: '47%', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E5EA' },
  statCardHighlight: { backgroundColor: '#1A1A1A' },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#1A1A1A' },
  statNumberHighlight: { color: '#FFFFFF' },
  statLabel: { fontSize: 13, color: '#8E8E93', marginTop: 4 },
  statLabelHighlight: { color: '#FFFFFF', opacity: 0.8 },
});
