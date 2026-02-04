import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#F5F3EF',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSec: '#3C3C43',
  textTer: '#8E8E93',
  accent: '#34C759',
  border: '#F2F2F7',
  danger: '#FF3B30',
  iconColor: '#3C3C43',
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
};

const STORAGE_KEY = 'kalfa_quick_messages';

interface TeamMember {
  id: string;
  name: string;
  role: 'admin' | 'manager' | 'member';
}

export default function SettingsScreen() {
  const [quickMessages, setQuickMessages] = useState<string[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  
  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const currentUserRole = 'admin'; // Şimdilik Volkan admin

  useFocusEffect(
    useCallback(() => {
      loadMessages();
      fetchTeamMembers();
    }, [])
  );

  async function loadMessages() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setQuickMessages(JSON.parse(stored));
    } catch (e) {
      console.error(e);
    }
  }

  async function saveMessages(msgs: string[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
      setQuickMessages(msgs);
    } catch (e) {
      console.error(e);
    }
  }

  function addMessage() {
    if (!newMsg.trim()) return;
    const updated = [...quickMessages, newMsg.trim()];
    saveMessages(updated);
    setNewMsg('');
    setShowAdd(false);
  }

  function deleteMessage(index: number) {
    Alert.alert('Sil', `"${quickMessages[index]}" silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          const updated = quickMessages.filter((_, i) => i !== index);
          saveMessages(updated);
        },
      },
    ]);
  }

  async function generateReport() {
    setLoadingReport(true);
    setShowReport(true);
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', 'done')
      .gte('updated_at', weekAgo);
      
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'done');
      
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .gte('created_at', weekAgo);
    
    setReport({
      completed: completedTasks?.length || 0,
      active: activeTasks?.length || 0,
      messages: messages?.length || 0,
      completedList: completedTasks || [],
      urgentActive: activeTasks?.filter((t: any) => t.priority === 'urgent') || [],
    });
    setLoadingReport(false);
  }

  async function fetchTeamMembers() {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .order('name', { ascending: true });
    
    if (data) {
      setTeamMembers(data);
    }
  }

  async function updateRole(memberId: string, newRole: 'admin' | 'manager' | 'member') {
    await supabase
      .from('team_members')
      .update({ role: newRole })
      .eq('id', memberId);
    
    fetchTeamMembers();
  }

  function changeRole(member: TeamMember) {
    Alert.alert(
      'Rol Değiştir',
      `${member.name} için yeni rol seç`,
      [
        { text: 'Yönetici', onPress: () => updateRole(member.id, 'admin') },
        { text: 'Müdür', onPress: () => updateRole(member.id, 'manager') },
        { text: 'Üye', onPress: () => updateRole(member.id, 'member') },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  }

  function getRoleBadgeStyle(role: 'admin' | 'manager' | 'member') {
    switch (role) {
      case 'admin':
        return { bg: '#1A1A1A', text: '#FFFFFF', label: 'Yönetici' };
      case 'manager':
        return { bg: '#F5F3EF', text: '#3C3C43', label: 'Müdür' };
      case 'member':
        return { bg: '#E5E5EA', text: '#8E8E93', label: 'Üye' };
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={{ alignItems: 'center', paddingVertical: 28, backgroundColor: '#FFFFFF', marginBottom: 35 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#E5E5EA', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: '700', color: '#3C3C43' }}>V</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#1A1A1A', marginTop: 12 }}>Volkan</Text>
          <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 2 }}>KALFA v0.2.0</Text>
        </View>

        {/* Group 1 */}
        <View style={{ backgroundColor: '#FFFFFF', marginBottom: 35 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 }} activeOpacity={0.7}>
            <Ionicons name="chatbubble-outline" size={22} color="#3C3C43" style={{ width: 32 }} />
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 17, color: '#1A1A1A' }}>Hazır Mesajlar</Text>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={{ height: 0.5, backgroundColor: '#F2F2F7', marginLeft: 60 }} />

          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 }} activeOpacity={0.7} onPress={generateReport}>
            <Ionicons name="bar-chart-outline" size={22} color="#3C3C43" style={{ width: 32 }} />
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 17, color: '#1A1A1A' }}>Haftalık Rapor</Text>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={{ height: 0.5, backgroundColor: '#F2F2F7', marginLeft: 60 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 }}>
            <Ionicons name="mic-outline" size={22} color="#3C3C43" style={{ width: 32 }} />
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 17, color: '#1A1A1A' }}>Hey Voxi</Text>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              trackColor={{ false: '#E5E5EA', true: '#34C759' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Group 2 */}
        <View style={{ backgroundColor: '#FFFFFF', marginBottom: 35 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 }} activeOpacity={0.7}>
            <Ionicons name="people-outline" size={22} color="#3C3C43" style={{ width: 32 }} />
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 17, color: '#1A1A1A' }}>Ekip Yönetimi</Text>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>

          <View style={{ height: 0.5, backgroundColor: '#F2F2F7', marginLeft: 60 }} />

          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 }} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={22} color="#3C3C43" style={{ width: 32 }} />
            <Text style={{ flex: 1, marginLeft: 8, fontSize: 17, color: '#1A1A1A' }}>Bildirimler</Text>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Group 3 - Ekip Yönetimi (Admin Only) */}
        {currentUserRole === 'admin' && teamMembers.length > 0 && (
          <View style={{ backgroundColor: '#FFFFFF', marginBottom: 35 }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#8E8E93', letterSpacing: 0.5 }}>
                EKİP YÖNETİMİ
              </Text>
            </View>
            
            {teamMembers.map((member, index) => {
              const badge = getRoleBadgeStyle(member.role);
              return (
                <View key={member.id}>
                  {index > 0 && <View style={{ height: 0.5, backgroundColor: '#F2F2F7', marginLeft: 78 }} />}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 }}
                    activeOpacity={0.7}
                    onPress={() => changeRole(member)}
                  >
                    <View style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: '#E5E5EA',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                    }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#3C3C43' }}>
                        {member.name[0]}
                      </Text>
                    </View>
                    
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, color: '#1A1A1A' }}>{member.name}</Text>
                    </View>
                    
                    <View style={{
                      backgroundColor: badge.bg,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 6,
                      marginRight: 8,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: badge.text }}>
                        {badge.label.toUpperCase()}
                      </Text>
                    </View>
                    
                    <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Group 4 */}
        <View style={{ backgroundColor: '#FFFFFF', marginBottom: 35 }}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20 }} activeOpacity={0.7}>
            <Ionicons name="information-circle-outline" size={22} color="#3C3C43" style={{ width: 32 }} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={{ fontSize: 17, color: '#1A1A1A' }}>Hakkında</Text>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginTop: 1 }}>KALFA v0.2.0</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        {/* Quick Messages Management */}
        {showAdd && (
          <View style={styles.settingsGroup}>
            <View style={styles.addMessageSection}>
              <Text style={styles.addMessageTitle}>Yeni Hazır Mesaj</Text>
              <TextInput
                style={styles.addInput}
                value={newMsg}
                onChangeText={setNewMsg}
                placeholder="Mesaj yaz..."
                placeholderTextColor={C.textTer}
                autoFocus
                multiline
              />
              <View style={styles.addButtonRow}>
                <TouchableOpacity
                  style={[styles.addButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAdd(false);
                    setNewMsg('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addButton, styles.saveButton]} onPress={addMessage}>
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {quickMessages.length > 0 && (
          <View style={styles.settingsGroup}>
            <View style={styles.messagesHeader}>
              <Text style={styles.messagesTitle}>Kayıtlı Mesajlar</Text>
              <TouchableOpacity onPress={() => setShowAdd(!showAdd)}>
                <Text style={styles.addLink}>+ Ekle</Text>
              </TouchableOpacity>
            </View>
            {quickMessages.map((msg, i) => (
              <View key={i}>
                {i > 0 && <View style={[styles.settingsSep, { marginLeft: 16 }]} />}
                <TouchableOpacity
                  style={styles.messageRow}
                  onLongPress={() => deleteMessage(i)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.messageText} numberOfLines={2}>
                    {msg}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.messageHint}>
              <Text style={styles.messageHintText}>Silmek için basılı tut</Text>
            </View>
          </View>
        )}

        {quickMessages.length === 0 && !showAdd && (
          <View style={styles.settingsGroup}>
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>Hazır mesaj yok</Text>
              <TouchableOpacity style={styles.emptyAddButton} onPress={() => setShowAdd(true)}>
                <Text style={styles.emptyAddButtonText}>+ İlk mesajı ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Haftalık Rapor Modal */}
      <Modal visible={showReport} transparent animationType="slide" onRequestClose={() => setShowReport(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '80%',
            paddingBottom: 40,
          }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: 8, marginBottom: 16 }} />
            
            <ScrollView style={{ paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 22, fontWeight: '700', color: '#212121', marginBottom: 4 }}>Haftalık Rapor</Text>
              <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 20 }}>Son 7 gün</Text>
              
              {loadingReport ? (
                <ActivityIndicator color="#1A1A1A" size="large" style={{ marginTop: 40 }} />
              ) : report && (
                <>
                  {/* Özet kartları */}
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <View style={{ flex: 1, backgroundColor: '#F5F3EF', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                      <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>{report.completed}</Text>
                      <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>Tamamlanan</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#F5F3EF', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                      <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>{report.active}</Text>
                      <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>Devam Eden</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#F5F3EF', borderRadius: 12, padding: 16, alignItems: 'center' }}>
                      <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>{report.messages}</Text>
                      <Text style={{ fontSize: 12, color: '#8E8E93', marginTop: 4 }}>Mesaj</Text>
                    </View>
                  </View>
                  
                  {/* Acil görevler */}
                  {report.urgentActive.length > 0 && (
                    <>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#212121', marginBottom: 10 }}>
                        Acil Görevler ({report.urgentActive.length})
                      </Text>
                      {report.urgentActive.map((t: any) => (
                        <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF3B30' }} />
                          <Text style={{ fontSize: 14, color: '#212121', flex: 1 }}>{t.title}</Text>
                          <Text style={{ fontSize: 12, color: '#8E8E93' }}>{t.assigned_to}</Text>
                        </View>
                      ))}
                    </>
                  )}
                  
                  {/* Tamamlanan görevler */}
                  {report.completedList.length > 0 && (
                    <>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#212121', marginTop: 16, marginBottom: 10 }}>
                        Tamamlanan ({report.completedList.length})
                      </Text>
                      {report.completedList.map((t: any) => (
                        <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 10 }}>
                          <Ionicons name="checkmark-circle" size={18} color="#8E8E93" />
                          <Text style={{ fontSize: 14, color: '#8E8E93', flex: 1 }}>{t.title}</Text>
                        </View>
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
            
            <TouchableOpacity
              onPress={() => setShowReport(false)}
              style={{ marginHorizontal: 20, marginTop: 16, backgroundColor: '#F5F3EF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flex: 1,
  },

  // Profile Card
  profileCard: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    marginTop: 16,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    color: C.surface,
    fontSize: 28,
    fontWeight: '700',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: C.textSec,
  },

  // Settings Groups
  settingsGroup: {
    backgroundColor: C.surface,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingsIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingsLabelContainer: {
    flex: 1,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 16,
    color: C.text,
  },
  settingsSubLabel: {
    fontSize: 13,
    color: C.textSec,
    marginTop: 2,
  },
  settingsSep: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },

  // Add Message Section
  addMessageSection: {
    padding: 16,
  },
  addMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    marginBottom: 12,
  },
  addInput: {
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  addButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: C.bg,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textSec,
  },
  saveButton: {
    backgroundColor: C.accent,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.surface,
  },

  // Messages List
  messagesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  messagesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textSec,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addLink: {
    fontSize: 15,
    fontWeight: '600',
    color: C.accent,
  },
  messageRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageText: {
    fontSize: 15,
    color: C.text,
    lineHeight: 20,
  },
  messageHint: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageHintText: {
    fontSize: 11,
    color: C.textTer,
    textAlign: 'center',
  },

  // Empty State
  emptyMessages: {
    padding: 32,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: 15,
    color: C.textSec,
    marginBottom: 12,
  },
  emptyAddButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.accent,
  },
  emptyAddButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.surface,
  },
});
