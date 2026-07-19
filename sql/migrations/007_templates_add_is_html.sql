-- Query permanente
-- Dominio: template
-- Objetivo: agregar soporte HTML a templates de email

ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS is_html boolean DEFAULT false;
