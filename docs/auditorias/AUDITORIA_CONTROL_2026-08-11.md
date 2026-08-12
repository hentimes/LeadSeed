# Auditoria CONTROL - 2026-08-11

Version: 1.0
Proyecto: `LeadSeed`
Alcance: auditoria integral aplicando `PROTOCOLO_CONTROL.md` seccion 10 (angulos obligatorios)
Metodo: cinco pasadas especializadas en paralelo (backend/datos, arquitectura frontend, higiene de
repositorio, UX/UI y accesibilidad, integracion `landing-gerow`) mas verificacion directa de git,
build y documentos rectores.

Exclusion declarada: por instruccion explicita del usuario, esta pasada NO audita ni actualiza
`AI_SYNC.md` ni las secciones 6, 14 y 19 del protocolo (coordinacion entre IAs). Todo lo demas del
protocolo si fue auditado.

---

## 1. Veredicto ejecutivo

El proyecto esta funcionalmente mucho mas avanzado de lo que declara su propia documentacion, y esa
brecha es el hallazgo estructural principal.

Lo que esta genuinamente bien:

- la capa de datos es solida: 48 tablas, todas con RLS habilitado, cero hallazgos criticos o altos
- la separacion `repositories / services / types` es real, no decorativa
- el retiro de Cloudflare del backend del formulario efectivamente ocurrio
- el historial git es lineal y limpio, sin divergencias que reconciliar
- `npm run build` esta en verde

Lo que esta mal y bloquea el objetivo declarado (base para app movil):

- deriva documental severa: el roadmap va 20 dias atrasado y omite modulos completos ya construidos
- doble fuente de verdad activa en `form-leads` entre este repo y `landing-gerow`, con riesgo real
  de romper produccion en el proximo deploy
- una migracion SQL de produccion no existe en el historial de este repo
- cero tests y cero lint en 305 archivos TypeScript
- el acoplamiento que impide portar a movil no es Chrome, es el DOM dentro de hooks de dominio

Clasificacion global segun protocolo seccion 9: `parcial`, con dos `pendiente estructural` criticos
(doble fuente de verdad de Edge Functions, historial de migraciones incompleto).

---

## 2. Cumplimiento del PROTOCOLO_CONTROL

### 2.1 Seccion 4 - Jerarquia de verdad

| Nivel | Estado | Evidencia |
|---|---|---|
| Nivel 1 (realidad verificable) | respetado en codigo | build verde, git limpio, RLS real |
| Nivel 2 (documentos operativos) | **incumplido** | roadmap, plan y contratos desalineados con el codigo |
| Nivel 3 (memoria conversacional) | no evaluable en esta pasada | - |

El protocolo declara cuatro documentos operativos vigentes. Tres de los cuatro contradicen el codigo
real hoy. Detalle en la seccion 3 de este informe.

### 2.2 Seccion 5 - Principios obligatorios

- **5.1 No desviarse del plan sin justificarlo: INCUMPLIDO.** El roadmap fija una regla de avance
  explicita: "no se abre como foco principal `tareas`, `plantillas`, `grupos`, `blog/noticias` ni
  nuevos modulos de producto hasta cerrar la validacion end-to-end real de Google Calendar / Google
  Meet". Entre el 2026-07-22 y el 2026-08-08 se abrieron y construyeron: sala de chat con menciones,
  comunidad como foro, moderacion y mensajes directos, adjuntos en chat, registro generico
  `form_types`, canal `retiro` con `source_channel`, funnel de visitas/paso1/paso2 y rediseno de
  Enviar. La validacion E2E de Google Calendar sigue abierta. La desviacion es real y no quedo
  justificada por escrito en el roadmap ni en el plan.
- **5.2 No cambiar arquitectura por impulso: cumplido.** No se detectaron reemplazos arquitectonicos
  injustificados.
- **5.3 No mezclar viejo y nuevo si eso crea dos fuentes de verdad: INCUMPLIDO en tres frentes.**
  (a) `form-leads` y `_shared/emailChannels.ts` existen divergentes en dos repos; (b) `sql/migrations/`
  y `supabase/migrations/` son dos lineas paralelas mantenidas a mano; (c) en frontend conviven tres
  sistemas de color (tokens, arbitrary values, `dark:` ad-hoc) y dos sistemas de primitivas UI.
  Ninguna de las tres convivencias tiene frontera declarada ni plan de salida escrito, que es
  justamente lo que 5.3 exige para admitir transicion.
- **5.4 No resolver sintomas con hacks: mayormente cumplido.** Se detecto duplicacion de logica
  (seccion 5.3 de este informe) pero no hacks ni banderas ocultas.
- **5.5 No marcar como hecho algo no validado: INCUMPLIDO parcialmente.** El roadmap declara
  `[COMPLETADO] Bajar entry principal validado a 30.27 kB en build`. El entry real medido hoy es
  **94.93 kB** (gzip 26.91 kB). La afirmacion es falsa contra la realidad actual.
- **5.6 No ocultar incertidumbre: cumplido.** La documentacion existente es explicita sobre lo que no
  esta validado. Este es el punto mas fuerte del proyecto en materia de gobierno.

### 2.3 Seccion 8 - Roadmap y plan vivos

Incumplido. Las reglas 8.4 (plan y roadmap deben mantenerse vivos), 8.5 (regla de actualizacion
obligatoria) y 8.6 (estado real de tareas) exigen que cada requerimiento nuevo se refleje en el
documento correspondiente. Ninguno de los modulos construidos entre el 22 de julio y el 8 de agosto
entro al roadmap. Se corrige en esta pasada.

