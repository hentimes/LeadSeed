-- Ejecutar esto en el SQL Editor de Supabase

-- 1. Agregar la columna is_helper si no existe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_helper BOOLEAN DEFAULT false;

-- 2. Asegurarnos de que el SuperAdmin pueda actualizar perfiles
-- (Si ya tenías una política para que admin actualice, esto la reemplaza/refuerza)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Admins can update all profiles" 
ON public.profiles
FOR UPDATE 
USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'planespro.cl@gmail.com'
);
