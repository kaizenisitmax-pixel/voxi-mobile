/**
 * MediaGrid Component
 * 3-column grid for order media (photos, files, voice notes)
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#F8F7F5',
  card: '#FFFFFF',
  border: '#E5E5EA',
  text: '#1A1A1A',
  textSec: '#8E8E93',
  primary: '#1A1A1A',
};

interface MediaItem {
  id: string;
  order_id: string;
  file_url: string;
  file_name: string;
  file_type: 'image' | 'video' | 'audio' | 'document';
  file_size?: number;
  duration?: number;
  thumbnail_url?: string;
  created_at: string;
  created_by?: string;
  profiles?: {
    full_name: string;
  };
}

interface MediaGridProps {
  media: MediaItem[];
  onMediaPress: (item: MediaItem) => void;
  onAddPress: () => void;
}

export default function MediaGrid({ media, onMediaPress, onAddPress }: MediaGridProps) {
  const renderMediaItem = ({ item }: { item: MediaItem }) => {
    const isImage = item.file_type === 'image';
    const isVideo = item.file_type === 'video';
    const isAudio = item.file_type === 'audio';
    const isDocument = item.file_type === 'document';

    return (
      <TouchableOpacity
        onPress={() => onMediaPress(item)}
        style={{
          flex: 1,
          aspectRatio: 1,
          margin: 2,
          backgroundColor: C.card,
          borderRadius: 8,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: C.border,
        }}
      >
        {/* Image/Video Thumbnail */}
        {(isImage || isVideo) && (
          <Image
            source={{ uri: item.thumbnail_url || item.file_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        )}

        {/* Audio Icon */}
        {isAudio && (
          <View
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F0EDE8',
            }}
          >
            <Ionicons name="musical-notes" size={32} color={C.textSec} />
            {item.duration && (
              <Text style={{ fontSize: 12, color: C.textSec, marginTop: 8 }}>
                {Math.floor(item.duration / 60)}:{String(item.duration % 60).padStart(2, '0')}
              </Text>
            )}
          </View>
        )}

        {/* Document Icon */}
        {isDocument && (
          <View
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F0EDE8',
              padding: 8,
            }}
          >
            <Ionicons name="document-text" size={32} color={C.textSec} />
            <Text
              style={{ fontSize: 10, color: C.textSec, marginTop: 8, textAlign: 'center' }}
              numberOfLines={2}
            >
              {item.file_name}
            </Text>
          </View>
        )}

        {/* Video Play Icon Overlay */}
        {isVideo && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
          >
            <Ionicons name="play-circle" size={40} color="#FFFFFF" />
          </View>
        )}

        {/* File Type Badge */}
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            backgroundColor: 'rgba(0,0,0,0.6)',
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 4,
          }}
        >
          <Text style={{ fontSize: 10, color: '#FFFFFF', fontWeight: '600' }}>
            {item.file_type.toUpperCase()}
          </Text>
        </View>

        {/* File Size */}
        {item.file_size && (
          <View
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              backgroundColor: 'rgba(0,0,0,0.6)',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <Text style={{ fontSize: 10, color: '#FFFFFF' }}>
              {(item.file_size / 1024 / 1024).toFixed(1)} MB
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderAddButton = () => (
    <TouchableOpacity
      onPress={onAddPress}
      style={{
        flex: 1,
        aspectRatio: 1,
        margin: 2,
        backgroundColor: C.card,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: C.border,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="add-circle-outline" size={40} color={C.textSec} />
      <Text style={{ fontSize: 12, color: C.textSec, marginTop: 8 }}>Ekle</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={[...media, { id: '__add__' } as any]}
      renderItem={({ item }) => {
        if (item.id === '__add__') {
          return renderAddButton();
        }
        return renderMediaItem({ item });
      }}
      keyExtractor={(item) => item.id}
      numColumns={3}
      contentContainerStyle={{ padding: 10 }}
      ListEmptyComponent={
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="images-outline" size={48} color={C.textSec} />
          <Text style={{ fontSize: 15, color: C.textSec, marginTop: 16, textAlign: 'center' }}>
            Henüz medya eklenmemiş
          </Text>
        </View>
      }
    />
  );
}
