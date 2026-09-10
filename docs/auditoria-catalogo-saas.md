# Auditoría del catálogo SaaS

Fecha: 9 de septiembre de 2026. Todo lo de aquí está verificado leyendo el
código y las 178 migraciones, con la ruta y la línea de cada cosa.

La pregunta que se hizo: **¿por qué no se pueden gestionar los planes?**

La respuesta corta: el catálogo tiene 12 funcionalidades para una aplicación
con 15 secciones y unas 40 capacidades vendibles; tres de las claves que el
código exige no existen en el catálogo —y una de ellas cierra Comunidad para
todo el mundo—; no se puede dar de alta una funcionalidad porque el formulario
nunca recoge su identificador; y cuando se cambia un plan el usuario no se
entera, porque las cinco tablas del catálogo no están publicadas en Realtime.

---

## 1. Lo que rompe la gestión hoy

### 1.1 No se puede crear una funcionalidad — CRÍTICO

`apps/extension/src/components/admin/AdminFeatureEditor.tsx:70`

El formulario tiene un campo rotulado **«Código»**, con la ayuda *«Es el
identificador que consulta el código»*. Está enlazado a `borrador.name`:

```tsx
<Field label="Código" hint="Es el identificador que consulta el código...">
  <Input value={borrador.name || ''} onChange={... name: ...} />
```

El `id` no se recoge en ninguna parte. Al guardar:

```ts
// repositories/saasRepository.ts:113
const { data, error } = await supabase.from('features').insert([feature]);
```

`features.id` es `text PRIMARY KEY` **sin valor por defecto**
(`000_platform_core_schema.sql:85`), así que el insert viola la restricción de
no-nulo y falla siempre. El alta nunca ha funcionado.

**Corrección**: el formulario tiene que pedir dos cosas distintas —el
identificador técnico (`id`, inmutable después del alta) y el nombre visible
(`name`)—, y el repositorio tiene que hacer `upsert` con el `id` explícito.

### 1.2 Los cambios no llegan al usuario — CRÍTICO

`AuthContext` mantiene tres suscripciones para enterarse de los cambios de
permisos (`repositories/authRealtimeRepository.ts`):

| Suscripción | Tabla que escucha |
|---|---|
| `subscribeToUserUpdates` | `profiles`, `user_feature_overrides` |
| `subscribeToPlanUpdates` | `plan_features` |

**Ninguna de esas tablas está en la publicación `supabase_realtime`.** Se
publicaron 29 tablas a lo largo de las migraciones —leads, tasks, chat,
comunidad, agenda— y ninguna del catálogo.

Consecuencia: añadir una funcionalidad a un plan, cambiarle el plan a alguien o
concederle un permiso puntual **no produce ningún efecto visible** hasta que esa
persona recarga la extensión. Es exactamente el síntoma reportado.

**Corrección**: publicar las cinco tablas, o —si se prefiere no exponerlas por
Realtime— sustituir las suscripciones por un refresco al volver la pestaña al
primer plano, y quitar el código muerto.

### 1.3 Comunidad está cerrada para todos — ALTO

`config/routes.ts:59` exige `module:community`. Esa clave **no existe en el
catálogo**. `hasFeature` falla cerrado (`AuthContext.tsx:27` devuelve `false`
por defecto), así que la sección solo la ve un administrador, que pasa por el
atajo `isAdmin`.

Es la misma trampa que el comentario de `routes.ts:36-46` describe para Flujos y
Playbooks, y que allí se evitó a propósito. Aquí está activa.

Lo mismo con `premium_aesthetics` (el marco premium del perfil, en
`ProfileModal.tsx:33` y `AccountSettings.tsx:47`): nadie lo tiene nunca.

`module:admin` también falta, pero ahí el efecto es el correcto por accidente:
cierra el panel a los no-administradores. Está bien cerrado por la razón
equivocada.

### 1.4 El mecanismo de prueba no existe — MEDIO

`features.trial_days` se recoge en el formulario, se muestra como distintivo en
la lista (`AdminCatalogPage.tsx:203`) y su ayuda promete que *«cualquier usuario
sin plan premium puede activar una prueba temporal»*.

`get_my_features()` (`051_fix_saas_feature_ids_and_entitlements.sql`) resuelve
los permisos así:

```sql
plan_features del plan del usuario
UNION
user_feature_overrides no vencidos
```

**`trial_days` no aparece.** No hay nada que active una prueba. El campo se
guarda y no lo consulta nadie.

---

## 2. Lo que el modelo no permite

### 2.1 No hay categorías

`features` tiene `id`, `name`, `description`, `is_active`, `trial_days`,
`created_at`. **No hay columna de categoría**, así que agrupar las
funcionalidades —que es como se necesita verlas para componer un plan— no es
posible ni siquiera en la base.

