-- =====================================================
-- EvimAI Adım 2: Şartname Sistemi - SQL Migration
-- Tarih: 13 Şubat 2026
-- Supabase SQL Editor'da çalıştırın
-- =====================================================

-- =====================================================
-- 1. SPECIFICATIONS (Şartname Ana Kayıt)
-- =====================================================
CREATE TABLE IF NOT EXISTS specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- Meta bilgi
  title TEXT,  -- "Salon Modern Tasarım Şartnamesi"
  category TEXT NOT NULL CHECK (category IN ('decoration', 'construction', 'hvac')),
  service_type TEXT,  -- ev | commercial | industrial | other
  style TEXT,         -- modern | luxury | greenhouse ...
  
  -- Oda/Proje detayları
  room_details JSONB DEFAULT '{}',
  /*
    {
      "room_type": "salon",
      "area_m2": 35,
      "current_condition": "boş",
      "ceiling_height_m": 2.8,
      "window_count": 2
    }
  */
  
  -- AI analiz sonucu (ham)
  ai_analysis JSONB DEFAULT '{}',
  /*
    Claude Vision'ın döndürdüğü tam JSON.
    Referans olarak saklanır, item'lar ayrı tabloda.
  */
  
  -- Kullanıcı notları
  user_notes TEXT,
  
  -- Durum
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'analyzing',   -- AI analiz ediyor
    'draft',       -- Kullanıcı düzenliyor
    'ready',       -- Kullanıcı onayladı, gönderime hazır
    'sent',        -- Ustaya/ISITMAX'a gönderildi
    'completed'    -- İş tamamlandı
  )),
  
  -- Zaman damgaları
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_specifications_design ON specifications(design_id);
CREATE INDEX idx_specifications_user ON specifications(user_id);
CREATE INDEX idx_specifications_status ON specifications(status);
CREATE INDEX idx_specifications_category ON specifications(category);

-- =====================================================
-- 2. SPECIFICATION_ITEMS (Malzeme/Ölçü Kalemleri)
-- =====================================================
CREATE TABLE IF NOT EXISTS specification_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specification_id UUID NOT NULL REFERENCES specifications(id) ON DELETE CASCADE,
  
  -- Kalem bilgisi
  item_type TEXT NOT NULL CHECK (item_type IN (
    'material',    -- Malzeme (parke, boya, cam, profil)
    'dimension',   -- Ölçü (en, boy, yükseklik)
    'finish',      -- Kaplama/finish (mat, parlak, saten)
    'color',       -- Renk (duvar rengi, mobilya rengi)
    'fixture',     -- Armatür/donatı (avize, musluk, pencere)
    'note'         -- Genel not/açıklama
  )),
  
  -- Gruplandırma
  category TEXT,  -- zemin | duvar | tavan | mobilya | aydınlatma | taşıyıcı | kaplama | havalandırma | diğer
  
  -- İçerik
  label TEXT NOT NULL,        -- Görünen isim: "Meşe Parke", "Alüminyum Profil 40x80"
  description TEXT,           -- Detaylı açıklama
  
  -- Miktar (opsiyonel)
  quantity DECIMAL,           -- Miktar (AI tahmini veya kullanıcı girişi)
  unit TEXT,                  -- m² | m | adet | kg | lt | set | takım
  
  -- AI güven skoru
  ai_confidence DECIMAL CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  
  -- Kullanıcı etkileşimi
  user_approved BOOLEAN DEFAULT false,
  user_note TEXT,             -- Kullanıcının eklediği not
  
  -- Kaynak
  source TEXT NOT NULL DEFAULT 'ai_generated' CHECK (source IN (
    'ai_generated',   -- Claude Vision tarafından çıkarıldı
    'user_added',     -- Kullanıcı manuel ekledi
    'master_added'    -- Usta ekledi (ileride)
  )),
  
  -- Sıralama
  sort_order INT DEFAULT 0,
  
  -- Zaman damgası
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_spec_items_spec ON specification_items(specification_id);
CREATE INDEX idx_spec_items_type ON specification_items(item_type);
CREATE INDEX idx_spec_items_category ON specification_items(category);