### 2.4 Seccion 10.1 - Restricciones de UX y UI

Incumplido en cuatro puntos verificables:

- **caja blanca generica de bordes redondeados como patron por defecto**: el patron `bg-white` aparece
  186 veces en 83 archivos, reiteradamente combinado con `rounded-*` y `shadow-*` para estructurar
  bloques completos en Listas, Plantillas, Pipeline e Historial de envios. Evidencia puntual:
  `src/pages/ListsPage.tsx:427` y `:446`, `src/components/templates/TemplateEditor.tsx:242`,
  `src/pages/TemplatesPage.tsx:189` y `:222`, `src/pages/PipelinePage.tsx:137`.
- **prohibicion de emojis**: resuelto por el usuario el `2026-08-12`, incorporado al protocolo como
  precision `10.1.a`. La frontera es quien escribe el emoji, no donde se ve: prohibido todo emoji
  escrito en codigo, permitido el que el usuario final elige y envia como contenido de un mensaje.
  Estado por caso:
  - `src/pages/ListsPage.tsx:438` - icono decorativo de carpeta en la interfaz. Incumple, se retira.
  - `src/components/chat/ChatRoom.tsx:225` y `:376` - centinela hardcodeado. Correccion respecto de la
    primera version de este informe: **no** se persiste como contenido del mensaje, alimenta solo el
    fingerprint interno del anti-spam. Igual incumple `10.1.a` por ser emoji escrito en codigo; se
    sustituye por una marca ASCII sin cambio de comportamiento.
  - `src/components/chat/EmojiPicker.tsx` - **excepcion legitima**, se mantiene. Su unico destino es
    que el usuario inserte un emoji en un mensaje propio.
- **compacidad real en sidebar y movil**: 132 apariciones de anchos fijos en px y grids de columnas
  fijas en 68 archivos, concentradas en admin (`AdminUsersPage.tsx` 33, `AdminRequirementsPage.tsx`
  24, `AdminRolesPage.tsx` 22) y settings (`AgendaSettings.tsx` 25, `EmailSettings.tsx` 23).
- **lenguaje visual unico de LeadSeed**: coexisten dos sistemas de encabezado de pagina con escalas
  tipograficas distintas, `src/design/PageShell.tsx` (tokenizado, 17px) y
  `src/components/ui/PageHeader.tsx` (`text-2xl`, 24px, fuera de la escala). Producen jerarquia
  inconsistente entre secciones.

### 2.5 Seccion 15 - Reglas para SQL y Supabase

Cumplido en calidad de objetos (nombres consistentes, RLS tratado como alto riesgo, `search_path`
presente en todas las funciones `SECURITY DEFINER` reales). Incumplido en 15.3 respecto de la
disciplina de nomenclatura secuencial: `sql/migrations/` tiene colisiones de numero en `036` (dos
archivos) y `090` (dos archivos, uno de ellos sin commitear en este momento).

Se confirma que la regla 15.5 (el source de algunas Edge Functions vive en otro repo) esta
correctamente documentada, pero **la propia regla ya fue violada**: el `README.md` de
`supabase/functions/` afirma que `form-leads` pertenece a LeadSeed y que la unica funcion de
`landing-gerow` confirmada es `form-progress`. Es falso.

### 2.6 Seccion 16 - Integracion planespro.cl a LeadSeed

- **16.1 No romper el contrato publico antes de tiempo: en riesgo, no roto todavia.** Los tres
  endpoints protegidos siguen respondiendo. Pero existe un camino directo a romperlos, descrito en la
  seccion 4.1 de este informe.
- **16.2 No migrar solo media solucion: INCUMPLIDO.** El worker `ppusers` sigue montado sobre el D1
  `ppforms_db` y el R2 `ppforms-uploads`. Mientras siga vivo hay dos fuentes de verdad de leads, que
  es exactamente el riesgo que 16.2 prohibe y que el propio
  `landing-gerow-cloudflare-context.md:450` anticipo.
- **16.3 Orden recomendado: respetado.** Los pasos 1 a 4 se ejecutaron en orden. El paso 5 (cambiar el
  frontend publico) sigue pendiente y correctamente bloqueado por la CSP.
- **16.4 Fuente obligatoria: comprometida.** El documento que 16.4 declara obligatorio esta
  desactualizado en nueve puntos verificables (seccion 3.3).

---

## 3. Deriva documental

### 3.1 roadmap.md

Fecha de control declarada: 2026-07-22. Ultimo commit real: 2026-08-08. Veinte dias de deriva.

Modulos construidos y ausentes del roadmap:

| Modulo | Commit | Ausente del roadmap |
|---|---|---|
| Sala de chat con menciones e integrantes, comunidad como foro | `22e1a3a` | si |
| Moderacion de sala, mensajes directos, adjuntos | `e4e3f5a` | si |
| Correccion de colision de canal realtime en chat | `cd70955` | si |
| Rediseno de Enviar sobre sistema visual del Dashboard | `c59432d` | si |
| Canal retiro (`source_channel`) + funnel visitas/paso1/paso2 | `9e60aae` | si |
| Registro generico `form_types` | `f04729f` | si |
| Correccion de `Referer` como fallback de ref | `a351b59` | si |
| Borrado admin de mensajes de chat | sin commitear | si |

Afirmacion factualmente incorrecta detectada: entry principal declarado en 30.27 kB, real 94.93 kB.

