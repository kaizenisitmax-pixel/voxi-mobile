/**
 * VOXI - Specification Service
 * Şartname CRUD + Edge Function çağrıları
 */

import { supabase } from '../lib/supabase';

// ==========================================
// TYPES
// ==========================================

export interface Specification {
  id: string;
  design_id: string;
  user_id: string;
  title: string | null;
  category: string;
  service_type: string | null;
  style: string | null;
  room_details: Record<string, any>;
  ai_analysis: Record<string, any>;
  user_notes: string | null;
  status: 'analyzing' | 'draft' | 'ready' | 'sent' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface SpecificationItem {
  id: string;
  specification_id: string;
  item_type: 'material' | 'dimension' | 'finish' | 'color' | 'fixture' | 'note';
  category: string | null;
  label: string;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  ai_confidence: number | null;
  user_approved: boolean;
  user_note: string | null;
  source: 'ai_generated' | 'user_added' | 'master_added';
  sort_order: number;
  created_at: string;
}

export interface IsitmaxInquiry {
  id: string;
  specification_id: string;
  user_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  project_location: string | null;
  project_area_m2: number | null;
  message: string | null;
  email_sent: boolean;
  status: 'pending' | 'contacted' | 'quoted' | 'won' | 'lost';
  created_at: string;
}

export interface SpecificationWithItems extends Specification {
  items: SpecificationItem[];
}

export interface AnalyzeDesignInput {
  design_id: string;
  image_url: string;
  category: string;
  style: string;
}

export interface AnalyzeDesignResult {
  specification_id: string;
  item_count: number;
  summary: string | null;
}

export interface IsitmaxInquiryInput {
  specification_id: string;
  contact_name: string;
  contact_phone: string;
  contact_email?: string;
  project_location?: string;
  project_area_m2?: number;
  message?: string;
}

// ==========================================
// AI ANALYSIS (Edge Function)
// ==========================================

/**
 * Claude Vision ile tasarım görselini analiz et
 * Şartname + malzeme kalemleri otomatik oluşturulur
 */
export async function analyzeDesign(input: AnalyzeDesignInput): Promise<AnalyzeDesignResult> {
  console.log('🔍 Tasarım analiz ediliyor...', input.design_id);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  
  const response = await fetch(`${supabaseUrl}/functions/v1/analyze-design`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Analiz hatası: ${response.status}`);
  }

  const result = await response.json();
  console.log('✅ Analiz tamamlandı:', result);
  return result;
}

// ==========================================
// SPECIFICATION CRUD
// ==========================================

/**
 * Tasarım için mevcut şartname var mı kontrol et
 */
export async function getDesignSpecification(designId: string): Promise<{
  has_specification: boolean;
  specification_id?: string;
  status?: string;
  item_count?: number;
} | null> {
  try {
    const { data, error } = await supabase.rpc('get_design_specification', {
      p_design_id: designId,
    });

    if (error) {
      console.error('❌ Şartname kontrol hatası:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Şartname kontrol hatası:', error);
    return null;
  }
}

/**
 * Şartname detayını item'larıyla birlikte getir
 */
export async function getSpecificationWithItems(specId: string): Promise<SpecificationWithItems | null> {
  try {
    // Spec'i getir
    const { data: spec, error: specError } = await supabase
      .from('specifications')
      .select('*')
      .eq('id', specId)
      .single();

    if (specError) throw specError;

    // Item'ları getir
    const { data: items, error: itemsError } = await supabase
      .from('specification_items')
      .select('*')
      .eq('specification_id', specId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (itemsError) throw itemsError;

    return {
      ...spec,
      items: items || [],
    };
  } catch (error) {
    console.error('❌ Şartname getirme hatası:', error);
    return null;
  }
}

/**
 * Kullanıcının tüm şartnamelerini listele
 */
export async function listSpecifications(): Promise<Specification[]> {
  try {
    const { data, error } = await supabase
      .from('specifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('❌ Şartname listesi hatası:', error);
    return [];
  }
}

/**
 * Şartname güncelle (status, user_notes, room_details vb.)
 */
export async function updateSpecification(
  specId: string,
  updates: Partial<Pick<Specification, 'title' | 'status' | 'user_notes' | 'room_details'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('specifications')
      .update(updates)
      .eq('id', specId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Şartname güncelleme hatası:', error);
    return false;
  }
}

/**
 * Şartname sil (sadece draft durumunda)
 */
export async function deleteSpecification(specId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('specifications')
      .delete()
      .eq('id', specId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Şartname silme hatası:', error);
    return false;
  }
}

// ==========================================
// SPECIFICATION ITEMS CRUD
// ==========================================

/**
 * Item onayla/reddet
 */
export async function approveItem(itemId: string, approved: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('specification_items')
      .update({ user_approved: approved })
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Item onay hatası:', error);
    return false;
  }
}

/**
 * Item'a not ekle
 */
export async function addItemNote(itemId: string, note: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('specification_items')
      .update({ user_note: note })
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Item not hatası:', error);
    return false;
  }
}

/**
 * Yeni item ekle (kullanıcı tarafından)
 */
export async function addSpecItem(
  specId: string,
  item: Omit<SpecificationItem, 'id' | 'specification_id' | 'created_at'>
): Promise<SpecificationItem | null> {
  try {
    const { data, error } = await supabase
      .from('specification_items')
      .insert({
        specification_id: specId,
        ...item,
        source: 'user_added',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Item ekleme hatası:', error);
    return null;
  }
}

/**
 * Item sil
 */
export async function deleteSpecItem(itemId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('specification_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Item silme hatası:', error);
    return false;
  }
}

/**
 * Item güncelle
 */
export async function updateSpecItem(
  itemId: string,
  updates: Partial<Pick<SpecificationItem, 'label' | 'description' | 'quantity' | 'unit' | 'user_note' | 'user_approved'>>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('specification_items')
      .update(updates)
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('❌ Item güncelleme hatası:', error);
    return false;
  }
}

// ==========================================
// ISITMAX INQUIRY (Edge Function)
// ==========================================

/**
 * ISITMAX'a yapı talebi gönder
 */
export async function sendIsitmaxInquiry(input: IsitmaxInquiryInput): Promise<{
  inquiry_id: string;
  email_sent: boolean;
}> {
  console.log('📧 ISITMAX talebi gönderiliyor...');

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Oturum bulunamadı');

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

  const response = await fetch(`${supabaseUrl}/functions/v1/send-isitmax-inquiry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
      'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Gönderim hatası: ${response.status}`);
  }

  const result = await response.json();
  console.log('✅ ISITMAX talebi gönderildi:', result);
  return result;
}

// ==========================================
// HELPERS
// ==========================================

/**
 * Item type'a göre Türkçe label
 */
export function getItemTypeLabel(itemType: string): string {
  const labels: Record<string, string> = {
    material: 'Malzeme',
    dimension: 'Ölçü',
    finish: 'Kaplama',
    color: 'Renk',
    fixture: 'Donatı',
    note: 'Not',
  };
  return labels[itemType] || itemType;
}

/**
 * Item type'a göre icon
 */
export function getItemTypeIcon(itemType: string): string {
  const icons: Record<string, string> = {
    material: 'cube-outline',
    dimension: 'resize-outline',
    finish: 'color-palette-outline',
    color: 'color-fill-outline',
    fixture: 'bulb-outline',
    note: 'document-text-outline',
  };
  return icons[itemType] || 'ellipse-outline';
}

/**
 * Kategori'ye göre Türkçe label
 */
export function getItemCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    zemin: 'Zemin',
    duvar: 'Duvar',
    tavan: 'Tavan',
    mobilya: 'Mobilya',
    aydınlatma: 'Aydınlatma',
    taşıyıcı: 'Taşıyıcı',
    kaplama: 'Kaplama',
    havalandırma: 'Havalandırma',
    iklimlendirme: 'İklimlendirme',
    ısıtma: 'Isıtma',
    soğutma: 'Soğutma',
    yalıtım: 'Yalıtım',
    kontrol: 'Kontrol',
    çatı: 'Çatı',
    diğer: 'Diğer',
  };
  return labels[category] || category || 'Diğer';
}

