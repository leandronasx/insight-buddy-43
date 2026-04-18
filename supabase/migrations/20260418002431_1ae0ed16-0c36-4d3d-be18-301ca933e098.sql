-- Remove broad public SELECT policy on logos bucket to prevent unauthenticated
-- enumeration/listing of all uploaded company logos via the storage API.
-- The bucket remains public so existing direct-URL fetches (used to render logos
-- in the app and in generated OS PDFs) continue to work.

DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;