### 3.2 HANDOFF_NEXT_SESSION.md

Emitido el 2026-07-30. Declara explicitamente que comunidad, foro, chat, intercambio de leads,
reputacion y marketplace "no es el alcance actual". Chat, comunidad y foro se construyeron despues.
El documento esta caducado y hoy induce a error a cualquier IA que lo lea como vigente.

### 3.3 landing-gerow-cloudflare-context.md

Documento declarado obligatorio por el protocolo seccion 7. Desactualizado en nueve puntos
verificables contra el codigo real de `landing-gerow`:

| Afirmacion del documento | Realidad verificada |
|---|---|
| `ppforms` resuelve disponibilidad, leads, PDF, Calendar, correos y panel admin | es un proxy sin logica de negocio |
| ruta publica `POST /api/form/appointments` | no existe, cae en 404 |
| rutas admin dentro de `ppforms` | no existen, solo hay 4 rutas mas `/health` |
| modulos internos `advisor-domain`, `calendar-domain`, `leads-domain` | no existen, `src/` tiene 3 archivos |
| binding D1 `FORM_DB` en `ppforms` | el real es `FORMS_DB` y esta en `ppusers` |
| binding R2 `FORM_UPLOADS` en `ppforms` | el real es `FORMS_UPLOADS` y esta en `ppusers` |
| cron cada 15 minutos en `ppforms` | `ppforms/wrangler.toml` no tiene triggers |
| `wrangler.toml` con correos, origins, Google client id, D1, R2, cron | tiene 3 lineas y ningun `[vars]` |
| "el siguiente paso no es tocar el frontend" | los pasos 1 a 4 ya se ejecutaron |

Sigue vigente: la meta arquitectonica, la lista de riesgos y el contrato de rutas a preservar.

### 3.4 planespro-form-integration-contract.md

Incompleto en cinco puntos. El mas grave: declara que existen **dos** canales publicos (`general` y
`pb`). Existen **cuatro**: `general`, `pb`, `retiro` y `form`. Tampoco documenta el protocolo de dos
fases (`submission_id`, `update_token`, `action_only`, `existing_lead_id`) que desde el 3 de agosto es
el mecanismo principal de `/form` y `/retiro`.

---

## 4. Migracion Cloudflare a Supabase

### 4.1 Hallazgo critico: doble fuente de verdad en form-leads

`supabase/functions/form-leads/index.ts` existe en **ambos repos** con contenido divergente:

- LeadSeed: 584 lineas, 31 de julio
- landing-gerow: 690 lineas, 3 de agosto

La version de `landing-gerow` es la de produccion y es estrictamente superior. Contiene un despacho
de tres vias que la de LeadSeed desconoce por completo:

- `action_only=1` invoca `update_planespro_public_lead_action`
- `submission_id` mas `update_token` invoca `submit_planespro_idempotent_public_lead`
- el resto invoca `submit_planespro_public_lead`

La copia de LeadSeed solo conoce la tercera. **Un `supabase functions deploy form-leads` ejecutado
desde este repo romperia `/form/` y `/retiro-tecnico-extranjero/` en produccion**: el paso 2 de esos
formularios dejaria de ser un UPDATE y crearia un lead duplicado por cada envio, ademas de perder la
creacion de cita.

Colision equivalente, menos grave, en `supabase/functions/_shared/emailChannels.ts` (381 lineas en
LeadSeed, 332 en landing-gerow).

Clasificacion: `pendiente estructural`. Riesgo activo hasta que se resuelva.

### 4.2 Hallazgo critico: migracion de produccion ausente del historial

`landing-gerow/supabase/migrations/20260803000100_form_lead_two_phase_submit.sql` (203 lineas) y
`LeadSeed/supabase/migrations/20260803000100_form_lead_two_phase_submit.sql` (93 lineas) comparten
timestamp y nombre, pero **son distintos**.

Faltan en LeadSeed, verificado por busqueda en todo el repo:

- el indice unico `leads_form_submission_id_uidx`
- la funcion `update_planespro_public_lead_action`

Consecuencia: un `supabase db reset` o una reconstruccion del esquema desde este repo produciria una
base sin idempotencia y sin la RPC de segunda fase, es decir, `/form/` y `/retiro/` rotos. Y como
ambos repos comparten la tabla `supabase_migrations.schema_migrations` con la misma version, la
herramienta considera la migracion ya aplicada y el drift queda invisible.

Clasificacion: `pendiente estructural`.

### 4.3 Estado real del retiro de Cloudflare

Ya migrado, con Supabase como fuente de verdad:

| Endpoint publico | Destino |
|---|---|
| `POST /api/form/leads` | `form-leads` |
| `POST /api/form/leads/abandoned` | `form-lead-abandoned` |
| `GET /api/public/availability` | `form-public-availability` |
| `POST /api/form/progress` | `form-progress` |

El worker `ppforms` quedo en 288 lineas de proxy, sin D1, sin R2, sin cron, sin Resend y sin Google
Calendar. Ese corte es real.

Pendiente de migrar:

1. `ppusers` sigue con los bindings `FORMS_DB` (D1 `ppforms_db`) y `FORMS_UPLOADS` (R2
   `ppforms-uploads`). Es la doble fuente de verdad de leads que el protocolo 16.2 prohibe.
2. `ppcrm`, el CRM legacy en `admin.planespro.cl/crm`.
3. `ppblog` y `ppnews`, ya contemplados en el roadmap como fase posterior.
4. La CSP de `landing-gerow` (`_headers:7`) no incluye `*.supabase.co`, asi que los formularios no
   pueden saltarse el proxy todavia.

