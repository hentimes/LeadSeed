-- send_logs_dashboard_index
--
-- Tipo:          query permanente (DDL de indices)
-- Objeto:        public.send_logs
-- Clase:         optimizacion de lectura
-- Persistencia:  permanente
-- Reversibilidad: total (ver bloque de reversion al final)
--
-- PROPOSITO
--
-- get_my_dashboard_snapshot hace ocho conteos sobre send_logs. Seis de ellos
-- tienen exactamente esta forma:
--
--   where sl.user_id = auth.uid()
--     and sl.template_type = '<whatsapp|email|call>'
--     and sl.sent_at >= <inicio> and sl.sent_at < <fin>
--
-- Igualdad en user_id, igualdad en template_type, rango en sent_at. El indice
-- que sirve ese patron es (user_id, template_type, sent_at): las igualdades
-- primero y el rango al final.
--
-- Ninguno de los dos indices existentes lo cubre:
--
--   send_logs_user_lead_type_idx  (user_id, lead_id, template_type)
--   send_logs_user_sent_at_idx    (user_id, sent_at desc)
--
-- El primero pone lead_id en medio. Como la consulta no filtra por lead_id,
-- el recorrido se corta en user_id y template_type queda inalcanzable: la
-- tercera columna de un indice solo sirve si las dos anteriores estan fijadas.
-- El segundo sirve el rango de fechas pero obliga a filtrar template_type
-- fila por fila. Hoy funciona porque el volumen es bajo; el coste crece con
-- los envios acumulados por usuario, que es justo lo que crece siempre.
--
-- DEPENDENCIAS
--
-- Consultas que tocan send_logs y a que indice van tras este cambio:
--
--   get_my_dashboard_snapshot, 6 conteos por tipo  -> el indice nuevo
--   get_my_dashboard_snapshot, 2 conteos 'total'   -> send_logs_user_sent_at_idx
--   get_my_dashboard_snapshot, not exists por lead -> send_logs_user_lead_idx
--   fetchSentLeadTypePairs (historyRepository)     -> el indice nuevo
--   fetchSentLeadIdsByUser, fetchSendLogRowsByUser -> user_id, cualquiera sirve
--   mergeSendLogsIntoLead (duplicatesRepository)   -> send_logs_user_lead_idx
--
-- IMPACTO
--
-- Lecturas: mejora los seis conteos del dashboard, que se ejecutan en cada
-- carga de la pagina principal. Escrituras: send_logs pasa de tres indices a
-- tres. No hay coste neto de mantenimiento por fila insertada.
--
-- Sin CONCURRENTLY a proposito: send_logs es una tabla por usuario con
-- volumenes de miles de filas, no de millones, y CONCURRENTLY no puede correr
-- dentro de la transaccion en la que se aplica una migracion. Si algun dia
-- esta tabla crece un orden de magnitud, este indice hay que rehacerlo fuera
-- de migracion.

create index if not exists send_logs_user_type_sent_at_idx
  on public.send_logs (user_id, template_type, sent_at desc);

-- La tercera columna de send_logs_user_lead_type_idx no la aprovecha ninguna
-- consulta: no hay ni una que fije user_id y lead_id y ademas filtre por
-- template_type. Se reemplaza por su prefijo util, que es lo que si se usa
-- (el not exists del dashboard y la fusion de duplicados). Es un indice mas
-- estrecho que hace el mismo trabajo.
create index if not exists send_logs_user_lead_idx
  on public.send_logs (user_id, lead_id);

drop index if exists public.send_logs_user_lead_type_idx;

-- REVERSION
--
--   create index if not exists send_logs_user_lead_type_idx
--     on public.send_logs (user_id, lead_id, template_type);
--   drop index if exists public.send_logs_user_lead_idx;
--   drop index if exists public.send_logs_user_type_sent_at_idx;
