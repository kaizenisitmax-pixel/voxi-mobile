-- Supabase Storage CORS ve Public Access Düzeltmesi
-- Supabase Dashboard > SQL Editor'da çalıştırın

-- ============================================
-- 1. MEDIA BUCKET'INI PUBLIC YAP
-- ============================================
UPDATE storage.buckets 
SET public = true 
WHERE id = 'media';

-- ============================================
-- 2. BUCKET AYARLARINI KONTROL ET
-- ============================================
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'media';

-- Beklenen: public = true

-- ============================================
-- 3. RLS POLİTİKALARINI GÜNCELLE
-- ============================================

-- Public read access (herkes okuyabilir)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "public_read_access" ON storage.objects;

CREATE POLICY "public_read_access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');

-- Authenticated upload (kimlik doğrulanmış kullanıcılar yükleyebilir)
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "authenticated_upload" ON storage.objects;

CREATE POLICY "authenticated_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

-- Authenticated update (kimlik doğrulanmış kullanıcılar güncelleyebilir)
DROP POLICY IF EXISTS "authenticated_update" ON storage.objects;

CREATE POLICY "authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = owner_id);

-- Authenticated delete (kimlik doğrulanmış kullanıcılar silebilir)
DROP POLICY IF EXISTS "authenticated_delete" ON storage.objects;

CREATE POLICY "authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid()::text = owner_id);

-- ============================================
-- 4. KONTROL: POLİTİKALARI GÖSTER
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%media%' OR policyname LIKE '%public%';

-- Beklenen: public_read_access, authenticated_upload, vb.