### 4.4 Problemas concretos en los formularios

Existen cinco frontends de formulario (cuatro desplegados, uno WIP) y dos copias muertas versionadas.

| ID | Sev | Problema |
|---|---|---|
| P1 | CRITICO | doble fuente de verdad de `form-leads` (seccion 4.1) |
| P2 | CRITICO | RPC de produccion sin migracion en LeadSeed (seccion 4.2) |
| P3 | ALTO | `forms/form/app.js:237` envia `source_channel: "form"`, pero `resolve_planespro_booking_context` solo acepta `pb`, `general` y `retiro`. Sin un ref valido, un lead de `/form/` cae silenciosamente como `general`. La migracion `20260806000300` registro `form` en `form_types` pero no lo agrego a la normalizacion de canal |
| P4 | ALTO | `retiro-v2` esta roto por diseno: canal invalido, sin idempotencia, escribe telemetria que ningun funnel puede leer. Mitigante: no esta desplegado ni trackeado en git |
| P5 | ALTO | cuatro implementaciones independientes del normalizador de rutas de API, mas `retiro-v2` que hardcodea rutas legacy. Ya produjo drift real |
| P6 | MEDIO | el proxy fuerza `source_channel: "pb"` para cualquier request con ref y usa `Referer` como fuente de canal, contradiciendo el fix `a351b59` aplicado aguas abajo |
| P7 | MEDIO | el proxy no reenvia el header `Origin`, por lo que la allowlist CORS de las Edge Functions nunca discrimina nada y el borde real acepta cualquier origen |
| P8 | MEDIO | validaciones inconsistentes entre formularios (idempotencia, `first_touch_ref`, `capture_ref` vacio) |
| P9 | MEDIO | `retiro-v2` redirige a Hotmart tanto si el lead se guardo como si fallo; el lead se pierde en silencio |
| P10 | MEDIO | copias muertas versionadas (`pb/app.js`, `form/app.js`, `.codex-tmp/deploy-clean/`) que pueden confundir un deploy |
| P11 | BAJO | las Pages Functions solo exportan `onRequestGet` |
| P12 | BAJO | `form-progress` valida contra un allowlist hardcodeado mientras LeadSeed construyo `form_types` como registro editable; agregar un tipo desde la extension no habilita su telemetria |

---

## 5. Estado tecnico por capa

### 5.1 Datos y backend - el punto mas fuerte

- 97 archivos en cada carpeta de migraciones, sincronizados uno a uno y byte a byte salvo comentarios
- 48 tablas, todas con RLS habilitado; **cero hallazgos criticos, cero altos**
- todas las funciones `SECURITY DEFINER` reales tienen `SET search_path`
- ningun secreto hardcodeado en las Edge Functions
- el historial documenta correcciones de seguridad reales previas, incluida una escalada de
  privilegios en `profiles` cerrada con trigger (`20260601000106_lock_privileged_profile_columns.sql`)

Hallazgos abiertos:

| Sev | Hallazgo |
|---|---|
| MEDIO | `supabase/functions/form-lead-file/index.ts:7-17` refleja cualquier origin en CORS, a diferencia del resto de funciones que usan allowlist. Mitigado por auth y validacion de propiedad, pero es desviacion del estandar propio |
| MEDIO | `list_my_forgotten_leads` usa `ilike '%token%'` sin `pg_trgm`, mas `OFFSET` y un `NOT EXISTS` correlacionado. Se degrada linealmente con el volumen por usuario |
| MEDIO | RPC publicas anonimas con escritura real: superficie legitima pero unica, exige rigor en cada cambio |
| BAJO | `send_logs_user_lead_type_idx` tiene el orden de columnas equivocado para el patron de `get_my_dashboard_snapshot` |
| BAJO | scripts de reparacion de datos (`_recovery`, `repair_historical_`) mezclados con migraciones de esquema |
| BAJO | llamadas a Resend y Google sin `AbortController` con timeout |

### 5.2 Arquitectura frontend

Frontera de capas: buena pero con fugas concretas.

| Sev | Violacion |
|---|---|
| ALTA | `src/hooks/useRealtimeRefresh.ts:2` importa el cliente Supabase directamente. No es marginal: de el dependen `useLists`, `useTemplates`, `useLeadRealtimeRefresh` y por tanto `useLeads`. Toda la estrategia realtime cuelga de un hook acoplado al SDK |
| MEDIA | `src/services/realtimeService.ts:1` importa el cliente directamente |
| MEDIA | inversion de dependencia: `src/services/appSettings.ts:2` y `src/config/leadColumns.ts:2` importan un tipo desde `components/ColumnSelector` |
| MEDIA | `AdminSupportChat.tsx:86-134` y `SupportFloatingChat.tsx:96-132` arman la suscripcion realtime dentro del componente, con la logica de filtrado incluida |
| MEDIA | logica de dominio dentro de repositorios: `leadsRepository.ts:278-292`, `:217-225`, `:180-194` |

Bug funcional derivado, detectado de paso: `hasActiveLeadFilters` (`leadsRepository.ts:217-225`) ignora
`captureLinkId` y `sourceChannel`, por lo que el `totalCount` se calcula mal cuando el usuario filtra
solo por canal.

Estado servidor y realtime:

