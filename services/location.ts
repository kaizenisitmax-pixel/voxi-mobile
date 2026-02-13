// GPS Location Service for finding nearby masters

import * as Location from 'expo-location';
import { Alert } from 'react-native';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

/**
 * Request location permissions and get current location
 */
export async function getCurrentLocation(): Promise<LocationCoords | null> {
  try {
    // İzin kontrolü
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Konum İzni Gerekli',
        'Yakındaki ustaları bulmak için konum izni vermelisiniz',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Ayarları Aç', onPress: () => Location.requestForegroundPermissionsAsync() },
        ]
      );
      return null;
    }

    // Konum al (accuracy: High için)
    console.log('📍 Konum alınıyor...');
    
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    console.log('✅ Konum alındı:', location.coords);

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
  } catch (error) {
    console.error('❌ Konum alma hatası:', error);
    Alert.alert('Konum Hatası', 'Konumunuz alınamadı. Lütfen GPS\'inizi açın.');
    return null;
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

/**
 * Get address from coordinates (reverse geocoding)
 */
export async function getAddressFromCoords(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      const parts = [
        address.district || address.subregion,
        address.city,
        address.region,
      ].filter(Boolean);
      
      return parts.join(', ');
    }

    return null;
  } catch (error) {
    console.error('❌ Reverse geocoding hatası:', error);
    return null;
  }
}
