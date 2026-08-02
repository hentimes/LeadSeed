-- Query permanente
-- Dominio: profiles
-- Objetivo: permitir ocultar perfiles de los listados de comunidad/presencia

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_invisible boolean DEFAULT false;
