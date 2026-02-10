-- ════════════════════════════════════════════════════════════════
-- VOXI — TASK MESSAGES (Görev Sohbet Sistemi)
-- ════════════════════════════════════════════════════════════════
-- WhatsApp grup sohbeti gibi çalışan görev mesajlaşma sistemi
-- Metin, sesli not, dosya eki, sistem logları destekler
-- ════════════════════════════════════════════════════════════════

-- 1. task_messages tablosunu oluştur
CREATE TABLE IF NOT EXISTS task_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id),
  type text NOT NULL DEFAULT 'message'
    CHECK (type IN ('message', 'voice_note', 'system', 'ai')),
  content text,
  voice_url text,
  voice_duration integer,
  file_url text,
  file_name text,
  file_size integer,
  created_at timestamptz DEFAULT now()
);

-- 2. RLS politikaları
ALTER TABLE task_messages ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (authenticated kullanıcılar)
DROP POLICY IF EXISTS "tm_sel" ON task_messages;
CREATE POLICY "tm_sel" 
  ON task_messages FOR SELECT 
  TO authenticated 
  USING (true);

-- Herkes ekleyebilir (authenticated kullanıcılar)
DROP POLICY IF EXISTS "tm_ins" ON task_messages;
CREATE POLICY "tm_ins" 
  ON task_messages FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Kullanıcı kendi mesajlarını silebilir
DROP POLICY IF EXISTS "tm_del" ON task_messages;
CREATE POLICY "tm_del" 
  ON task_messages FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);

-- 3. İndeksler (performans)
CREATE INDEX IF NOT EXISTS idx_tm_task 
  ON task_messages(task_id, created_at);

CREATE INDEX IF NOT EXISTS idx_tm_user 
  ON task_messages(user_id);

-- 4. Tablo bilgileri
COMMENT ON TABLE task_messages IS 'Görev sohbet mesajları - WhatsApp tarzı grup mesajlaşma';
COMMENT ON COLUMN task_messages.type IS 'message: metin, voice_note: sesli not, system: sistem logu, ai: AI yanıtı';
COMMENT ON COLUMN task_messages.voice_duration IS 'Sesli not süresi (saniye)';
COMMENT ON COLUMN task_messages.file_size IS 'Dosya boyutu (byte)';

-- ════════════════════════════════════════════════════════════════
-- SUPABASE STORAGE BUCKET (order-media gibi, ama task-media)
-- ════════════════════════════════════════════════════════════════
-- Bu SQL çalıştıktan sonra Supabase Dashboard → Storage'dan
-- 'task-media' bucket'ı manuel oluştur (public)
-- ════════════════════════════════════════════════════════════════
