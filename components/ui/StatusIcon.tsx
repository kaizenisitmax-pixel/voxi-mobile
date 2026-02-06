import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TaskStatus = 'open' | 'in_progress' | 'done' | 'cancelled';

interface StatusIconProps {
  status: TaskStatus;
  size?: number;
  showLabel?: boolean;
  color?: string;
}

const statusIcons = {
  open: { icon: 'radio-button-off' as const, label: 'Bekliyor' },      // ○
  in_progress: { icon: 'play-circle' as const, label: 'Yapılıyor' },   // ▶
  done: { icon: 'checkmark-circle' as const, label: 'Tamam' },         // ●
  cancelled: { icon: 'close-circle' as const, label: 'İptal' },        // ✕
};

export const StatusIcon: React.FC<StatusIconProps> = ({ 
  status, 
  size = 20, 
  showLabel = false,
  color 
}) => {
  const config = statusIcons[status];
  
  // Monokrom renkler (status'e göre)
  const defaultColor = 
    status === 'done' ? '#1A1A1A' :      // Koyu siyah (tamamlanan)
    status === 'in_progress' ? '#3C3C43' : // Orta gri (devam eden)
    status === 'cancelled' ? '#8E8E93' :   // Açık gri (iptal)
    '#C7C7CC';                             // Çok açık gri (bekleyen)
  
  if (showLabel) {
    return (
      <View style={styles.container}>
        <Ionicons 
          name={config.icon} 
          size={size} 
          color={color || defaultColor} 
        />
        <Text style={[styles.label, { fontSize: size * 0.6, color: defaultColor }]}>
          {config.label}
        </Text>
      </View>
    );
  }
  
  return (
    <Ionicons 
      name={config.icon} 
      size={size} 
      color={color || defaultColor} 
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontWeight: '500',
  },
});

// Yardımcı fonksiyon: Status'e göre renk al
export const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case 'done': return '#1A1A1A';
    case 'in_progress': return '#3C3C43';
    case 'cancelled': return '#8E8E93';
    case 'open': return '#C7C7CC';
    default: return '#8E8E93';
  }
};

// Yardımcı fonksiyon: Status label al
export const getStatusLabel = (status: TaskStatus): string => {
  return statusIcons[status]?.label || status;
};
