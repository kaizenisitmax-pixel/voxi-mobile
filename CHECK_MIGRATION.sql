-- EvimAI Migration Kontrol
-- Bu sorguları Supabase Dashboard > SQL Editor'da çalıştırın

-- ============================================
-- 1. TABLOLARIN MEVCUT OLUP OLMADIĞINI KONTROL ET
-- ============================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'masters', 
    'designs', 
    'job_requests', 
    'chats', 
    'chat_messages', 
    'reviews'
  )
ORDER BY table_name;

-- Beklenen: 6 tablo görünmeli
-- Eğer boş dönerse: supabase-evim-schema.sql migration'ı çalıştırılmamış!

-- ============================================
-- 2. DESIGNS TABLOSU YAPISINI KONTROL ET
-- ============================================
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'designs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Beklenen kolonlar:
-- id, user_id, original_image_url, ai_image_url, category, 
-- style, tool, room_type, prompt, replicate_id, 
-- processing_status, is_favorite, view_count, share_count, created_at

-- ============================================
-- 3. DESIGNS RLS POLİTİKALARINI KONTROL ET
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'designs';

-- Beklenen: SELECT, INSERT, UPDATE, DELETE policy'leri

-- ============================================
-- 4. PROFILES TABLOSUNDA ROLE KOLONUNU KONTROL ET
-- ============================================
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND table_schema = 'public'
  AND column_name = 'role';

-- Beklenen: role kolonu 'customer' default değerle

-- ============================================
-- 5. STORAGE BUCKET KONTROLÜ
-- ============================================
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'media';

-- Beklenen: media bucket'ı public=true olarak

-- ============================================
-- 6. TEST: KENDİ USER ID'NİZİ ÖĞRENME
-- ============================================
SELECT auth.uid() as my_user_id;

-- Bu ID ile designs tablosuna insert deneyebilirsiniz
