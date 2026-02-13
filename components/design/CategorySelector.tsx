import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Category, CATEGORIES } from '../../lib/categories';

interface CategorySelectorProps {
  selected: Category;
  onSelect: (category: Category) => void;
}

export default function CategorySelector({ selected, onSelect }: CategorySelectorProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((category) => {
          const isSelected = selected === category.id;
          return (
            <TouchableOpacity
              key={category.id}
              onPress={() => onSelect(category.id)}
              style={[
                styles.pill,
                isSelected && styles.pillSelected,
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.pillText,
                isSelected && styles.pillTextSelected,
              ]}>
                {category.label}
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
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: '#212121',
    borderColor: '#212121',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
});
