import { useState, useEffect, useCallback, useRef } from 'react';
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
  archived_at: string | null;
  archive_reason: string | null;
  customers?: { id: string; company_name: string; contact_name: string | null; phone: string | null; email: string | null } | null;
  card_members?: CardMember[];
};

export type CardFilter = 'active' | 'archive' | 'all';

// Page size — enterprise'da daha az çekiyoruz, scroll ile yüklenecek
const PAGE_SIZE = 30;

async function enrichWithProfiles(data: any[]): Promise<Card[]> {
  if (!data || data.length === 0) return [];

  const allUserIds = new Set<string>();
  data.forEach(card => {
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

    data.forEach(card => {
      card.card_members?.forEach((m: any) => {
        m.profiles = profileMap.get(m.user_id) || null;
      });
    });
  }

  return data as Card[];
}

// ─── Ana hook: aktif kartlar (arşivlenmemiş) ─────────────────
export function useCards() {
  const { membership, user } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);

  const fetchCards = useCallback(async (reset = true) => {
    if (!membership?.workspace_id) return;

    if (reset) {
      pageRef.current = 0;
      setLoading(true);
    }

    setError(null);

    try {
      const from = pageRef.current * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: fetchError, count } = await supabase
        .from('cards')
        .select(`
          *,
          customers(id, company_name, contact_name, phone, email),
          card_members(user_id, role)
        `, { count: 'exact' })
        .eq('workspace_id', membership.workspace_id)
        .is('archived_at', null)          // Arşivlenmemişler
        .neq('status', 'cancelled')
        .order('last_message_at', { ascending: false })
        .range(from, to);

      if (fetchError) {
        console.error('[useCards] Fetch error:', fetchError.message);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      const enriched = await enrichWithProfiles(data || []);
      setHasMore((count ?? 0) > (from + enriched.length));

      if (reset) {
        setCards(enriched);
      } else {
        setCards(prev => [...prev, ...enriched]);
      }
      setLoading(false);
    } catch (err: any) {
      console.error('[useCards] Exception:', err);
      setError(err.message || 'Kartlar yüklenemedi');
      setLoading(false);
    }
  }, [membership?.workspace_id]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMore || loading) return;
    pageRef.current += 1;
    await fetchCards(false);
  }, [hasMore, loading, fetchCards]);

  useEffect(() => {
    fetchCards(true);
  }, [fetchCards]);

  // Realtime subscription
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
        () => { fetchCards(true); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [membership?.workspace_id, fetchCards]);

  // ─── Kart oluştur ───────────────────────────────────────────
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

      // Activity log
      await supabase.from('card_activity_log').insert({
        card_id: card.id,
        workspace_id: membership.workspace_id,
        user_id: user.id,
        action: 'created',
        new_value: { title: card.title, priority: card.priority },
      }).throwOnError().then(() => {}).catch(() => {});  // log hatası ana akışı engellemesin

      setCards(prev => [{ ...card, archived_at: null, archive_reason: null } as Card, ...prev]);
    }

    return { card, error };
  };

  // ─── Kart arşivle (manuel) ──────────────────────────────────
  const archiveCard = async (cardId: string) => {
    const { error } = await supabase
      .from('cards')
      .update({ archived_at: new Date().toISOString(), archive_reason: 'manual', archived_by: user?.id })
      .eq('id', cardId);

    if (!error) {
      setCards(prev => prev.filter(c => c.id !== cardId));
    }
    return { error };
  };

  // ─── Arşivden çıkar ────────────────────────────────────────
  const unarchiveCard = async (cardId: string) => {
    const { error } = await supabase
      .from('cards')
      .update({ archived_at: null, archive_reason: null, archived_by: null })
      .eq('id', cardId);

    if (!error) {
      await fetchCards(true);
    }
    return { error };
  };

  return { cards, loading, error, hasMore, fetchCards, fetchNextPage, createCard, archiveCard, unarchiveCard };
}


// ─── Arşiv hook'u: sadece arşivlenmiş kartlar ──────────────
export function useArchivedCards(searchQuery?: string) {
  const { membership } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const pageRef = useRef(0);

  const fetchArchived = useCallback(async (reset = true) => {
    if (!membership?.workspace_id) return;
    if (reset) { pageRef.current = 0; setLoading(true); }

    try {
      const from = pageRef.current * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('cards')
        .select(`
          *,
          customers(id, company_name, contact_name, phone, email),
          card_members(user_id, role)
        `, { count: 'exact' })
        .eq('workspace_id', membership.workspace_id)
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false })
        .range(from, to);

      // Full-text search
      if (searchQuery && searchQuery.trim().length > 1) {
        query = query.textSearch('title', searchQuery, { type: 'websearch', config: 'turkish' });
      }

      const { data, error, count } = await query;
      if (error) { setLoading(false); return; }

      const enriched = await enrichWithProfiles(data || []);
      setHasMore((count ?? 0) > (from + enriched.length));

      if (reset) setCards(enriched);
      else setCards(prev => [...prev, ...enriched]);
      setLoading(false);
    } catch { setLoading(false); }
  }, [membership?.workspace_id, searchQuery]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMore || loading) return;
    pageRef.current += 1;
    await fetchArchived(false);
  }, [hasMore, loading, fetchArchived]);

  useEffect(() => { fetchArchived(true); }, [fetchArchived]);

  return { cards, loading, hasMore, fetchNextPage, refresh: () => fetchArchived(true) };
}


// ─── Kart detay hook'u (tekil kart) ────────────────────────
export function useCardDetail(cardId: string | null) {
  const [card, setCard] = useState<Card | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCard = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('cards')
      .select(`
        *,
        customers(id, company_name, contact_name, phone, email),
        card_members(user_id, role)
      `)
      .eq('id', cardId)
      .single();

    if (!error && data) {
      const [enriched] = await enrichWithProfiles([data]);
      setCard(enriched);
    }
    setLoading(false);
  }, [cardId]);

  useEffect(() => { fetchCard(); }, [fetchCard]);

  return { card, loading, refresh: fetchCard };
}


// ─── Kart aktivite logu hook'u ──────────────────────────────
export function useCardActivity(cardId: string | null) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    supabase
      .from('card_activity_log')
      .select('*, profiles:user_id(full_name)')
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setActivities(data || []);
        setLoading(false);
      });
  }, [cardId]);

  return { activities, loading };
}