### 2.2 Las cuotas no son funcionalidades

Los topes reales viven en tres sitios distintos, ninguno de ellos el catálogo:

| Tope | Dónde vive | Ruta |
|---|---|---|
| 100 leads | escrito a mano en el cliente | `useLeadsPageController.ts:537,554` |
| 2 listas | escrito a mano en el cliente | `ListsPage.tsx:137` |
| 5 enlaces de captura | columna del perfil, por usuario | `profiles.capture_links_limit` |
| 50 WhatsApp/día | columna del perfil, por usuario | `profiles.whatsapp_daily_limit` |

El catálogo solo sabe decir sí o no (`pro:unlimited_leads`). No puede decir
*cuánto*, así que un plan no puede ofrecer «5 enlaces» ni «300 leads»: hay que
ir usuario por usuario.

---

## 3. Desalineación entre el catálogo y el código

### Claves que el código exige y el catálogo no tiene

| Clave | Efecto real |
|---|---|
| `module:community` | Comunidad cerrada para todo no-administrador |
| `premium_aesthetics` | El marco premium no lo obtiene nadie |
| `module:admin` | Panel cerrado (correcto, pero por accidente) |

### Claves del catálogo que nadie comprueba

| Clave | Efecto real |
|---|---|
| `module:leads` | Ninguno: Leads no tiene puerta |
| `pro:unlimited_templates` | Ninguno: no hay tope de plantillas |
| `pro:unlimited_emails` | Ninguno: no hay tope de correos |

### Secciones sin puerta

Agenda, Flujos, Playbooks y Chat son módulos completos, abiertos a cualquiera
con sesión. Flujos y Playbooks están así **a propósito** —el comentario de
`routes.ts` explica que ponerles una clave inexistente se los quitaría a todos—,
pero Agenda y Chat simplemente nunca se declararon.

---

## 4. Inventario: lo que existe hoy

Quince secciones y unas cuarenta capacidades, todas verificadas en el código.
Marcadas las que ya tienen una clave en el catálogo.

### Contactos
Base de contactos · Importar desde Excel/CSV · Exportar a Excel/JSON ·
Detección de duplicados · Fijar al inicio · Papelera y restaurar · Columnas
configurables · Acciones en lote · Alertas de contacto cruzado ·
Leads olvidados

### Listas
Listas manuales · Listas automáticas · Grupos de listas · Colores y
descripciones

### Mensajes
Plantillas de WhatsApp · Plantillas de correo · Guiones de llamada · Categorías
de plantillas · Variables con tres formas del nombre · Envío en tanda · Tope
diario de envíos · Programar correos · Flujos (secuencias) · Playbooks (guiones
de reunión)

### Captación
Enlaces de captura · Campañas y UTM · Tipos de formulario · Formulario público ·
Abandonos de formulario

### Seguimiento
Pipeline (kanban) · Motivos de descarte · Tareas · Tablero de tareas · Matriz de
Eisenhower · Subtareas y notas · Tarea diaria automática · Agenda de citas ·
Horarios de disponibilidad · Bloqueos de agenda · Sincronización con Google
Calendar · Agendamiento público

### Análisis
Panel con ventanas de tiempo · Reporte de adquisición · Reporte del embudo ·
Calidad por fuente · Historial de envíos

### Comunidad
Foro · Comentarios y reacciones · Denuncias y moderación · Chat de salas ·
Mensajes directos · Adjuntos · Anuncios · Bloqueos y silencios · Mensajes
guardados · Marco premium en el perfil

### Correo
EmailJS · Resend · Gmail

### Plataforma
Soporte por requerimientos · Ayuda VIP · Rol de ayudante · Panel de
administración · Telemetría de uso · Transferencia de cuentas

---

## 5. Catálogo propuesto

Nueve categorías. Los identificadores usan `categoria.funcionalidad`, que ordena
solo y se lee en el código sin necesitar el nombre visible.

Las que hoy existen conservan su identificador para no romper nada; se propone
un alias en vez de un renombrado.

