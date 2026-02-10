-- ════════════════════════════════════════════════════════════════
-- VOXI — PUSH TOKENS (Expo Push Notification)
-- ════════════════════════════════════════════════════════════════
-- Kullanıcıların cihaz token'larını saklar
-- Görev ataması ve mesaj bildirimleri için
-- ════════════════════════════════════════════════════════════════

-- 1. push_tokens tablosunu oluştur
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL,
  device_type text DEFAULT 'mobile',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

-- 2. RLS politikaları
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pt_sel" ON push_tokens;
CREATE POLICY "pt_sel" 
  ON push_tokens FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "pt_ins" ON push_tokens;
CREATE POLICY "pt_ins" 
  ON push_tokens FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "pt_upd" ON push_tokens;
CREATE POLICY "pt_upd" 
  ON push_tokens FOR UPDATE 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "pt_del" ON push_tokens;
CREATE POLICY "pt_del" 
  ON push_tokens FOR DELETE 
  TO authenticated 
  USING (true);

-- 3. İndeksler
CREATE INDEX IF NOT EXISTS idx_pt_user 
  ON push_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_pt_token 
  ON push_tokens(token);

-- 4. Updated_at trigger
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER trigger_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- 5. Tablo bilgileri
COMMENT ON TABLE push_tokens IS 'Expo Push Notification token yönetimi';
COMMENT ON COLUMN push_tokens.token IS 'Expo Push Token (ExponentPushToken[...])';
COMMENT ON COLUMN push_tokens.device_type IS 'ios, android, web';
