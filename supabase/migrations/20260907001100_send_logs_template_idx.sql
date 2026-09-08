-- send_logs_template_idx
--
-- Tipo:           indices nuevos
-- Objeto:         public.send_logs
-- Clase:          rendimiento
-- Persistencia:   permanente
-- Reversibilidad: total (drop de los indices)
--
-- PROPOSITO
--
-- Sostener la deteccion de "que paso del flujo ya recibio cada lead".
--
-- `flow_resume_points` (158, corregida en la 163) cruza `send_logs` con los
-- pasos del flujo por `template_id` y, cuando la plantilla se borro y el
-- vinculo quedo nulo, por `template_name`. Ninguna de las dos columnas tenia
-- indice: los que hay sobre esta tabla son por `(user_id, sent_at)`,
-- `(user_id, template_type, sent_at)` y `(lead_id, sent_at)`.
--
-- El coste de esa consulta crece con el TOTAL de mensajes que la cuenta mando
-- alguna vez -incluidos los manuales, de cualquier canal y de cualquier fecha-
-- y no con los leads del flujo. Se paga entera al abrir "Inscribir" y otra vez
-- en cada inscripcion en tanda. Con unos miles de envios historicos eso es un
-- recorrido completo de la tabla por cada apertura de la pantalla.
--
-- POR QUE DOS INDICES PARCIALES Y NO UNO
--
-- Porque son las dos ramas del `OR` de la 163, y cada una filtra por lo
-- contrario: la primera solo sirve cuando hay `template_id`, la segunda solo
-- cuando NO lo hay. Partirlos deja cada indice pequeño -el segundo cubre
-- unicamente los envios huerfanos, que son pocos- y le da al planificador dos
-- caminos exactos en vez de uno que no encaja en ninguna de las dos.
--
-- Van con `user_id` delante porque toda lectura de esta tabla pasa por RLS,
-- que filtra por `auth.uid() = user_id`: sin esa columna primero el indice se
-- usa despues de filtrar en vez de para filtrar.
--
-- COSTE
--
-- Dos indices mas sobre una tabla que se escribe una fila por mensaje enviado.
-- La escritura de `send_logs` no esta en ningun camino critico -ocurre una vez
-- por envio, junto a abrir WhatsApp- asi que el intercambio es claramente
-- favorable.

CREATE INDEX IF NOT EXISTS send_logs_user_template_idx
  ON public.send_logs (user_id, template_id)
  WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS send_logs_user_template_name_idx
  ON public.send_logs (user_id, template_name)
  WHERE template_id IS NULL AND template_name IS NOT NULL;

COMMENT ON INDEX public.send_logs_user_template_idx IS
  'Sostiene el cruce de flow_resume_points y lead_send_summary por plantilla.';

COMMENT ON INDEX public.send_logs_user_template_name_idx IS
  'La rama de respaldo: envios cuya plantilla se borro y solo conservan el nombre.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   drop index if exists public.send_logs_user_template_idx;
--   drop index if exists public.send_logs_user_template_name_idx;
