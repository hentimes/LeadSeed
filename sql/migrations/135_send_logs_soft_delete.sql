-- send_logs_soft_delete
--
-- Tipo:           query permanente (columna nueva)
-- Objeto:         public.send_logs
-- Clase:          borrado reversible con constancia
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la columna y del indice)
--
-- PROPOSITO
--
-- Hoy el historial de envios no se puede limpiar: no hay forma de sacar una
-- linea. Se pide poder eliminarlas, pero con una condicion que cambia por
-- completo la implementacion: **la linea eliminada tiene que seguir viendose**,
-- como "Fecha - Mensaje enviado a {nombre} eliminado", en gris y cursiva.
--
-- O sea que no se pide borrar. Se pide OCULTAR EL CONTENIDO conservando la
-- constancia de que el envio existio. Un DELETE no sirve para eso: perderia el
-- hecho junto con el texto.
--
-- POR QUE UNA MARCA Y NO UN DELETE
--
-- Ademas de lo anterior, `send_logs` no es solo una lista para mirar. Es la
-- fuente de tres cosas que se romperian en silencio si las filas desaparecieran:
--
--   * los contadores de envios por lead (`buildLeadSendCounts`), que alimentan
--     las columnas "WhatsApp" y "Email" de la tabla de leads
--   * el conjunto de leads ya contactados (`fetchSentLeadIdsSetForUser`), del
--     que depende la bandeja de olvidados
--   * las metricas del panel (`097_send_logs_dashboard_index`)
--
-- Con un DELETE, limpiar el historial le bajaria los numeros al panel y
-- resucitaria leads en "olvidados". Con una marca, cada consumidor decide: los
-- contadores siguen contando el envio -porque ocurrio- y el historial lo pinta
-- como lapida.
--
-- Esa es la razon de fondo por la que esta columna es `deleted_at` y no un
-- `DELETE`: el dato que se oculta y el hecho que se conserva son cosas
-- distintas.
--
-- SOBRE RLS
--
-- No hace falta politica nueva. La de `006_lead_notes_and_send_logs` es
-- `FOR ALL ... USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
-- asi que el UPDATE que marca la fila ya esta cubierto, y solo sobre las filas
-- propias. Queda dicho porque es facil suponer lo contrario: una politica de
-- SELECT no habilita UPDATE, y aca la que hay cubre las dos por ser FOR ALL.
--
-- QUE NO HACE
--
-- No borra nada de forma definitiva. El borrado real -si alguna vez se pide-
-- seria otra migracion y otra decision, porque destruye el registro contable
-- del envio.

ALTER TABLE public.send_logs
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.send_logs.deleted_at IS
  'Marca de borrado blando del historial. Con valor, el historial pinta la fila como lapida y oculta el contenido; el envio sigue contando para metricas y contadores.';

-- Indice parcial: solo indexa lo eliminado, que es la minoria.
--
-- El historial pide "las no eliminadas" (`deleted_at IS NULL`), que es casi
-- todo, y para eso un indice no sirve de nada -recorrer la tabla es mas barato
-- que el indice-. Lo que si conviene es encontrar rapido las eliminadas cuando
-- se quiera revisarlas o restaurarlas, y ahi el indice parcial pesa poquisimo
-- porque solo tiene las filas marcadas.
CREATE INDEX IF NOT EXISTS send_logs_deleted_at_idx
  ON public.send_logs (user_id, deleted_at)
  WHERE deleted_at IS NOT NULL;
