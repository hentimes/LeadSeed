# Edge Functions - donde vive el source de cada una

Este proyecto y `landing-gerow` comparten el **mismo proyecto Supabase**. Las
Edge Functions de ese proyecto se despliegan desde dos repos distintos segun
de quien es el dominio de la funcionalidad:

- **Este repo (LeadSeed)**: funciones que sirven a la extension / la app del
  usuario autenticado. Son las que ves listadas en este directorio:
  `email-channels`, `form-lead-abandoned`, `form-lead-file`, `form-leads`,
  `form-public-availability`, `google-calendar-*`, `send-email`.
- **`landing-gerow`**: funciones que sirven a los formularios publicos
  (planespro.cl / pb / form / retiro). Su source vive en
  `landing-gerow/supabase/functions/`, **no aca**. La confirmada hasta ahora:
  - `form-progress` (recibe eventos de visita/paso1/paso2 de los formularios
    publicos y escribe en `public.form_progress_events` con la service role
    key).

Si buscas el source de una funcion desplegada y no la encuentras en este
directorio, antes de asumir que "falta" o esta "rota", corre
`npx supabase functions list` (o revisa el campo `entrypoint_path` de la
funcion) para confirmar en cual repo vive. No la reconstruyas de memoria en
este repo: eso crearia una segunda fuente de verdad para la misma funcion
desplegada.

Este README nace de un hallazgo de la auditoria cruzada CONTROL 14.4 del
2026-08-05 (ver `AI_SYNC.md`): `form-progress` parecia "faltante" en este repo
hasta verificar que su entrypoint real apunta a `landing-gerow`.
