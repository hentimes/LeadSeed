-- Agregar contador de "bumps" y fecha a la tabla requirements

ALTER TABLE public.requirements 
ADD COLUMN IF NOT EXISTS bump_count INT DEFAULT 0;

ALTER TABLE public.requirements 
ADD COLUMN IF NOT EXISTS last_bumped_at TIMESTAMPTZ DEFAULT NOW();
