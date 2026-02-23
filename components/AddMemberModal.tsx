import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList,
  ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { colors } from '../lib/colors';
import type { CardMember } from '../hooks/useCards';

type TeamMember = {
  user_id: string;
  role: string;
  full_name: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  cardId: string;
  currentMembers: CardMember[];
  workspaceId?: string;
  teamId?: string | null;
  onMembersChanged: () => void;
};

function getInitials(name: string): string {
  return name.split(/[\s\-]+/).filter(w => w.length > 0).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export default function AddMemberModal({
  visible, onClose, cardId, currentMembers, workspaceId, teamId, onMembersChanged,
}: Props) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !workspaceId) return;
    fetchTeamMembers();
  }, [visible, workspaceId, teamId]);

  const fetchTeamMembers = async () => {
    setLoading(true);
    let query = supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId!)
      .eq('is_active', true);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data } = await query;
    if (data && data.length > 0) {
      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = new Map(
        profiles?.map(p => [p.id, p.full_name]) || []
      );

      setTeamMembers(data.map((m: any) => ({
        user_id: m.user_id,
        role: m.role,
        full_name: profileMap.get(m.user_id) || null,
      })));
    } else {
      setTeamMembers([]);
    }
    setLoading(false);
  };

  const isMember = (userId: string) =>
    currentMembers.some(m => m.user_id === userId);

  const toggleMember = async (userId: string) => {
    setUpdating(userId);
    try {
      if (isMember(userId)) {
        const { error } = await supabase
          .from('card_members')
          .delete()
          .eq('card_id', cardId)
          .eq('user_id', userId);

        if (error) {
          Alert.alert('Hata', 'Uye cikarilken hata olustu');
        }
      } else {
        const { error } = await supabase
          .from('card_members')
          .insert({
            card_id: cardId,
            user_id: userId,
            role: 'member',
            added_by: (await supabase.auth.getUser()).data.user?.id,
          });

        if (error) {
          Alert.alert('Hata', 'Uye eklenirken hata olustu');
        }
      }
      onMembersChanged();
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Uye Yonetimi</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>Kapat</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Ekip uyelerini karta ekleyin veya cikartin.
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={teamMembers}
              keyExtractor={m => m.user_id}
              renderItem={({ item }) => {
                const active = isMember(item.user_id);
                const isUpdating = updating === item.user_id;
                return (
                  <TouchableOpacity
                    style={styles.memberRow}
                    onPress={() => toggleMember(item.user_id)}
                    disabled={isUpdating}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(item.full_name || '?')}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{item.full_name || 'Isimsiz'}</Text>
                      <Text style={styles.memberRole}>{item.role}</Text>
                    </View>
                    {isUpdating ? (
                      <ActivityIndicator size="small" color={colors.dark} />
                    ) : (
                      <View style={[styles.check, active && styles.checkActive]}>
                        {active && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Ekip uyesi bulunamadi.</Text>
              }
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.dark },
  closeBtn: { fontSize: 15, fontWeight: '500', color: colors.dark },
  subtitle: { fontSize: 13, color: colors.muted, paddingHorizontal: 20, marginBottom: 16 },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.avatar,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '700', color: colors.text },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: '600', color: colors.dark },
  memberRole: { fontSize: 12, color: colors.muted, marginTop: 2 },
  check: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  checkActive: { backgroundColor: colors.dark, borderColor: colors.dark },
  checkMark: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  emptyText: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingVertical: 32 },
});
