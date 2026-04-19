CREATE POLICY "Logos are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');