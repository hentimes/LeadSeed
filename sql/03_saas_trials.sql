-- 03_saas_trials.sql
-- Añadir soporte para promociones de prueba global (Trials) a las funcionalidades.

ALTER TABLE public.features 
ADD COLUMN trial_days INTEGER DEFAULT 0;

-- Comentario descriptivo para la nueva columna
COMMENT ON COLUMN public.features.trial_days IS 'Cantidad de días de prueba gratuitos que tiene esta funcionalidad por defecto para nuevos usuarios (0 = sin trial)';

-- Actualizar el caché de Supabase o notificar cambios si es necesario
NOTIFY pgrst, 'reload schema';
