-- Create storage bucket for patient files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-files',
  'patient-files',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS policy: Authenticated users can upload files
CREATE POLICY "Authenticated users can upload patient files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'patient-files');

-- RLS policy: Authenticated users can read patient files
CREATE POLICY "Authenticated users can read patient files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'patient-files');

-- RLS policy: Authenticated users can update patient files
CREATE POLICY "Authenticated users can update patient files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'patient-files');

-- RLS policy: Authenticated users can delete patient files
CREATE POLICY "Authenticated users can delete patient files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'patient-files');