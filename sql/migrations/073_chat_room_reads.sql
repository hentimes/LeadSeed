-- Query permanente
-- Dominio: chat
-- Objetivo: registrar hasta donde leyo cada usuario en cada sala, para marcar
--           mensajes sin leer en el menu de navegacion.
--
-- Se guarda en base y no en el navegador porque la extension se usa desde
-- perfiles de Chrome y equipos distintos: con almacenamiento local el indicador
-- reaparecia en cada instalacion nueva aunque el usuario ya hubiera leido todo.

CREATE TABLE IF NOT EXISTS public.chat_room_reads (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  last_read_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, room_id)
);

ALTER TABLE public.chat_room_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read their own chat reads" ON public.chat_room_reads;
CREATE POLICY "Users read their own chat reads"
ON public.chat_room_reads
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert their own chat reads" ON public.chat_room_reads;
CREATE POLICY "Users insert their own chat reads"
ON public.chat_room_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own chat reads" ON public.chat_room_reads;
CREATE POLICY "Users update their own chat reads"
ON public.chat_room_reads
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Resuelve el indicador en una sola consulta, sin traer los mensajes al cliente.
-- Los mensajes propios no cuentan como pendientes.
CREATE OR REPLACE FUNCTION public.has_unread_chat_messages()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.chat_messages m
    LEFT JOIN public.chat_room_reads r
      ON r.room_id = m.room_id
     AND r.user_id = auth.uid()
    WHERE m.user_id <> auth.uid()
      AND m.created_at > coalesce(r.last_read_at, '-infinity'::timestamptz)
  );
$$;

REVOKE ALL ON FUNCTION public.has_unread_chat_messages() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_unread_chat_messages() TO authenticated;

NOTIFY pgrst, 'reload schema';
