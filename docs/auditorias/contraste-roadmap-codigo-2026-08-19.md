# Contraste del roadmap contra el codigo

**Fecha:** 2026-08-19
**Motivo:** el roadmap declaraba 140 items abiertos. Se sospechaba que una parte estaba construida y
sin marcar, porque ese mismo dia se edito `AdminUserAgenda.tsx` para retirarle una variable CSS
muerta, y ese archivo no deberia existir si la agenda observada estuviera sin empezar.

**Alcance honesto:** esto contrasta **existencia de codigo**, no comportamiento. Que una tabla, un RPC
y un componente existan no prueba que se comporten como el item pedia. Donde se verifico algo mas
fuerte que la existencia, se dice.

No se revisaron los 140. Se priorizaron los capitulos con mas items abiertos y los que se iban a
recomendar como siguiente trabajo, que era el riesgo concreto: mandar a construir lo ya construido.

## Correccion previa: el titular de este informe estaba mal

La primera version decia **"26 items marcados como abiertos estaban construidos"**, con el roadmap
como culpable. Es falso, y el error era mio.

De esos 26, **22 estaban marcados `[EN REVISION]`**, que en este roadmap significa *construido, falta
verificar*. El registro era correcto. Lo que estaba mal era **mi recuento anterior**, que sumo
`EN REVISION` dentro de "items abiertos" y presento 145 como si fueran trabajo por hacer.

Se descubrio al intentar reescribir esas lineas: el script fallo porque buscaba `[PENDIENTE]` y no lo
encontraba. Sin ese fallo se habria publicado la acusacion entera.

## Lo que si esta mal marcado: 5 items

Estos si decian `[PENDIENTE]` estando construidos.

### Capitulo 6.2 - Alertas cruzadas multi-ejecutivo

Respaldo: `sql/migrations/021_capture_links_analytics_and_cross_exec_alerts.sql`.

| Item | Evidencia |
|---|---|
| Tablas/RPCs para alertas cruzadas | tabla `lead_cross_exec_events` |
| Recalcular coincidencias al crear lead | trigger `lead_cross_exec_sync_trg` sobre `leads`, que cubre **todas** las vias a la vez: formulario, `pb`, importacion, carga manual y edicion |
| Mostrar alerta discreta en el detalle | `LeadDetailCrossExecAlert.tsx`, consumido en `LeadDetail` y `LeadsTableRow` |
| Validar privacidad | se cumple **por construccion**: el `select` trae `related_lead_id`, `event_kind`, `counterpart_captured_at` y `matched_by`, y **no** nombre, correo ni id del otro ejecutivo |

Queda `[PARCIAL]` priorizar leads con alerta reciente: hay lectura por lote
(`fetchCrossExecEventRowsByLeadIds`), pero no se comprobo que ordene la bandeja.

Queda abierto de verdad: la preferencia por usuario para activar o desactivar las alertas.

### Capitulo 12.1

`ChatRoom.tsx` esta en **601 lineas, no en las 1097** que dice el item. Ya se dividio, y 601 cumple el
limite de 800 del propio roadmap.

## Lo verificado como construido y en revision (22 items)

El registro ya lo decia; se confirma que el codigo existe.

- **8.2, supervision de leads nuevos (9):** migracion 043, `unseen_new_leads_count`,
  `mark_admin_user_leads_seen`, badges en `AdminUsersPage.tsx:329` y `:396`, feed `admin_lead_events`
  (migracion 048).
- **8.3, agenda observada (6):** `AdminUserAgenda.tsx`, RPC `list_admin_user_appointments`, estado de
  replica Google via `googleSyncError`.
- **8.4, contrato de aislamiento (1):** aqui si se verifico mas que la existencia. El RPC es
  `SECURITY DEFINER`, exige `auth.uid()` y `role = 'admin'`, **rechaza que el admin se observe a si
  mismo**, y su cuerpo es solo `RETURN QUERY SELECT`: sin `insert`, `update` ni `delete`. El
  componente que la consume tampoco muta nada.
- **12.1, chat y comunidad (6):** sala, foro, moderacion, mensajes directos y adjuntos.

## Confirmado abierto

- **5.3**, panel analitico configurable: el backend expone los atributos, el panel no existe.
- **9.2**, app movil: sin Capacitor, Expo ni React Native en `package.json`.
- **10.3**, marketplace de leads: sin rastro.
- **6.2**, preferencia de alertas reciprocas.

## Defecto del roadmap como documento

**Numeracion duplicada.** Los capitulos 8.2, 8.3 y 8.4 aparecen **dos veces** con contenidos
distintos: lineas 401-426 (supervision de admin) y 480-496 (despliegue, suscripciones, correo).
Citarlos por numero es ambiguo.

## Conclusion, y es distinta de la que se esperaba

El roadmap esta **mejor mantenido de lo que se supuso**. El problema no es que mienta, sino que
`EN REVISION` y `PENDIENTE` se venian sumando en el mismo saco al contar. Son cosas opuestas: uno es
codigo escrito esperando ojos, el otro es trabajo sin empezar.

De los 140 abiertos, **29 son `EN REVISION`**: no son trabajo pendiente, son verificaciones
pendientes. Y la mayoria son del usuario, no de quien escribe codigo.
