-- INSERCIÓN DE DATOS BASE PARA EL SAAS

-- 1. Crear las Funcionalidades (Las Llaves)
INSERT INTO public.features (id, name, description, is_active, trial_days) VALUES
('module:leads', 'Acceso a Leads', 'Permite entrar al CRM y gestionar prospectos básicos.', true, 0),
('module:send', 'Envíos Masivos', 'Permite acceder a la herramienta de envío de WhatsApp y correos.', true, 0),
('pro:unlimited_leads', 'Prospectos Ilimitados', 'Desactiva el candado de 100 prospectos del plan gratuito.', true, 0),
('pro:unlimited_emails', 'Correos Ilimitados', 'Desactiva el límite de 10 correos diarios del plan gratuito.', true, 15)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear los Planes (Paquetes Comerciales)
INSERT INTO public.plans (id, name, description, is_active) VALUES
('plan_free', 'Plan Free', 'Plan gratuito para empezar. Límite de 100 leads y 10 correos diarios.', true),
('plan_pro', 'Plan Pro', 'Para vendedores serios. Sin límites de leads ni de envíos.', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Asignar las funcionalidades al Plan Free
INSERT INTO public.plan_features (plan_id, feature_id) VALUES
('plan_free', 'module:leads'),
('plan_free', 'module:send')
ON CONFLICT (plan_id, feature_id) DO NOTHING;

-- 4. Asignar las funcionalidades al Plan Pro
INSERT INTO public.plan_features (plan_id, feature_id) VALUES
('plan_pro', 'module:leads'),
('plan_pro', 'module:send'),
('plan_pro', 'pro:unlimited_leads'),
('plan_pro', 'pro:unlimited_emails')
ON CONFLICT (plan_id, feature_id) DO NOTHING;
