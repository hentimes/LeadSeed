-- Query permanente
-- Dominio: requirements / support
-- Objetivo: crear requerimientos de soporte y alinear mensajeria interna con el frontend actual

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_helper boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_code text,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  helper_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL,
  content text NOT NULL,
  status text DEFAULT 'open',
  rating text,
  claim_reason text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS ticket_code text,
ADD COLUMN IF NOT EXISTS claim_reason text;

ALTER TABLE public.internal_messages
ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS context_req_id uuid,
ADD COLUMN IF NOT EXISTS context_ticket_code text,
ADD COLUMN IF NOT EXISTS context_ticket_type text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'internal_messages'
      AND column_name = 'content'
  ) THEN
    EXECUTE '
      UPDATE public.internal_messages
      SET message = content
      WHERE message IS NULL
        AND content IS NOT NULL
    ';
  END IF;
END $$;

ALTER TABLE public.requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins y helpers pueden ver todos los requerimientos" ON public.requirements;
CREATE POLICY "Admins y helpers pueden ver todos los requerimientos"
ON public.requirements
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Usuarios pueden ver sus propios requerimientos" ON public.requirements;
CREATE POLICY "Usuarios pueden ver sus propios requerimientos"
ON public.requirements
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuarios pueden crear requerimientos" ON public.requirements;
CREATE POLICY "Usuarios pueden crear requerimientos"
ON public.requirements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins y helpers pueden actualizar requerimientos" ON public.requirements;
CREATE POLICY "Admins y helpers pueden actualizar requerimientos"
ON public.requirements
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Usuarios pueden actualizar sus propios requerimientos" ON public.requirements;
CREATE POLICY "Usuarios pueden actualizar sus propios requerimientos"
ON public.requirements
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'requirements'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.requirements';
  END IF;
END $$;

COMMENT ON TABLE public.requirements IS
'Tabla activa de soporte interno. Reemplaza operativamente al experimento legacy support_tickets.';

NOTIFY pgrst, 'reload schema';
