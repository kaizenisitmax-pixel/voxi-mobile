/**
 * AIAnalysisLoader - AI analiz animasyonu
 * Claude Vision analiz ederken gösterilir
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIAnalysisLoaderProps {
  category?: string;
  style?: string;
}

const ANALYSIS_STEPS = [
  { icon: 'eye-outline', text: 'Görsel analiz ediliyor...' },
  { icon: 'cube-outline', text: 'Malzemeler tespit ediliyor...' },
  { icon: 'resize-outline', text: 'Ölçüler hesaplanıyor...' },
  { icon: 'color-palette-outline', text: 'Renkler ve kaplamalar belirleniyor...' },
  { icon: 'document-text-outline', text: 'Şartname oluşturuluyor...' },
];

export default function AIAnalysisLoader({ category, style }: AIAnalysisLoaderProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const stepAnim = useRef(new Animated.Value(0)).current;
  const [currentStep, setCurrentStep] = React.useState(0);

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Rotate animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Step progression
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev < ANALYSIS_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const step = ANALYSIS_STEPS[currentStep];

  return (
    <View style={styles.container}>
      {/* Central animation */}
      <Animated.View
        style={[
          styles.circle,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <View style={styles.innerCircle}>
            <Ionicons name="sparkles" size={36} color="#212121" />
          </View>
        </Animated.View>
      </Animated.View>

      {/* Title */}
      <Text style={styles.title}>AI Analiz Ediyor</Text>

      {/* Current step */}
      <View style={styles.stepContainer}>
        <Ionicons name={step.icon as any} size={18} color="#212121" />
        <Text style={styles.stepText}>{step.text}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dotsContainer}>
        {ANALYSIS_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index <= currentStep && styles.dotActive,
              index === currentStep && styles.dotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Context info */}
      {(category || style) && (
        <View style={styles.contextRow}>
          {category && (
            <View style={styles.contextBadge}>
              <Text style={styles.contextText}>{category}</Text>
            </View>
          )}
          {style && (
            <View style={styles.contextBadge}>
              <Text style={styles.contextText}>{style}</Text>
            </View>
          )}
        </View>
      )}

      <Text style={styles.subtitle}>
        Claude Vision görseli detaylı analiz ediyor.{'\n'}
        Bu işlem 10-20 saniye sürebilir.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  innerCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F5F3EF',
    borderRadius: 20,
  },
  stepText: {
    fontSize: 14,
    color: '#3C3C43',
    fontWeight: '500',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  dotActive: {
    backgroundColor: '#212121',
  },
  dotCurrent: {
    width: 20,
    borderRadius: 4,
  },
  contextRow: {
    flexDirection: 'row',
    gap: 8,
  },
  contextBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  contextText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
});
