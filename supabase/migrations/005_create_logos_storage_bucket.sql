-- Migration: 005_create_logos_storage_bucket.sql
-- Description: Create public storage bucket 'logos' and set up RLS policies for hospital logo uploads

-- 1. Create the storage bucket if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Allow public access to view logos
DROP POLICY IF EXISTS "Public Read Access for Logos" ON storage.objects;
CREATE POLICY "Public Read Access for Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- 3. Allow authenticated & anon users to upload logos
DROP POLICY IF EXISTS "Allow Upload Access for Logos" ON storage.objects;
CREATE POLICY "Allow Upload Access for Logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'logos');

-- 4. Allow users to update logos
DROP POLICY IF EXISTS "Allow Update Access for Logos" ON storage.objects;
CREATE POLICY "Allow Update Access for Logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'logos');

-- 5. Allow users to delete logos
DROP POLICY IF EXISTS "Allow Delete Access for Logos" ON storage.objects;
CREATE POLICY "Allow Delete Access for Logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'logos');
