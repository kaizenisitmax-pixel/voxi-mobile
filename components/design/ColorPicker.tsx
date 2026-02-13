import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface ColorPickerProps {
  selected: string | null;
  onSelect: (color: string) => void;
}

// Popüler duvar boyası renkleri
const POPULAR_COLORS = [
  { id: 'white', name: 'Beyaz', hex: '#FFFFFF' },
  { id: 'beige', name: 'Bej', hex: '#F5F5DC' },
  { id: 'gray', name: 'Gri', hex: '#808080' },
  { id: 'light-gray', name: 'Açık Gri', hex: '#D3D3D3' },
  { id: 'dark-gray', name: 'Koyu Gri', hex: '#404040' },
  { id: 'cream', name: 'Krem', hex: '#FFFDD0' },
  { id: 'ivory', name: 'Fildişi', hex: '#FFFFF0' },
  { id: 'light-blue', name: 'Açık Mavi', hex: '#ADD8E6' },
  { id: 'navy', name: 'Lacivert', hex: '#000080' },
  { id: 'sage', name: 'Adaçayı', hex: '#9CAF88' },
  { id: 'olive', name: 'Zeytin Yeşili', hex: '#808000' },
  { id: 'terracotta', name: 'Terracotta', hex: '#E2725B' },
  { id: 'burgundy', name: 'Bordo', hex: '#800020' },
  { id: 'charcoal', name: 'Antrasit', hex: '#36454F' },
  { id: 'taupe', name: 'Vizon', hex: '#B38B6D' },
];

export default function ColorPicker({ selected, onSelect }: ColorPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Renk Seçin</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {POPULAR_COLORS.map((color) => {
          const isSelected = selected === color.id;
          return (
            <TouchableOpacity
              key={color.id}
              onPress={() => onSelect(color.id)}
              style={styles.colorCard}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.colorCircle,
                  { backgroundColor: color.hex },
                  isSelected && styles.colorCircleSelected,
                  color.hex === '#FFFFFF' && styles.colorCircleWhite,
                ]}
              >
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.colorName,
                  isSelected && styles.colorNameSelected,
                ]}
              >
                {color.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
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
    gap: 16,
  },
  colorCard: {
    alignItems: 'center',
    gap: 8,
  },
  colorCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleWhite: {
    borderColor: '#E5E5EA',
  },
  colorCircleSelected: {
    borderColor: '#212121',
    borderWidth: 3,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  colorName: {
    fontSize: 13,
    color: '#3C3C43',
    textAlign: 'center',
    maxWidth: 70,
  },
  colorNameSelected: {
    fontWeight: '600',
    color: '#212121',
  },
});
