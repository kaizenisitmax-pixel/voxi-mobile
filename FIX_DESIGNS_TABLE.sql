-- EvimAI Designs Tablosu Eksik Kolon Düzeltmesi
-- Bu SQL kodunu Supabase Dashboard > SQL Editor'da çalıştırın

-- ============================================
-- DESIGNS TABLOSUNA EKSİK KOLONLARI EKLE
-- ============================================

-- 1. Prompt kolonu (Replicate'e gönderilen prompt)
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS prompt TEXT;

-- 2. Replicate prediction ID
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS replicate_id TEXT;

-- 3. Processing status (KRİTİK!)
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'processing' 
CHECK (processing_status IN ('processing', 'completed', 'failed'));

-- 4. Favori işareti
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- 5. Görüntülenme sayısı
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- 6. Paylaşım sayısı
ALTER TABLE designs 
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- ============================================
-- KONTROL: TÜM KOLONLARI GÖSTER
-- ============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'designs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Beklenen: 15 kolon (id, user_id, original_image_url, ai_image_url, 
--                      category, style, tool, room_type, prompt, 
--                      replicate_id, processing_status, is_favorite, 
--                      view_count, share_count, created_at)
