BEGIN;

INSERT INTO public.features (id, name, description, is_active, trial_days)
VALUES (
  'pro:multiple_email_channels',
  'Multiples canales de correo',
  'Permite registrar hasta 6 canales de correo por usuario en Ajustes > Email.',
  true,
  15
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  trial_days = EXCLUDED.trial_days;

COMMIT;