- no hay capa de estado servidor; el patron es un contador `refreshKey` que invalida por fuerza bruta
- `loadLeads()` lanza 4 consultas por ejecucion; cualquier INSERT visible repite las 4
- doble disparo en cada mutacion (refetch manual mas evento realtime de la propia escritura): cada
  guardado cuesta del orden de 8 consultas
- sin `AbortController` ni guard de "ultima respuesta gana" en el controller de leads: un cambio
  rapido de filtro puede pintar resultados obsoletos
- nombres de canal realtime estaticos y globales (`'public:leads'`, `'public:lead_lists'`): es
  exactamente el fallo ya sufrido y parcheado en el chat en `cd70955`, latente en otras superficies
- `AdminSupportChat.tsx:142` y `SupportFloatingChat.tsx:132` usan `channel.unsubscribe()` en vez de
  `supabase.removeChannel()`, dejando canales muertos en el registro del cliente

Duplicacion de logica:

- `ACTIVE_APPOINTMENT_STATUSES` definido tres veces y con comparacion inconsistente: dos sitios
  normalizan con `.toLowerCase()` y `useLeadDetail.ts:283` compara en crudo. Si el backend devuelve
  `"Confirmada"`, esa rama falla en silencio
- `getErrorMessage` canonico en `src/utils/errorMessage.ts` reimplementado dos veces y con unas 40
  copias inline que tienen exactamente el bug que el archivo canonico documenta: con errores de
  PostgREST muestran el fallback generico en vez de la causa
- ordenamiento de leads implementado dos veces con reglas distintas (cliente en `useSort.ts`, servidor
  en `leadsRepository.ts`)
- limite del plan Free (100 leads) hardcodeado dos veces con mensajes distintos
- normalizacion de telefono reimplementada inline en `useLeadsPageController.ts:116` y `:339`
- dos servicios de settings solapados escribiendo en dos lugares distintos

### 5.3 Portabilidad a app movil

El acoplamiento a Chrome esta mas contenido de lo esperado: 93 usos en 18 archivos (6% de los
archivos). Pero esta mal ubicado en tres sitios: dentro de componentes de UI
(`DataManagement.tsx:60`, `EmailSender.tsx:188`) y dentro de un hook de dominio
(`useEmailChannels.ts:329`).

El bloqueador real no es Chrome, es el DOM dentro de hooks de dominio:

- `useLeadsPageController.ts` usa `window.location.hash`, `document.body.style.overflow` y **nueve
  llamadas a `confirm()` / `alert()`**
- mismo patron en `useLeadDetail.ts`, `useAgenda.ts` y `useEmailChannels.ts`

Reutilizable tal cual, del orden del 65% del valor: `src/types/**`, `src/repositories/**`,
`src/services/**` salvo los seis acoplados a Chrome, y la mayoria de `src/utils/**`.

Necesita adaptador, extraible a `src/platform/` con interfaces y dos implementaciones: `KeyValueStore`,
`Notifier`, `BadgeCounter`, `OAuthLauncher`, `BackgroundScheduler`, `AppMessageBus`, `Dialogs`,
`Navigation`, `Deeplink`.

### 5.4 Tooling - la brecha mas grande

- **tests: cero.** Ni Vitest, ni Jest, ni Playwright, ni un solo archivo de test en 305 archivos
- **lint: cero.** No hay ESLint, por tanto no hay `react-hooks/exhaustive-deps` ni reglas de frontera
- `tsconfig.json` tiene `strict: true`, pero `noUnusedLocals` y `noUnusedParameters` estan apagados,
  `include: ["src"]` deja `vite.config.ts` sin typecheck, falta `noUncheckedIndexedAccess`, y el alias
  `@` de Vite no tiene `paths` equivalente en TypeScript
- `xlsx` apunta a `https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`, **sin version pinneada**: el
  build no es reproducible y `npm audit` no cubre ese paquete
- no hay CI, ni `engines`, ni `.nvmrc`
- `package.json` sigue llamandose `leads-crm-extension`: el rebranding a LeadSeed quedo incompleto

Sin tests no hay refactor seguro. Dado que el objetivo declarado es extraer el dominio para una app
movil, esta es la deuda que condiciona todo lo demas.

### 5.5 Sistema visual

Existe una fuente unica de verdad real y bien documentada en `src/design/tokens.css`, expuesta a
Tailwind y con puente a runtime en `src/design/palette.ts`. El diseno es correcto. La adopcion no:

- 575 usos de arbitrary values de Tailwind en 103 archivos
- 94 colores hex o rgb literales en 26 archivos
- 681 usos de `dark:bg-*` / `dark:text-*` / `dark:border-*` en 80 archivos, cuando `tokens.css` ya
  resuelve el tema oscuro por variables: cada uno es una segunda fuente de verdad de color
- dos sistemas de botones, dos de tarjetas, dos de encabezado de pagina, y overlays manuales fuera de
  `src/design/Modal.tsx`

Accesibilidad, hallazgos priorizados:

| Sev | Hallazgo |
|---|---|
| CRITICO | botones icono sin nombre accesible: `LeadsTableRow.tsx:157-166` usa `title` en vez de `aria-label`. Solo 6 apariciones de `aria-label` en todo `src/` frente a decenas de acciones basadas en iconos. Incumple WCAG 4.1.2. La primitiva correcta ya existe (`IconButton` fuerza `aria-label` por tipos), pero gran parte del codigo no la usa |
| ALTO | 17 archivos usan overlays `fixed inset-0`, solo 4 manejan `Escape` o `role="dialog"` |
| ALTO | `src/index.css:42` fija `focus:ring-offset-[#0a0a0a]` literal, que no reacciona al tema. Degrada el indicador de foco en superficies claras (WCAG 2.4.11) |
| MEDIO | `--ls-text-muted: #8c95a6` sobre `--ls-surface: #ffffff` da ~3.0:1, insuficiente para texto normal (WCAG 1.4.3) |

