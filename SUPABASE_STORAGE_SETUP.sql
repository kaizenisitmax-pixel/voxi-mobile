-- VOXI Storage Bucket Setup
-- Bu SQL kodunu Supabase Dashboard > SQL Editor'da çalıştırın

-- ============================================
-- 1. MEDIA BUCKET OLUŞTUR
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/mpeg', 'audio/wav', 'audio/m4a']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================
-- 2. STORAGE RLS POLİTİKALARI
-- ============================================

-- Herkese okuma izni (public bucket)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'media');

-- Authenticated kullanıcılar yükleme yapabilir
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
CREATE POLICY "Authenticated users can upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'media' AND 
  auth.role() = 'authenticated'
);

-- Kullanıcılar kendi dosyalarını güncelleyebilir
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
CREATE POLICY "Users can update own files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'media' AND 
  auth.uid()::text = owner_id
);

-- Kullanıcılar kendi dosyalarını silebilir
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
CREATE POLICY "Users can delete own files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'media' AND 
  auth.uid()::text = owner_id
);

-- ============================================
-- 3. KONTROL
-- ============================================
-- Bucket'ların listesini göster
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'media';

-- Politikaları kontrol et
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
