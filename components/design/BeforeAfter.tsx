import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, PanResponder, Animated, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface BeforeAfterProps {
  beforeImage: string;
  afterImage: string;
  onClose?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BeforeAfter({ beforeImage, afterImage, onClose }: BeforeAfterProps) {
  const insets = useSafeAreaInsets();
  const [sliderPosition] = useState(new Animated.Value(SCREEN_WIDTH / 2));
  const [currentPosition, setCurrentPosition] = useState(SCREEN_WIDTH / 2);
  const [isBeforeLoaded, setIsBeforeLoaded] = useState(false);
  const [isAfterLoaded, setIsAfterLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Debug log
  React.useEffect(() => {
    console.log('[BeforeAfter] beforeImage:', beforeImage);
    console.log('[BeforeAfter] afterImage:', afterImage);
  }, [beforeImage, afterImage]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      sliderPosition.setOffset(currentPosition);
      sliderPosition.setValue(0);
    },
    onPanResponderMove: (_, gestureState) => {
      const newPosition = currentPosition + gestureState.dx;
      if (newPosition >= 0 && newPosition <= SCREEN_WIDTH) {
        sliderPosition.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      sliderPosition.flattenOffset();
      const newPosition = Math.max(0, Math.min(SCREEN_WIDTH, currentPosition + gestureState.dx));
      setCurrentPosition(newPosition);
    },
  });

  return (
    <View style={styles.container}>
      {/* After Image (Full Background) - SONRA */}
      <Image
        key={`after-${afterImage}`}
        source={{ uri: afterImage, cache: 'reload' }}
        style={styles.fullImage}
        resizeMode="cover"
        onLoad={() => {
          console.log('✅ After image loaded');
          setIsAfterLoaded(true);
        }}
        onError={(error) => {
          console.error('❌ After image error:', error.nativeEvent);
          setImageError(true);
        }}
      />

      {/* Before Image (Clipped Overlay) - ÖNCE */}
      <Animated.View
        style={[
          styles.beforeContainer,
          {
            width: sliderPosition,
          },
        ]}
      >
        <Image
          key={`before-${beforeImage}`}
          source={{ uri: beforeImage, cache: 'reload' }}
          style={[styles.fullImage, { width: SCREEN_WIDTH }]}
          resizeMode="cover"
          onLoad={() => {
            console.log('✅ Before image loaded');
            setIsBeforeLoaded(true);
          }}
          onError={(error) => {
            console.error('❌ Before image error:', error.nativeEvent);
            setImageError(true);
          }}
        />
      </Animated.View>

      {/* Loading indicator */}
      {(!isBeforeLoaded || !isAfterLoaded) && !imageError && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Görseller yükleniyor...</Text>
        </View>
      )}

      {/* Error indicator */}
      {imageError && (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color="#FFFFFF" />
          <Text style={styles.loadingText}>Görsel yüklenemedi</Text>
        </View>
      )}

      <View style={styles.overlayContainer}>

        {/* Slider Handle */}
        <Animated.View
          style={[
            styles.sliderHandle,
            {
              left: Animated.subtract(sliderPosition, 20),
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleCircle}>
            <Ionicons name="swap-horizontal" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.handleLine} />
        </Animated.View>

        {/* Slider Handle */}
        <Animated.View
          style={[
            styles.sliderHandle,
            {
              left: Animated.subtract(sliderPosition, 20),
            },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleCircle}>
            <Ionicons name="swap-horizontal" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.handleLine} />
        </Animated.View>

        {/* Labels - Kompakt ve SafeArea içinde */}
        <View style={[styles.labelContainer, { top: insets.top + 12 }]}>
          <View style={styles.labelLeft}>
            <Text style={styles.labelText}>ÖNCE</Text>
          </View>
          <View style={styles.labelRight}>
            <Text style={styles.labelText}>SONRA</Text>
          </View>
        </View>

        {/* Close Button - SafeArea içinde, label'ların altında */}
        {onClose && (
          <TouchableOpacity 
            style={[styles.closeButton, { top: insets.top + 56 }]}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            <View style={styles.closeButtonInner}>
              <Ionicons
                name="close"
                size={28}
                color="#FFFFFF"
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: '100%',
  },
  beforeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sliderHandle: {
    position: 'absolute',
    top: 0,
    height: '100%',
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleLine: {
    position: 'absolute',
    width: 3,
    height: '100%',
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
  },
  handleCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  labelContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 50,
  },
  labelLeft: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  labelRight: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 100,
  },
  closeButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
