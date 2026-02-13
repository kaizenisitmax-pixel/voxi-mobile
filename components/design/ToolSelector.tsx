import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ToolId, ToolData } from '../../lib/categories';

interface ToolSelectorProps {
  selected: ToolId | null;
  onSelect: (tool: ToolId) => void;
  tools: ToolData[];  // Category-specific tools
}

export default function ToolSelector({ selected, onSelect, tools }: ToolSelectorProps) {
  const getIconName = (iconId: string): any => {
    const iconMap: Record<string, any> = {
      'sparkles': 'sparkles',
      'cube': 'cube-outline',
      'trash': 'trash-outline',
      'color-palette': 'color-palette-outline',
      'brush': 'brush-outline',
      'star': 'star-outline',
      'expand': 'expand-outline',
      'grid': 'grid-outline',
      'square': 'square-outline',
      'shield-checkmark': 'shield-checkmark-outline',
      'leaf': 'leaf-outline',
      'water': 'water-outline',
      'bulb': 'bulb-outline',
    };
    return iconMap[iconId] || 'apps-outline';
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tools.map((tool) => {
          const isSelected = selected === tool.id;
          return (
            <TouchableOpacity
              key={tool.id}
              onPress={() => onSelect(tool.id)}
              style={[
                styles.toolCard,
                isSelected && styles.toolCardSelected,
              ]}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                isSelected && styles.iconContainerSelected,
              ]}>
                <Ionicons
                  name={getIconName(tool.icon)}
                  size={24}
                  color={isSelected ? '#FFFFFF' : '#212121'}
                />
              </View>
              <Text style={[
                styles.toolLabel,
                isSelected && styles.toolLabelSelected,
              ]}>
                {tool.label}
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
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  toolCard: {
    alignItems: 'center',
    gap: 8,
    width: 80,
  },
  toolCardSelected: {},
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainerSelected: {
    backgroundColor: '#212121',
    borderColor: '#212121',
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3C3C43',
    textAlign: 'center',
  },
  toolLabelSelected: {
    fontWeight: '600',
    color: '#212121',
  },
});
