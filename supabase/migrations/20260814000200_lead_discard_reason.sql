-- lead_discard_reason
--
-- Tipo:           query permanente (columna nueva)
-- Objeto:         public.leads
-- Clase:          captura de dato que hoy no existe
-- Persistencia:   permanente
-- Reversibilidad: total (drop column)
--
-- PROPOSITO
--
-- El panel muestra un grafico "Razones de descarte" con cuatro barras: Precio
-- alto 42, No responde 28, Competencia 18, Fuera de zona 12. Esos numeros estan
-- escritos en el codigo del componente. No salen de ningun sitio.
--
-- Y no podian salir: **el CRM nunca ha preguntado por que se descarta un lead**.
-- Se puede pasar un lead a `descartado` desde tres sitios (la ficha, la accion
-- masiva y el arrastre en el pipeline) y ninguno recoge el motivo.
--
-- Esta migracion crea el sitio donde guardarlo. La captura en la interfaz va
-- aparte, porque cambia el flujo de trabajo.
--
-- POR QUE UNA COLUMNA Y NO METADATA
--
-- El resto del contexto del lead vive en `metadata`, pero esto se va a agregar
-- en cada carga del panel. Una columna se indexa y se agrupa sin extraer JSON,
-- y ademas deja el dato a la vista de cualquiera que mire la tabla, que es lo
-- que se quiere de un campo que el usuario rellena a mano.
--
-- SOBRE LOS LEADS YA DESCARTADOS
--
-- Quedan con el motivo en nulo, y **asi debe ser**: nadie se lo pregunto. Se
-- cuentan aparte como "Sin motivo" en vez de repartirlos entre las categorias,
-- que seria inventar otra vez. Al `2026-08-14` son todos los descartados que
-- haya, porque el dato nace hoy.
--
-- IMPACTO
--
-- Escritura: una columna de texto, nula por defecto. Ninguna fila existente
-- cambia. Lectura: el indice parcial solo cubre las filas que tienen motivo,
-- que son las unicas que el grafico agrupa.

alter table public.leads
  add column if not exists discard_reason text;

comment on column public.leads.discard_reason is
  'Motivo por el que se descarto el lead. Nulo si no se pregunto o si el lead no esta descartado. Alimenta el grafico de razones de descarte del panel.';

-- Parcial: solo interesan las filas que tienen motivo, que son pocas frente al
-- total de leads.
create index if not exists leads_discard_reason_idx
  on public.leads (user_id, discard_reason)
  where discard_reason is not null and deleted_at is null;

-- REVERSION
--
--   drop index if exists public.leads_discard_reason_idx;
--   alter table public.leads drop column if exists discard_reason;
