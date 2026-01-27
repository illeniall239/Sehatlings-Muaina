-- =====================================================
-- MUAINA PORTAL - SUPABASE STORAGE SETUP
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create the reports bucket for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'reports',
  'reports',
  false, -- private bucket
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can upload to their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read from their org folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete from their org folder" ON storage.objects;

-- Users can upload files to their organization's folder
-- Path format: reports/{organization_id}/{filename}
CREATE POLICY "Users can upload to their org folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

-- Users can read files from their organization's folder
CREATE POLICY "Users can read from their org folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  )
);

-- Users can delete files from their organization's folder (only admins/directors)
CREATE POLICY "Admins can delete from their org folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text FROM public.users WHERE id = auth.uid()
  ) AND
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'director')
);
