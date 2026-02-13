-- VOXI Integration Schema
-- Oda tasarım + usta bulma platform tabloları

-- ============================================
-- 1. USTA PROFİLLERİ (Masters)
-- ============================================
CREATE TABLE IF NOT EXISTS masters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  specialties JSONB DEFAULT '[]'::jsonb, -- ["Yerden Isıtma", "Tadilat", "Boya"]
  service_areas JSONB DEFAULT '[]'::jsonb, -- ["Balıkesir", "Bursa"]
  experience_years INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
  total_jobs INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  bio TEXT,
  profile_image_url TEXT,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  lead_plan TEXT DEFAULT 'free' CHECK (lead_plan IN ('free', 'basic', 'premium')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usta profili güncellendiğinde updated_at otomatik güncelle
CREATE OR REPLACE FUNCTION update_masters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER masters_updated_at_trigger
BEFORE UPDATE ON masters
FOR EACH ROW
EXECUTE FUNCTION update_masters_updated_at();

-- ============================================
-- 2. TASARIMLAR (Designs - VOXI)
-- ============================================
CREATE TABLE IF NOT EXISTS designs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  original_image_url TEXT NOT NULL,
  ai_image_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ev', 'ticari', 'endustriyel', 'diger')),
  style TEXT NOT NULL, -- "Modern", "Minimalist", "İskandinav" vb.
  tool TEXT DEFAULT 'redesign' CHECK (tool IN ('redesign', 'furnish', 'remove_furniture', 'wall_paint', 'sketch_render', 'enhance', 'ai_expand')),
  room_type TEXT, -- "Oturma Odası", "Yatak Odası" vb.
  prompt TEXT, -- Replicate'e gönderilen prompt
  replicate_id TEXT, -- Replicate prediction ID
  processing_status TEXT DEFAULT 'processing' CHECK (processing_status IN ('processing', 'completed', 'failed')),
  is_favorite BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler (performans için)
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_category ON designs(category);
CREATE INDEX IF NOT EXISTS idx_designs_created_at ON designs(created_at DESC);

-- ============================================
-- 3. İŞ TALEPLERİ (Job Requests)
-- ============================================
CREATE TABLE IF NOT EXISTS job_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  design_id UUID REFERENCES designs(id) ON DELETE SET NULL,
  master_id UUID REFERENCES masters(id) ON DELETE SET NULL,
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  address TEXT,
  job_type TEXT, -- "Tadilat", "Boya", "Yerden Isıtma" vb.
  job_description TEXT,
  budget_min DECIMAL(10,2),
  budget_max DECIMAL(10,2),
  preferred_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'contacted', 'negotiating', 'accepted', 'in_progress', 'completed', 'cancelled')),
  master_response TEXT,
  master_quote DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_job_requests_customer_id ON job_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_master_id ON job_requests(master_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON job_requests(status);
CREATE INDEX IF NOT EXISTS idx_job_requests_location ON job_requests(latitude, longitude);

-- ============================================
-- 4. SOHBETLER (Chats)
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_request_id UUID REFERENCES job_requests(id) ON DELETE CASCADE UNIQUE,
  customer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_customer INTEGER DEFAULT 0,
  unread_count_master INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_chats_customer_id ON chats(customer_id);
CREATE INDEX IF NOT EXISTS idx_chats_master_id ON chats(master_id);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats(last_message_at DESC);

-- ============================================
-- 5. SOHBET MESAJLARI (Chat Messages)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  image_url TEXT,
  voice_url TEXT,
  voice_duration INTEGER, -- saniye
  design_image_url TEXT, -- Tasarım görseli paylaşıldıysa
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'voice', 'design', 'system')),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- Mesaj gönderildiğinde chat'in last_message'ını güncelle
CREATE OR REPLACE FUNCTION update_chat_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE chats
  SET 
    last_message = CASE 
      WHEN NEW.message_type = 'text' THEN NEW.message
      WHEN NEW.message_type = 'voice' THEN '🎤 Sesli mesaj'
      WHEN NEW.message_type = 'image' THEN '📷 Fotoğraf'
      WHEN NEW.message_type = 'design' THEN '🎨 Tasarım'
      ELSE NEW.message
    END,
    last_message_at = NEW.created_at,
    unread_count_customer = CASE 
      WHEN NEW.sender_id != customer_id THEN unread_count_customer + 1
      ELSE unread_count_customer
    END,
    unread_count_master = CASE 
      WHEN NEW.sender_id != (SELECT user_id FROM masters WHERE id = chats.master_id) THEN unread_count_master + 1
      ELSE unread_count_master
    END
  WHERE id = NEW.chat_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_update_last_message
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION update_chat_last_message();

