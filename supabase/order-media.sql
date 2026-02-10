-- ════════════════════════════════════════════════════════════════
-- VOXI — ORDER MEDIA (Sipariş Medya Galerisi)
-- ════════════════════════════════════════════════════════════════
-- 3-sütun grid görünümü
-- Fotoğraf, PDF, Document, Audio destekler
-- AI Vision analiz özelliği
-- ════════════════════════════════════════════════════════════════

-- 1. order_media tablosunu oluştur
CREATE TABLE IF NOT EXISTS order_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('image', 'pdf', 'document', 'audio')),
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  ai_analysis text,
  uploaded_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- 2. RLS politikaları
ALTER TABLE order_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "om_sel" ON order_media;
CREATE POLICY "om_sel" 
  ON order_media FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "om_ins" ON order_media;
CREATE POLICY "om_ins" 
  ON order_media FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "om_del" ON order_media;
CREATE POLICY "om_del" 
  ON order_media FOR DELETE 
  TO authenticated 
  USING (auth.uid() = uploaded_by);

DROP POLICY IF EXISTS "om_upd" ON order_media;
CREATE POLICY "om_upd" 
  ON order_media FOR UPDATE 
  TO authenticated 
  USING (true);

-- 3. İndeksler
CREATE INDEX IF NOT EXISTS idx_om_order 
  ON order_media(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_om_type 
  ON order_media(type);

-- 4. Tablo bilgileri
COMMENT ON TABLE order_media IS 'Sipariş medya galerisi - fotoğraf, PDF, döküman, ses';
COMMENT ON COLUMN order_media.type IS 'image, pdf, document, audio';
COMMENT ON COLUMN order_media.ai_analysis IS 'Claude Vision ile görsel analiz sonucu';
COMMENT ON COLUMN order_media.file_size IS 'Dosya boyutu (byte)';

-- ════════════════════════════════════════════════════════════════
-- SUPABASE STORAGE BUCKET
-- ════════════════════════════════════════════════════════════════
-- Bu SQL çalıştıktan sonra Supabase Dashboard → Storage'dan
-- 'order-media' bucket'ı manuel oluştur (public)
-- ════════════════════════════════════════════════════════════════