-- =====================================================
-- 3. ISITMAX_INQUIRIES (Yapı Kategorisi İletişim)
-- =====================================================
CREATE TABLE IF NOT EXISTS isitmax_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specification_id UUID NOT NULL REFERENCES specifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- İletişim bilgileri
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  
  -- Proje bilgileri
  project_location TEXT,      -- İl/ilçe
  project_area_m2 DECIMAL,    -- Tahmini alan
  message TEXT,               -- Ek mesaj
  
  -- Takip
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  
  -- ISITMAX tarafı
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Yeni talep
    'contacted',    -- İletişime geçildi
    'quoted',       -- Teklif verildi
    'won',          -- İş alındı
    'lost'          -- İş kaybedildi
  )),
  internal_notes TEXT,  -- ISITMAX iç notları
  
  -- Zaman damgası
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index'ler
CREATE INDEX idx_isitmax_spec ON isitmax_inquiries(specification_id);
CREATE INDEX idx_isitmax_user ON isitmax_inquiries(user_id);
CREATE INDEX idx_isitmax_status ON isitmax_inquiries(status);

-- =====================================================
-- 4. RLS POLİCY'LER
-- =====================================================

-- Specifications RLS
ALTER TABLE specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own specifications"
  ON specifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own specifications"
  ON specifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own specifications"
  ON specifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own draft specifications"
  ON specifications FOR DELETE
  USING (auth.uid() = user_id AND status = 'draft');

-- Specification Items RLS
ALTER TABLE specification_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spec items"
  ON specification_items FOR SELECT
  USING (
    specification_id IN (
      SELECT id FROM specifications WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own spec items"
  ON specification_items FOR ALL
  USING (
    specification_id IN (
      SELECT id FROM specifications WHERE user_id = auth.uid()
    )
  );

-- ISITMAX Inquiries RLS
ALTER TABLE isitmax_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own inquiries"
  ON isitmax_inquiries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create inquiries"
  ON isitmax_inquiries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Service role (Edge Functions) tam erişim
-- Edge Function'lar service_role key kullanır, RLS bypass eder

-- =====================================================
-- 5. TRIGGER: updated_at Otomatik Güncelleme
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER specifications_updated_at
  BEFORE UPDATE ON specifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER isitmax_inquiries_updated_at
  BEFORE UPDATE ON isitmax_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 6. HELPER RPC: Şartname ile Item'ları Birlikte Getir
-- =====================================================

CREATE OR REPLACE FUNCTION get_specification_with_items(spec_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'specification', row_to_json(s),
    'items', COALESCE(
      (SELECT json_agg(row_to_json(si) ORDER BY si.sort_order, si.created_at)
       FROM specification_items si
       WHERE si.specification_id = s.id),
      '[]'::json
    ),
    'design', row_to_json(d)
  )
  INTO result
  FROM specifications s
  JOIN designs d ON d.id = s.design_id
  WHERE s.id = spec_id AND s.user_id = auth.uid();

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 7. HELPER RPC: Tasarım için Şartname Var mı?
-- =====================================================

CREATE OR REPLACE FUNCTION get_design_specification(p_design_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_build_object(
      'has_specification', true,
      'specification_id', s.id,
      'status', s.status,
      'item_count', (SELECT COUNT(*) FROM specification_items WHERE specification_id = s.id)
    )
    FROM specifications s
    WHERE s.design_id = p_design_id AND s.user_id = auth.uid()
    ORDER BY s.created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8. DOĞRULAMA SORGUSU
-- =====================================================

-- Bu sorguyu çalıştırarak tabloların oluştuğunu doğrulayın:
/*
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('specifications', 'specification_items', 'isitmax_inquiries')
ORDER BY table_name;

-- Beklenen çıktı:
-- specifications      | 12
-- specification_items  | 14
-- isitmax_inquiries    | 13
*/
