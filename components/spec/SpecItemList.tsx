/**
 * SpecItemList - Gruplu malzeme listesi
 * Kategoriye göre gruplandırma, collapse/expand
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SpecItemCard from './SpecItemCard';
import {
  SpecificationItem,
  groupItemsByCategory,
  getItemCategoryLabel,
} from '../../services/specification';

interface SpecItemListProps {
  items: SpecificationItem[];
  onApprove: (itemId: string, approved: boolean) => void;
  onAddNote: (itemId: string, note: string) => void;
  onDelete?: (itemId: string) => void;
  editable?: boolean;
}

export default function SpecItemList({
  items,
  onApprove,
  onAddNote,
  onDelete,
  editable = true,
}: SpecItemListProps) {
  const grouped = groupItemsByCategory(items);
  const categoryKeys = Object.keys(grouped);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggleCategory = (cat: string) => {
    setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="clipboard-outline" size={40} color="#D1D5DB" />
        <Text style={styles.emptyText}>Henüz kalem eklenmemiş</Text>
        <Text style={styles.emptySubtext}>AI analiz sonucu veya manuel eklenen kalemler burada görünecek</Text>
      </View>
    );
  }

  // Stats
  const totalItems = items.length;
  const approvedItems = items.filter(i => i.user_approved).length;
  const aiItems = items.filter(i => i.source === 'ai_generated').length;

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalItems}</Text>
          <Text style={styles.summaryLabel}>Toplam</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>{approvedItems}</Text>
          <Text style={styles.summaryLabel}>Onaylı</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#3B82F6' }]}>{aiItems}</Text>
          <Text style={styles.summaryLabel}>AI</Text>
        </View>
      </View>

      {/* Grouped Items */}
      {categoryKeys.map((cat) => {
        const catItems = grouped[cat];
        const isCollapsed = collapsed[cat];
        const approvedInGroup = catItems.filter(i => i.user_approved).length;

        return (
          <View key={cat} style={styles.group}>
            {/* Category Header */}
            <TouchableOpacity
              style={styles.groupHeader}
              onPress={() => toggleCategory(cat)}
              activeOpacity={0.7}
            >
              <View style={styles.groupHeaderLeft}>
                <Text style={styles.groupTitle}>{getItemCategoryLabel(cat)}</Text>
                <View style={styles.groupBadge}>
                  <Text style={styles.groupBadgeText}>
                    {approvedInGroup}/{catItems.length}
                  </Text>
                </View>
              </View>
              <Ionicons
                name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                size={18}
                color="#8E8E93"
              />
            </TouchableOpacity>

            {/* Items */}
            {!isCollapsed && (
              <View style={styles.groupItems}>
                {catItems.map((item) => (
                  <SpecItemCard
                    key={item.id}
                    item={item}
                    onApprove={onApprove}
                    onAddNote={onAddNote}
                    onDelete={onDelete}
                    editable={editable}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    maxWidth: 240,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '500',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 4,
  },
  group: {
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  groupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  groupBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  groupItems: {
    gap: 8,
  },
});
