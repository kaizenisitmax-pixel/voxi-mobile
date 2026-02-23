import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, FlatList,
} from 'react-native';
import { getSelectedIndustry } from '../lib/industryStore';
import { Industry } from '../lib/industries';
import { colors } from '../lib/colors';

type Template = Industry['templates'][number];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: Template) => void;
};

export default function TemplateSheet({ visible, onClose, onSelect }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [industryName, setIndustryName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadTemplates();
    }
  }, [visible]);

  const loadTemplates = async () => {
    setLoading(true);
    const industry = await getSelectedIndustry();
    if (industry) {
      setTemplates(industry.templates);
      setIndustryName(industry.name);
    } else {
      setTemplates([]);
      setIndustryName('');
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Hazır Şablonlar</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>Kapat</Text>
            </TouchableOpacity>
          </View>

          {industryName ? (
            <Text style={styles.subtitle}>📂 {industryName} şablonları</Text>
          ) : (
            <Text style={styles.subtitle}>
              Şablon görmek için Ayarlar'dan sektörünüzü seçin
            </Text>
          )}

          {templates.length > 0 ? (
            <FlatList
              data={templates}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.templateCard}
                  onPress={() => { onSelect(item); onClose(); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateName}>{item.name}</Text>
                    <View style={[styles.targetBadge, item.target === 'Müşteriye' && styles.targetCustomer]}>
                      <Text style={[styles.targetText, item.target === 'Müşteriye' && styles.targetCustomerText]}>
                        {item.target === 'Müşteriye' ? '👤 Müşteri' : '👥 Ekip'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.templateContent} numberOfLines={3}>{item.content}</Text>
                  <Text style={styles.templateTrigger}>⏰ {item.trigger}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            />
          ) : !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Şablon bulunamadı</Text>
              <Text style={styles.emptyDesc}>
                Ayarlar → Sektör Seçimi'nden{'\n'}sektörünüzü belirleyin
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingBottom: 20,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.dark },
  closeBtn: { fontSize: 15, fontWeight: '500', color: colors.dark },
  subtitle: { fontSize: 14, color: colors.muted, paddingHorizontal: 20, marginBottom: 16 },
  templateCard: {
    marginHorizontal: 20, marginBottom: 12, padding: 16,
    backgroundColor: colors.bg, borderRadius: 14, borderWidth: 1, borderColor: colors.border,
  },
  templateHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  templateName: { fontSize: 16, fontWeight: '700', color: colors.dark, flex: 1 },
  targetBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: colors.border,
  },
  targetCustomer: { backgroundColor: colors.dark },
  targetText: { fontSize: 11, fontWeight: '600', color: colors.text },
  targetCustomerText: { color: '#FFF' },
  templateContent: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 8 },
  templateTrigger: { fontSize: 12, color: colors.muted },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: 6 },
  emptyDesc: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
});
