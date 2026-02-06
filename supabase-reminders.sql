-- VOXI Faz 2: Hatırlatmalar Tablosu
-- Supabase Dashboard'da SQL Editor'da çalıştırın

CREATE TABLE IF NOT EXISTS reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
  message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  remind_at date NOT NULL,
  note text,
  is_done boolean DEFAULT false,
  created_by text DEFAULT 'Volkan',
  created_at timestamptz DEFAULT now()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_reminders_task_id ON reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at) WHERE is_done = false;
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders(created_by);

-- Bugünkü hatırlatmaları sorgulamak için view (opsiyonel)
CREATE OR REPLACE VIEW today_reminders AS
SELECT 
  r.*,
  t.title as task_title,
  t.assigned_to
FROM reminders r
JOIN tasks t ON r.task_id = t.id
WHERE r.remind_at = CURRENT_DATE
  AND r.is_done = false
ORDER BY r.created_at;
