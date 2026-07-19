-- Query permanente
-- Dominio: saas
-- Objetivo: sembrar catalogo base de planes, features y asignaciones

INSERT INTO public.features (id, name, description, is_active, trial_days)
VALUES
  ('module:leads', 'Modulo: Leads', 'Acceso a la base de contactos.', true, 0),
  ('module:send', 'Modulo: Envios', 'Acceso a la vista de envios masivos.', true, 0),
  ('module:templates', 'Modulo: Plantillas', 'Crear y editar mensajes predefinidos.', true, 0),
  ('module:lists', 'Modulo: Listas', 'Agrupar prospectos en listas.', true, 0),
  ('module:history', 'Modulo: Historial', 'Ver el registro de mensajes enviados.', true, 0),
  ('module:pipeline', 'Modulo: Embudos', 'Acceso al pipeline de ventas tipo Kanban.', true, 15),
  ('module:tasks', 'Modulo: Tareas', 'Gestor de tareas y recordatorios.', true, 15),
  ('module:dashboard', 'Modulo: Dashboard', 'Metricas avanzadas y analitica.', true, 15),
  ('pro:unlimited_leads', 'Prospectos Ilimitados', 'Permite mas de 100 leads.', true, 0),
  ('pro:unlimited_lists', 'Listas Ilimitadas', 'Permite crear mas de 2 listas.', true, 0),
  ('pro:unlimited_templates', 'Plantillas Ilimitadas', 'Permite crear mas de 3 plantillas.', true, 0),
  ('pro:unlimited_emails', 'Correos Ilimitados', 'Permite mas de 10 correos diarios.', true, 0)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  trial_days = EXCLUDED.trial_days;

INSERT INTO public.plans (id, name, description, is_active)
VALUES
  ('plan_free', 'Plan Free', 'Plan gratuito para empezar.', true),
  ('plan_standard', 'Plan Standard', 'Plan intermedio para vendedores en crecimiento.', true),
  ('plan_pro', 'Plan Pro', 'Plan sin limites operativos principales.', true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active;

INSERT INTO public.plan_features (plan_id, feature_id)
VALUES
  ('plan_free', 'module:leads'),
  ('plan_free', 'module:send'),
  ('plan_free', 'module:templates'),
  ('plan_free', 'module:lists'),
  ('plan_free', 'module:history'),
  ('plan_standard', 'module:leads'),
  ('plan_standard', 'module:send'),
  ('plan_standard', 'module:templates'),
  ('plan_standard', 'module:lists'),
  ('plan_standard', 'module:history'),
  ('plan_pro', 'module:leads'),
  ('plan_pro', 'module:send'),
  ('plan_pro', 'module:templates'),
  ('plan_pro', 'module:lists'),
  ('plan_pro', 'module:history'),
  ('plan_pro', 'module:pipeline'),
  ('plan_pro', 'module:tasks'),
  ('plan_pro', 'module:dashboard'),
  ('plan_pro', 'pro:unlimited_leads'),
  ('plan_pro', 'pro:unlimited_lists'),
  ('plan_pro', 'pro:unlimited_templates'),
  ('plan_pro', 'pro:unlimited_emails')
ON CONFLICT (plan_id, feature_id) DO NOTHING;
