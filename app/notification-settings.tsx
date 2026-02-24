/**
 * Bildirim Tercihleri Ekranı
 */
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Switch, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { colors } from '../lib/colors';

type Prefs = {
  push_task_assigned:   boolean;
  push_task_completed:  boolean;
  push_urgent:          boolean;
  push_new_message:     boolean;
  sms_urgent:           boolean;
  morning_briefing:     boolean;
};

const DEFAULT_PREFS: Prefs = {
  push_task_assigned:  true,
  push_task_completed: true,
  push_urgent:         true,
  push_new_message:    true,
  sms_urgent:          false,
  morning_briefing:    true,
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [prefs, setPrefs]     = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('notification_prefs')
        .eq('id', user.id)
        .single();
      if (data?.notification_prefs) {
        setPrefs({ ...DEFAULT_PREFS, ...data.notification_prefs });
      }
      setLoading(false);
    })();
  }, [user?.id]);

  const toggle = async (key: keyof Prefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    await supabase.from('profiles').update({ notification_prefs: updated }).eq('id', user!.id);
    setSaving(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <ActivityIndicator size="large" color={colors.dark} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.back}>← Geri</Text>
        </TouchableOpacity>
        <Text style={s.title}>Bildirim Tercihleri</Text>
        {saving
          ? <ActivityIndicator size="small" color={colors.muted} />
          : <View style={{ width: 40 }} />}
      </View>

      <ScrollView contentContainerStyle={s.content}>

        <View style={s.block}>
          <Text style={s.blockTitle}>PUSH BİLDİRİMLER</Text>
          <SwitchRow
            label="Görev Atandı"
            sub="Size yeni bir görev atandığında"
            value={prefs.push_task_assigned}
            onToggle={() => toggle('push_task_assigned')}
          />
          <SwitchRow
            label="Görev Tamamlandı"
            sub="Atadığınız görev tamamlandığında"
            value={prefs.push_task_completed}
            onToggle={() => toggle('push_task_completed')}
          />
          <SwitchRow
            label="Acil Görevler"
            sub="Acil öncelikli görevler oluşturulduğunda"
            value={prefs.push_urgent}
            onToggle={() => toggle('push_urgent')}
          />
          <SwitchRow
            label="Yeni Mesaj"
            sub="Kart sohbetine yeni mesaj geldiğinde"
            value={prefs.push_new_message}
            onToggle={() => toggle('push_new_message')}
          />
        </View>

        <View style={s.block}>
          <Text style={s.blockTitle}>SMS BİLDİRİMLER</Text>
          <SwitchRow
            label="Acil Görev SMS"
            sub="Çok acil durumlarda SMS gönderilir (ek ücret uygulanabilir)"
            value={prefs.sms_urgent}
            onToggle={() => toggle('sms_urgent')}
          />
        </View>

        <View style={s.block}>
          <Text style={s.blockTitle}>VOXI AI</Text>
          <SwitchRow
            label="Sabah Brifingi"
            sub="Her sabah günün özeti ve yapılacaklar push bildirimi"
            value={prefs.morning_briefing}
            onToggle={() => toggle('morning_briefing')}
          />
        </View>

        <View style={s.infoBox}>
          <Text style={s.infoText}>
            💡 Bildirimler cihazınızın bildirimine göre çalışır. Cihaz ayarlarından VOXI bildirimlerini kapatırsanız bu tercihler geçersiz olur.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function SwitchRow({ label, sub, value, onToggle }: {
  label: string; sub: string; value: boolean; onToggle: () => void;
}) {
  return (
    <View style={r.row}>
      <View style={r.left}>
        <Text style={r.label}>{label}</Text>
        <Text style={r.sub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.dark }}
        thumbColor="#fff"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

const r = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  left:  { flex: 1, gap: 3 },
  label: { fontSize: 15, fontWeight: '600', color: colors.dark },
  sub:   { fontSize: 12, color: colors.muted, lineHeight: 17 },
});

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bg },
  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
  title:      { fontSize: 17, fontWeight: '700', color: colors.dark },
  back:       { fontSize: 16, color: colors.dark, fontWeight: '600' },
  content:    { paddingBottom: 60, gap: 16, paddingTop: 8 },
  block:      { backgroundColor: colors.card, borderTopWidth: 1, borderTopColor: colors.border, overflow: 'hidden' },
  blockTitle: { fontSize: 11, fontWeight: '800', color: colors.muted, letterSpacing: 1.2, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  infoBox:    { marginHorizontal: 16, padding: 14, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  infoText:   { fontSize: 13, color: colors.muted, lineHeight: 19 },
});