/**
 * Status'a göre Türkçe label ve renk
 */
export function getStatusInfo(status: string): { label: string; color: string; bgColor: string } {
  const map: Record<string, { label: string; color: string; bgColor: string }> = {
    analyzing: { label: 'Analiz Ediliyor', color: '#F59E0B', bgColor: '#FEF3C7' },
    draft: { label: 'Taslak', color: '#6B7280', bgColor: '#F3F4F6' },
    ready: { label: 'Hazır', color: '#10B981', bgColor: '#D1FAE5' },
    sent: { label: 'Gönderildi', color: '#3B82F6', bgColor: '#DBEAFE' },
    completed: { label: 'Tamamlandı', color: '#059669', bgColor: '#A7F3D0' },
  };
  return map[status] || { label: status, color: '#6B7280', bgColor: '#F3F4F6' };
}

/**
 * AI confidence'ı yüzdeye çevir
 */
export function confidenceToPercent(confidence: number | null): string {
  if (confidence === null || confidence === undefined) return '-';
  return `%${Math.round(confidence * 100)}`;
}

/**
 * Gruplandırılmış itemları döndür
 */
export function groupItemsByCategory(items: SpecificationItem[]): Record<string, SpecificationItem[]> {
  const groups: Record<string, SpecificationItem[]> = {};
  
  for (const item of items) {
    const cat = item.category || 'diğer';
    if (!groups[cat]) {
      groups[cat] = [];
    }
    groups[cat].push(item);
  }

  return groups;
}
