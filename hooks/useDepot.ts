import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type DepotItem = {
  id: string;
  card_id: string;
  customer_id: string | null;
  type: string;
  title: string | null;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  metadata: any;
  pinned: boolean;
  sort_order: number;
  ref_id: string | null;
  ref_type: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function useDepot(cardId: string) {
  const { user } = useAuth();
  const [items, setItems] = useState<DepotItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('card_depot_items')
      .select('*')
      .eq('card_id', cardId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(data as DepotItem[]);
    }
    setLoading(false);
  }, [cardId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (data: Partial<DepotItem>) => {
    const { error } = await supabase.from('card_depot_items').insert({
      card_id: cardId,
      created_by: user?.id,
      ...data,
    });
    if (!error) fetchItems();
    return { error };
  };

  const togglePin = async (itemId: string, pinned: boolean) => {
    await supabase.from('card_depot_items').update({ pinned: !pinned }).eq('id', itemId);
    fetchItems();
  };

  const deleteItem = async (itemId: string) => {
    await supabase.from('card_depot_items').delete().eq('id', itemId);
    fetchItems();
  };

  const mediaItems = items.filter(i => ['media', 'document'].includes(i.type));
  const actionItems = items.filter(i => ['proposal', 'invoice', 'reminder', 'calendar_event'].includes(i.type));
  const commItems = items.filter(i => ['whatsapp', 'email', 'sms'].includes(i.type));
  const pinnedItems = items.filter(i => i.pinned);

  return {
    items, loading, fetchItems, addItem, togglePin, deleteItem,
    mediaItems, actionItems, commItems, pinnedItems,
  };
}
