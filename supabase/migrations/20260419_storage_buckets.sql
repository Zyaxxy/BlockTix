-- Create storage buckets for image uploads
-- Avatars: User profile pictures (2MB limit)
-- Events: Event banners and images (5MB limit)

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('events', 'events', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
-- Public read access
CREATE POLICY "avatars_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated insert (uploads go through API routes with service role, so this is a fallback)
CREATE POLICY "avatars_authenticated_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- Storage policies for events bucket
-- Public read access
CREATE POLICY "events_public_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'events');

-- Authenticated insert
CREATE POLICY "events_authenticated_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'events');