import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type ChatMessage = {
  id: string;
  card_id: string;
  user_id: string | null;
  content: string | null;
  message_type: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  duration: number | null;
  metadata: any;
  reply_to: string | null;
  created_at: string;
  profiles?: { full_name: string | null } | null;
};

export function useChat(cardId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('card_messages')
      .select('*, profiles:user_id(full_name)')
      .eq('card_id', cardId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setMessages(data as ChatMessage[]);
    }
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat-${cardId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'card_messages', filter: `card_id=eq.${cardId}` },
        async (payload) => {
          const { data } = await supabase
            .from('card_messages')
            .select('*, profiles:user_id(full_name)')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            setMessages(prev => [...prev, data as ChatMessage]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cardId]);

  const sendMessage = async (content: string, type: string = 'text', extra: Partial<ChatMessage> = {}) => {
    const { error } = await supabase.from('card_messages').insert({
      card_id: cardId,
      user_id: user?.id,
      content,
      message_type: type,
      ...extra,
    });
    return { error };
  };

  return { messages, loading, sendMessage, fetchMessages };
}
