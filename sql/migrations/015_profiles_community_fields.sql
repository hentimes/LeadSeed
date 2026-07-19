-- Query permanente
-- Dominio: profiles / storage
-- Objetivo: agregar campos de comunidad y reforzar el bucket de avatares

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS show_premium_frame boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS badges text[] DEFAULT '{}'::text[];

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Avatares publicos" ON storage.objects;
CREATE POLICY "Avatares publicos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Usuarios pueden subir avatares" ON storage.objects;
CREATE POLICY "Usuarios pueden subir avatares"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios pueden actualizar avatares" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar avatares"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
