-- whatsapp_daily_limit
--
-- Tipo:           columna nueva
-- Objeto:         public.profiles.whatsapp_daily_limit
-- Clase:          ajuste del usuario
-- Persistencia:   permanente
-- Reversibilidad: total (drop de la columna)
--
-- PROPOSITO
--
-- El tope de mensajes de WhatsApp que se pueden mandar en un dia.
--
-- POR QUE NO SE REUSA `daily_goal_whatsapp`
--
-- Porque son dos cosas distintas con el mismo numero por casualidad.
--
--   daily_goal_whatsapp  es una META: "hoy quiero llegar a 50". Vive en el
--                        panel, motiva, y bajarla un dia flojo es razonable.
--   whatsapp_daily_limit es un TOPE: "no pases de 50 o te arriesgas a que
--                        WhatsApp te bloquee la cuenta".
--
-- Con una sola columna, bajar la meta a 20 un dia tranquilo apagaria los
-- botones de los flujos al llegar a 20, que no es lo que nadie quiso decir. Son
-- dos numeros porque contestan dos preguntas.
--
-- POR QUE NO HAY TABLA DE CUPOS
--
-- Cuantos van hoy no se guarda: se cuenta sobre `send_logs`, que ya registra
-- cada envio con su `sent_at` y su `template_type`. Una tabla de contadores
-- seria una segunda fuente de verdad sobre lo mismo, y la primera vez que las
-- dos discreparan -un envio registrado y el contador no- el tope empezaria a
-- mentir en la direccion peligrosa.
--
-- QUE DIA SE CUENTA
--
-- El del usuario, no el del servidor: quien manda mensajes a las 22:00 en
-- Santiago no quiere que su cupo se reinicie a las 21:00 porque en UTC ya es
-- otro dia. El corte lo calcula el cliente con su propio reloj y lo manda como
-- instante; aca no se decide nada de eso.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp_daily_limit integer DEFAULT 50;

COMMENT ON COLUMN public.profiles.whatsapp_daily_limit IS
  'Tope de mensajes de WhatsApp por dia. Distinto de daily_goal_whatsapp, que es una meta: uno frena, la otra motiva.';

NOTIFY pgrst, 'reload schema';

-- REVERSION
--
--   alter table public.profiles drop column if exists whatsapp_daily_limit;
