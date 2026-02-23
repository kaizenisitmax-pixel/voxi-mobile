import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type Card = {
  id: string;
  workspace_id: string;
  team_id: string | null;
  customer_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  source_type: string | null;
  labels: string[];
  ai_summary: string | null;
  due_date: string | null;
  created_by_user: string | null;
  completed_at: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
  created_at: string;
  updated_at: string;
  customers?: { id: string; company_name: string; contact_name: string | null } | null;
};

export function useCards() {
  const { membership } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    if (!membership?.workspace_id) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('cards')
      .select('*, customers(id, company_name, contact_name)')
      .eq('workspace_id', membership.workspace_id)
      .neq('status', 'cancelled')
      .order('last_message_at', { ascending: false });

    if (!error && data) {
      setCards(data as Card[]);
    }
    setLoading(false);
  }, [membership?.workspace_id]);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    if (!membership?.workspace_id) return;

    const channel = supabase
      .channel('cards-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `workspace_id=eq.${membership.workspace_id}`,
        },
        () => {
          fetchCards();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [membership?.workspace_id, fetchCards]);

  const createCard = async (data: {
    title: string;
    description?: string;
    source_type?: string;
    source_data?: any;
    customer_id?: string;
    priority?: string;
    labels?: string[];
    ai_summary?: string;
  }) => {
    if (!membership) return null;

    const { data: card, error } = await supabase
      .from('cards')
      .insert({
        ...data,
        workspace_id: membership.workspace_id,
        team_id: membership.team_id,
        created_by_user: (await supabase.auth.getUser()).data.user?.id,
      })
      .select()
      .single();

    if (!error && card) {
      setCards(prev => [card as Card, ...prev]);
    }

    return { card, error };
  };

  return { cards, loading, fetchCards, createCard };
}
