-- Query permanente
-- Dominio: admin / supervision / realtime
-- Objetivo: entregar eventos realtime confiables al superadmin para leads ajenos

CREATE TABLE IF NOT EXISTS public.admin_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  observed_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  event_kind text NOT NULL DEFAULT 'lead_created' CHECK (event_kind IN ('lead_created')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS admin_lead_events_admin_created_idx
ON public.admin_lead_events (admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_lead_events_observed_created_idx
ON public.admin_lead_events (observed_user_id, created_at DESC);

ALTER TABLE public.admin_lead_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read their own lead events" ON public.admin_lead_events;
CREATE POLICY "Admins can read their own lead events"
ON public.admin_lead_events
FOR SELECT
USING (
  auth.uid() = admin_user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Admins can delete their own lead events" ON public.admin_lead_events;
CREATE POLICY "Admins can delete their own lead events"
ON public.admin_lead_events
FOR DELETE
USING (
  auth.uid() = admin_user_id
  AND EXISTS (
    SELECT 1
    FROM public.profiles profile
    WHERE profile.id = auth.uid()
      AND profile.role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.emit_admin_lead_created_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_lead_events (
    admin_user_id,
    observed_user_id,
    lead_id,
    event_kind
  )
  SELECT
    profile.id,
    NEW.user_id,
    NEW.id,
    'lead_created'
  FROM public.profiles profile
  WHERE profile.role = 'admin';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS emit_admin_lead_created_events_trigger ON public.leads;
CREATE TRIGGER emit_admin_lead_created_events_trigger
AFTER INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.emit_admin_lead_created_events();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'admin_lead_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_lead_events;
  END IF;
END;
$$;

GRANT SELECT, DELETE ON public.admin_lead_events TO authenticated;

COMMENT ON TABLE public.admin_lead_events IS
'Dedicated realtime feed for admin observation of newly created leads without requiring direct realtime visibility over public.leads rows.';

COMMENT ON FUNCTION public.emit_admin_lead_created_events() IS
'Emits one admin-facing realtime event per admin profile whenever a lead is created.';

NOTIFY pgrst, 'reload schema';
