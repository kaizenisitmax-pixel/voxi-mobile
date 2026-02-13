import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  message: string | null;
  image_url: string | null;
  voice_url: string | null;
  design_image_url: string | null;
  message_type: 'text' | 'image' | 'voice' | 'design' | 'system';
  is_read: boolean;
  created_at: string;
}

interface Chat {
  id: string;
  customer_id: string;
  master_id: string;
  master?: {
    name: string;
    profile_image_url: string | null;
  };
  customer?: {
    full_name: string;
  };
  design?: {
    ai_image_url: string;
  };
}

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const { session } = useAuth();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load chat details
  useEffect(() => {
    if (id) {
      loadChat();
      loadMessages();
    }
  }, [id]);

  const loadChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          master:masters!chats_master_id_fkey(name, profile_image_url),
          customer:profiles!chats_customer_id_fkey(full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setChat(data);
    } catch (error) {
      console.error('❌ Sohbet yüklenemedi:', error);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('chat_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data || []);

      // Mark as read
      await markMessagesAsRead();
    } catch (error) {
      console.error('❌ Mesajlar yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await supabase
        .from('chat_messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('chat_id', id)
        .neq('sender_id', session?.user?.id);

      // Reset unread count
      const isCustomer = chat?.customer_id === session?.user?.id;
      await supabase
        .from('chats')
        .update({
          [isCustomer ? 'unread_count_customer' : 'unread_count_master']: 0,
        })
        .eq('id', id);
    } catch (error) {
      console.error('❌ Okundu işaretlenemedi:', error);
    }
  };

  // Subscribe to real-time messages
  useEffect(() => {
    if (!id) return;

    console.log('📡 Realtime mesaj dinlemesi başlatıldı');

    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${id}`,
        },
        (payload) => {
          console.log('💬 Yeni mesaj:', payload);
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      console.log('🔌 Realtime bağlantısı kapatıldı');
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Scroll to bottom when messages load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const { error } = await supabase.from('chat_messages').insert({
        chat_id: id,
        sender_id: session?.user?.id,
        message: messageText,
        message_type: 'text',
      });

      if (error) throw error;

      console.log('✅ Mesaj gönderildi');
    } catch (error) {
      console.error('❌ Mesaj gönderilemedi:', error);
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = (message: Message) => {
    const isMine = message.sender_id === session?.user?.id;

    return (
      <View
        key={message.id}
        style={[styles.messageContainer, isMine && styles.messageContainerMine]}
      >
        <View style={[styles.messageBubble, isMine && styles.messageBubbleMine]}>
          {message.message_type === 'design' && message.design_image_url && (
            <Image
              source={{ uri: message.design_image_url }}
              style={styles.designImage}
              resizeMode="cover"
            />
          )}
          {message.message && (
            <Text style={[styles.messageText, isMine && styles.messageTextMine]}>
              {message.message}
            </Text>
          )}
          <Text
            style={[styles.messageTime, isMine && styles.messageTimeMine]}
          >
            {new Date(message.created_at).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#212121" />
        </View>
      </SafeAreaView>
    );
  }

  const chatName =
    chat?.customer_id === session?.user?.id
      ? chat?.master?.name || 'Usta'
      : chat?.customer?.full_name || 'Müşteri';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{chatName}</Text>
            <Text style={styles.headerSubtitle}>Aktif</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => {
              // TODO: Fotoğraf/dosya ekleme
            }}
          >
            <Ionicons name="add-circle" size={28} color="#8E8E93" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Mesaj yazın..."
            placeholderTextColor="#8E8E93"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    justifyContent: 'flex-start',
  },
  messageContainerMine: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  messageBubbleMine: {
    backgroundColor: '#212121',
    borderColor: '#212121',
  },
  messageText: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 22,
  },
  messageTextMine: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: '#8E8E93',
    marginTop: 4,
  },
  messageTimeMine: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  designImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 8,
  },
  attachButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    backgroundColor: '#F5F3EF',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#1A1A1A',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#212121',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
