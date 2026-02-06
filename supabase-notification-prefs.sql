-- Profiles tablosuna notification_prefs kolonu ekle
-- Bu kolonda kullanıcının bildirim tercihlerini JSON olarak saklayacağız

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS notification_prefs jsonb 
DEFAULT '{"push": true, "sms": false, "morning_reminder": true, "urgent_sms": true}';

-- Mevcut kayıtları güncelle
UPDATE profiles 
SET notification_prefs = '{"push": true, "sms": false, "morning_reminder": true, "urgent_sms": true}'
WHERE notification_prefs IS NULL;
