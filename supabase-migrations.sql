-- KALFA/Voxi - WhatsApp Tarzı İletişim Özellikleri
-- Bu SQL'leri Supabase Dashboard'da çalıştırın

-- 1. Mesaj durumu (okundu bilgisi)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS status text DEFAULT 'sent';
-- status değerleri: sent, delivered, read
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- 2. Yıldızlı mesajlar
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false;

-- 3. Yanıtlama (reply)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES messages(id);

-- 4. Görev sabitleme
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- İndeksler (performans için)
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_starred ON messages(is_starred) WHERE is_starred = true;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_pinned ON tasks(is_pinned) WHERE is_pinned = true;
