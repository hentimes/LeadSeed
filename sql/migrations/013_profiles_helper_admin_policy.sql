-- Query permanente
-- Dominio: profiles
-- Objetivo: agregar is_helper y definir policy admin basada en rol, no en correo fijo

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_helper boolean DEFAULT false;

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'planespro.cl@gmail.com';

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);