---

## 6. Higiene del repositorio

Codigo muerto confirmado, verificado con `knip` mas grep manual de cada export:

- `src/components/dashboard/charts/ChannelPerformanceChart.tsx`
- `src/components/dashboard/InsightsPanel.tsx`
- `src/components/lists/ListEditor.tsx`
- `src/contexts/LayoutContext.tsx`
- `assets/img/icons/leadseed-icon.png`

No borrar pese a aparecer como candidatos: `src/background.ts` y su cadena (punto ciego de la
herramienta, que no sigue el `service_worker` del manifest), `CargasAgeModal.tsx` (feature pausada con
nota explicita), y el barril de `src/design/`.

Otros:

- `dotenv` es dependencia declarada y sin usar
- dos PDFs de diseno versionados en la raiz suman 3.7 MB de binarios en el historial del repo
- la carpeta `rediseño leadseed/` tiene espacio y tilde en el nombre, fragil para tooling
  cross-platform
- ruido de depuracion minimo: un solo `console.log` en `src/main.tsx:24`, cero `debugger`, 7 TODO

---

## 7. Estado de git

Verificado directamente.

| Rama | Commit | Fecha | Relacion |
|---|---|---|---|
| `master` | `853aa3d` | 2026-07-31 | 66 commits atras de `develop` |
| `design` | `cd70955` | 2026-08-05 | 4 commits atras de `develop` |
| `develop` | `a351b59` | 2026-08-08 | cabeza real del proyecto |

Historial **lineal**: `master` es ancestro directo de `develop`, no hay divergencia que reconciliar.
El desorden no es de estructura, es de sincronizacion.

Pendiente:

- `develop` local tiene 4 commits sin pushear; `origin/develop` sigue en `cd70955`
- 7 archivos modificados sin commitear y 2 migraciones nuevas sin trackear, correspondientes al bloque
  de borrado admin de mensajes de chat, que quedo a medio cerrar
- `master` no recibe el trabajo de agosto

No se encontraron secretos filtrados en el arbol versionado. `.gitignore` cubre correctamente `.env`,
`dist/` y `dist.pem`.

Riesgo cruzado registrado en `landing-gerow`: la reconciliacion que porta el formulario de retiro y el
tracking vive en la rama `fix/reconcile-ppforms-retirement-with-tracking`, no en `master`. Un deploy
desde `master` de ese repo perderia retiro y tracking.

---

## 8. Plan de accion

Cada bloque indica clasificacion de estado segun protocolo seccion 9 y criterio de cierre.

### Bloque 0 - Contencion inmediata (antes de cualquier otro trabajo)

Justificacion: hay dos riesgos que pueden romper produccion con una sola operacion rutinaria.

1. Adoptar en LeadSeed la version de `landing-gerow` de `supabase/functions/form-leads/index.ts` (690
   lineas) y eliminar la copia de `landing-gerow`. Nunca volver a desplegar la version de 584 lineas.
2. Fusionar `_shared/emailChannels.ts` conservando la version de LeadSeed (superset de 381 lineas) y
   eliminar la de `landing-gerow`.
3. Crear una migracion nueva en LeadSeed, con **timestamp nuevo** (no reusar `20260803000100`, ya
   registrado), idempotente (`CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`), que contenga
   `leads_form_submission_id_uidx` y `update_planespro_public_lead_action`. Sin efecto en produccion,
   solo para que el historial cuadre.
4. Corregir el `README.md` de `supabase/functions/`: la regla real es que todas las Edge Functions se
   despliegan solo desde LeadSeed. Anadir un check de CI en `landing-gerow` que falle si reaparece
   `supabase/functions/`.
5. Commitear o descartar el bloque de borrado admin de chat, renumerando
   `sql/migrations/090_chat_message_admin_delete.sql` para no perpetuar la colision.

Criterio de cierre: no queda ningun archivo de Edge Function ni migracion con dos versiones
divergentes entre repos, verificado por diff.

### Bloque 1 - Alineacion de git

1. Pushear los 4 commits pendientes de `develop`.
2. Avanzar `master` hasta `develop` (fast-forward, el historial es lineal).
3. Decidir el destino de la rama `design`: es un alias rezagado de `develop`, o se elimina o se
   redefine su proposito por escrito.
4. Coordinar el merge de `fix/reconcile-ppforms-retirement-with-tracking` a `master` en
   `landing-gerow`.

Criterio de cierre: `git status` limpio, las tres ramas en el mismo commit o con proposito declarado.

### Bloque 2 - Red de seguridad (prerrequisito de todo refactor)

1. Instalar Vitest y escribir tests sobre los seis modulos de dominio de mayor valor:
   `utils/rutNormalizer.ts`, `utils/importParser.ts`, `utils/smartLists.ts`, `utils/mentionParser.ts`,
   `services/leadsService.ts` (mapeo) y `repositories/leadsRepository.ts::tokenizeSearch`. Este ultimo
   es la defensa contra inyeccion en el `or()` de PostgREST y hoy no tiene un solo test.
