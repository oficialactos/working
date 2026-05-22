-- Storage bucket for service request attachments.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'request-media',
  'request-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];

DROP POLICY IF EXISTS "request-media: public read" ON storage.objects;
CREATE POLICY "request-media: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'request-media');

DROP POLICY IF EXISTS "request-media: user uploads own files" ON storage.objects;
CREATE POLICY "request-media: user uploads own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'request-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "request-media: user updates own files" ON storage.objects;
CREATE POLICY "request-media: user updates own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'request-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'request-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "request-media: user deletes own files" ON storage.objects;
CREATE POLICY "request-media: user deletes own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'request-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
