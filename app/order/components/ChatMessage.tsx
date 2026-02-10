/**
 * ChatMessage Component (Order Chat Version)
 * WhatsApp-style message bubble for order chat
 */

import React from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const C = {
  text: '#1A1A1A',
  textSec: '#8E8E93',
  avatarBg: '#E5E5EA',
  avatarText: '#3C3C43',
  bubbleMe: '#1A1A1A',
  bubbleOther: '#F0EDE8',
  bubbleTextMe: '#FFFFFF',
  bubbleTextOther: '#1A1A1A',
};

interface Message {
  id: string;
  order_id: string;
  user_id?: string;
  type: 'message' | 'voice_note' | 'system' | 'ai';
  content?: string;
  voice_url?: string;
  voice_duration?: number;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
  profiles?: {
    full_name: string;
  };
  sender_name?: string;
  message_type?: 'text' | 'voice' | 'image' | 'file' | 'system';
  transcript?: string;
}

interface ChatMessageProps {
  message: Message;
  currentUserId?: string;
  onLongPress: (message: Message) => void;
}

function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function ChatMessage({ message, currentUserId, onLongPress }: ChatMessageProps) {
  const isOwnMessage = message.user_id === currentUserId;
  const senderName = message.profiles?.full_name || message.sender_name || 'Bilinmeyen';
  const initials = getInitials(senderName);
  const messageTime = new Date(message.created_at).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // System mesajları (ortada, gri)
  if (message.type === 'system') {
    return (
      <View style={{ alignItems: 'center', marginVertical: 8 }}>
        <Text style={{ fontSize: 12, color: '#8E8E93', fontStyle: 'italic', textAlign: 'center' }}>
          ⟳ {message.content}
        </Text>
      </View>
    );
  }

  // Sesli not
  if (message.type === 'voice_note' || message.message_type === 'voice') {
    return (
      <View
        style={{
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          marginVertical: 4,
          marginHorizontal: 12,
        }}
      >
        {/* İnisyal */}
        {!isOwnMessage && (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: C.avatarBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: C.avatarText }}>{initials}</Text>
          </View>
        )}

        <View style={{ maxWidth: '70%' }}>
          {/* İsim + Saat */}
          <Text
            style={{
              fontSize: 11,
              color: C.textSec,
              marginBottom: 4,
              textAlign: isOwnMessage ? 'right' : 'left',
              marginHorizontal: 4,
            }}
          >
            {senderName} · {messageTime}
          </Text>

          {/* Sesli not balonu */}
          <TouchableOpacity
            style={{
              backgroundColor: isOwnMessage ? C.bubbleMe : C.bubbleOther,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
            onPress={() => {
              Alert.alert('Sesli Not', 'Sesli not çalma özelliği yakında eklenecek');
            }}
          >
            <Ionicons name="play" size={16} color={isOwnMessage ? C.bubbleTextMe : C.bubbleTextOther} />
            <Text style={{ fontSize: 14, color: isOwnMessage ? C.bubbleTextMe : C.bubbleTextOther }}>
              Sesli not · {message.voice_duration || 0}s
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Dosya eki
  if (message.file_url && message.file_name) {
    return (
      <View
        style={{
          flexDirection: isOwnMessage ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          marginVertical: 4,
          marginHorizontal: 12,
        }}
      >
        {/* İnisyal */}
        {!isOwnMessage && (
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: C.avatarBg,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: C.avatarText }}>{initials}</Text>
          </View>
        )}

        <View style={{ maxWidth: '70%' }}>
          {/* İsim + Saat */}
          <Text
            style={{
              fontSize: 11,
              color: C.textSec,
              marginBottom: 4,
              textAlign: isOwnMessage ? 'right' : 'left',
              marginHorizontal: 4,
            }}
          >
            {senderName} · {messageTime}
          </Text>

          {/* Dosya balonu */}
          <TouchableOpacity
            style={{
              backgroundColor: isOwnMessage ? C.bubbleMe : C.bubbleOther,
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
            onPress={() => {
              if (message.file_url) {
                Linking.openURL(message.file_url);
              }
            }}
          >
            <Ionicons name="document-attach" size={16} color={isOwnMessage ? C.bubbleTextMe : C.bubbleTextOther} />
            <View style={{ flex: 1 }}>
              <Text
                style={{ fontSize: 14, color: isOwnMessage ? C.bubbleTextMe : C.bubbleTextOther }}
                numberOfLines={1}
              >
                {message.file_name}
              </Text>
              {message.file_size && (
                <Text style={{ fontSize: 11, color: isOwnMessage ? '#CCCCCC' : C.textSec }}>
                  {(message.file_size / 1024 / 1024).toFixed(1)} MB
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Normal metin mesajı
  return (
    <View
      style={{
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        marginVertical: 4,
        marginHorizontal: 12,
      }}
    >
      {/* İnisyal */}
      {!isOwnMessage && (
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: C.avatarBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: 'bold', color: C.avatarText }}>{initials}</Text>
        </View>
      )}

      <View style={{ maxWidth: '70%' }}>
        {/* İsim + Saat */}
        <Text
          style={{
            fontSize: 11,
            color: C.textSec,
            marginBottom: 4,
            textAlign: isOwnMessage ? 'right' : 'left',
            marginHorizontal: 4,
          }}
        >
          {senderName} · {messageTime}
        </Text>

        {/* Mesaj balonu */}
        <TouchableOpacity
          onLongPress={() => onLongPress(message)}
          style={{
            backgroundColor: isOwnMessage ? C.bubbleMe : C.bubbleOther,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ fontSize: 15, color: isOwnMessage ? C.bubbleTextMe : C.bubbleTextOther }}>
            {message.content || message.transcript}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
