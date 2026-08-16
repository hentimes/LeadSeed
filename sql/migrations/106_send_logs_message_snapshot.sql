-- send_logs_message_snapshot
--
-- Tipo:           query permanente (columnas nuevas)
-- Objeto:         public.send_logs
-- Clase:          captura de dato que hoy no existe
-- Persistencia:   permanente
-- Reversibilidad: total (drop de las cuatro columnas)
--
-- PROPOSITO
--
-- El historial de mensajes de un lead **no guarda nada**: lo reconstruye
-- buscando la plantilla por id en la lista viva. `useLeadDetail` lo hace asi:
--
--   getTemplateName    -> waTemplates.find(t => t.id === templateId)?.nombre || '?'
--   getTemplateContent -> waTemplates.find(t => t.id === log.templateId)?.contenido || ''
--
-- Eso tiene dos consecuencias, y ninguna es evidente hasta que ocurre:
--
-- 1. **Si se borra la plantilla, el mensaje desaparece del historial.** El
--    nombre pasa a ser '?' y el contenido a cadena vacia; `LeadDetailHistory`
--    ademas usa `templateName !== '?'` para decidir si la fila se puede
--    desplegar, asi que el registro queda sin poder abrirse.
-- 2. **Si se edita la plantilla, el historial muestra el texto nuevo** como si
--    fuera el que se envio. Nadie avisa. Es la misma clase de problema que el
--    panel analitico: la pantalla afirma algo que no puede saber.
--
-- El segundo es el mas grave de los dos, porque no se nota. Un lead al que se
-- le escribio en julio muestra el texto de agosto y parece correcto.
--
-- QUE SE GUARDA
--
-- El mensaje **ya resuelto**, no la plantilla: con las variables sustituidas y
-- con la edicion temporal que el usuario haya hecho en el momento de enviar
-- (el campo "Contenido (edicion temporal)" del compositor). Es lo unico que
-- responde de verdad a "que le mande a esta persona".
--
-- POR QUE COLUMNAS Y NO UNA REFERENCIA A UNA TABLA DE VERSIONES
--
-- Versionar plantillas resolveria el caso 2 pero no el 1: si se borra la
-- plantilla, se borran sus versiones. Ademas el texto enviado no es una version
-- de la plantilla, porque incluye sustituciones por lead y ediciones sueltas;
-- dos leads del mismo envio reciben textos distintos. El registro pertenece al
-- envio, no a la plantilla.
--
-- COSTE
--
-- Una copia del texto por destinatario. Un envio a 500 leads con un mensaje de
-- 1 KB son 500 KB. Es asumible y es el precio de que el historial sea cierto.
--
-- SOBRE LAS FILAS ANTERIORES
--
-- Quedan con las cuatro columnas en nulo y **no se rellenan**: reconstruirlas
-- desde la plantilla actual seria escribir como si fuera el texto enviado algo
-- que quiza no lo es, que es justo el defecto que esta migracion corrige.
--
-- El frontend debe seguir cayendo a la plantilla viva cuando el snapshot sea
-- nulo, y solo entonces. Asi el historial viejo se sigue viendo igual que hoy y
-- el nuevo es exacto.

alter table public.send_logs
  add column if not exists template_name text,
  add column if not exists content text,
  add column if not exists subject text,
  add column if not exists is_html boolean;

comment on column public.send_logs.template_name is
  'Nombre de la plantilla en el momento del envio. Nulo en registros anteriores a la migracion 106, y entonces se cae a la plantilla viva.';

comment on column public.send_logs.content is
  'Mensaje realmente enviado: variables ya sustituidas y ediciones del momento incluidas. No es el texto de la plantilla.';

comment on column public.send_logs.subject is
  'Asunto ya resuelto. Solo para envios de correo.';

comment on column public.send_logs.is_html is
  'Si el cuerpo guardado en content es HTML. Decide como se muestra en el historial.';

-- REVERSION
--
--   alter table public.send_logs
--     drop column if exists template_name,
--     drop column if exists content,
--     drop column if exists subject,
--     drop column if exists is_html;
