-- 126 - Actividad reciente, edicion y denuncias en el foro
--
-- Tres huecos que se notaron al usar la seccion como se usa un grupo de
-- Facebook, que es el modelo que se busca.
--
-- ## 1. Un comentario nuevo no subia la publicacion
--
-- Los dos ordenes existentes miran `created_at` de la PUBLICACION. O sea que
-- una conversacion viva de hace dos semanas queda enterrada bajo publicaciones
-- nuevas sin una sola respuesta. En un grupo de Facebook el orden por defecto
-- es justamente el contrario: "actividad reciente", donde cada comentario
-- devuelve el hilo arriba.
--
-- Se resuelve con una columna `last_activity_at` mantenida por trigger, y NO
-- calculando el maximo de los comentarios al vuelo: ese calculo obliga a un
-- LEFT JOIN con agregacion sobre toda la tabla de comentarios en cada carga del
-- feed, y no se puede indexar para ordenar.
--
-- ## 2. "Tendencia" escondia todo lo de mas de 72 horas
--
-- La vista llevaba `WHERE created_at > now() - interval '72 hours'`. No es que
-- ordenara distinto: es que las publicaciones mas viejas NO APARECIAN. En un
-- foro interno, donde puede pasar una semana sin publicar, esa pestana se veia
-- vacia y parecia rota.
--
-- La ventana pasa a 30 dias y se mide desde la ultima actividad, no desde la
-- creacion: una publicacion de hace tres semanas que hoy tiene comentarios
-- sigue siendo relevante. El decaimiento de la formula ya se encarga de que lo
-- viejo pese menos, que es para lo que estaba.
--
-- ## 3. No habia forma de denunciar una publicacion
--
-- El chat si la tiene desde la 080. Esta tabla es su equivalente y sigue el
-- mismo modelo para que el panel de moderacion pueda tratarlas igual.

-- ---------------------------------------------------------------------------
-- 1. Actividad reciente
-- ---------------------------------------------------------------------------

ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS last_activity_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.community_posts.last_activity_at IS
  'Ultima vez que pasó algo en la publicacion: se creo, o le comentaron. Es la clave del orden por actividad reciente, el que usa un grupo de Facebook por defecto.';

-- Backfill: la ultima actividad de lo ya publicado es su comentario mas nuevo,
-- o su propia fecha de creacion si nadie comento.
UPDATE public.community_posts p
SET last_activity_at = GREATEST(
  p.created_at,
  COALESCE((SELECT max(c.created_at) FROM public.community_comments c WHERE c.post_id = p.id), p.created_at)
);

-- El indice lleva category_id primero porque el feed casi siempre filtra por
-- categoria antes de ordenar.
CREATE INDEX IF NOT EXISTS community_posts_activity_idx
ON public.community_posts (category_id, last_activity_at DESC);

CREATE INDEX IF NOT EXISTS community_posts_activity_global_idx
ON public.community_posts (last_activity_at DESC);

/*
 * SECURITY DEFINER a proposito: quien comenta no tiene -ni debe tener- permiso
 * de UPDATE sobre la publicacion de otra persona. El trigger necesita poder
 * tocar esa fila igualmente, y este es el unico campo que toca.
 */
CREATE OR REPLACE FUNCTION public.bump_community_post_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.community_posts
  SET last_activity_at = NEW.created_at
  WHERE id = NEW.post_id
    -- Nunca hacia atras: un comentario que llega con fecha vieja (una
    -- importacion, un reintento) no debe bajar una publicacion activa.
    AND last_activity_at < NEW.created_at;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_bump_community_post_activity ON public.community_comments;
CREATE TRIGGER trigger_bump_community_post_activity
AFTER INSERT ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_community_post_activity();

-- ---------------------------------------------------------------------------
-- 2. Marca de edicion
-- ---------------------------------------------------------------------------

ALTER TABLE public.community_posts
ADD COLUMN IF NOT EXISTS edited_at timestamptz;

COMMENT ON COLUMN public.community_posts.edited_at IS
  'Cuando se edito por ultima vez, o NULL si nunca. La interfaz muestra "editado" al lado de la fecha: sin esa marca, cambiar el contenido despues de que alguien respondio deja la conversacion sin sentido y nadie se entera.';

/*
 * Lo pone el servidor, no el cliente. Si dependiera de que el frontend mande el
 * campo, bastaria con no mandarlo para editar sin dejar rastro -- que es
 * justamente lo que la marca viene a impedir.
 *
 * Solo cuenta como edicion un cambio de titulo o de cuerpo: `likes_count` y
 * `last_activity_at` los mueven los triggers todo el tiempo y no son ediciones.
 */
CREATE OR REPLACE FUNCTION public.stamp_community_post_edit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.title IS DISTINCT FROM OLD.title OR NEW.body IS DISTINCT FROM OLD.body THEN
    NEW.edited_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_stamp_community_post_edit ON public.community_posts;
CREATE TRIGGER trigger_stamp_community_post_edit
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.stamp_community_post_edit();

-- ---------------------------------------------------------------------------
-- 3. Vista de tendencia, sin el corte de 72 horas
-- ---------------------------------------------------------------------------

/*
 * DROP y CREATE, no CREATE OR REPLACE: la vista hace `SELECT p.*` y la tabla
 * acaba de ganar dos columnas. `CREATE OR REPLACE VIEW` solo admite agregar
 * columnas AL FINAL, y las nuevas de `p.*` entrarian antes de `trending_score`.
 */
DROP VIEW IF EXISTS public.community_posts_trending;

CREATE VIEW public.community_posts_trending AS
SELECT
  p.*,
  (p.likes_count * 2 + p.comments_count * 3)::numeric
    / power((extract(epoch FROM (now() - p.last_activity_at)) / 3600.0) + 2, 1.5) AS trending_score
FROM public.community_posts p
-- 30 dias y desde la ULTIMA ACTIVIDAD, no desde la creacion: una publicacion
-- vieja que hoy tiene respuestas sigue siendo relevante. El decaimiento de la
-- formula ya hace que lo viejo pese menos; el filtro solo evita recorrer el
-- historico entero.
WHERE p.last_activity_at > now() - interval '30 days';

GRANT SELECT ON public.community_posts_trending TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. Denuncias de publicaciones
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.community_post_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text CHECK (reason IS NULL OR char_length(reason) <= 200),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Una persona denuncia una publicacion una sola vez. Sin esto, tocar el boton
  -- dos veces cuenta dos denuncias y falsea la cola de moderacion.
  UNIQUE (post_id, reporter_id)
);

CREATE INDEX IF NOT EXISTS community_post_reports_pending_idx
ON public.community_post_reports (created_at);

ALTER TABLE public.community_post_reports ENABLE ROW LEVEL SECURITY;

-- Solo el staff lee la cola. Que cualquiera pudiera ver quien denuncio a quien
-- convertiria la moderacion en un motivo de conflicto entre usuarios.
DROP POLICY IF EXISTS "Staff read community post reports" ON public.community_post_reports;
CREATE POLICY "Staff read community post reports"
ON public.community_post_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

DROP POLICY IF EXISTS "Users report posts once" ON public.community_post_reports;
CREATE POLICY "Users report posts once"
ON public.community_post_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Staff dismiss community post reports" ON public.community_post_reports;
CREATE POLICY "Staff dismiss community post reports"
ON public.community_post_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR coalesce(p.is_helper, false) = true)
  )
);

GRANT SELECT, INSERT, DELETE ON public.community_post_reports TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'community_post_reports'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.community_post_reports';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
