-- SEMILLA DEFINITIVA DEL MODELO DE NEGOCIO SAAS

-- 1. Inyectar TODAS las llaves (Módulos de menú y Límites)
INSERT INTO public.features (id, name, description, is_active, trial_days) VALUES
-- Menú
('module:leads', 'Módulo: Leads', 'Acceso a la base de contactos.', true, 0),
('module:send', 'Módulo: Envíos', 'Acceso a la vista de envíos masivos.', true, 0),
('module:templates', 'Módulo: Plantillas', 'Crear y editar mensajes predefinidos.', true, 0),
('module:lists', 'Módulo: Listas', 'Agrupar prospectos en listas.', true, 0),
('module:history', 'Módulo: Historial', 'Ver el registro de mensajes enviados.', true, 0),
('module:pipeline', 'Módulo: Embudos', 'Acceso al Pipeline de ventas tipo Kanban.', true, 15),
('module:tasks', 'Módulo: Tareas', 'Gestor de tareas y recordatorios.', true, 15),
('module:dashboard', 'Módulo: Dashboard', 'Métricas avanzadas y analítica.', true, 15),

-- Límites
('pro:unlimited_leads', 'Prospectos Ilimitados', 'Permite más de 100 leads.', true, 0),
('pro:unlimited_lists', 'Listas Ilimitadas', 'Permite crear más de 2 listas.', true, 0),
('pro:unlimited_templates', 'Plantillas Ilimitadas', 'Permite crear más de 3 plantillas.', true, 0),
('pro:unlimited_emails', 'Correos Ilimitados', 'Permite más de 10 correos diarios.', true, 0)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;


-- 2. Asegurar que el Plan Free tenga exactamente los módulos base permitidos
INSERT INTO public.plan_features (plan_id, feature_id) VALUES
('plan_free', 'module:leads'),
('plan_free', 'module:send'),
('plan_free', 'module:templates'),
('plan_free', 'module:lists'),
('plan_free', 'module:history')
ON CONFLICT DO NOTHING;


-- 3. Asegurar que el Plan Pro tenga el poder absoluto
INSERT INTO public.plan_features (plan_id, feature_id) VALUES
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
ON CONFLICT DO NOTHING;
