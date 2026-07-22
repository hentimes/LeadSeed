# Informe de Auditoria de Seguimiento - PlanesPro/MENSAJES

Fecha: 2026-07-20
Auditor: Antigravity (Gemini 3.1 Pro)
Protocolo: CONTROL
Alcance: Verificacion de cambios post-auditoria y busqueda de nuevas incidencias

---

## Resumen Ejecutivo

Se han analizado los cambios recientes (commitados y sin commitear) aplicados tras la ultima auditoria. Los **cinco problemas principales identificados anteriormente fueron abordados y resueltos exitosamente** tanto a nivel de Frontend como de Backend (Supabase y Edge Functions).

Sin embargo, durante esta revision de calidad general se detectaron **nuevas incidencias (principalmente memory leaks y fallas de manejo de errores silenciosos)** introducidas en los nuevos componentes del dashboard y modales, que podrian causar problemas de experiencia de usuario o dificultar el debugging en el futuro.

---

## 1. Verificacion de Resolucion de Problemas Anteriores

### ✅ 1. Leads no cargaban en Admin SaaS ("Cargando base del usuario..." infinito)
**Estado: Resuelto.** 
- Se removio la dependencia estricta de la clase `Error` en `AdminUserBase.tsx` y `AdminUserAgenda.tsx`. Ahora se usa tipado estandar de Javascript.
- En `src/repositories/adminRepository.ts`, se corrigio el tipo de `lead_ids` a `string[]` coincidiendo correctamente con el tipo `text[]` en la BD (migracion 045).
- En `adminService.ts`, se añadio un bypass (cuando el admin se observa a si mismo) que usa los metodos estandar en vez de las RPC de supervision.

### ✅ 2. Agenda propia del admin no se cargaba ("No se pudo cargar la agenda observada")
**Estado: Resuelto.** 
- Confirmado en el backend: La migracion `045` removio exitosamente la restriccion de auto-observacion (`OR p_observed_user_id = v_admin_user_id`) en los RPCs de supervision (leads, templates, agenda). 
- El frontend ahora ademas evita hacer la llamada a la RPC si el usuario es el mismo.

### ✅ 3. Leads propios del admin no cargaban en bandeja principal
**Estado: Resuelto.**
- Se detecto y soluciono un retraso en el estado de `loading` en el `AuthContext.tsx`. Ahora se libera `setLoading(false)` inmediatamente despues de recuperar la sesion, permitiendo a la UI principal y la bandeja cargar de inmediato.
- Se optimizo `fetchLeadPageRows` en `leadsRepository.ts` para no duplicar conteos innecesarios, y ademas la llamada a `loadLeadIdentities` se ha pospuesto hasta que se abre el formulario de carga/importacion.

### ✅ 4. Horas cruzadas entre formulario general y PB
**Estado: Resuelto.**
- Se verificaron las nuevas Edge Functions (`form-leads`, `form-public-availability`, `form-lead-abandoned`).
- En `form-public-availability`, el `context` ahora distingue claramente si es el `source_channel` de `general` o `pb`, aislacion que evita el cruce de slots de agenda.

---

## 2. Nuevas Incidencias y Regresiones Detectadas

Durante la auditoria de los nuevos componentes y utilidades, se encontraron los siguientes problemas (clasificados por severidad):

### 🚨 Severidad Media

**A. Enmascaramiento de Errores Silenciosos (Falla Parcial)**
- **Ubicacion**: `src/services/adminService.ts` (`loadAdminUserBase`)
- **Problema**: Se uso `Promise.allSettled` para cargar leads y plantillas. Si falla la carga de leads pero las plantillas tienen exito, la validacion actual no detecta el fallo parcial, devolviendo `0 leads` silenciosamente, haciendo creer al admin que el usuario no tiene leads en lugar de mostrar un error de red.
- **Recomendacion**: Si una de las promesas de `allSettled` es `rejected`, se debe arrojar el error para notificar a la UI o al menos manejar el caso donde *solo una* falla.

**B. Memory Leaks por falta de limpieza en UseEffects**
- **Ubicacion**: `src/components/leads/LeadDetail.tsx` y `src/hooks/useSendCounts.ts`
- **Problema**: Las funciones de `useEffect` hacen peticiones asincronas (`loadLeadDetailData`, `loadLeadCrossExecAlerts`, `listMyAppointments` y `fetchLeadSendCountsForUser`) y actualizan estados de React. Si el usuario cierra el modal o cambia de pagina rapido antes de que la peticion termine, se intentara actualizar un componente desmontado (memory leak).
- **Recomendacion**: Replicar la solucion ya implementada en `DashboardPage.tsx` donde usan `let cancelled = false;` o usar un `AbortController` para cancelar la suscripcion al desmontar.

**C. Manejo de Errores Vacio (Catch mudo) en Repositorios**
- **Ubicacion**: `src/repositories/dashboardRepository.ts`, `historyRepository.ts` y `templatesRepository.ts`
- **Problema**: Varias funciones (ej. `fetchRecentSendLogRows`) tienen un catch explicito o implicito que simplemente retorna vacio: `if (error || !data) { return {}; }`. Esto esconde problemas graves de la base de datos a los desarrolladores.
- **Recomendacion**: Añadir `console.error('Fetch error:', error)` antes de devolver el fallback vacio para tener visibilidad de los errores en la consola.

### ⚠️ Severidad Baja

**A. Condicion de Carrera Menor al Abrir Modales**
- **Ubicacion**: `src/pages/LeadsPage.tsx`
- **Problema**: Al hacer click en "Nuevo Lead", se abre el `LeadForm` y simultaneamente inicia `loadLeadIdentities()`. Como esta carga demora ms, el modal puede renderizarse momentaneamente sin validacion de duplicados lista.

**B. Calculo Inexacto en Dashboard (Division por Cero)**
- **Ubicacion**: `src/pages/DashboardPage.tsx`
- **Problema**: Existe un codigo preventivo `settings.dailyGoalWhatsApp || 1` para divisiones. Sin embargo, si un usuario pone explicitamente "0" como meta diaria, la formula divide por 1, falseando los calculos (mostraria % de progreso que no tiene sentido matematico). Deberia chequearse que si la meta es 0, no mostrar o no calcular la barra.

**C. URL en Codigo Duro (Hardcode)**
- **Ubicacion**: `src/components/leads/LeadDetail.tsx` (constante `PLANESPRO_FILE_PROXY_URL`)
- **Problema**: Esta escrita de manera fija. Deberia inyectarse por variables de entorno `import.meta.env`.

---

## 3. Comentarios de Funcionalidades Nuevas

- **Dashboard Analitico (`DashboardPage.tsx`)**: Se ha implementado de forma excelente. La estructura de Recharts es solida. Se ha comprobado en caliente que el RPC subyacente `get_my_dashboard_snapshot` **SI existe** y responde de forma adecuada en la base de datos de produccion.
- **Optimizacion `useSendCounts.ts`**: Destacable optimizacion de performance al evitar el clasico problema "N+1 Queries" al renderizar filas, llamando los totales de forma masiva.

## 4. Conclusion

El codigo backend y frontend implementado recientemente **resolvio definitivamente los bugs core reportados** en la primera auditoria. La migracion a Supabase ya no bloquea visualizacion.

**Proximos Pasos**: El enfoque deberia estar en limpiar los pequenos "Tech Debts" (limpieza de useEffects para memory leaks, evitar catches vacios que silencian fallas de DB, y manejar los rejects parciales de `Promise.allSettled`). Estas mejoras de calidad del codigo pueden hacerse en una rapida refactorizacion antes del despliegue final.
