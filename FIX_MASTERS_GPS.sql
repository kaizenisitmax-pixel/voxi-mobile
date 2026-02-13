-- Masters Tablosu GPS Kolonları Ekleme
-- Supabase Dashboard > SQL Editor'da çalıştırın

-- ============================================
-- MASTERS TABLOSUNA GPS KOLONLARI EKLE
-- ============================================

-- Latitude kolonu
ALTER TABLE masters 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,7);

-- Longitude kolonu
ALTER TABLE masters 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10,7);

-- Location address
ALTER TABLE masters 
ADD COLUMN IF NOT EXISTS location_address TEXT;

-- Service radius (km)
ALTER TABLE masters 
ADD COLUMN IF NOT EXISTS service_radius INTEGER DEFAULT 50;

-- Updated at kolonu (eğer yoksa)
ALTER TABLE masters 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- GPS INDEX EKLE (Performans için)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_masters_location 
ON masters(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================
-- KONTROL: TÜM KOLONLARI GÖSTER
-- ============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'masters' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
