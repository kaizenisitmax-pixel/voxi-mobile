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

async function enrichWithProfiles(messages: any[]): Promise<ChatMessage[]> {
  if (messages.length === 0) return [];

  const userIds = new Set<string>();
  messages.forEach(m => { if (m.user_id) userIds.add(m.user_id); });

  if (userIds.size === 0) return messages as ChatMessage[];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', Array.from(userIds));

  const profileMap = new Map(
    profiles?.map(p => [p.id, { full_name: p.full_name }]) || []
  );

  return messages.map(m => ({
    ...m,
    profiles: m.user_id ? profileMap.get(m.user_id) || null : null,
  })) as ChatMessage[];
}

export function useChat(cardId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('card_messages')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('[useChat] Fetch error:', fetchError.message);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data) {
        const enriched = await enrichWithProfiles(data);
        setMessages(enriched);
      }
    } catch (err: any) {
      console.error('[useChat] Exception:', err);
      setError(err.message || 'Mesajlar yüklenemedi');
    } finally {
      setLoading(false);
    }
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
            .select('*')
            .eq('id', payload.new.id)
            .single();
          if (data) {
            const [enriched] = await enrichWithProfiles([data]);
            setMessages(prev => [...prev, enriched]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cardId]);

  const sendMessage = async (content: string, type: string = 'text', extra: Partial<ChatMessage> = {}) => {
    try {
      const { error: sendError } = await supabase.from('card_messages').insert({
        card_id: cardId,
        user_id: user?.id,
        content,
        message_type: type,
        ...extra,
      });
      if (sendError) {
        console.error('[useChat] sendMessage error:', sendError);
        setError(sendError.message);
      }
      return { error: sendError };
    } catch (err: any) {
      console.error('[useChat] sendMessage exception:', err);
      setError(err.message || 'Mesaj gönderilemedi');
      return { error: err };
    }
  };

  return { messages, loading, error, sendMessage, fetchMessages };
}
