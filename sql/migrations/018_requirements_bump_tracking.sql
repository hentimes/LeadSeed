-- Query permanente
-- Dominio: requirements
-- Objetivo: agregar metadata de bump para tickets internos

ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS bump_count integer DEFAULT 0;

ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS last_bumped_at timestamptz DEFAULT now();
