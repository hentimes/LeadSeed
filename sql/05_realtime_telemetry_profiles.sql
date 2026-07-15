-- ==============================================================================
-- 05. REAL-TIME, TELEMETRÍA, Y SINCRONIZACIÓN DE PERFILES
-- ==============================================================================

-- 1. Modificar public.profiles para agregar los nuevos campos y corregir permisos
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;

-- Asegurar que los perfiles se puedan listar públicamente (RLS)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
CREATE POLICY "Enable read access for all users" ON public.profiles FOR SELECT USING (true);

-- Asegurar que los usuarios puedan actualizar su propio last_seen_at
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Crear tabla de Telemetría de Usuario (Para saber dónde pasa el tiempo)
CREATE TABLE IF NOT EXISTS public.user_telemetry (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    total_seconds INTEGER DEFAULT 0,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, section) -- Solo una fila por usuario y sección, se va actualizando
);

-- Habilitar RLS para Telemetría
ALTER TABLE public.user_telemetry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own telemetry" ON public.user_telemetry;
CREATE POLICY "Users can insert their own telemetry" ON public.user_telemetry
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own telemetry" ON public.user_telemetry;
CREATE POLICY "Users can update their own telemetry" ON public.user_telemetry
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all telemetry" ON public.user_telemetry;
CREATE POLICY "Admins can view all telemetry" ON public.user_telemetry
FOR SELECT USING (true);

-- Función RPC para incrementar telemetría eficientemente (1 sola llamada)
CREATE OR REPLACE FUNCTION public.increment_telemetry(p_user_id UUID, p_section TEXT, p_seconds INTEGER)
RETURNS void AS $$
BEGIN
  INSERT INTO public.user_telemetry (user_id, section, total_seconds, last_updated_at)
  VALUES (p_user_id, p_section, p_seconds, timezone('utc'::text, now()))
  ON CONFLICT (user_id, section) DO UPDATE
  SET 
    total_seconds = public.user_telemetry.total_seconds + EXCLUDED.total_seconds,
    last_updated_at = EXCLUDED.last_updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para Sincronizar Usuarios de Google
-- Esta función captura el nombre y foto de Google automáticamente al crearse la cuenta
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  )
  -- Si el perfil ya existe por alguna razón, lo actualizamos
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparar la función cada vez que se inserta un nuevo usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 4. Storage Bucket para Avatares Personalizados
-- Nota: La creación de buckets a veces requiere permisos de superusuario en Postgres.
-- Si esto falla, el usuario puede crearlo manualmente en el Panel de Supabase.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de seguridad para el Storage de Avatares
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible." 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Users can upload their own avatars." ON storage.objects;
CREATE POLICY "Users can upload their own avatars." 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'avatars' AND auth.uid() = owner );

DROP POLICY IF EXISTS "Users can update their own avatars." ON storage.objects;
CREATE POLICY "Users can update their own avatars."
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.uid() = owner );


-- 5. Habilitar Realtime para las tablas clave
-- Esto le dice a Supabase que escuche y envíe cambios de estas tablas por WebSockets
BEGIN;
  -- Remover publicación si ya existe para evitar errores
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;
-- (Nota: Alternativamente, se debe habilitar Replication en la UI de Supabase para las tablas leads, tasks)

-- ==============================================================================
-- 6. SINCRONIZACIÓN INICIAL (Backfill)
-- ==============================================================================
-- Esto fuerza a que todos los usuarios que ya existían en Google Auth
-- se copien hacia la tabla pública. El "ON CONFLICT" evita usuarios duplicados.
INSERT INTO public.profiles (id, email, full_name, avatar_url)
SELECT id, email, raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
  avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url);
