// Kutlama Motoru: Doğum günü, iş yıldönümü, milestone popup
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { colors } from '../lib/colors';

type Celebration = {
  type: 'work_anniversary' | 'milestone' | 'birthday';
  name: string;
  message: string;
  emoji: string;
};

type Props = {
  celebrations: Celebration[];
  onClose: () => void;
};

export default function EQCelebration({ celebrations, onClose }: Props) {
  const [current, setCurrent] = useState(0);
  const scaleAnim = new Animated.Value(0.5);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 5,
    }).start();
  }, [current]);

  if (celebrations.length === 0) return null;

  const cel = celebrations[current];

  const handleNext = () => {
    if (current < celebrations.length - 1) {
      setCurrent(current + 1);
    } else {
      onClose();
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.emoji}>{cel.emoji}</Text>
          <Text style={styles.title}>
            {cel.type === 'work_anniversary' ? '🎂 İş Yıldönümü!' :
             cel.type === 'milestone' ? '🏆 Milestone!' :
             '🎉 Kutlama!'}
          </Text>
          <Text style={styles.message}>{cel.message}</Text>

          {current < celebrations.length - 1 && (
            <Text style={styles.counter}>{current + 1}/{celebrations.length}</Text>
          )}

          <TouchableOpacity style={styles.btn} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.btnText}>
              {current < celebrations.length - 1 ? 'Sonraki →' : 'Harika! 🎉'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={onClose}>
            <Text style={styles.skipText}>Geç</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    backgroundColor: '#FFF', borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  emoji: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.dark, marginBottom: 12, textAlign: 'center' },
  message: { fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  counter: { fontSize: 13, color: colors.muted, marginBottom: 12 },
  btn: {
    backgroundColor: colors.dark, borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 32, alignItems: 'center', width: '100%', marginBottom: 12,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  skipBtn: { paddingVertical: 8 },
  skipText: { fontSize: 14, color: colors.muted },
});
