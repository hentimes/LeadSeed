-- Ejecuta esto en tu SQL Editor en Supabase
-- Esto actualizará las políticas de seguridad para usar el 'rol' en lugar del correo fijo.

-- 1. Primero, nos aseguramos de que el correo fundador tenga el rol admin por si acaso.
UPDATE public.profiles SET role = 'admin' WHERE email = 'planespro.cl@gmail.com';

-- 2. Eliminar la política basada en correo (la que acabamos de crear hace un momento o cualquier antigua)
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 3. Crear la nueva política escalable (revisa el ROL del usuario que intenta hacer el UPDATE)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles
FOR UPDATE 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
