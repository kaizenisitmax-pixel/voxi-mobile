import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Modal,
} from 'react-native';
import { MOOD_OPTIONS, getMoodResponse } from '../lib/eq-data';
import type { MoodLevel } from '../lib/eq-data';
import { colors } from '../lib/colors';
import { supabase } from '../lib/supabase';

const WEB_API = 'https://voxi-web-production.vercel.app';

type Props = {
  workspaceId: string;
  onClose?: () => void;
  compact?: boolean;
};

export default function MoodCheckin({ workspaceId, onClose, compact = false }: Props) {
  const [selected, setSelected] = useState<MoodLevel | null>(null);
  const [voxiResponse, setVoxiResponse] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSelect = (level: MoodLevel) => {
    setSelected(level);
    setVoxiResponse(getMoodResponse(level));
  };

  const submitLevel = async (level: MoodLevel) => {
    setSubmitting(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      await fetch(`${WEB_API}/api/eq/mood`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ workspaceId, level }),
      });
      setDone(true);
      setTimeout(() => onClose?.(), 1500);
    } catch {
      // fail silently — EQ optional
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (!selected) return;
    submitLevel(selected);
  };

  if (compact) {
    if (done) return null;

    return (
      <View style={styles.compact}>
        <Text style={styles.compactTitle}>Bugün nasılsın?</Text>
        <View style={styles.emojiRow}>
          {MOOD_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.level}
              style={[styles.emojiBtn, selected === opt.level && styles.emojiBtnSelected]}
              onPress={() => {
                if (submitting || selected !== null) return;
                setSelected(opt.level);
                submitLevel(opt.level);
              }}
              disabled={submitting}
            >
              <Text style={styles.emojiText}>{opt.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {selected && (
          <Text style={styles.compactDone}>
            {MOOD_OPTIONS.find(m => m.level === selected)?.emoji} Kaydedildi
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {done ? (
        <View style={styles.doneContainer}>
          <Text style={styles.doneEmoji}>{MOOD_OPTIONS.find(m => m.level === selected)?.emoji}</Text>
          <Text style={styles.doneTitle}>Kaydedildi!</Text>
          {voxiResponse && <Text style={styles.voxiText}>{voxiResponse}</Text>}
        </View>
      ) : (
        <>
          <Text style={styles.title}>Bugün nasıl hissediyorsun?</Text>
          <Text style={styles.subtitle}>Ekibinle anonim olarak paylaşılır 💙</Text>

          <View style={styles.emojiRow}>
            {MOOD_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.level}
                style={[styles.moodBtn, selected === opt.level && styles.moodBtnSelected]}
                onPress={() => handleSelect(opt.level)}
                activeOpacity={0.7}
              >
                <Text style={styles.moodEmoji}>{opt.emoji}</Text>
                <Text style={[styles.moodLabel, selected === opt.level && styles.moodLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {voxiResponse && (
            <View style={styles.voxiCard}>
              <Text style={styles.voxiLabel}>VOXI diyor ki:</Text>
              <Text style={styles.voxiText}>{voxiResponse}</Text>
            </View>
          )}

          {selected && (
            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Kaydediliyor...' : 'Paylaş →'}
              </Text>
            </TouchableOpacity>
          )}

          {onClose && (
            <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
              <Text style={styles.skipText}>Şimdi değil</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: colors.muted, textAlign: 'center', marginBottom: 28 },
  emojiRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  moodBtn: {
    alignItems: 'center', paddingVertical: 14, paddingHorizontal: 10,
    borderRadius: 16, borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.bg, minWidth: 56,
  },
  moodBtnSelected: { borderColor: colors.dark, backgroundColor: colors.dark },
  moodEmoji: { fontSize: 28, marginBottom: 4 },
  moodLabel: { fontSize: 10, fontWeight: '600', color: colors.muted, textAlign: 'center' },
  moodLabelSelected: { color: '#FFF' },
  voxiCard: {
    backgroundColor: colors.bg, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border, marginBottom: 20,
  },
  voxiLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  voxiText: { fontSize: 15, color: colors.dark, lineHeight: 22 },
  submitBtn: {
    backgroundColor: colors.dark, borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  skipBtn: { alignItems: 'center', paddingVertical: 12 },
  skipText: { fontSize: 14, color: colors.muted },
  doneContainer: { alignItems: 'center', paddingVertical: 30 },
  doneEmoji: { fontSize: 60, marginBottom: 12 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.dark, marginBottom: 12 },
  // compact
  compact: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12,
  },
  compactTitle: { fontSize: 13, fontWeight: '600', color: colors.dark },
  compactDone: { fontSize: 12, color: colors.muted, marginLeft: 4 },
  emojiBtn: { padding: 6, borderRadius: 8 },
  emojiBtnSelected: { backgroundColor: colors.dark },
  emojiText: { fontSize: 22 },
});
