import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category, ServiceType, StyleData, getStylesByServiceAndCategory } from '../../lib/categories';

interface StylePickerProps {
  category: Category;
  serviceType: ServiceType;
  selected: string | null;
  onSelect: (styleId: string) => void;
}

export default function StylePicker({ category, serviceType, selected, onSelect }: StylePickerProps) {
  const styles = getStylesByServiceAndCategory(serviceType, category);

  if (styles.length === 0) {
    return null;
  }

  return (
    <View style={componentStyles.container}>
      <Text style={componentStyles.title}>Stil Seçin</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={componentStyles.scrollContent}
      >
        {styles.map((style) => {
          const isSelected = selected === style.id;
          return (
            <TouchableOpacity
              key={style.id}
              onPress={() => onSelect(style.id)}
              style={[
                componentStyles.styleCard,
                isSelected && componentStyles.styleCardSelected,
              ]}
              activeOpacity={0.7}
            >
              <View style={[
                componentStyles.styleIconContainer,
                isSelected && componentStyles.styleIconSelected,
              ]}>
                <Ionicons
                  name={(style.icon || 'sparkles-outline') as any}
                  size={28}
                  color={isSelected ? '#FFFFFF' : '#212121'}
                />
              </View>
              <View style={componentStyles.styleInfo}>
                <Text style={[
                  componentStyles.styleLabel,
                  isSelected && componentStyles.styleLabelSelected,
                ]}>
                  {style.label}
                </Text>
                <Text style={componentStyles.styleDescription} numberOfLines={2}>
                  {style.description}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const componentStyles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  styleCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  styleCardSelected: {
    borderColor: '#212121',
    borderWidth: 2,
  },
  styleIconContainer: {
    height: 80,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  styleIconSelected: {
    backgroundColor: '#212121',
  },
  styleInfo: {
    padding: 10,
    gap: 4,
  },
  styleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  styleLabelSelected: {
    color: '#212121',
    fontWeight: '700',
  },
  styleDescription: {
    fontSize: 11,
    color: '#8E8E93',
    lineHeight: 15,
  },
});
