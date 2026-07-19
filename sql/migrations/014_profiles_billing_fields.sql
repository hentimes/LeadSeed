-- Query permanente
-- Dominio: profiles
-- Objetivo: agregar metadata de facturacion y suscripcion al perfil

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS gateway_customer_id text,
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text CHECK (subscription_status IN ('active', 'past_due', 'canceled', 'trialing', 'incomplete')),
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;
