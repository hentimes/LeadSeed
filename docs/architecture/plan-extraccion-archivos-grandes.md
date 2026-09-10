# Plan de extracción de los archivos sobre 500 líneas

Version: 1.0
Fecha: 2026-09-10
Estado: vigente
Origen: auditoría CONTROL del 2026-09-10, hallazgo H

---

## Por qué existe este documento

El §41 del plan de arquitectura no prohíbe pasar de 500 líneas. Exige **plan de extracción
al tocarlo**. La auditoría del `2026-09-10` encontró trece archivos sobre ese umbral, cinco de
ellos modificados el día anterior, y ningún plan declarado en ninguna parte: la única mención
en `AI_SYNC.md` era de agosto y sobre dos archivos distintos.

Este documento cierra ese hueco. **No es una orden de refactorizar ahora.** Es la decisión
escrita de qué sale primero de cada archivo, para que cuando alguien lo toque no tenga que
volver a decidirlo desde cero, y para que la decisión no dependa de la memoria de una
conversación. El argumento es el mismo que el roadmap usa en su capítulo 13.6: una decisión que
no está en el repositorio no existe, porque se vuelve a discutir cada vez que alguien mira el
problema de nuevo.

Clasificación bajo CONTROL §9: `pendiente estructural`.

---

## Los cinco con plan decidido

Son los cinco que se tocaron sin declararlo. Cada uno lleva la pieza concreta que sale, su
destino y por qué esa y no otra.

### 1. `components/flows/FlowEnrollPanel.tsx` — 755 líneas

**Sale:** el visor del mensaje ya enviado. El bloque `<Modal>` "LO QUE SE LE MANDO"
(líneas 693-752) más lo que lo alimenta: los estados `viendoEnvio`, `envio`, `cargandoEnvio`
(275-277), el testigo `peticionDeEnvio` (285) y la función `verEnvio` (287-299).

**A dónde:** `components/flows/FlowSentMessageModal.tsx`, con props
`{ lead, paso, desde, onClose }` y la llamada a `fetchEnvioDeLeadEn` dentro.

**Por qué esa:** es la única pieza cuya responsabilidad no es inscribir sino leer historial, y
la única que arrastra `fetchEnvioDeLeadEn`, `SendLog` y `formatearFecha`. Baja complejidad y no
solo líneas: retira tres estados y un `useRef`, y `peticionDeEnvio` **desaparece** si el modal
se monta con `key={lead.id}`, porque la carrera que ese testigo defiende deja de existir cuando
cada lead tiene su instancia. Extraer primero la fila (519-683) daría más líneas pero exigiría
pasarle ocho valores calculados: cambiaría el reparto sin cambiar el acoplamiento. La fila es la
segunda extracción, no la primera.

### 2. `pages/TemplatesPage.tsx` — 680 líneas

**Sale:** la resolución del canal. Los seis hooks de las líneas 76-78 (`waT/waL/emT/emL/caT/caL`),
los estados `templates`, `tplLists`, `cargando`, `fallo`, la función `load` (141-163) y las
**cinco copias** del mismo `if (tab === 'whatsapp') ... else if (tab === 'email') ... else` de
las líneas 187-189, 195-197, 213-223 y 259-261.

**A dónde:** `hooks/useTemplatesDelCanal.ts`, que recibe `tab` y devuelve
`{ plantillas, categorias, cargando, fallo, recargar, guardar, borrar, guardarCategoria, borrarCategoria }`.

**Por qué esa:** es el único defecto estructural del archivo; lo demás es volumen. Esas cinco
ramas triples son una sola decisión repetida cinco veces, y ya produjo un defecto real que el
propio código confiesa: el `as any` sobre `asunto` comentado en 214-220 existe porque la rama de
correo se escribió aparte de las otras dos. Extraer primero el `<ul>` del listado (535-614)
dejaría la triplicación intacta y solo mudaría JSX.

### 3. `repositories/leadsRepository.ts` — 646 líneas

**Sale:** el constructor de la consulta paginada. `LeadSortField` (4-14), `LEAD_SORT_COLUMNS`
(23-36), `LeadPageQuery` (46-63), `tokenizeSearch` (155-161), `applyLeadPageFilters` (182-255),
`resolveLeadSort` (257-263) y `hasActiveLeadFilters` (273-284). Unas 170 líneas.

**A dónde:** `repositories/leadsPageQuery.ts`. `fetchLeadPageRows` y `fetchForgottenLeadPageRows`
se quedan e importan de ahí.

**Por qué esa:** el resto del archivo son envoltorios finos de una consulta cada uno. Esta es la
única zona con lógica ramificada, contiene la defensa contra inyección en `or()` de PostgREST y
es la única ya exportada para test, cosa que el propio archivo comenta en 270-272. Sacarla junta
el código con su prueba y separa cómo se arma la consulta de cómo se ejecuta. Coste de rotura
casi nulo y verificable: solo `leadsRepository.test.ts` importa `tokenizeSearch` y
`hasActiveLeadFilters`, y `LeadPageQuery` lo importan como tipo tres archivos
(`services/leadsService.ts`, `hooks/useLeads.ts`, `hooks/useLeadsPageController.ts`), que se
resuelven con un re-export.

### 4. `hooks/useLeadsPageController.ts` — 642 líneas