-- ============================================
-- 6. DEĞERLENDİRMELER (Reviews)
-- ============================================
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_request_id UUID REFERENCES job_requests(id) ON DELETE CASCADE UNIQUE,
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  master_id UUID REFERENCES masters(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  images JSONB DEFAULT '[]'::jsonb, -- Tamamlanan iş fotoğrafları
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_reviews_master_id ON reviews(master_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Değerlendirme eklendiğinde usta profilini güncelle
CREATE OR REPLACE FUNCTION update_master_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE masters
  SET 
    rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM reviews
      WHERE master_id = NEW.master_id
    ),
    total_jobs = (
      SELECT COUNT(*)
      FROM reviews
      WHERE master_id = NEW.master_id
    )
  WHERE id = NEW.master_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reviews_update_master_rating
AFTER INSERT ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_master_rating();

-- ============================================
-- 7. PROFILES TABLOSUNA ROLE EKLEME
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'master', 'both'));

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) POLİCİES
-- ============================================

-- Masters tablosu RLS
ALTER TABLE masters ENABLE ROW LEVEL SECURITY;

-- DROP existing policies if they exist
DROP POLICY IF EXISTS "Ustalar herkese görünür" ON masters;
DROP POLICY IF EXISTS "Ustalar kendi profillerini güncelleyebilir" ON masters;
DROP POLICY IF EXISTS "Ustalar kendi profillerini oluşturabilir" ON masters;

-- Recreate policies
CREATE POLICY "masters_select_policy"
ON masters FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "masters_update_policy"
ON masters FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "masters_insert_policy"
ON masters FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Designs tablosu RLS
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kullanıcılar kendi tasarımlarını görebilir" ON designs;
DROP POLICY IF EXISTS "Kullanıcılar kendi tasarımlarını ekleyebilir" ON designs;
DROP POLICY IF EXISTS "Kullanıcılar kendi tasarımlarını güncelleyebilir" ON designs;
DROP POLICY IF EXISTS "Kullanıcılar kendi tasarımlarını silebilir" ON designs;

CREATE POLICY "designs_select_policy"
ON designs FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "designs_insert_policy"
ON designs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "designs_update_policy"
ON designs FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "designs_delete_policy"
ON designs FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Job Requests tablosu RLS
ALTER TABLE job_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Müşteriler kendi taleplerini görebilir"
ON job_requests FOR SELECT
TO authenticated
USING (
  auth.uid() = customer_id OR 
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);

CREATE POLICY "Müşteriler talep oluşturabilir"
ON job_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Müşteriler ve ustalar kendi taleplerini güncelleyebilir"
ON job_requests FOR UPDATE
TO authenticated
USING (
  auth.uid() = customer_id OR 
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);

-- Chats tablosu RLS
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sohbet katılımcıları sohbetleri görebilir"
ON chats FOR SELECT
TO authenticated
USING (
  auth.uid() = customer_id OR 
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);

CREATE POLICY "Sohbet katılımcıları sohbet oluşturabilir"
ON chats FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = customer_id OR 
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);

CREATE POLICY "Sohbet katılımcıları sohbeti güncelleyebilir"
ON chats FOR UPDATE
TO authenticated
USING (
  auth.uid() = customer_id OR 
  master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
);

-- Chat Messages tablosu RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sohbet katılımcıları mesajları görebilir"
ON chat_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chats
    WHERE chats.id = chat_messages.chat_id
    AND (
      chats.customer_id = auth.uid() OR 
      chats.master_id IN (SELECT id FROM masters WHERE user_id = auth.uid())
    )
  )
);

CREATE POLICY "Sohbet katılımcıları mesaj gönderebilir"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Mesaj sahipleri mesajları güncelleyebilir"
ON chat_messages FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id);

-- Reviews tablosu RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Herkes değerlendirmeleri görebilir"
ON reviews FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Müşteriler değerlendirme yapabilir"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reviewer_id);

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- GPS mesafesi hesaplama (km cinsinden)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL,
  lon1 DECIMAL,
  lat2 DECIMAL,
  lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  earth_radius CONSTANT DECIMAL := 6371; -- km
  dlat DECIMAL;
  dlon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lon2 - lon1);
  
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlon/2) * sin(dlon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Yakındaki ustaları bulma fonksiyonu
CREATE OR REPLACE FUNCTION find_nearby_masters(
  user_lat DECIMAL,
  user_lon DECIMAL,
  max_distance_km INTEGER DEFAULT 50,
  specialty_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  master_id UUID,
  name TEXT,
  specialties JSONB,
  rating DECIMAL,
  total_jobs INTEGER,
  distance_km DECIMAL,
  profile_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.specialties,
    m.rating,
    m.total_jobs,
    calculate_distance(user_lat, user_lon, m.latitude, m.longitude) AS distance_km,
    m.profile_image_url
  FROM masters m
  WHERE 
    m.is_active = true
    AND m.latitude IS NOT NULL
    AND m.longitude IS NOT NULL
    AND calculate_distance(user_lat, user_lon, m.latitude, m.longitude) <= max_distance_km
    AND (specialty_filter IS NULL OR m.specialties @> to_jsonb(ARRAY[specialty_filter]))
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MIGRATION TAMAMLANDI
-- ============================================

-- Başarı mesajı
DO $$
BEGIN
  RAISE NOTICE 'VOXI schema migration tamamlandı!';
  RAISE NOTICE 'Oluşturulan tablolar: masters, designs, job_requests, chats, chat_messages, reviews';
  RAISE NOTICE 'RLS policies aktif edildi.';
END $$;