| Categoría | Identificador | Funcionalidad |
|---|---|---|
| **Contactos** | `contactos.base` | La base de contactos |
| | `contactos.importar` | Importar desde Excel o CSV |
| | `contactos.exportar` | Exportar a Excel o JSON |
| | `contactos.duplicados` | Detección de duplicados |
| | `contactos.papelera` | Papelera y restaurar |
| | `contactos.cupo` | Cuántos contactos (numérica) |
| **Listas** | `listas.base` | Listas manuales |
| | `listas.automaticas` | Listas que se actualizan solas |
| | `listas.grupos` | Carpetas de listas |
| | `listas.cupo` | Cuántas listas (numérica) |
| **Mensajes** | `mensajes.plantillas` | Plantillas de mensaje |
| | `mensajes.whatsapp` | Envío por WhatsApp |
| | `mensajes.correo` | Envío por correo |
| | `mensajes.llamadas` | Guiones de llamada |
| | `mensajes.tanda` | Envío en tanda |
| | `mensajes.programar` | Programar correos |
| | `mensajes.flujos` | Secuencias de mensajes |
| | `mensajes.playbooks` | Guiones de reunión |
| | `mensajes.cupo_diario` | Tope diario de envíos (numérica) |
| **Captación** | `captacion.enlaces` | Enlaces de captura |
| | `captacion.campanas` | Campañas y seguimiento UTM |
| | `captacion.formularios` | Tipos de formulario |
| | `captacion.cupo` | Cuántos enlaces (numérica) |
| **Seguimiento** | `seguimiento.pipeline` | Embudo tipo kanban |
| | `seguimiento.tareas` | Gestor de tareas |
| | `seguimiento.tablero` | Tablero de tareas |
| | `seguimiento.matriz` | Matriz de Eisenhower |
| | `seguimiento.agenda` | Agenda de citas |
| | `seguimiento.google` | Sincronizar con Google Calendar |
| | `seguimiento.agendamiento` | Agendamiento público |
| **Análisis** | `analisis.panel` | Panel de métricas |
| | `analisis.reportes` | Reportes de adquisición y embudo |
| | `analisis.historial` | Historial de envíos |
| **Comunidad** | `comunidad.foro` | Foro |
| | `comunidad.chat` | Chat de salas |
| | `comunidad.directos` | Mensajes directos |
| | `comunidad.marco` | Marco premium en el perfil |
| **Correo** | `correo.emailjs` | Enviar con EmailJS |
| | `correo.resend` | Enviar con Resend |
| | `correo.gmail` | Enviar con Gmail |
| **Plataforma** | `plataforma.soporte_vip` | Ayuda prioritaria |
| | `plataforma.ayudante` | Rol de ayudante |
| | `plataforma.admin` | Panel de administración |

Cuarenta y tres funcionalidades. Las cinco marcadas como **numéricas** son el
cambio de modelo: hoy no se pueden expresar.

---

## 6. Plan

Cuatro bloques, en este orden porque cada uno depende del anterior.

### Bloque A — Que se pueda gestionar (bloqueante)

1. **Arreglar el alta de funcionalidades.** Separar `id` de `name` en el
   formulario, `upsert` con el `id` explícito, y validar el formato del
   identificador. Sin esto no se puede hacer nada de lo que sigue desde la
   interfaz.
2. **Publicar las tablas del catálogo en Realtime**, o cambiar las
   suscripciones por un refresco al volver al primer plano. Hoy hay tres
   suscripciones que no disparan nunca.
3. **Dar de alta las tres claves huérfanas** (`module:community`,
   `module:admin`, `premium_aesthetics`) y asignarlas a los planes que
   correspondan. Esto reabre Comunidad.

### Bloque B — Que se pueda agrupar

4. **Añadir `category` a `features`**, con orden dentro de la categoría.
5. **Agrupar el catálogo del panel** por categoría, con la lista de
   funcionalidades dentro y un contador por plan.

### Bloque C — Que el catálogo describa la aplicación

6. **Sembrar las 43 funcionalidades** con sus categorías, conservando los
   identificadores existentes.
7. **Poner las puertas que faltan** en el código: Agenda, Chat, y las
   capacidades que hoy no se comprueban. Ojo: cada puerta nueva **cierra** algo
   que hoy está abierto, así que va acompañada de su asignación a los planes en
   la misma migración.
8. **Retirar las tres claves muertas** (`module:leads`,
   `pro:unlimited_templates`, `pro:unlimited_emails`) o darles uso.

### Bloque D — Cuotas y pruebas

9. **Cuotas por plan.** Una tabla `plan_feature_limits` con el valor numérico
   por plan y funcionalidad, y los topes escritos a mano en el cliente pasan a
   leerse de ahí.
10. **Pruebas temporales.** O se implementa `trial_days` en `get_my_features()`
    con su tabla de pruebas activas, o se retira el campo del formulario. Hoy
    promete algo que no ocurre.

### Riesgo a vigilar en todo el bloque C

`hasFeature` falla cerrado. Declarar una clave que no esté en el catálogo, o
asignarla a unos planes y no a otros, **quita la funcionalidad** a quien la
tiene hoy. Y probando con una cuenta de administrador no se nota, porque para el
administrador `hasFeature` siempre devuelve `true`.

Cada cambio de puerta se comprueba con una cuenta de cada plan, no con la de
administrador.
