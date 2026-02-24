/**
 * Sektör Şablonları & Hızlı Aksiyonlar Detay Ekranı
 * Seçili sektörün template'lerini ve quick action'larını gösterir
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Share, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSelectedIndustry } from '../lib/industryStore';
import { Industry } from '../lib/industries';
import { colors } from '../lib/colors';

type Mode = 'templates' | 'quickactions';

export default function IndustryDetailScreen() {
  const router   = useRouter();
  const { mode } = useLocalSearchParams<{ mode: Mode }>();

  const [industry, setIndustry] = useState<Industry | null>(null);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    getSelectedIndustry().then(ind => { setIndustry(ind); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  const isTemplates = mode !== 'quickactions';
  const title = isTemplates ? 'Sektör Şablonları' : 'Hızlı Aksiyonlar';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={s.title}>{title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {!industry ? (
          <View style={s.emptyBox}>
            <Text style={s.emptyIcon}>🏢</Text>
            <Text style={s.emptyTitle}>Sektör Seçilmedi</Text>
            <Text style={s.emptyText}>Ayarlar ekranından sektörünüzü seçin; şablonlar ve hızlı aksiyonlar sektörünüze özel oluşturulur.</Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => router.back()}>
              <Text style={s.emptyBtnText}>Sektör Seç →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Sektör başlığı */}
            <View style={s.sectorCard}>
              <Text style={s.sectorCategory}>{industry.category}</Text>
              <Text style={s.sectorName}>{industry.name}</Text>
              <View style={s.sectorStats}>
                <View style={s.stat}>
                  <Text style={s.statNum}>{industry.templates.length}</Text>
                  <Text style={s.statLabel}>Şablon</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={s.statNum}>{industry.quickActions.length}</Text>
                  <Text style={s.statLabel}>Hızlı Aksiyon</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.stat}>
                  <Text style={s.statNum}>{industry.benefitScore}/10</Text>
                  <Text style={s.statLabel}>Fayda Skoru</Text>
                </View>
              </View>
            </View>

            {/* Şablonlar */}
            {isTemplates && (
              <View style={s.block}>
                <Text style={s.blockTitle}>MESAJ ŞABLONLARİ</Text>
                {industry.templates.map((tmpl, i) => (
                  <TouchableOpacity
                    key={i}
                    style={s.templateItem}
                    onPress={() => setExpanded(expanded === i ? null : i)}
                    activeOpacity={0.8}
                  >
                    <View style={s.templateHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.templateName}>{tmpl.name}</Text>
                        <View style={s.templateMeta}>
                          <Text style={s.metaChip}>→ {tmpl.target}</Text>
                          <Text style={s.metaChip}>⏱ {tmpl.trigger}</Text>
                        </View>
                      </View>
                      <Text style={s.expandArrow}>{expanded === i ? '▲' : '▼'}</Text>
                    </View>
                    {expanded === i && (
                      <View style={s.templateBody}>
                        <Text style={s.templateContent}>{tmpl.content}</Text>
                        <TouchableOpacity
                          style={s.copyBtn}
                          onPress={() => Share.share({ message: tmpl.content })}
                        >
                          <Text style={s.copyBtnText}>Kopyala / Paylaş</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Hızlı Aksiyonlar */}
            {!isTemplates && (
              <>
                <View style={s.block}>
                  <Text style={s.blockTitle}>VOXI'YE SORABİLECEKLERİNİZ</Text>
                  {industry.quickActions.map((qa, i) => (
                    <View key={i} style={s.qaItem}>
                      <Text style={s.qaIndex}>{i + 1}</Text>
                      <Text style={s.qaText}>{qa}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.block}>
                  <Text style={s.blockTitle}>SEKTÖR SENARYOLARI</Text>
                  {industry.scenarios.map((sc, i) => (
                    <View key={i} style={s.scenarioItem}>
                      <Text style={s.scenarioText}>{sc}</Text>
                    </View>
                  ))}
                </View>

                <View style={s.block}>
                  <Text style={s.blockTitle}>ENTEGRASYONLAR</Text>
                  <View style={s.integRow}>
                    {industry.integrations.map((intg, i) => (
                      <View key={i} style={s.integChip}>
                        <Text style={s.integText}>{intg}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:       { fontSize: 17, fontWeight: '700', color: colors.dark },
  back:        { fontSize: 16, color: colors.dark, fontWeight: '600' },
  content:     { paddingBottom: 60, gap: 12, paddingTop: 8 },

  emptyBox:    { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32, gap: 14 },
  emptyIcon:   { fontSize: 48 },
  emptyTitle:  { fontSize: 20, fontWeight: '800', color: colors.dark },
  emptyText:   { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtn:    { backgroundColor: colors.dark, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText:{ fontSize: 15, fontWeight: '700', color: '#fff' },

  sectorCard:  { backgroundColor: colors.card, marginHorizontal: 16, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, gap: 10 },
  sectorCategory: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
  sectorName:  { fontSize: 22, fontWeight: '800', color: colors.dark },
  sectorStats: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  stat:        { flex: 1, alignItems: 'center', gap: 2 },
  statNum:     { fontSize: 18, fontWeight: '900', color: colors.dark },
  statLabel:   { fontSize: 11, color: colors.muted },
  statDivider: { width: 1, height: 32, backgroundColor: colors.border },

  block:       { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, overflow: 'hidden' },
  blockTitle:  { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },

  templateItem:   { borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingVertical: 14 },
  templateHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  templateName:   { fontSize: 15, fontWeight: '700', color: colors.dark },
  templateMeta:   { flexDirection: 'row', gap: 8, marginTop: 6 },
  metaChip:       { fontSize: 11, color: colors.muted, backgroundColor: colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  expandArrow:    { fontSize: 12, color: colors.muted, marginTop: 2 },
  templateBody:   { marginTop: 12, gap: 10 },
  templateContent:{ fontSize: 13, color: colors.text, lineHeight: 20, backgroundColor: colors.bg, padding: 12, borderRadius: 10, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  copyBtn:        { backgroundColor: colors.dark, borderRadius: 10, padding: 10, alignItems: 'center' },
  copyBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },

  qaItem:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  qaIndex:     { fontSize: 13, fontWeight: '800', color: colors.muted, width: 22, textAlign: 'center' },
  qaText:      { flex: 1, fontSize: 14, color: colors.dark, lineHeight: 20 },

  scenarioItem:   { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border },
  scenarioText:   { fontSize: 13, color: colors.text, lineHeight: 19 },

  integRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  integChip:   { backgroundColor: colors.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  integText:   { fontSize: 13, fontWeight: '600', color: colors.text },
});