**Sale:** borrar un lead cancelando su cita. `getLeadAppointmentMetadata` (26-31),
`resolveActiveAppointmentId` (153-172), `confirmDeleteLeadWithAgenda` (174-180),
`cancelLeadAppointmentBeforeDelete` (182-188) y los cinco manejadores `handleDelete` (390-421),
`handleUndoDelete`, `handleRestore`, `handleBulkDelete` (435-489) y `handleBulkRestore`.

**A dónde:** `hooks/useLeadDeletion.ts`, recibiendo
`{ leads, showTrash, selection, remove, restore, permanentDelete, recargar, deleteToast }`.

**Por qué esa:** es argumento de frontera, no de tamaño. Ese bloque es lo único que hace que un
controlador de CRM importe `agendaService`, `getDefaultAgendaRange`, `listMyAppointments`,
`cancelMyAppointment` e `isActiveAppointment`. Sacarlo devuelve el grafo de dependencias del
controlador a un solo bounded context (CRM) en vez de CRM más Scheduling, que es justo la
frontera que el §11 quiere hacer automatizable con ESLint boundaries. Extraer primero `loadLeads`
(198-321) quitaría más líneas pero es el corazón del hook y dejaría el cruce donde está.

> El comentario de `ScrollLockPort` en `platform/types.ts` (líneas 228-231) ya anticipa que este
> hook hace demasiado y lo asigna al bloque 6. Esa nota y este plan hablan del mismo problema.

### 5. `pages/FlowsPage.tsx` — 511 líneas

> **HECHA** el 2026-09-10, al agregar las salidas por "sin WhatsApp" y "no contactar".
> `components/flows/FlowList.tsx` existe con las props previstas y `eliminarFlujo` subió a la
> página.
>
> Ese mismo día bajó a **493 líneas** y salió de la línea base, por una razón distinta: la cola
> de envío subió a `WhatsAppQueueProvider` y esta pantalla dejó de tener panel propio. La segunda
> extracción -el cupo de WhatsApp hacia `hooks/useWhatsAppQuota.ts`- **sigue pendiente** y es la
> que hay que hacer antes de volver a crecer aquí.

**Sale:** la lista de flujos. El `<Card>` con su `<ul>` de las líneas 437-501, incluido el
`onClick` asíncrono de 24 líneas embebido en el JSX del botón de borrar (472-495).

**A dónde:** `components/flows/FlowList.tsx`, con props
`{ flujos, onAbrirDetalle, onInscribir, onEditar, onEliminar }`. La confirmación y el `try/catch`
del borrado suben a una función `eliminarFlujo` en la página.

**Por qué esa:** el trabajo real de `FlowsPage` es conmutar entre cinco vistas (`type Vista`), y
de esas cinco, cuatro ya delegan en un componente -`FlowEnrollPanel`, `FlowDetail`, `FlowEditor`,
`FlowTodayList`- y **solo esta se renderiza en línea**. La asimetría es el defecto, y corregirla
no es cosmética: saca del JSX la única lógica de negocio que ahí queda, que el §42 prohíbe.

**Segunda extracción, ya decidida para no volver a discutirla:** el cupo de WhatsApp -estados
`proximos`, `enviadosHoy`, `topeDiario`, más `cupo`, `repartoPropuesto`, `adelantar` y `repartir`,
líneas 64-197- hacia `hooks/useWhatsAppQuota.ts`.

---

## Los otros ocho, sin plan todavía

Estos superan las 500 líneas pero no se han tocado desde que se levantó el hallazgo, así que el
§41 no exige plan aún. Se listan para que quien toque uno sepa que le corresponde escribirlo
aquí antes de cerrar su bloque.

| Archivo | Líneas |
|---|---|
| `components/chat/ChatRoom.tsx` | 675 |
| `pages/ListsPage.tsx` | 600 |
| `pages/PipelinePage.tsx` | 574 |
| `components/send/RecipientPicker.tsx` | 569 |
| `components/agenda/AgendaCalendar.tsx` | 554 |
| `hooks/useLeadDetail.ts` | 543 |
| `components/send/EmailSender.tsx` | 531 |
| ~~`components/send/WhatsAppSender.tsx`~~ | ~~508~~ → **478**, fuera de la línea base |

No se inventa plan para ellos: bajo el §5.6 de CONTROL, proponer una extracción sin haber leído
el archivo sería declarar una certeza que no se tiene.

**`WhatsAppSender.tsx` salió de la lista el 2026-09-10**, ya leído. Dos piezas se fueron:
`hooks/useSeleccionDeDestinatarios.ts` -elegir a quién se le manda no es del canal, funciona igual
para correo y llamadas- y la cola de envío, que subió a `contexts/WhatsAppQueueContext.tsx` para
que una ronda empezada en Flujos sobreviva al cambio de pestaña.

---

## La guarda que hace cumplir el §41

El §41 era la única regla estructural del proyecto sin guarda automática, y por eso se incumplió
sin que nada lo delatara, mientras que las reglas con script -`check:classes`, `check:functions`,
`audit-dark-gaps`- se sostienen solas.

`npm run check:file-size` cierra ese hueco. Compara contra la lista de excepciones versionada en
`scripts/file-size-baseline.json` y **falla solo en dos casos**:

- un archivo de la lista **crece** respecto a su línea base
- aparece un archivo **nuevo** sobre 500 líneas que no está en la lista

Así el umbral deja de ser una aspiración sin consecuencia, y a la vez no obliga a un refactor
masivo para poner el proyecto en verde. Cada extracción de este plan baja su línea base, y el
número solo puede ir hacia abajo.