2. Instalar ESLint con `eslint-plugin-react-hooks` y reglas de frontera
   (`import/no-restricted-paths` o `eslint-plugin-boundaries`):
   - `components/**` y `hooks/**` no importan `lib/supabaseClient`
   - `services/**` y `config/**` no importan `components/**`
   - `repositories|services|hooks/**` no usan `chrome`, `window`, `document`
   - `no-restricted-globals` para `confirm` y `alert`
3. Endurecer `tsconfig.json`: activar `noUnusedLocals`, `noUnusedParameters`,
   `noUncheckedIndexedAccess`, anadir `paths` para el alias `@` y un `tsconfig.node.json`.
4. Pinnear `xlsx` a una version concreta.
5. Anadir CI que corra build, lint y tests.

Criterio de cierre: CI en verde, y las violaciones de frontera de la seccion 5.2 fallando el lint
(para que se corrijan, no para que se ignoren).

### Bloque 3 - Correcciones funcionales concretas

Independientes entre si, ejecutables en cualquier orden una vez existe la red de seguridad.

1. Unificar `ACTIVE_APPOINTMENT_STATUSES` en un solo lugar con helper `isActiveAppointment(status)` que
   normalice. Cierra el fallo silencioso de `useLeadDetail.ts:283`.
2. Corregir `hasActiveLeadFilters` para incluir `captureLinkId` y `sourceChannel`. Cierra el
   `totalCount` incorrecto.
3. Unificar `getErrorMessage` adoptando la version completa de `appSettingsService.ts` y migrar las 40
   copias inline.
4. Migrar `AdminSupportChat` y `SupportFloatingChat` a un unico `useSupportThread(peerId)`, con
   `removeChannel()` en vez de `unsubscribe()`.
5. Sufijar los nombres de canal realtime con el `userId` o un `useId()`, como ya se hace en
   `realtimeService.ts`.
6. Sacar el cliente Supabase de `useRealtimeRefresh.ts` y `realtimeService.ts` hacia repositorios.
7. P3: hacer que `resolve_planespro_booking_context` consulte `form_types` en vez de la lista literal
   `('pb','general','retiro')`. Cierra la caida silenciosa de leads de `/form/` a `general`.
8. P12: hacer que `form-progress` valide contra `form_types` en vez del `Set` hardcodeado.
9. P6 y P7: quitar `resolveChannel` del proxy y reenviar el header `Origin` al upstream, para que la
   allowlist CORS de las Edge Functions deje de ser decorativa.
10. Corregir el CORS de `form-lead-file` para usar la allowlist estandar del proyecto.

### Bloque 4 - Consolidacion de los formularios en LeadSeed

Principio rector: la extension y los formularios publicos no comparten runtime. La consolidacion es de
**codigo fuente y de deploy, no de bundle**. La frontera es una carpeta hermana con pipeline propio,
nunca una entrada en el build de la extension.

Estructura propuesta:

```
LeadSeed/
  src/                       extension - INTOCADA
  supabase/
    functions/               unica fuente de verdad de Edge Functions
    migrations/              unica fuente de verdad de SQL
  public-forms/              NUEVO
    package.json             deps propias, NO en el package.json raiz
    src/{pb,form,retiro,retiro-v2}/
    shared/form-api-client.js    un solo normalizador de rutas
    shared/attribution.js        una sola resolucion de ref
    build.js
    deploy/ppforms/
```

Garantias de aislamiento, obligatorias:

1. `public-forms/` tiene su propio `package.json`. No se agrega como workspace ni se referencia desde
   el `package.json` raiz.
2. Anadir `public-forms` a `exclude` en `tsconfig.json` y a la configuracion de Vite. Verificar que
   ningun chunk de la extension referencie la carpeta.
3. CI separado por carpeta con filtro de `paths`.
4. Deploy separado.
5. Prohibido importar desde `src/` hacia `public-forms/` o al reves.
6. Las Edge Functions **no** se mueven a `public-forms/`: sirven a ambos consumidores
   (`form-lead-file` lo usa la extension en `useLeadDetail.ts:73`).

Secuencia: mover `forms/{pb,form,retiro,retiro-v2}` y `frontend/lead-capture/`, borrar las copias
muertas en el mismo commit, y extraer un unico normalizador compartido (cierra P5 y parte de P4).

### Bloque 5 - Preparacion para app movil

1. Crear `src/platform/` con los nueve puertos identificados y su implementacion Chrome actual.
2. Inyectar `Dialogs` y `Navigation` en `useLeadsPageController`, `useLeadDetail` y `useAgenda`,
   eliminando `confirm`, `alert` y `window.location.hash` de la capa de dominio.
3. Evaluar TanStack Query como capa unica de estado servidor sobre `services/`. Es portable a React
   Native tal cual y resuelve de una vez el refetch cuadruple, el doble disparo por mutacion, los
   estados sombra y buena parte del riesgo de canales. Es el cambio de mayor retorno del informe.
4. Mover a `src/types/` los tipos de dominio que hoy viven en hooks y utils.

### Bloque 6 - Division de archivos grandes

Por orden de riesgo: `ChatRoom.tsx` (1097 lineas, 30 `useState`, 680 lineas de JSX),
`useLeadsPageController.ts` (578, devuelve un objeto de 70 propiedades), `leadsRepository.ts` (535),
`useLeadDetail.ts` (493), `ListsPage.tsx` (480), `AdminUsersPage.tsx` (455),
`useEmailChannels.ts` (433), `AgendaSettings.tsx` (438), `FormTypeLinksSection.tsx` (428).

