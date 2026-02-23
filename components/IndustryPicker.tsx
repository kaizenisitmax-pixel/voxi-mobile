import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput,
} from 'react-native';
import { INDUSTRIES, CATEGORIES, Industry } from '../lib/industries';
import { getSelectedIndustryId, setSelectedIndustryId } from '../lib/industryStore';
import { colors } from '../lib/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (industry: Industry | null) => void;
};

export default function IndustryPicker({ visible, onClose, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      getSelectedIndustryId().then(setSelectedId);
    }
  }, [visible]);

  const filtered = search.trim()
    ? INDUSTRIES.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.category.toLowerCase().includes(search.toLowerCase())
      )
    : INDUSTRIES;

  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    industries: filtered.filter(i => cat.industryIds.includes(i.id)),
  })).filter(cat => cat.industries.length > 0);

  const handleSelect = async (industry: Industry) => {
    await setSelectedIndustryId(industry.id);
    setSelectedId(industry.id);
    onSelect(industry);
    onClose();
  };

  const handleClear = async () => {
    await setSelectedIndustryId(null);
    setSelectedId(null);
    onSelect(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Sektör Seçimi</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>Kapat</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Sektörünüzü seçin — VOXI size özel öneriler sunsun
          </Text>

          <TextInput
            style={styles.searchInput}
            placeholder="Sektör ara..."
            placeholderTextColor={colors.muted}
            value={search}
            onChangeText={setSearch}
          />

          {selectedId && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearText}>✕ Sektör seçimini kaldır</Text>
            </TouchableOpacity>
          )}

          <FlatList
            data={grouped}
            keyExtractor={item => item.name}
            renderItem={({ item: cat }) => (
              <View style={styles.categoryGroup}>
                <Text style={styles.categoryTitle}>{cat.name}</Text>
                {cat.industries.map(ind => (
                  <TouchableOpacity
                    key={ind.id}
                    style={[styles.industryRow, selectedId === ind.id && styles.industrySelected]}
                    onPress={() => handleSelect(ind)}
                  >
                    <View style={styles.industryInfo}>
                      <Text style={[styles.industryName, selectedId === ind.id && styles.industryNameSelected]}>
                        {ind.name}
                      </Text>
                      <Text style={styles.industryMeta}>
                        {ind.quickActions.slice(0, 2).join(' · ')}
                      </Text>
                    </View>
                    {selectedId === ind.id && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '90%', paddingBottom: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.dark },
  closeBtn: { fontSize: 15, fontWeight: '500', color: colors.dark },
  subtitle: { fontSize: 13, color: colors.muted, paddingHorizontal: 20, marginBottom: 12 },
  searchInput: {
    marginHorizontal: 20, backgroundColor: colors.bg, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.dark,
    marginBottom: 12,
  },
  clearBtn: { paddingHorizontal: 20, paddingVertical: 8, marginBottom: 8 },
  clearText: { fontSize: 14, color: colors.danger, fontWeight: '500' },
  categoryGroup: { paddingHorizontal: 20, marginBottom: 16 },
  categoryTitle: {
    fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1,
    marginBottom: 8, textTransform: 'uppercase',
  },
  industryRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, marginBottom: 4,
  },
  industrySelected: { backgroundColor: colors.dark },
  industryInfo: { flex: 1 },
  industryName: { fontSize: 16, fontWeight: '600', color: colors.dark },
  industryNameSelected: { color: '#FFF' },
  industryMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  checkMark: { fontSize: 18, fontWeight: '700', color: '#FFF' },
});
