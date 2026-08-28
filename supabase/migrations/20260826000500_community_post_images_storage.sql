-- 125 - Bucket de imagenes de las publicaciones del foro
--
-- Complementa a la 124, que creo la tabla `community_post_attachments`. Aquella
-- resuelve la parte relacional (que imagen va en que publicacion, arriba o
-- abajo); esta resuelve donde vive el archivo.
--
-- ## Bucket propio y no `chat-attachments`
--
-- La primera intuicion fue reusar el del chat, y es incorrecta. No por
-- privacidad -el bucket del chat ya es publico desde la 085, con una policy de
-- lectura sin filtro- sino por tres motivos que NO se pueden resolver con un
-- prefijo de carpeta:
--
-- 1. `file_size_limit` es por bucket. El chat esta en 3 MB; una imagen a ancho
--    completo necesita mas. Subir ese limite afloja tambien el chat.
-- 2. `allowed_mime_types` tambien es por bucket. El chat acepta documentos; el
--    foro tiene que aceptar solo imagenes.
-- 3. El ciclo de vida es distinto: el chat purga a los 30 dias (077), una
--    publicacion del foro es permanente. El trigger de la 088 filtra por
--    `bucket_id = 'chat-attachments'`, asi que mezclar obligaria a discriminar
--    por prefijo dentro del mismo bucket.
--
-- ## El limite de 1,5 MB
--
-- El cliente comprime antes de subir a 1280px por lado y, cuando el navegador
-- sabe codificarlo, a AVIF. Eso da entre 110 y 180 KB tipicos. 1,5 MB es techo
-- para el caso raro (una imagen con mucho ruido, que comprime mal), no el
-- tamano esperado.
--
-- El tope de 1280 sale de medir, no de redondear: el contenedor de imagen mas
-- ancho de la extension son 548px CSS, que a 2x de densidad son 1096px reales.
-- Una version anterior de esta migracion decia 1920px y 2 MB; eran 2,25 veces
-- los pixeles necesarios, o sea mas del doble de peso por pixeles que ninguna
-- pantalla llega a mostrar.
--
-- ## AVISO DE CAPACIDAD, a verificar antes de aplicar
--
-- A ~150 KB por imagen, 200 personas publicando dos veces al mes con dos
-- imagenes son ~120 MB al mes, y el foro no purga: se acumula. El plan gratuito
-- de Supabase da 1 GB de Storage, o sea unos ocho meses hasta el tope. NO se
-- puede saber desde el repositorio en que plan esta el proyecto ni cuanto ocupa
-- hoy el bucket: hay que mirarlo en la consola (Settings -> Usage) antes de
-- abrir esto a todo el mundo.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community-post-images',
  'community-post-images',
  true,
  1572864, -- 1,5 MB
  -- AVIF incluido: el compresor del cliente lo prefiere cuando el navegador
  -- sabe codificarlo, porque pesa entre un 30% y un 50% menos que WebP a la
  -- misma calidad. Sin esta entrada, esas subidas las rechazaria el bucket.
  ARRAY['image/avif', 'image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Lectura abierta, mismo criterio que la 005 y la 085: el foro ya se lee entero
-- con estar autenticado, y esconder los archivos tras URLs firmadas costaria
-- una llamada por imagen al dibujar el feed sin agregar ninguna restriccion
-- real.
DROP POLICY IF EXISTS "community_post_images_public_read" ON storage.objects;
CREATE POLICY "community_post_images_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'community-post-images');

-- La ruta es `{uid}/{uuid}.{ext}` y NO `{postId}/...`. La extension la decide
-- el formato que el compresor consiguio (avif o webp), no una constante.
--
-- El motivo es de orden temporal: cuando la persona elige la imagen todavia
-- esta redactando y la publicacion no existe, asi que no hay `postId` contra el
-- que validar en el momento del INSERT. El vinculo con la publicacion lo hace
-- despues la fila de `community_post_attachments`.
--
-- `is_current_user_confirmed()` por la regla de la 110/112: sin eso, una cuenta
-- con el correo sin confirmar sube archivos y reparte la URL publica. Seria
-- alojamiento gratis a costa del proyecto, sin pasar siquiera por el foro.
DROP POLICY IF EXISTS "community_post_images_owner_insert" ON storage.objects;
CREATE POLICY "community_post_images_owner_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'community-post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND public.is_current_user_confirmed()
);

DROP POLICY IF EXISTS "community_post_images_owner_delete" ON storage.objects;
CREATE POLICY "community_post_images_owner_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'community-post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Al borrarse la publicacion, la fila de `community_post_attachments` cae por
-- ON DELETE CASCADE. Pero eso borra la FILA, no el archivo: Supabase Storage no
-- tiene reglas de ciclo de vida ni borrado en cascada hacia los objetos. Hay
-- que hacerlo a mano.
--
-- El `set_config` es obligatorio, no decorativo: `storage.protect_delete()`
-- rechaza cualquier DELETE directo sobre `storage.objects` salvo que la sesion
-- lo habilite. Sin esa linea, borrar una publicacion con imagen aborta la
-- transaccion entera. Es exactamente el fallo que corrigio la 088 en el chat.
CREATE OR REPLACE FUNCTION public.delete_community_post_image_object()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);

  DELETE FROM storage.objects
  WHERE bucket_id = 'community-post-images'
    AND name = OLD.storage_path;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_community_post_image_object ON public.community_post_attachments;
CREATE TRIGGER trigger_delete_community_post_image_object
AFTER DELETE ON public.community_post_attachments
FOR EACH ROW EXECUTE FUNCTION public.delete_community_post_image_object();

-- Huerfanas del borrador abandonado.
--
-- El archivo se sube mientras se redacta, asi que si la persona cierra la
-- extension sin publicar, el objeto queda en el bucket y nunca llega a existir
-- la fila que lo vincula. Nadie lo borra.
--
-- No hay pg_cron en este proyecto, y el patron establecido para retencion es
-- barrer dentro de un trigger de INSERT (`clean_old_chat_messages`, 077). Se
-- replica: al registrar una imagen se limpian las huerfanas de mas de 24 horas
-- de la carpeta de esa misma persona. Acotarlo a su carpeta mantiene el coste
-- constante, en vez de recorrer el bucket entero en cada publicacion.
--
-- Las 24 horas son el margen para que un borrador legitimo que quedo abierto un
-- rato largo no pierda su imagen antes de publicarse.
CREATE OR REPLACE FUNCTION public.sweep_orphan_community_post_images()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('storage.allow_delete_query', 'true', true);

  DELETE FROM storage.objects o
  WHERE o.bucket_id = 'community-post-images'
    AND (storage.foldername(o.name))[1] = NEW.uploader_id::text
    AND o.created_at < now() - interval '24 hours'
    AND NOT EXISTS (
      SELECT 1 FROM public.community_post_attachments a
      WHERE a.storage_path = o.name
    );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_sweep_orphan_community_post_images ON public.community_post_attachments;
CREATE TRIGGER trigger_sweep_orphan_community_post_images
AFTER INSERT ON public.community_post_attachments
FOR EACH ROW EXECUTE FUNCTION public.sweep_orphan_community_post_images();

NOTIFY pgrst, 'reload schema';
