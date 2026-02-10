/**
 * StatusBadge Component
 * Reusable status badge for tasks, orders, customers
 */

import React from 'react';
import { View, Text } from 'react-native';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium' | 'large';
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  // Task status
  'todo': { bg: '#E5E5EA', text: '#3C3C43' },
  'in_progress': { bg: '#FFF3CD', text: '#856404' },
  'completed': { bg: '#D4EDDA', text: '#155724' },
  'cancelled': { bg: '#F8D7DA', text: '#721C24' },
  
  // Order status
  'pending': { bg: '#E5E5EA', text: '#3C3C43' },
  'confirmed': { bg: '#D1ECF1', text: '#0C5460' },
  'in_production': { bg: '#FFF3CD', text: '#856404' },
  'ready': { bg: '#CCE5FF', text: '#004085' },
  'delivered': { bg: '#D4EDDA', text: '#155724' },
  'paid': { bg: '#D4EDDA', text: '#155724' },
  
  // Priority
  'low': { bg: '#E5E5EA', text: '#3C3C43' },
  'medium': { bg: '#FFF3CD', text: '#856404' },
  'high': { bg: '#FFE5E5', text: '#CC0000' },
  'urgent': { bg: '#F8D7DA', text: '#721C24' },
  
  // Default
  'default': { bg: '#E5E5EA', text: '#3C3C43' },
};

const STATUS_LABELS: Record<string, string> = {
  // Task status (Turkish)
  'todo': 'Yapılacak',
  'in_progress': 'Devam Ediyor',
  'completed': 'Tamamlandı',
  'cancelled': 'İptal',
  
  // Order status (Turkish)
  'pending': 'Bekliyor',
  'confirmed': 'Onaylandı',
  'in_production': 'Üretimde',
  'ready': 'Hazır',
  'delivered': 'Teslim Edildi',
  'paid': 'Ödendi',
  
  // Priority (Turkish)
  'low': 'Düşük',
  'medium': 'Orta',
  'high': 'Yüksek',
  'urgent': 'Acil',
};

const SIZE_STYLES = {
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 11,
  },
  medium: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    fontSize: 13,
  },
  large: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    fontSize: 15,
  },
};

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const normalizedStatus = status?.toLowerCase() || 'default';
  const colors = STATUS_COLORS[normalizedStatus] || STATUS_COLORS.default;
  const label = STATUS_LABELS[normalizedStatus] || status;
  const styles = SIZE_STYLES[size];

  return (
    <View
      style={{
        backgroundColor: colors.bg,
        paddingHorizontal: styles.paddingHorizontal,
        paddingVertical: styles.paddingVertical,
        borderRadius: styles.borderRadius,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          color: colors.text,
          fontSize: styles.fontSize,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
