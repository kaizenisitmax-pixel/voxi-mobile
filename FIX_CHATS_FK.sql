-- Chats Tablosu Foreign Key Düzeltmesi
-- Supabase Dashboard > SQL Editor'da çalıştırın

-- ============================================
-- MEVCUT FOREIGN KEY CONSTRAINT'LERİ SİL
-- ============================================

-- Chats customer_id constraint'i sil
ALTER TABLE chats 
DROP CONSTRAINT IF EXISTS chats_customer_id_fkey;

-- Job_requests customer_id constraint'i sil  
ALTER TABLE job_requests 
DROP CONSTRAINT IF EXISTS job_requests_customer_id_fkey;

-- Chat_messages sender_id constraint'i sil
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;

-- Reviews reviewer_id constraint'i sil
ALTER TABLE reviews 
DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;

-- Designs user_id constraint'i sil
ALTER TABLE designs 
DROP CONSTRAINT IF EXISTS designs_user_id_fkey;

-- ============================================
-- YENİ FOREIGN KEY CONSTRAINT'LERİ EKLE (profiles'a)
-- ============================================

-- Chats -> profiles
ALTER TABLE chats 
ADD CONSTRAINT chats_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Job_requests -> profiles
ALTER TABLE job_requests 
ADD CONSTRAINT job_requests_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Chat_messages -> profiles
ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_sender_id_fkey 
FOREIGN KEY (sender_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Reviews -> profiles
ALTER TABLE reviews 
ADD CONSTRAINT reviews_reviewer_id_fkey 
FOREIGN KEY (reviewer_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Designs -> profiles
ALTER TABLE designs 
ADD CONSTRAINT designs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- ============================================
-- KONTROL: FOREIGN KEY'LERİ GÖSTER
-- ============================================
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('chats', 'job_requests', 'chat_messages', 'reviews', 'designs')
ORDER BY tc.table_name, tc.constraint_name;
