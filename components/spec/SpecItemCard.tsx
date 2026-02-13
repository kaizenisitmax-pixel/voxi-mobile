/**
 * SpecItemCard - Tek malzeme/ölçü kalemi kartı
 * Onay/red, not ekleme, güven skoru gösterimi
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  SpecificationItem,
  getItemTypeLabel,
  getItemTypeIcon,
  confidenceToPercent,
} from '../../services/specification';

interface SpecItemCardProps {
  item: SpecificationItem;
  onApprove: (itemId: string, approved: boolean) => void;
  onAddNote: (itemId: string, note: string) => void;
  onDelete?: (itemId: string) => void;
  editable?: boolean;
}

export default function SpecItemCard({
  item,
  onApprove,
  onAddNote,
  onDelete,
  editable = true,
}: SpecItemCardProps) {
  const [showNote, setShowNote] = useState(false);
  const [noteText, setNoteText] = useState(item.user_note || '');

  const handleApprove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onApprove(item.id, !item.user_approved);
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
      onAddNote(item.id, noteText.trim());
    }
    setShowNote(false);
  };

  const confidenceColor = (item.ai_confidence || 0) >= 0.7
    ? '#10B981'
    : (item.ai_confidence || 0) >= 0.4
      ? '#F59E0B'
      : '#EF4444';

  return (
    <View style={[styles.card, item.user_approved && styles.cardApproved]}>
      {/* Top Row: Type Icon + Label + Actions */}
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <View style={[styles.typeIcon, item.user_approved && styles.typeIconApproved]}>
            <Ionicons
              name={getItemTypeIcon(item.item_type) as any}
              size={16}
              color={item.user_approved ? '#FFFFFF' : '#212121'}
            />
          </View>
          <View style={styles.labelContainer}>
            <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
            <Text style={styles.typeLabel}>{getItemTypeLabel(item.item_type)}</Text>
          </View>
        </View>

        {editable && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, item.user_approved && styles.actionBtnApproved]}
              onPress={handleApprove}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.user_approved ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={22}
                color={item.user_approved ? '#10B981' : '#8E8E93'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => setShowNote(!showNote)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.user_note ? 'chatbubble' : 'chatbubble-outline'}
                size={18}
                color={item.user_note ? '#3B82F6' : '#8E8E93'}
              />
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  onDelete(item.id);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={18} color="#FF3B30" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Description */}
      {item.description && (
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      )}

      {/* Bottom Row: Quantity + Confidence */}
      <View style={styles.bottomRow}>
        {item.quantity !== null && item.quantity !== undefined && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>
              {item.quantity} {item.unit || ''}
            </Text>
          </View>
        )}

        {item.source === 'ai_generated' && item.ai_confidence !== null && (
          <View style={[styles.confidenceBadge, { backgroundColor: `${confidenceColor}15` }]}>
            <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
            <Text style={[styles.confidenceText, { color: confidenceColor }]}>
              AI {confidenceToPercent(item.ai_confidence)}
            </Text>
          </View>
        )}

        {item.source === 'user_added' && (
          <View style={styles.sourceBadge}>
            <Ionicons name="person-outline" size={12} color="#6B7280" />
            <Text style={styles.sourceText}>Kullanıcı</Text>
          </View>
        )}
      </View>

      {/* User Note Display */}
      {item.user_note && !showNote && (
        <View style={styles.noteDisplay}>
          <Ionicons name="chatbubble" size={12} color="#3B82F6" />
          <Text style={styles.noteDisplayText} numberOfLines={2}>{item.user_note}</Text>
        </View>
      )}

      {/* Note Input */}
      {showNote && editable && (
        <View style={styles.noteInput}>
          <TextInput
            style={styles.noteTextInput}
            placeholder="Not ekleyin..."
            placeholderTextColor="#8E8E93"
            value={noteText}
            onChangeText={setNoteText}
            multiline
            maxLength={200}
          />
          <View style={styles.noteActions}>
            <TouchableOpacity onPress={() => setShowNote(false)} activeOpacity={0.7}>
              <Text style={styles.noteCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveNote} activeOpacity={0.7}>
              <Text style={styles.noteSaveText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardApproved: {
    borderColor: '#10B98140',
    backgroundColor: '#F0FDF4',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  typeIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconApproved: {
    backgroundColor: '#10B981',
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  typeLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  actionBtnApproved: {},
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginLeft: 42,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 42,
    flexWrap: 'wrap',
  },
  quantityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  quantityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  sourceText: {
    fontSize: 11,
    color: '#6B7280',
  },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginLeft: 42,
    paddingTop: 4,
  },
  noteDisplayText: {
    fontSize: 13,
    color: '#3B82F6',
    flex: 1,
    lineHeight: 18,
  },
  noteInput: {
    marginLeft: 42,
    gap: 8,
  },
  noteTextInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  noteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  noteCancelText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  noteSaveText: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '600',
  },
});