El patron a replicar ya existe y funciona en el repo: `LeadsPage.tsx` (213 lineas) mas su controller.

### Bloque 7 - Consolidacion del sistema visual

1. Eliminar las clases legacy `.btn*` y `.card-*` de `src/index.css`, migrando sus 27 usos a
   `Button` / `IconButton` y `Card` / `Panel`.
2. Eliminar `src/components/ui/PageHeader.tsx` y migrar sus consumidores a `PageShell`.
3. Erradicar los 94 colores literales y reducir los 575 arbitrary values, empezando por `ListsPage`,
   `PipelineTab` y los charts del dashboard.
4. Eliminar los 681 `dark:*` ad-hoc en favor de las utilidades derivadas de tokens.
5. Barrer el patron de caja blanca redondeada en las superficies citadas en la seccion 2.4.
6. Corregir el `focus:ring-offset` hardcodeado y auditar el contraste de `--ls-text-muted`.
7. Hacer obligatorio `IconButton` para todo boton con solo un icono.
8. Migrar los overlays manuales a `src/design/Modal.tsx`.
9. Quitar los emojis de UI persistente (`ListsPage.tsx:438`, `ChatRoom.tsx:225` y `:376`) y decidir
   explicitamente el caso del selector de emojis del chat.

### Bloque 8 - Higiene

1. Sacar del arbol de git los dos PDFs de diseno (3.7 MB).
2. Eliminar `dotenv`.
3. Eliminar los 4 archivos de codigo muerto confirmados y el asset huerfano.
4. Reorganizar la documentacion de la raiz en `docs/` (ver bloque 9).
5. Renombrar `rediseño leadseed/` sin espacios ni tildes.
6. Quitar el `console.log` de `src/main.tsx:24`.
7. Renombrar `package.json` de `leads-crm-extension` a `leadseed`.

### Bloque 9 - Documentacion

1. Actualizar `docs/planning/roadmap.md` (se ejecuta en esta misma pasada).
2. Reescribir `docs/integrations/landing-gerow-cloudflare-context.md`: esta desactualizado en 9 puntos verificables y el
   protocolo seccion 7 lo declara de lectura obligatoria. Un documento obligatorio y falso es peor que
   no tenerlo.
3. Actualizar `planespro-form-integration-contract.md` con los cuatro canales reales y el protocolo de
   dos fases.
4. Archivar `HANDOFF_NEXT_SESSION.md` y `pb_form_redesign_handoff.md` con fecha en el nombre.
5. Decidir el destino de `docs/_revision/implementation_plan.md` (2314 lineas, solapa fuertemente con el roadmap).
6. Fusionar `UX_UI_CHECKLIST.md` dentro del roadmap.

Estructura propuesta:

```
docs/
  planning/roadmap.md
  integrations/planespro-form-integration-contract.md
  integrations/landing-gerow-cloudflare-context.md
  archive/implementation_plan.md
  archive/handoff-2026-07-30.md
  archive/pb-form-redesign-2026-07-29.md
  redesign/
```

`PROTOCOLO_CONTROL.md` y `AI_SYNC.md` permanecen en la raiz sin tocar: son registro normativo.

---

## 9. Orden de ejecucion recomendado

```
Bloque 0  contencion            -> BLOQUEANTE, riesgo activo de romper produccion
Bloque 1  alineacion git        -> barato, desbloquea trabajo ordenado
Bloque 2  red de seguridad      -> prerrequisito de 3, 5, 6 y 7
Bloque 3  correcciones          -> en paralelo con 4
Bloque 4  formularios           -> en paralelo con 3
Bloque 8  higiene               -> en paralelo, bajo riesgo
Bloque 9  documentacion         -> en paralelo, bajo riesgo
Bloque 5  puertos de plataforma -> despues de 2
Bloque 6  division de archivos  -> despues de 2
Bloque 7  sistema visual        -> despues de 2
```

Los bloques 0 y 1 deberian cerrarse antes de abrir cualquier otro frente.

---

## 10. Riesgos abiertos declarados

1. Un `supabase functions deploy form-leads` desde este repo rompe `/form/` y `/retiro/` en
   produccion. Vigente hasta cerrar el bloque 0.
2. Un `supabase db reset` desde este repo produce un esquema sin idempotencia ni RPC de segunda fase.
   Vigente hasta cerrar el bloque 0.
3. Un deploy de `landing-gerow` desde `master` pierde el formulario de retiro y el tracking. Vigente
   hasta mergear `fix/reconcile-ppforms-retirement-with-tracking`.
4. Mientras `ppusers` conserve `FORMS_DB` y `FORMS_UPLOADS` hay dos fuentes de verdad de leads.
5. Sin tests, cualquier refactor de los bloques 5, 6 y 7 es una apuesta.
6. La validacion E2E de Google Calendar y Meet sigue abierta desde julio y ya fue rebasada por
   trabajo posterior sin decision escrita.

---

## 11. Lo que esta auditoria NO cubrio

- `AI_SYNC.md` y las secciones 6, 14 y 19 del protocolo, por exclusion explicita del usuario
- validacion funcional en navegador real: no se ejecuto la extension ni se probaron flujos end-to-end
- estado del backend remoto desplegado: no se corrio `npx supabase functions list` ni se consulto la
  base de produccion; todo el analisis de Supabase es sobre el codigo del repo
- `ppblog`, `ppnews` y `ppcrm` mas alla de confirmar que siguen vivos con sus bindings
- rendimiento medido: no hay profiling, solo analisis estatico de patrones de consulta
