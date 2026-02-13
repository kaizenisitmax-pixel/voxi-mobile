import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistance } from '../../services/location';

interface Master {
  id: string;
  name: string;
  specialties: string[];
  rating: number;
  total_jobs: number;
  distance_km?: number;
  profile_image_url: string | null;
  experience_years?: number;
}

interface MasterCardProps {
  master: Master;
  onPress: () => void;
}

export default function MasterCard({ master, onPress }: MasterCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Profile Image */}
        <View style={styles.profileContainer}>
          {master.profile_image_url ? (
            <Image
              source={{ uri: master.profile_image_url }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Ionicons name="person" size={32} color="#8E8E93" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.name}>{master.name}</Text>

          {/* Specialties */}
          <View style={styles.specialties}>
            {master.specialties.slice(0, 2).map((specialty, index) => (
              <View key={index} style={styles.specialtyBadge}>
                <Text style={styles.specialtyText}>{specialty}</Text>
              </View>
            ))}
            {master.specialties.length > 2 && (
              <Text style={styles.moreSpecialties}>
                +{master.specialties.length - 2}
              </Text>
            )}
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            {/* Rating */}
            <View style={styles.stat}>
              <Ionicons name="star" size={14} color="#FFB800" />
              <Text style={styles.statText}>
                {master.rating > 0 ? master.rating.toFixed(1) : 'Yeni'}
              </Text>
            </View>

            {/* Jobs */}
            <View style={styles.stat}>
              <Ionicons name="checkmark-circle" size={14} color="#34C759" />
              <Text style={styles.statText}>{master.total_jobs} iş</Text>
            </View>

            {/* Distance */}
            {master.distance_km !== undefined && (
              <View style={styles.stat}>
                <Ionicons name="location" size={14} color="#007AFF" />
                <Text style={styles.statText}>
                  {formatDistance(master.distance_km)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F3EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  specialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  specialtyBadge: {
    backgroundColor: '#F5F3EF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specialtyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#3C3C43',
  },
  moreSpecialties: {
    fontSize: 12,
    color: '#8E8E93',
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#3C3C43',
  },
});
