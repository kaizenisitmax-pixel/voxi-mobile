import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type CardMember = {
  user_id: string;
  role: string;
  profiles: { full_name: string | null } | null;
};

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
  customers?: { id: string; company_name: string; contact_name: string | null; phone: string | null; email: string | null } | null;
  card_members?: CardMember[];
};

export function useCards() {
  const { membership, user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCards = useCallback(async () => {
    if (!membership?.workspace_id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('cards')
        .select(`
          *,
          customers(id, company_name, contact_name, phone, email),
          card_members(user_id, role)
        `)
        .eq('workspace_id', membership.workspace_id)
        .neq('status', 'cancelled')
        .order('last_message_at', { ascending: false });

      if (fetchError) {
        console.error('[useCards] Fetch error:', fetchError.message);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const allUserIds = new Set<string>();
        data.forEach((card: any) => {
          card.card_members?.forEach((m: any) => allUserIds.add(m.user_id));
        });

        if (allUserIds.size > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', Array.from(allUserIds));

          const profileMap = new Map(
            profiles?.map(p => [p.id, { full_name: p.full_name }]) || []
          );

          data.forEach((card: any) => {
            card.card_members?.forEach((m: any) => {
              m.profiles = profileMap.get(m.user_id) || null;
            });
          });
        }

        setCards(data as Card[]);
      } else {
        setCards([]);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('[useCards] Exception:', err);
      setError(err.message || 'Kartlar yüklenemedi');
      setLoading(false);
    }
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
        () => { fetchCards(); }
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
    if (!membership || !user) return null;

    const { data: card, error } = await supabase
      .from('cards')
      .insert({
        ...data,
        workspace_id: membership.workspace_id,
        team_id: membership.team_id,
        created_by_user: user.id,
      })
      .select()
      .single();

    if (!error && card) {
      await supabase.from('card_members').insert({
        card_id: card.id,
        user_id: user.id,
        role: 'owner',
        added_by: user.id,
      });

      setCards(prev => [card as Card, ...prev]);
    }

    return { card, error };
  };

  return { cards, loading, error, fetchCards, createCard };
}
