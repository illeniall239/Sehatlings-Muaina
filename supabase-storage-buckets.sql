-- =====================================================
-- STORAGE BUCKETS: Per-Lab Storage for Multi-Tenancy
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- Creates a separate storage bucket for each lab organization

-- Create storage buckets for each organization
-- Each lab has its own isolated storage
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('reports-aga-khan-lab', 'reports-aga-khan-lab', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('reports-chughtai-lab', 'reports-chughtai-lab', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('reports-essa-lab', 'reports-essa-lab', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('reports-idc-lab', 'reports-idc-lab', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('reports-citi-lab', 'reports-citi-lab', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('reports-excel-labs', 'reports-excel-labs', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('reports-husaini-lab', 'reports-husaini-lab', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- ROW LEVEL SECURITY for Storage
-- Users can only access their organization's bucket
-- =====================================================

-- Policy for SELECT (reading/downloading files)
CREATE POLICY "Users can read files from their org bucket"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports-' || (
    SELECT o.slug
    FROM public.organizations o
    INNER JOIN public.users u ON u.organization_id = o.id
    WHERE u.id = auth.uid()
  )
);

-- Policy for INSERT (uploading files)
CREATE POLICY "Users can upload files to their org bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports-' || (
    SELECT o.slug
    FROM public.organizations o
    INNER JOIN public.users u ON u.organization_id = o.id
    WHERE u.id = auth.uid()
  )
);

-- Policy for UPDATE (updating file metadata)
CREATE POLICY "Users can update files in their org bucket"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports-' || (
    SELECT o.slug
    FROM public.organizations o
    INNER JOIN public.users u ON u.organization_id = o.id
    WHERE u.id = auth.uid()
  )
);

-- Policy for DELETE (deleting files)
CREATE POLICY "Users can delete files from their org bucket"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports-' || (
    SELECT o.slug
    FROM public.organizations o
    INNER JOIN public.users u ON u.organization_id = o.id
    WHERE u.id = auth.uid()
  )
);

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
  id AS bucket_name,
  public,
  file_size_limit / 1024 / 1024 AS max_size_mb
FROM storage.buckets
WHERE id LIKE 'reports-%'
ORDER BY id;
