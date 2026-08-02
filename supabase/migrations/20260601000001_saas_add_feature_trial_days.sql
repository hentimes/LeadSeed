-- Query permanente
-- Dominio: saas
-- Objetivo: agregar soporte de trial_days a features

ALTER TABLE public.features
ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 0;

COMMENT ON COLUMN public.features.trial_days IS
'Cantidad de dias de prueba gratuitos por defecto para la funcionalidad (0 = sin trial).';

NOTIFY pgrst, 'reload schema';
