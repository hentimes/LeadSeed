-- Query permanente
-- Tipo: DDL (ALTER TABLE)
-- Objeto: public.profiles
-- Clase: columnas de preferencias de usuario
-- Dominio: settings / perfil
--
-- Descripcion:
--   Agrega tres columnas de preferencias que la aplicacion ya escribe pero
--   que nunca existieron en la base.
--
-- Proposito:
--   `saveSettings` hace un UPDATE con estas tres columnas incluidas. Como no
--   existian, PostgREST rechazaba la sentencia COMPLETA, por lo que NINGUNA
--   preferencia se guardaba: ni columnas visibles, ni modo compacto, ni modo
--   oscuro, ni metas diarias. El error aparecia en la extension como
--   "Error saving remote settings".
--
--   El origen es la migracion 054_add_whatsapp_client_preference.sql, que
--   apunta a una tabla `user_settings` que no existe en este proyecto. Esa
--   migracion nunca pudo aplicarse. Queda obsoleta y se reemplaza por esta.
--
-- Dependencias: public.profiles
--
-- Impacto:
--   Ninguno sobre datos existentes. Solo agrega columnas con DEFAULT, sin
--   reescribir filas (Postgres 11+ no reescribe la tabla con default constante).
--   No altera RLS: las politicas de profiles ya cubren estas columnas.
--
-- Persistencia: permanente
-- Reversibilidad: ALTER TABLE public.profiles DROP COLUMN ...

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_client_preference text DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS active_smart_lists jsonb DEFAULT '["smart_nuevos","smart_sin_gestion","smart_eliminados"]'::jsonb,
  ADD COLUMN IF NOT EXISTS list_groups jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.whatsapp_client_preference IS
  'Cliente de WhatsApp preferido al enviar: web o app.';
COMMENT ON COLUMN public.profiles.active_smart_lists IS
  'Ids de las listas inteligentes activas para el usuario.';
COMMENT ON COLUMN public.profiles.list_groups IS
  'Agrupaciones de listas definidas por el usuario.';

NOTIFY pgrst, 'reload schema';
