-- Query permanente
-- Dominio: profiles
-- Objetivo: persistir settings de aplicacion en profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS compact_mode boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS dark_mode boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS visible_cols jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS email_provider text DEFAULT 'emailjs',
ADD COLUMN IF NOT EXISTS resend_api_key text,
ADD COLUMN IF NOT EXISTS resend_from_name text,
ADD COLUMN IF NOT EXISTS resend_from_email text,
ADD COLUMN IF NOT EXISTS export_format text DEFAULT 'json',
ADD COLUMN IF NOT EXISTS daily_goal_whatsapp integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS daily_goal_email integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS daily_goal_calls integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS dashboard_compare_period text DEFAULT 'yesterday';
