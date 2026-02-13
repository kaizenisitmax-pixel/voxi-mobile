import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceType, SERVICE_TYPES } from '../../lib/categories';

interface ServiceTypeSelectorProps {
  selected: ServiceType;
  onSelect: (serviceType: ServiceType) => void;
}

export default function ServiceTypeSelector({ selected, onSelect }: ServiceTypeSelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Hizmet Türü</Text>
      <View style={styles.grid}>
        {SERVICE_TYPES.map((service) => {
          const isSelected = selected === service.id;
          return (
            <TouchableOpacity
              key={service.id}
              onPress={() => onSelect(service.id)}
              style={[
                styles.card,
                isSelected && styles.cardSelected,
              ]}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected,
              ]}>
                <Ionicons
                  name={service.icon as any}
                  size={24}
                  color={isSelected ? '#FFFFFF' : '#212121'}
                />
              </View>
              <Text style={[
                styles.label,
                isSelected && styles.labelSelected,
              ]}>
                {service.label}
              </Text>
              <Text style={[
                styles.description,
                isSelected && styles.descriptionSelected,
              ]} numberOfLines={2}>
                {service.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 10,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  cardSelected: {
    borderColor: '#212121',
    borderWidth: 2,
    backgroundColor: '#FAFAFA',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSelected: {
    backgroundColor: '#212121',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  labelSelected: {
    color: '#212121',
  },
  description: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 15,
  },
  descriptionSelected: {
    color: '#3C3C43',
  },
});
