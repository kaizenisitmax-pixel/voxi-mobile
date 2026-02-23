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
  const [error, setError] = useState<string | null>(null);
  const [operationLoading, setOperationLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('card_depot_items')
        .select('*')
        .eq('card_id', cardId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setItems(data as DepotItem[]);
      }
    } catch (err: any) {
      console.error('[useDepot] Fetch error:', err);
      setError(err.message || 'Depo öğeleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = async (data: Partial<DepotItem>) => {
    setOperationLoading(true);
    try {
      const { error: addError } = await supabase.from('card_depot_items').insert({
        card_id: cardId,
        created_by: user?.id,
        ...data,
      });
      if (addError) {
        setError(addError.message);
      } else {
        fetchItems();
      }
      return { error: addError };
    } catch (err: any) {
      console.error('[useDepot] addItem error:', err);
      setError(err.message || 'Öğe eklenemedi');
      return { error: err };
    } finally {
      setOperationLoading(false);
    }
  };

  const togglePin = async (itemId: string, pinned: boolean) => {
    setOperationLoading(true);
    try {
      const { error: pinError } = await supabase
        .from('card_depot_items')
        .update({ pinned: !pinned })
        .eq('id', itemId);
      if (pinError) {
        setError(pinError.message);
      } else {
        fetchItems();
      }
    } catch (err: any) {
      console.error('[useDepot] togglePin error:', err);
      setError(err.message || 'Pin durumu değiştirilemedi');
    } finally {
      setOperationLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    setOperationLoading(true);
    try {
      const { error: delError } = await supabase
        .from('card_depot_items')
        .delete()
        .eq('id', itemId);
      if (delError) {
        setError(delError.message);
      } else {
        fetchItems();
      }
    } catch (err: any) {
      console.error('[useDepot] deleteItem error:', err);
      setError(err.message || 'Öğe silinemedi');
    } finally {
      setOperationLoading(false);
    }
  };

  const mediaItems = items.filter(i => ['media', 'document'].includes(i.type));
  const actionItems = items.filter(i => ['proposal', 'invoice', 'reminder', 'calendar_event'].includes(i.type));
  const commItems = items.filter(i => ['whatsapp', 'email', 'sms'].includes(i.type));
  const pinnedItems = items.filter(i => i.pinned);

  return {
    items, loading, error, operationLoading, fetchItems, addItem, togglePin, deleteItem,
    mediaItems, actionItems, commItems, pinnedItems,
  };
}
