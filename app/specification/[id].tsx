/**
 * Şartname Detay Sayfası
 * AI analiz sonucu + malzeme listesi + kullanıcı düzenleme + ISITMAX formu
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import SpecItemList from '../../components/spec/SpecItemList';
import IsitmaxForm from '../../components/spec/IsitmaxForm';
import {
  getSpecificationWithItems,
  updateSpecification,
  deleteSpecification,
  approveItem,
  addItemNote,
  deleteSpecItem,
  addSpecItem,
  getStatusInfo,
  getItemCategoryLabel,
  SpecificationWithItems,
  SpecificationItem,
} from '../../services/specification';
import { getCategoryConfig } from '../../lib/categories';

export default function SpecificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [spec, setSpec] = useState<SpecificationWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIsitmaxForm, setShowIsitmaxForm] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);

  // New item form
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemType, setNewItemType] = useState<string>('material');
  const [newItemCategory, setNewItemCategory] = useState<string>('diğer');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  useEffect(() => {
    loadSpec();
  }, [id]);

  const loadSpec = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getSpecificationWithItems(id);
      if (data) {
        setSpec(data);
        setUserNotes(data.user_notes || '');
      } else {
        Alert.alert('Hata', 'Şartname bulunamadı');
        router.back();
      }
    } catch (error) {
      console.error('❌ Şartname yüklenemedi:', error);
      Alert.alert('Hata', 'Şartname yüklenemedi');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ITEM ACTIONS
  // ==========================================

  const handleApproveItem = async (itemId: string, approved: boolean) => {
    const success = await approveItem(itemId, approved);
    if (success && spec) {
      setSpec({
        ...spec,
        items: spec.items.map(i =>
          i.id === itemId ? { ...i, user_approved: approved } : i
        ),
      });
    }
  };

  const handleAddNote = async (itemId: string, note: string) => {
    const success = await addItemNote(itemId, note);
    if (success && spec) {
      setSpec({
        ...spec,
        items: spec.items.map(i =>
          i.id === itemId ? { ...i, user_note: note } : i
        ),
      });
    }
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      'Kalemi Sil',
      'Bu kalemi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteSpecItem(itemId);
            if (success && spec) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setSpec({
                ...spec,
                items: spec.items.filter(i => i.id !== itemId),
              });
            }
          },
        },
      ]
    );
  };

  const handleAddNewItem = async () => {
    if (!newItemLabel.trim() || !spec) return;

    const result = await addSpecItem(spec.id, {
      item_type: newItemType as any,
      category: newItemCategory,
      label: newItemLabel.trim(),
      description: newItemDesc.trim() || null,
      quantity: newItemQuantity ? parseFloat(newItemQuantity) : null,
      unit: newItemUnit.trim() || null,
      ai_confidence: null,
      user_approved: true,
      user_note: null,
      source: 'user_added',
      sort_order: spec.items.length,
    });

    if (result) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSpec({
        ...spec,
        items: [...spec.items, result],
      });
      setShowAddItem(false);
      resetNewItemForm();
    }
  };

  const resetNewItemForm = () => {
    setNewItemLabel('');
    setNewItemType('material');
    setNewItemCategory('diğer');
    setNewItemQuantity('');
    setNewItemUnit('');
    setNewItemDesc('');
  };

  // ==========================================
  // SPEC ACTIONS
  // ==========================================

  const handleSaveNotes = async () => {
    if (!spec) return;
    const success = await updateSpecification(spec.id, { user_notes: userNotes });
    if (success) {
      setEditingNotes(false);
      setSpec({ ...spec, user_notes: userNotes });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleApproveAll = async () => {
    if (!spec) return;
    const unapproved = spec.items.filter(i => !i.user_approved);
    if (unapproved.length === 0) {
      Alert.alert('Bilgi', 'Tüm kalemler zaten onaylı.');
      return;
    }

    for (const item of unapproved) {
      await approveItem(item.id, true);
    }

    setSpec({
      ...spec,
      items: spec.items.map(i => ({ ...i, user_approved: true })),
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleMarkReady = async () => {
    if (!spec) return;
    const unapproved = spec.items.filter(i => !i.user_approved);

    if (unapproved.length > 0) {
      Alert.alert(
        'Onaylanmamış Kalemler',
        `${unapproved.length} kalem henüz onaylanmadı. Yine de devam etmek istiyor musunuz?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Devam Et',
            onPress: async () => {
              await updateSpecification(spec.id, { status: 'ready' });
              setSpec({ ...spec, status: 'ready' });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ]
      );
    } else {
      await updateSpecification(spec.id, { status: 'ready' });
      setSpec({ ...spec, status: 'ready' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleDeleteSpec = () => {
    Alert.alert(
      'Şartnameyi Sil',
      'Bu şartnameyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            if (!spec) return;
            const success = await deleteSpecification(spec.id);
            if (success) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.back();
            } else {
              Alert.alert('Hata', 'Şartname silinemedi. Sadece taslak şartnameler silinebilir.');
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // RENDER
  // ==========================================

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#212121" />
          <Text style={styles.loadingText}>Şartname yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!spec) return null;

  const statusInfo = getStatusInfo(spec.status);
  const categoryConfig = getCategoryConfig(spec.category);
  const isEditable = spec.status === 'draft' || spec.status === 'ready';
  const approvedCount = spec.items.filter(i => i.user_approved).length;
  const totalCount = spec.items.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {spec.title || 'Şartname'}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Meta Info */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Ionicons name="layers-outline" size={14} color="#212121" />
              <Text style={styles.metaText}>{spec.category}</Text>
            </View>
            {spec.style && (
              <View style={styles.metaBadge}>
                <Ionicons name="brush-outline" size={14} color="#212121" />
                <Text style={styles.metaText}>{spec.style}</Text>
              </View>
            )}
            {spec.service_type && (
              <View style={styles.metaBadge}>
                <Ionicons name="construct-outline" size={14} color="#212121" />
                <Text style={styles.metaText}>{spec.service_type}</Text>
              </View>
            )}
          </View>
          <Text style={styles.dateText}>
            {new Date(spec.created_at).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        {/* AI Summary */}
        {spec.ai_analysis?.summary && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="sparkles" size={18} color="#212121" />
              <Text style={styles.summaryTitle}>AI Özet</Text>
            </View>
            <Text style={styles.summaryText}>{spec.ai_analysis.summary}</Text>
          </View>
        )}

        {/* Item List */}
        <View style={styles.itemsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Malzeme ve Ölçü Kalemleri</Text>
            {isEditable && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddItem(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={22} color="#212121" />
                <Text style={styles.addButtonText}>Ekle</Text>
              </TouchableOpacity>
            )}
          </View>

          <SpecItemList
            items={spec.items}
            onApprove={handleApproveItem}
            onAddNote={handleAddNote}
            onDelete={isEditable ? handleDeleteItem : undefined}
            editable={isEditable}
          />
        </View>

        {/* User Notes */}
        <View style={styles.notesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Notlarınız</Text>
            {isEditable && !editingNotes && (
              <TouchableOpacity
                onPress={() => setEditingNotes(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color="#212121" />
              </TouchableOpacity>
            )}
          </View>

          {editingNotes ? (
            <View style={styles.notesEdit}>
              <TextInput
                style={styles.notesInput}
                placeholder="Şartname hakkında notlarınızı ekleyin..."
                placeholderTextColor="#C7C7CC"
                value={userNotes}
                onChangeText={setUserNotes}
                multiline
                maxLength={1000}
                textAlignVertical="top"
              />
              <View style={styles.notesActions}>
                <TouchableOpacity
                  onPress={() => {
                    setUserNotes(spec.user_notes || '');
                    setEditingNotes(false);
                  }}
                >
                  <Text style={styles.notesCancelText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveNotes}>
                  <Text style={styles.notesSaveText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : spec.user_notes ? (
            <View style={styles.notesDisplay}>
              <Text style={styles.notesDisplayText}>{spec.user_notes}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.notesEmpty}
              onPress={() => isEditable && setEditingNotes(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="document-text-outline" size={20} color="#C7C7CC" />
              <Text style={styles.notesEmptyText}>Not eklemek için dokunun</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        {isEditable && (
          <View style={styles.actionsSection}>
            {/* Approve All */}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleApproveAll}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-done" size={20} color="#10B981" />
              <Text style={styles.secondaryButtonText}>
                Tümünü Onayla ({approvedCount}/{totalCount})
              </Text>
            </TouchableOpacity>

            {/* Mark Ready / Send */}
            {spec.status === 'draft' && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleMarkReady}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Şartnameyi Onayla</Text>
              </TouchableOpacity>
            )}

            {spec.status === 'ready' && (
              <>
                {categoryConfig.directContact ? (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#1E293B' }]}
                    onPress={() => setShowIsitmaxForm(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="business" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>
                      {categoryConfig.contactLabel || 'ISITMAX ile İletişime Geç'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => {
                      // TODO: Usta eşleştirme akışına yönlendir
                      Alert.alert('Yakında', 'Usta eşleştirme özelliği yakında aktif olacak.');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="people" size={20} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Usta Bul</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Delete */}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteSpec}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color="#FF3B30" />
              <Text style={styles.deleteButtonText}>Şartnameyi Sil</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sent/Completed Info */}
        {(spec.status === 'sent' || spec.status === 'completed') && (
          <View style={styles.sentInfoCard}>
            <Ionicons
              name={spec.status === 'completed' ? 'checkmark-circle' : 'paper-plane'}
              size={24}
              color={spec.status === 'completed' ? '#059669' : '#3B82F6'}
            />
            <Text style={styles.sentInfoText}>
              {spec.status === 'completed'
                ? 'Bu şartname tamamlanmış olarak işaretlendi.'
                : 'Bu şartname gönderildi. Yanıt bekleniyor.'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ISITMAX Form Modal */}
      <Modal
        visible={showIsitmaxForm}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <IsitmaxForm
            specificationId={spec.id}
            onSuccess={(inquiryId) => {
              setShowIsitmaxForm(false);
              setSpec({ ...spec, status: 'sent' });
            }}
            onCancel={() => setShowIsitmaxForm(false)}
          />
        </SafeAreaView>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItem}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F5F3EF' }} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowAddItem(false);
              resetNewItemForm();
            }}>
              <Text style={styles.modalCancelText}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Yeni Kalem Ekle</Text>
            <TouchableOpacity
              onPress={handleAddNewItem}
              disabled={!newItemLabel.trim()}
            >
              <Text style={[
                styles.modalSaveText,
                !newItemLabel.trim() && { color: '#C7C7CC' },
              ]}>
                Ekle
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
            {/* Label */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>İsim *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Örn: Meşe Parke, Alüminyum Profil"
                placeholderTextColor="#C7C7CC"
                value={newItemLabel}
                onChangeText={setNewItemLabel}
              />
            </View>

            {/* Type Selector */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Tür</Text>
              <View style={styles.typeGrid}>
                {['material', 'dimension', 'finish', 'color', 'fixture', 'note'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeChip,
                      newItemType === type && styles.typeChipSelected,
                    ]}
                    onPress={() => setNewItemType(type)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.typeChipText,
                      newItemType === type && styles.typeChipTextSelected,
                    ]}>
                      {type === 'material' ? 'Malzeme' :
                       type === 'dimension' ? 'Ölçü' :
                       type === 'finish' ? 'Kaplama' :
                       type === 'color' ? 'Renk' :
                       type === 'fixture' ? 'Donatı' : 'Not'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Category Selector */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Kategori</Text>
              <View style={styles.typeGrid}>
                {['zemin', 'duvar', 'tavan', 'mobilya', 'aydınlatma', 'taşıyıcı', 'kaplama', 'diğer'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.typeChip,
                      newItemCategory === cat && styles.typeChipSelected,
                    ]}
                    onPress={() => setNewItemCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.typeChipText,
                      newItemCategory === cat && styles.typeChipTextSelected,
                    ]}>
                      {getItemCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity + Unit */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Miktar</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Örn: 35"
                  placeholderTextColor="#C7C7CC"
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.formField, { flex: 1 }]}>
                <Text style={styles.formLabel}>Birim</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="m², m, adet"
                  placeholderTextColor="#C7C7CC"
                  value={newItemUnit}
                  onChangeText={setNewItemUnit}
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.formField}>
              <Text style={styles.formLabel}>Açıklama</Text>
              <TextInput
                style={[styles.formInput, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="Detaylı açıklama (opsiyonel)"
                placeholderTextColor="#C7C7CC"
                value={newItemDesc}
                onChangeText={setNewItemDesc}
                multiline
                maxLength={300}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // Meta
  metaSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F5F3EF',
    borderRadius: 8,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#212121',
    textTransform: 'capitalize',
  },
  dateText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  // AI Summary
  summaryCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  summaryText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  // Items
  itemsSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  // Notes
  notesSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 8,
  },
  notesEdit: {
    gap: 8,
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 14,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 80,
  },
  notesActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  notesCancelText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  notesSaveText: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600',
  },
  notesDisplay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  notesDisplayText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  notesEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  notesEmptyText: {
    fontSize: 14,
    color: '#C7C7CC',
  },
  // Actions
  actionsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    backgroundColor: '#212121',
    borderRadius: 14,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE5E5',
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
  },
  // Sent info
  sentInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  sentInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  // Modal
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  // Form
  formField: {
    gap: 6,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3C3C43',
    marginLeft: 4,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1A1A1A',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  typeChipSelected: {
    backgroundColor: '#212121',
    borderColor: '#212121',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3C3C43',
  },
  typeChipTextSelected: {
    color: '#FFFFFF',
  },
});
