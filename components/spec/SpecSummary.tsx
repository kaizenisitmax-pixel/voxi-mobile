/**
 * SpecSummary - Şartname özet kartı
 * Tasarım detay sayfasında ve listede kullanılır
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStatusInfo } from '../../services/specification';

interface SpecSummaryProps {
  specId: string;
  status: string;
  itemCount: number;
  title?: string;
  onPress: () => void;
}

export default function SpecSummary({
  specId,
  status,
  itemCount,
  title,
  onPress,
}: SpecSummaryProps) {
  const statusInfo = getStatusInfo(status);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Ionicons name="document-text" size={22} color="#212121" />
        </View>
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {title || 'Şartname'}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            <Text style={styles.itemCount}>{itemCount} kalem</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  itemCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
