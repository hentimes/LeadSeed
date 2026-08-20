---
title: LeadSeed Platform
subtitle: Plan maestro de arquitectura, infraestructura y ejecución multiplataforma
author: Documento técnico de referencia para humanos y agentes de IA
date: 27 de julio de 2026
lang: es-CL
---

**Versión del documento:** 2.0  
**Fecha de referencia tecnológica:** 27 de julio de 2026  
**Estado:** Arquitectura objetivo, plan de migración y sistema visual oficial integrado  
**Corregido el:** 2026-08-19 — ver "Nota de vigencia" más abajo antes de usar cualquier cifra o medida  
**Audiencia:** Henry Farias, desarrolladores, auditores técnicos y agentes de IA que implementen LeadSeed  
**Base evaluada:** repositorio actual `MENSAJES`, extensión Chrome avanzada con React, TypeScript, Vite, CRXJS y Supabase

---


::: pagebreak
:::

# Índice de navegación

## Arquitectura principal

- Parte I - Decisiones ejecutivas
- Parte II - Estado actual y estrategia de conservación
- Parte III - Baseline tecnológico y política de versiones
- Parte IV - Arquitectura del monorepo
- Parte V - Bounded contexts y diseño de dominio
- Parte VI - Backend Supabase
- Parte VII - Arquitectura frontend compartida
- Parte VIII - Web
- Parte IX - Extensión Chrome
- Parte X - App móvil React Native + Expo
- Parte XI - Diseño, UX y sistema visual
- Parte XII - Convenciones de código
- Parte XIII - Entornos
- Parte XIV - Git y colaboración con IA
- Parte XV - Calidad y pruebas
- Parte XVI - CI/CD
- Parte XVII - Seguridad
- Parte XVIII - Observabilidad y operación
- Parte XIX - Rendimiento y escalabilidad
- Parte XX - Documentación y decisiones
- Parte XXI - Plan de ejecución por fases
- Parte XXII - Definición de terminado
- Parte XXIII - Riesgos y mitigaciones
- Parte XXIV - Antipatrones prohibidos
- Parte XXV - Archivos de configuración
- Parte XXVI - Checklist de aceptación
- Parte XXVII - Fuentes oficiales

## Apéndices de implementación

- A - Mapa de migración
- B - Matriz de paquetes
- C - Feature matrix
- D - DDL conceptual
- E - Contratos de plataforma
- F - Query y mutation pattern
- G - CI conceptual
- H - SLO y presupuestos
- I - Feature flags y entitlements
- J - Compatibilidad de contratos
- K - Backlog técnico
- L - Flujo de trabajo para IA
- M - Información pendiente del backend
- N - Sistema visual premium v3 (especificación canónica)

::: pagebreak
:::

## 0. Instrucciones obligatorias para cualquier IA o desarrollador que use este documento

Este documento es la fuente principal de arquitectura del nuevo repositorio. Antes de modificar código, una IA debe:

1. Leer este documento completo, el `README.md` raíz, el `AGENTS.md` raíz y el `README.md` del paquete afectado.
2. Identificar el bounded context, la aplicación y el paquete al que pertenece el cambio.
3. Confirmar que el cambio respeta el grafo de dependencias permitido.
4. Crear una rama y un worktree dedicados a una sola tarea.
5. No modificar archivos fuera del alcance sin explicar por qué.
6. No introducir secretos, claves, contraseñas, datos reales de clientes ni credenciales en código, documentación, commits o logs.
7. No ejecutar migraciones contra producción desde una tarea de desarrollo normal.
8. No introducir una dependencia nueva si la plataforma o una dependencia existente ya resuelve el problema.
9. No crear paquetes vacíos “por si acaso”. Un paquete se crea cuando tiene una responsabilidad concreta, API pública y al menos un consumidor real.
10. No fusionar una tarea si no pasan lint, typecheck, pruebas y build de los paquetes afectados.
11. Actualizar pruebas, documentación y ADR cuando cambie una decisión arquitectónica.
12. Entregar al terminar: resumen, archivos modificados, pruebas ejecutadas, riesgos y pasos manuales restantes.
13. Todo cambio visual debe consumir los paquetes del design system, incluir estados claro/oscuro y actualizar historias o pruebas visuales.
14. Las imágenes de referencia no son pixel-perfect; los tokens y contratos descritos en la Parte XI y el Apéndice N prevalecen.

### Reglas de seguridad inmediatas

Las credenciales privilegiadas compartidas durante la planificación deben considerarse comprometidas. Antes de continuar con el backend productivo se deben rotar:

- contraseña de PostgreSQL;
- clave `service_role` o clave secreta equivalente;
- claves legacy y firma JWT cuando corresponda;
- cualquier secreto reutilizado en otros servicios.

Los clientes públicos solo pueden recibir URL de proyecto y clave publishable. Una clave secreta o `service_role` nunca puede estar en extensión, web, móvil, repositorio o conversación.

---

## Nota de vigencia (`2026-08-19`)

Este documento se escribió el 27 de julio de 2026 y se trasladó al repositorio el 19 de agosto,
corrigiendo lo que había quedado desfasado. Contraste completo en
`docs/auditorias/evaluacion-plan-arquitectura-v2.md`.

**Lo que se corrigió, y por qué importa:**

1. **El viewport de la extensión decía 520–620 px. El panel real mide 360.** Era el error grave: todo
   el apéndice N estaba dimensionado sobre esa medida, así que implementarlo al pie de la letra
   rompía la interfaz *creyendo que seguía la especificación*. Corregidas las medidas que colgaban de
   ella: drawer, padding lateral y matriz de regresión visual.
2. **El inventario estaba casi al doble** (42.039 líneas, no 22.000; 111 migraciones, no 54).
3. **La denuncia de "ausencia de lint, pruebas y CI" ya es falsa**, igual que la de `.env.local` y
   `dist.pem` versionados. Importa porque era el argumento con el que este plan justificaba empezar
   en un repositorio nuevo.

**Dos decisiones posteriores que este documento todavía contradice, y que mandan sobre él:**

- **Monorepo en el repositorio actual, no uno nuevo.** El plan propone crear `leadseed-platform` y
  copiar sin `.git`. El usuario pidió el `2026-08-19` un monorepo con la app móvil en su propia
  carpeta, dentro de este repositorio. Empezar de cero costaría el historial de 111 migraciones y del
  roadmap, que es donde vive el *por qué* de cada decisión. Estructura acordada: `apps/extension`,
  `apps/mobile`, `packages/core`.
- **La paleta que manda es la del código, no la de este documento.** Coinciden al carácter el borde
  `#E6EAF0` y la superficie `#FFFFFF`, pero no el morado: el plan dice `#635BFF` y el código usa
  `#6c4cf6`. Se implementó desde aquí y después se ajustó sin volver a actualizarlo. Manda producción.

**Lo que sigue vigente y sin hacer**, rescatado de este plan porque no estaba en el roadmap:
tenencia por `workspace` en vez de `user_id`, outbox y colas para trabajos, idempotencia en envíos, y
audit log de acciones sensibles.

**Advertencia sobre los paquetes:** el documento enumera cerca de 40. Él mismo avisa de no crear
paquetes vacíos y ofrece un mínimo de ocho. Vale el mínimo, no la lista: cada frontera es
mantenimiento, y una inventada antes de tener dos consumidores reales se pone donde no toca.

---

# Parte I - Decisiones ejecutivas
## 1. Resumen ejecutivo

LeadSeed se reconstruirá organizativamente, no funcionalmente. La extensión actual contiene una inversión considerable y no debe descartarse. El objetivo es trasladarla a un repositorio nuevo y limpio, conservar su comportamiento, extraer progresivamente lógica reutilizable y agregar una web app y una aplicación móvil nativa sin duplicar el negocio.

La arquitectura definitiva es:

| Superficie | Stack recomendado |
|---|---|
| Extensión Chrome | React + TypeScript + Vite + CRXJS, Manifest V3, Side Panel |
| Web app | React + TypeScript + Vite + React Router |
| Android/iOS | React Native + Expo, Expo Router, Development Builds |
| Backend | Supabase Postgres, Auth, Storage, Realtime, Edge Functions, Cron y Queues |
| Monorepo | pnpm workspaces + Turborepo |
| Estado remoto | TanStack Query |
| Formularios | React Hook Form + Zod |
| Design system | Tokens tipados + `@leadseed/ui-web` + `@leadseed/ui-native` + `@leadseed/charts` |
| Catálogo visual | Storybook web + catálogo native de desarrollo + regresión visual |
| Observabilidad | Sentry + logs estructurados + métricas Supabase |
| Pruebas | Vitest/Jest, Testing Library, Playwright, Maestro, pgTAP y Deno tests |
| CI/CD | GitHub Actions, EAS Build/Submit/Update, despliegue web y Supabase CLI |

### Decisión móvil

La aplicación móvil se construirá con React Native y Expo, no con Capacitor. Esta elección sacrifica reutilización de pantallas HTML a cambio de una experiencia móvil nativa, mejor comportamiento de navegación, teclado, listas, gestos, notificaciones, deep links, almacenamiento y evolución a largo plazo.

### Principio rector

> Compartir dominio, contratos, validaciones, casos de uso, acceso a datos y tokens de diseño. Especializar navegación, composición y presentación por plataforma.

### Qué significa “no queremos monolitos”

No se construirá una carpeta `src` gigante donde todo importe todo. Tampoco se dividirá prematuramente el backend en microservicios de red. Se usará:

- un monorepo con aplicaciones y paquetes claramente limitados;
- módulos de negocio independientes por bounded context;
- puertos y adaptadores;
- APIs públicas por paquete;
- procesos asíncronos para desacoplar trabajos;
- un backend modular sobre Supabase.

Este enfoque se denomina **monorepo modular con backend modular**. Los microservicios solo se considerarán cuando exista una necesidad medible de escalado, aislamiento, cumplimiento o equipos independientes.

---

## 2. Resultado final esperado

Al terminar la migración, LeadSeed tendrá:

1. Una extensión Chrome enfocada en presencia persistente, alertas, captura y acciones rápidas.
2. Una web app completa para operación, administración, reportes, configuración e importaciones.
3. Una app móvil nativa para seguimiento, leads, tareas, agenda, notas, alertas y comunicaciones rápidas.
4. Un backend común, multi-tenant y seguro.
5. Un repositorio reproducible desde cero.
6. Entornos local, preview, staging y producción.
7. Migraciones versionadas y testeadas.
8. CI obligatorio para cada pull request.
9. Releases independientes por aplicación.
10. Observabilidad, auditoría y runbooks.
11. Reglas explícitas para humanos e IA.

---

## 3. Alcance por plataforma

No todas las plataformas necesitan todas las funciones con la misma profundidad.

### Extensión Chrome: presencia y velocidad

Responsabilidades principales:

- side panel persistente;
- alertas de tareas y citas;
- badge;
- acceso rápido a leads;
- creación y actualización rápida;
- acciones sobre teléfono, correo y WhatsApp;
- captura desde páginas permitidas;
- notificaciones locales;
- comandos y atajos;
- funcionamiento contextual mientras el usuario navega.

No debe asumir:

- trabajos programados críticos;
- envío autónomo cuando Chrome está cerrado;
- administración completa de la plataforma;
- almacenamiento de secretos de servidor.

### Web app: operación completa y administración

Responsabilidades principales:

- dashboard y reportes completos;
- gestión de leads y pipeline;
- importación/exportación;
- listas y segmentos;
- configuración de canales;
- plantillas avanzadas;
- agenda y administración de disponibilidad;
- administración SaaS;
- soporte y supervisión;
- configuraciones que requieren pantalla grande.

### App móvil: ejecución en terreno

Responsabilidades principales:

- login y sesión persistente;
- lista de leads;
- detalle, notas y cambio de estado;
- tareas y seguimientos;
- agenda;
- push notifications;
- llamadas, WhatsApp y correo;
- plantillas de uso rápido;
- caché de lectura y borradores offline;
- deep links desde alertas.

Funciones web-only iniciales:

- configuración técnica de canales de correo;
- importaciones masivas complejas;
- administración global;
- edición HTML avanzada;
- auditorías extensas y reportes densos.

---

# Parte II - Estado actual y estrategia de conservación
## 4. Inventario del repositorio actual

La extensión actual ya es una aplicación web avanzada. La auditoría estática encontró aproximadamente:

- 42.039 líneas TypeScript/TSX en `src`, sin contar pruebas;
- más de 4.000 líneas en Edge Functions;
- 341 archivos TypeScript/TSX, sin contar pruebas;
- 111 migraciones SQL y seed separado;
- 13 Edge Functions;
- React, TypeScript, Vite, Tailwind, CRXJS y Supabase;
- módulos de leads, listas, tareas, agenda, correo, chat, comunidad, soporte, administración y SaaS.

Fortalezas existentes:

- separación inicial entre páginas, componentes, hooks, servicios y repositorios;
- gran parte del acceso a Supabase concentrado en repositorios;
- modelos de dominio y mapeos existentes;
- pocos archivos con dependencia directa de `chrome.*`;
- backend común utilizable por las tres superficies.

Problemas estructurales actuales:

- ramas permanentes redundantes y cambios sin consolidar;
- ~~`.env.local` versionado~~ **resuelto**: solo existe `.env.example`;
- ~~clave privada `dist.pem` dentro del proyecto~~ **resuelto**: no hay `.pem` ni `.crx` versionados;
- artefactos de build en la raíz;
- documentación histórica extensa y contradictoria;
- ~~ausencia de lint, pruebas y CI~~ **resuelto**: ESLint con reglas de frontera entre capas, 349 pruebas, CI en GitHub Actions, umbrales de cobertura y tres guardas propias (`check:classes`, `audit-dark-gaps`, `check:functions`);
- tipos agrupados en un archivo grande;
- componentes y páginas de cientos de líneas;
- migraciones fuera de la convención Supabase;
- procesos programados iniciados desde el frontend;
- sesión del service worker sin adaptador de almacenamiento explícito;
- propiedad de datos centrada en `user_id`, poco preparada para equipos.

### Hotspots que deben dejar de crecer

- `EmailSettings.tsx`;
- `LeadDetail.tsx`;
- `AgendaPage.tsx`;
- `LeadsPage.tsx`;
- `DashboardPage.tsx`;
- `EmailSender.tsx`;
- `types/index.ts`.

No se refactorizarán todos antes de migrar. Se aplicará la regla: **cuando un hotspot sea tocado por una funcionalidad, se extrae una unidad coherente y se cubre con pruebas**.

---

## 5. Estrategia de migración: sin big bang

No se convertirá directamente el repositorio actual. Se creará un repositorio nuevo.

```text
C:\Proyectos\
├── MENSAJES\                 # respaldo histórico, no se elimina
└── leadseed-platform\        # nuevo repositorio
```

La migración seguirá el patrón:

```text
congelar -> copiar -> compilar -> proteger -> extraer -> expandir
```

Reglas:

1. La extensión debe funcionar en el nuevo repositorio antes de crear la web o móvil.
2. No se mezclará una migración de estructura con un rediseño.
3. No se copiará `.git` al repositorio nuevo.
4. No se copiarán secretos, builds ni archivos temporales.
5. Cada extracción se hará por una vertical funcional completa, comenzando por Leads.
6. Durante la transición puede existir código legacy dentro de `apps/extension`, pero no se agrega nueva deuda sin una tarea explícita.

---

# Parte III - Baseline tecnológico y política de versiones
## 6. Baseline recomendado a julio de 2026

La versión exacta debe verificarse en el momento de inicializar, pero la línea base estable es:

| Componente | Baseline |
|---|---|
| Node.js | 24 LTS |
| pnpm | última estable compatible, fijada en `packageManager` |
| TypeScript | 5.9 o parche estable compatible |
| React web | 19.2 |
| Vite | 8.1, parche soportado |
| Expo | SDK 56 |
| React Native dentro de Expo | 0.85 |
| React Native directo | no se gestiona fuera de la matriz de Expo |
| Supabase CLI | versión fijada como devDependency |

Expo SDK 56 usa React Native 0.85 y React 19.2. Aunque React Native 0.86 esté activo, no se forzará fuera de la matriz estable de Expo. La estabilidad de la plataforma elegida tiene prioridad sobre “usar el número mayor”.

### Política de versiones

- `packageManager` fijado con versión exacta.
- lockfile obligatorio y versionado.
- versiones exactas para herramientas críticas; rangos conservadores para librerías normales.
- actualizaciones automáticas agrupadas por categoría mediante Dependabot.
- una ventana mensual de mantenimiento técnico.
- SDK de Expo se actualiza una versión a la vez.
- Vite y TypeScript se actualizan en PR independiente.
- no se combinan upgrades de plataforma con funcionalidades.
- `pnpm minimumReleaseAge` para reducir riesgo de paquetes recién publicados.
- scripts de instalación permitidos mediante allowlist.

---

## 7. Herramientas elegidas y razones

### pnpm workspaces

- dependencias deduplicadas;
- enlaces explícitos con `workspace:`;
- instalación rápida;
- soporte robusto para monorepos;
- filtros por paquete;
- catálogo central de versiones.

### Turborepo

- grafo de tareas;
- caché de builds y pruebas;
- ejecución solo en paquetes afectados;
- pipeline uniforme;
- menor complejidad inicial que una plataforma más amplia.

### React Native + Expo

- UI nativa;
- Development Builds;
- EAS Build, Submit y Update;
- Expo Router;
- módulos nativos con Expo Modules API;
- soporte oficial para monorepos;
- Android/iOS desde una base TypeScript.

### Supabase

- Postgres real;
- Auth;
- RLS;
- Realtime;
- Storage;
- Edge Functions;
- Queues y Cron;
- desarrollo local y branches de preview.

### TanStack Query

- estado remoto;
- caché;
- reintentos;
- invalidación;
- paginación;
- soporte web y React Native;
- integración con conectividad móvil.

### React Hook Form + Zod

- validación compartida;
- formularios con pocas renderizaciones;
- esquemas reutilizables;
- adaptación a web y React Native.

---

# Parte IV - Arquitectura del monorepo
## 8. Estructura general del repositorio

```text
leadseed-platform/
├── apps/
│   ├── extension/
│   ├── web/
│   ├── mobile/
│   └── storybook/
│
├── packages/
│   ├── modules/
│   │   ├── identity/
│   │   ├── crm/
│   │   ├── tasks/
│   │   ├── communications/
│   │   ├── scheduling/
│   │   ├── notifications/
│   │   ├── billing/
│   │   └── support/
│   │
│   ├── infrastructure/
│   │   ├── supabase/
│   │   ├── auth/
│   │   ├── realtime/
│   │   ├── jobs/
│   │   └── integrations/
│   │
│   ├── presentation/
│   │   ├── web-core/
│   │   ├── web-crm/
│   │   ├── web-tasks/
│   │   ├── web-scheduling/
│   │   ├── web-communications/
│   │   ├── native-core/
│   │   ├── native-crm/
│   │   ├── native-tasks/
│   │   └── native-scheduling/
│   │
│   ├── platform/
│   │   ├── contracts/
│   │   ├── web/
│   │   ├── extension/
│   │   └── mobile/
│   │
│   ├── design-system/
│   │   ├── tokens/
│   │   ├── icons/
│   │   ├── web/
│   │   ├── native/
│   │   ├── charts/
│   │   └── testing/
│   │
│   ├── shared/
│   │   ├── kernel/
│   │   ├── validation/
│   │   ├── observability/
│   │   ├── i18n/
│   │   └── testing/
│   │
│   └── config/
│       ├── eslint/
│       ├── typescript/
│       ├── vitest/
│       └── prettier/
│
├── supabase/
│   ├── migrations/
│   ├── functions/
│   ├── tests/
│   ├── seed.sql
│   └── config.toml
│
├── e2e/
│   ├── web/
│   ├── extension/
│   └── mobile/
│
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── api/
│   ├── data/
│   ├── design/
│   ├── product/
│   ├── runbooks/
│   ├── security/
│   └── ai/
│
├── tooling/
│   ├── scripts/
│   ├── generators/
│   └── fixtures/
│
├── .github/
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── CODEOWNERS
│   └── dependabot.yml
│
├── .changeset/
├── .editorconfig
├── .gitignore
├── .npmrc
├── AGENTS.md
├── ARCHITECTURE.md
├── CONTRIBUTING.md
├── SECURITY.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

### Nota de pragmatismo

La estructura anterior es el destino. No se crearán todos los paquetes el primer día. Se crean al migrar cada capacidad. El repositorio puede comenzar con:

```text
apps/extension
packages/modules/crm
packages/infrastructure/supabase
packages/platform/contracts
packages/platform/extension
packages/shared/kernel
packages/shared/validation
packages/design-system/tokens
```

Después se agregan web, móvil y demás módulos.

---

## 9. Composición detallada de aplicaciones

### 9.1 `apps/extension`

```text
apps/extension/
├── src/
│   ├── entrypoints/
│   │   ├── sidepanel/
│   │   │   ├── index.html
│   │   │   ├── main.tsx
│   │   │   └── SidePanelApp.tsx
│   │   ├── service-worker/
│   │   │   ├── index.ts
│   │   │   ├── alarms.ts
│   │   │   ├── badge.ts
│   │   │   ├── notifications.ts
│   │   │   └── message-router.ts
│   │   ├── content-scripts/
│   │   │   └── capture/
│   │   └── options/
│   ├── composition/
│   │   ├── create-container.ts
│   │   └── providers.tsx
│   ├── platform/
│   │   ├── chrome-storage.adapter.ts
│   │   ├── chrome-notifications.adapter.ts
│   │   ├── chrome-links.adapter.ts
│   │   └── chrome-identity.adapter.ts
│   └── legacy/                     # temporal durante migración
├── public/
├── manifest.config.ts
├── vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

Reglas:

- `service-worker` no importa React.
- no existe estado crítico solo en memoria del worker;
- todo estado persistente usa `chrome.storage` o backend;
- el worker maneja eventos cortos y delega procesos remotos al backend;
- mensajes entre contextos tienen contratos TypeScript y validación runtime;
- permisos de Chrome son mínimos.

### 9.2 `apps/web`

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx
│   │   ├── router.tsx
│   │   └── error-boundary.tsx
│   ├── routes/
│   ├── composition/
│   ├── platform/
│   │   ├── browser-storage.adapter.ts
│   │   ├── web-notifications.adapter.ts
│   │   └── browser-links.adapter.ts
│   ├── assets/
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

`apps/web` es un composition root. Las pantallas reutilizables para web y extensión viven en paquetes `presentation/web-*`.

### 9.3 `apps/mobile`

```text
apps/mobile/
├── app/
│   ├── _layout.tsx
│   ├── +not-found.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── callback.tsx
│   │   └── reset-password.tsx
│   └── (app)/
│       ├── _layout.tsx
│       ├── (tabs)/
│       │   ├── _layout.tsx
│       │   ├── index.tsx
│       │   ├── leads.tsx
│       │   ├── tasks.tsx
│       │   ├── agenda.tsx
│       │   └── notifications.tsx
│       ├── leads/[leadId].tsx
│       ├── tasks/[taskId].tsx
│       ├── appointments/[appointmentId].tsx
│       ├── templates/index.tsx
│       └── settings/index.tsx
├── src/
│   ├── composition/
│   ├── platform/
│   │   ├── secure-storage.adapter.ts
│   │   ├── expo-notifications.adapter.ts
│   │   ├── native-links.adapter.ts
│   │   └── network-status.adapter.ts
│   ├── offline/
│   ├── providers/
│   └── assets/
├── app.config.ts
├── eas.json
├── package.json
├── tsconfig.json
└── README.md
```

Reglas:

- usar Development Builds, no depender de Expo Go;
- rutas pequeñas que componen features, no lógica compleja dentro de `app/`;
- tokens sensibles en SecureStore;
- caché y borradores persistentes separados de credenciales;
- push y deep links probados en builds reales;
- ningún componente web o API DOM se importa en móvil.

---

## 10. Estructura de un módulo de negocio

Ejemplo `packages/modules/crm`:

```text
packages/modules/crm/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── lead.ts
│   │   │   └── lead-note.ts
│   │   ├── value-objects/
│   │   │   ├── lead-id.ts
│   │   │   ├── lead-status.ts
│   │   │   ├── phone-number.ts
│   │   │   └── email-address.ts
│   │   ├── policies/
│   │   │   ├── lead-transition.policy.ts
│   │   │   └── duplicate-lead.policy.ts
│   │   ├── events/
│   │   │   ├── lead-created.event.ts
│   │   │   └── lead-status-changed.event.ts
│   │   └── errors/
│   ├── application/
│   │   ├── commands/
│   │   │   ├── create-lead/
│   │   │   │   ├── create-lead.command.ts
│   │   │   │   ├── create-lead.handler.ts
│   │   │   │   └── create-lead.test.ts
│   │   │   └── change-lead-status/
│   │   ├── queries/
│   │   │   ├── list-leads/
│   │   │   └── get-lead-detail/
│   │   ├── ports/
│   │   │   ├── lead.repository.ts
│   │   │   ├── lead-event.publisher.ts
│   │   │   └── clock.ts
│   │   ├── dto/
│   │   └── mappers/
│   ├── contracts/
│   │   ├── schemas.ts
│   │   ├── events.ts
│   │   └── public-types.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Reglas internas

- `domain` es TypeScript puro.
- `domain` no importa Supabase, React, Expo, Chrome, `window`, `fetch` ni almacenamiento.
- `application` orquesta casos de uso y depende de puertos.
- infraestructura implementa puertos.
- DTO y entidad no son lo mismo.
- toda API pública se exporta desde `src/index.ts`.
- están prohibidos los deep imports desde otros paquetes.

---

## 11. Grafo de dependencias permitido

```text
apps/*
  -> presentation/*
  -> modules/*
  -> infrastructure/*
  -> platform/*
  -> shared/*

presentation/*
  -> modules/*
  -> platform/contracts
  -> shared/*

infrastructure/*
  -> modules/*
  -> shared/*

modules/*
  -> shared/kernel
  -> shared/validation (solo contratos)

shared/kernel
  -> ninguna dependencia interna
```

Prohibiciones:

- un módulo de negocio no importa otro directamente para manipular sus internals;
- comunicación entre módulos mediante contratos, casos de uso o eventos;
- `ui-native` no importa `ui-web`;
- web no importa código de Chrome;
- extensión no importa código móvil;
- ninguna aplicación accede directamente a tablas si existe un caso de uso establecido;
- no hay imports relativos que atraviesen límites de paquete.

Estas reglas se automatizan con:

- ESLint boundaries;
- exports de `package.json`;
- TypeScript project references;
- dependency-cruiser o herramienta equivalente;
- CI.

---

# Parte V - Bounded contexts y diseño de dominio
## 12. Módulos de negocio

### 12.1 Identity & Access

Incluye:

- perfiles;
- workspaces;
- membresías;
- invitaciones;
- roles;
- permisos;
- dispositivos;
- sesiones de soporte;
- preferencias básicas.

No incluye planes comerciales ni entitlements.

### 12.2 CRM

Incluye:

- leads;
- contactos;
- estados;
- pipeline;
- asignación;
- notas;
- tags;
- listas;
- duplicados;
- captura;
- historial de actividad;
- importación y exportación.

### 12.3 Tasks & Follow-up

Incluye:

- tareas;
- vencimientos;
- recordatorios;
- seguimientos;
- prioridades;
- reglas de creación automática;
- tareas relacionadas con leads y citas.

### 12.4 Communications

Incluye:

- plantillas;
- variables;
- canales de correo;
- mensajes;
- programación;
- intentos de entrega;
- estados de envío;
- acciones WhatsApp y llamadas;
- límites de envío;
- reputación y errores.

### 12.5 Scheduling

Incluye:

- disponibilidad;
- bloques;
- citas;
- participantes;
- reprogramación;
- cancelación;
- sincronización Google Calendar;
- Meet;
- auditoría de cambios.

### 12.6 Notifications

Incluye:

- bandeja in-app;
- preferencias;
- tokens push;
- alertas de extensión;
- estado leído/no leído;
- routing desde notificación;
- entrega multi-canal.

### 12.7 Billing & Entitlements

Incluye:

- planes;
- suscripciones;
- trials;
- features;
- límites;
- overrides;
- consumo medido;
- habilitación de funciones.

### 12.8 Support & Administration

Incluye:

- tickets;
- chat de soporte;
- supervisión;
- acceso de soporte temporal;
- roles globales de plataforma;
- auditoría administrativa.

---

## 13. Comunicación entre módulos

### Sincrónica

Usar para:

- consultas necesarias para completar una acción inmediata;
- validaciones de permisos;
- operaciones atómicas dentro de una transacción.

Mecanismos:

- caso de uso importado desde API pública;
- RPC Postgres para transacciones multi-tabla;
- consulta a un port.

### Asíncrona

Usar para:

- notificaciones;
- correo;
- analítica;
- sincronizaciones externas;
- trabajos reintentables;
- efectos que no deben bloquear la acción principal.

Mecanismos:

- outbox transaccional;
- Supabase Queues;
- Edge Function worker;
- Broadcast para actualización de clientes.

Ejemplo:

```text
CRM cambia estado del lead
  -> guarda lead y evento outbox en la misma transacción
  -> worker consume crm.lead.status-changed.v1
  -> Tasks decide si crea seguimiento
  -> Notifications decide si alerta
  -> Analytics actualiza métricas
```

---

# Parte VI - Backend Supabase
## 14. Arquitectura del backend

Supabase seguirá siendo la plataforma backend. Se utilizará de forma disciplinada:

```text
Cliente público
  -> Data API con publishable key + RLS
  -> RPC para operaciones atómicas
  -> Edge Functions para secretos e integraciones
  -> Realtime para eventos

Backend privilegiado
  -> Edge Functions / workers
  -> secret key o service role
  -> Queues / Cron
  -> proveedores externos
```

### Regla de ubicación de lógica

| Tipo de lógica | Ubicación |
|---|---|
| validación de formulario | Zod compartido + servidor |
| regla pura de negocio | módulo de dominio |
| orquestación | application use case |
| restricción de acceso | RLS/Postgres |
| transacción multi-tabla | RPC/Postgres function |
| secreto de proveedor | Edge Function |
| proceso programado | Cron + Queue + worker |
| actualización visual instantánea | Broadcast/Realtime |
| cálculo de dashboard complejo | RPC optimizada o snapshot |

---

## 15. Esquemas de Postgres

Propuesta:

```text
public       # tablas, vistas y RPC expuestas al cliente con RLS
security     # helpers de autorización, no expuesto directamente
private      # tokens, secretos cifrados y datos internos
jobs         # outbox, idempotencia, control de trabajos
integration  # estado de integraciones externas
analytics    # agregados y snapshots, si son necesarios
audit        # registro inmutable de acciones sensibles
```

No todas las tablas deben exponerse a PostgREST. `private`, `security`, `jobs` y `audit` no tendrán grants a `anon` o `authenticated`, salvo funciones wrapper muy específicas.

---

## 16. Modelo multi-tenant

El tenant será `workspace`, no `user_id`.

### Tablas base

```text
profiles
workspaces
workspace_members
workspace_invitations
workspace_settings
workspace_subscriptions
workspace_entitlements
platform_staff_roles
support_access_sessions
```

### Columnas estándar en datos de negocio

```text
id uuid primary key
workspace_id uuid not null
created_by uuid
updated_by uuid
created_at timestamptz not null
updated_at timestamptz not null
version integer not null default 1
```

Cuando aplique:

```text
assigned_to uuid
deleted_at timestamptz
deleted_by uuid
```

### Reglas

- `workspace_id` siempre indexado.
- índices compuestos comienzan por `workspace_id` cuando las consultas son tenant-scoped.
- un usuario puede pertenecer a múltiples workspaces.
- roles globales y roles de workspace son distintos.
- un usuario individual recibe un workspace personal.
- el plan y los límites pertenecen al workspace.
- datos de soporte no permiten acceso silencioso; requieren sesión auditada.

---

## 17. Modelo de datos sugerido por contexto

### Identity

```text
profiles
workspaces
workspace_members
workspace_invitations
workspace_settings
user_devices
support_access_sessions
platform_staff_roles
```

### CRM

```text
leads
lead_contacts
lead_notes
lead_tags
lead_tag_assignments
lead_lists
lead_list_members
lead_events
lead_sources
lead_import_jobs
lead_import_errors
capture_links
capture_events
```

### Tasks

```text
tasks
task_events
task_reminders
follow_up_rules
```

### Communications

```text
message_templates
template_versions
communication_channels
outbound_messages
message_attempts
scheduled_messages
message_attachments
provider_webhook_events
```

### Scheduling

```text
availability_rules
availability_exceptions
appointments
appointment_participants
appointment_events
calendar_connections
external_calendar_events
calendar_sync_cursors
```

### Notifications

```text
notifications
notification_preferences
device_push_tokens
notification_deliveries
```

### Billing

```text
plans
features
plan_features
workspace_subscriptions
workspace_entitlements
usage_counters
entitlement_overrides
```

### Support

```text
support_tickets
support_messages
support_access_sessions
admin_actions
```

### Auditoría y trabajos

```text
audit.audit_log
jobs.outbox_events
jobs.idempotency_keys
jobs.job_attempts
jobs.dead_letters
```

---

## 18. Convenciones SQL

- nombres `snake_case`;
- tablas plurales;
- claves primarias `id` UUID;
- foreign keys con sufijo `_id`;
- timestamps `timestamptz` en UTC;
- dinero como entero en unidad menor y código de moneda;
- teléfono normalizado E.164 cuando sea posible;
- correo en formato normalizado para comparación;
- RUT normalizado en columna separada y validado en aplicación/DB;
- constraints antes que validaciones solo en frontend;
- enum Postgres solo para estados altamente estables; para catálogos evolutivos, tabla o text + check;
- `updated_at` automático mediante trigger compartido;
- no usar `select *` en consultas de producción;
- comentarios SQL para funciones sensibles;
- cada índice debe responder a una consulta conocida.

### Soft delete

No usar soft delete universalmente. Aplicar solo donde exista necesidad de restauración o auditoría. Datos transaccionales se conservan; datos temporales pueden eliminarse. Las políticas deben excluir `deleted_at is not null` por defecto.

---

## 19. RLS y autorización

RLS es la autoridad final. La UI solo mejora experiencia, no protege datos.

### Helpers en esquema `security`

```sql
security.is_workspace_member(target_workspace_id uuid)
security.has_workspace_role(target_workspace_id uuid, allowed_roles text[])
security.is_platform_staff(allowed_roles text[])
security.has_active_support_access(target_workspace_id uuid)
```

### Política conceptual

```sql
create policy leads_select_workspace_members
on public.leads
for select
to authenticated
using (
  security.is_workspace_member(workspace_id)
  and deleted_at is null
);
```

### Matriz mínima de pruebas RLS

Para cada tabla tenant-owned:

1. `anon` no lee ni escribe.
2. miembro del workspace lee lo permitido.
3. usuario de otro workspace no lee.
4. rol viewer no modifica.
5. rol member no ejecuta acciones de admin.
6. owner/admin puede operar según política.
7. soporte sin sesión activa no accede.
8. soporte con sesión limitada accede solo al workspace y tiempo autorizados.
9. service backend funciona donde corresponde.

### Funciones `SECURITY DEFINER`

Toda función debe:

- tener `set search_path = ''` o lista explícita segura;
- referenciar objetos con schema completo;
- validar `auth.uid()` y workspace;
- tener `revoke execute from public`;
- conceder ejecución solo al rol necesario;
- evitar SQL dinámico o sanitizar identificadores;
- estar cubierta por pruebas;
- documentar por qué necesita elevación.

---

## 20. Migraciones

Ubicación única:

```text
supabase/migrations/YYYYMMDDHHMMSS_descripcion.sql
```

Reglas:

- una migración aplicada nunca se edita;
- cambios nuevos crean otra migración;
- no usar numeración manual duplicable;
- el Dashboard no es fuente de verdad;
- todo cambio de esquema se reproduce con `supabase db reset`;
- seed determinístico y sin datos reales;
- generar tipos después de migraciones;
- migraciones destructivas usan expand/migrate/contract;
- índices grandes se crean con estrategia segura;
- cambios de RLS incluyen tests en el mismo PR.

### Patrón expand/migrate/contract

1. agregar nueva columna nullable;
2. escribir en antigua y nueva temporalmente;
3. backfill en lotes;
4. cambiar lecturas;
5. hacer obligatoria la nueva;
6. retirar la antigua en release posterior.

La base se revierte normalmente con forward-fix, no intentando deshacer una migración destructiva en producción.

---

## 21. Tipos de base de datos

El archivo generado será:

```text
packages/infrastructure/supabase/src/generated/database.types.ts
```

Reglas:

- se genera con Supabase CLI;
- no se edita manualmente;
- CI verifica que esté actualizado;
- tipos generados no se exponen directamente a UI;
- cada adapter mapea Row/Insert/Update a DTO y entidad;
- cambios de esquema que alteran tipos fallan en typecheck.

---

## 22. RPC y transacciones

Usar RPC para:

- crear una cita y participantes;
- reasignar leads con auditoría;
- importar lote de datos;
- aplicar cambios de estado con reglas;
- incrementar consumo de forma atómica;
- snapshots de dashboard;
- acciones que escriben varias tablas.

No usar RPC como contenedor genérico de toda consulta. CRUD simple con RLS puede usar Data API.

Cada RPC:

- nombre verbal y específico;
- parámetros explícitos;
- retorna un contrato estable;
- valida tenant y permisos;
- transacción atómica;
- idempotencia si puede repetirse;
- pruebas de éxito, permisos y conflicto.

---

## 23. Edge Functions

Estructura:

```text
supabase/functions/
├── _shared/
│   ├── auth/
│   ├── cors/
│   ├── errors/
│   ├── logging/
│   ├── validation/
│   ├── idempotency/
│   └── providers/
├── communications-send-email/
├── communications-provider-webhook/
├── scheduling-google-connect/
├── scheduling-google-sync/
├── notifications-send-push/
├── capture-submit-lead/
└── jobs-worker/
```

Reglas:

- nombres por bounded context;
- funciones pequeñas, un propósito;
- validación Zod o equivalente;
- CORS allowlist, no `*` sin razón;
- autenticación y autorización explícita;
- secret key solo dentro de función;
- logs estructurados;
- correlation ID;
- timeout y reintentos conscientes;
- no almacenar secretos en tablas públicas;
- código común en `_shared`, pero sin convertirlo en utilitario sin límites.

### Respuesta de error estándar

```json
{
  "error": {
    "code": "COMMUNICATION_CHANNEL_UNAVAILABLE",
    "message": "No hay un canal disponible.",
    "requestId": "...",
    "details": null
  }
}
```

Los mensajes internos de proveedor no se exponen al cliente.

---

## 24. Trabajos, Cron, Queues y outbox

Ningún correo, recordatorio o sincronización crítica dependerá de que una aplicación esté abierta.

### Flujo estándar

```text
transacción de negocio
  -> inserta outbox_event
  -> dispatcher lo publica en queue
  -> worker lee con visibility timeout
  -> ejecuta proveedor
  -> registra intento
  -> completa o reintenta
  -> después de N fallos mueve a dead letter
```

### Campos de outbox

```text
id
workspace_id
aggregate_type
aggregate_id
event_type
event_version
payload jsonb
occurred_at
published_at
attempt_count
last_error
```

### Idempotencia

Operaciones externas deben usar una clave como:

```text
workspace_id + operation + aggregate_id + version
```

La tabla `jobs.idempotency_keys` evita envíos duplicados.

### Retry recomendado

- errores 4xx permanentes: no reintentar salvo 408/429;
- 429: respetar `Retry-After`;
- 5xx/red: backoff exponencial con jitter;
- límite de intentos;
- dead-letter visible en administración;
- acción manual de reintento auditada.

### Jobs iniciales

- envío de correos programados;
- notificaciones de tareas;
- recordatorios de citas;
- sincronización Google Calendar;
- limpieza según retención;
- reintento de webhooks;
- actualización de snapshots;
- expiración de sesiones de soporte.

---

## 25. Realtime

### Usos

- cambios visibles de leads;
- tareas asignadas;
- citas actualizadas;
- chat;
- presencia;
- notificaciones in-app.

### Estrategia

- Broadcast para eventos de aplicación y alto fanout;
- Postgres Changes solo en casos controlados y bajo volumen;
- Presence solo para estado efímero;
- no usar Realtime como fuente de verdad;
- al reconectar, invalidar/refetch mediante TanStack Query.

### Topics

```text
workspace:{workspaceId}:crm
workspace:{workspaceId}:tasks
workspace:{workspaceId}:scheduling
user:{userId}:notifications
conversation:{conversationId}
```

### Eventos versionados

```text
crm.lead.created.v1
crm.lead.updated.v1
crm.lead.status-changed.v1
tasks.task.assigned.v1
scheduling.appointment.updated.v1
communications.message.delivered.v1
```

Payloads mínimos, sin datos sensibles innecesarios. El cliente recibe ID y campos necesarios, y consulta el estado canónico.

---

## 26. Auth y sesión por plataforma

Supabase Auth será la identidad central.

### Web

- PKCE;
- redirect URL del entorno;
- persistencia web;
- refresh automático;
- cierre de sesión global cuando sea necesario.

### Extensión

- adaptador de storage basado en `chrome.storage.local`;
- acceso compartido entre side panel y service worker;
- OAuth mediante `chrome.identity` si aplica;
- nunca depender de `localStorage` en service worker;
- worker carga sesión de manera asíncrona en cada evento relevante.

### Móvil

- Development Build;
- deep link de callback;
- SecureStore para sesión/tokens pequeños;
- PKCE;
- bloqueo biométrico opcional como capa local, no autenticación de servidor;
- limpieza segura al cerrar sesión.

### Roles

- roles de workspace se consultan en DB;
- no confiar en claims que cambian frecuentemente;
- claims globales solo para información estable y controlada;
- entitlements se obtienen por workspace y se cachean brevemente.

---

## 27. Storage y archivos

Buckets separados por propósito:

```text
avatars
lead-attachments
template-assets
support-attachments
imports
exports
```

Convenciones de path:

```text
{workspace_id}/{entity_type}/{entity_id}/{uuid}-{safe_filename}
```

Controles:

- RLS por workspace;
- MIME allowlist;
- tamaño máximo;
- nombre aleatorio;
- no confiar en extensión de archivo;
- URLs firmadas para privado;
- expiración corta;
- cuarentena/escaneo cuando el volumen o riesgo lo justifique;
- retención y borrado coherentes con datos asociados;
- Storage no está cubierto por backup de base, por lo que necesita política separada.

---

# Parte VII - Arquitectura frontend compartida
## 28. Separación de estado

### Estado remoto

TanStack Query administra:

- leads;
- tareas;
- citas;
- plantillas;
- perfiles;
- entitlements;
- notificaciones;
- cualquier dato de Supabase.

No duplicar server state en Context o Zustand.

### Estado de formulario

React Hook Form + Zod.

### Estado de UI local

`useState`/`useReducer` para:

- modal abierto;
- selección temporal;
- pestaña activa;
- expansión de sección.

### Estado global efímero

Zustand solo si existe necesidad transversal real:

- workspace activo;
- preferencias visuales no remotas;
- cola local de UI.

No almacenar entidades completas ni resultados de queries en Zustand.

---

## 29. Query keys

Cada módulo define factories:

```ts
export const leadKeys = {
  all: ['crm', 'leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (workspaceId: string, filters: LeadFilters) =>
    [...leadKeys.lists(), workspaceId, filters] as const,
  detail: (workspaceId: string, leadId: string) =>
    [...leadKeys.all, 'detail', workspaceId, leadId] as const,
};
```

Reglas:

- workspace incluido;
- filtros serializables y estables;
- invalidación específica;
- no usar strings ad hoc en componentes;
- paginación cursor-based cuando crezca el volumen;
- prefetch en navegación frecuente;
- evitar waterfalls.

---

## 30. Casos de uso y adapters

Ejemplo de port:

```ts
export interface LeadRepository {
  list(input: ListLeadsInput): Promise<Page<LeadSummary>>;
  getById(input: GetLeadInput): Promise<LeadDetail | null>;
  create(input: CreateLeadData): Promise<Lead>;
  changeStatus(input: ChangeLeadStatusData): Promise<Lead>;
}
```

Implementación Supabase:

```text
packages/infrastructure/supabase/src/crm/supabase-lead.repository.ts
```

La UI no conoce nombres de tablas ni sintaxis Supabase.

### Composition root

Cada app crea dependencias:

```ts
const leadRepository = new SupabaseLeadRepository(client);
const changeLeadStatus = new ChangeLeadStatusHandler(leadRepository, eventPublisher, clock);
```

No se necesita un framework de DI pesado. Usar factories y objetos explícitos.

---

## 31. Errores

Taxonomía:

```text
DomainError
ValidationError
AuthenticationError
AuthorizationError
NotFoundError
ConflictError
RateLimitError
ExternalServiceError
InfrastructureError
```

Reglas:

- errores esperados son tipados;
- infraestructura traduce errores de proveedor;
- UI no muestra mensajes técnicos;
- logging captura stack y request ID;
- PII se redacta;
- `unknown` en `catch`, no `any`;
- error boundary por aplicación y por áreas críticas.

Patrón recomendado:

- usar `Result<T, E>` para resultados esperados de negocio;
- usar excepciones para fallos inesperados de infraestructura;
- no mezclar ambos sin convención.

---

# Parte VIII - Web
## 32. Arquitectura de web app

La web será una SPA autenticada. El sitio público de marketing debe ser un proyecto separado si necesita SEO/SSR.

### Routing

- `BrowserRouter` para web;
- rutas declarativas y lazy-loaded;
- loaders/prefetch cuando aporte valor;
- guards de sesión y workspace;
- permisos revisados en UI, pero seguridad real en backend.

Rutas sugeridas:

```text
/login
/app
/app/leads
/app/leads/:leadId
/app/pipeline
/app/tasks
/app/agenda
/app/templates
/app/communications
/app/reports
/app/settings
/admin/*
```

### Bundle

- code splitting por ruta;
- módulos de administración separados;
- Recharts cargado solo en reportes;
- XLSX cargado solo al importar/exportar;
- source maps privados subidos a Sentry;
- presupuesto de bundle por PR.

### Despliegue

Recomendación: Cloudflare Pages para el artefacto estático, con:

- preview por PR;
- headers de seguridad;
- fallback SPA;
- variables por entorno;
- dominio de staging y producción separados.

---

# Parte IX - Extensión Chrome
## 33. Arquitectura Manifest V3

Contextos:

```text
Side Panel UI
Service Worker
Content Scripts
Options Page
```

### Service worker

Debe:

- registrar listeners de forma top-level;
- ser reiniciable;
- persistir estado;
- manejar alarmas, badges y mensajes;
- ejecutar operaciones breves;
- delegar procesos críticos al backend.

No debe:

- asumir que permanecerá vivo;
- usar `localStorage`;
- mantener timers largos;
- contener lógica de negocio duplicada;
- enviar trabajos masivos directamente.

### Messaging

Contrato discriminado:

```ts
type ExtensionMessage =
  | { type: 'SESSION_REFRESH_REQUESTED' }
  | { type: 'BADGE_RECALCULATE_REQUESTED' }
  | { type: 'LEAD_CAPTURE_REQUESTED'; payload: LeadCapturePayload };
```

Validación runtime antes de procesar mensajes externos.

### Permisos

- `storage`;
- `alarms`;
- `notifications`;
- `sidePanel`;
- permisos de host solo necesarios;
- `optional_host_permissions` para capacidades opcionales.

No incluir permisos amplios por comodidad.

### Seguridad

- CSP estricta;
- cero código remoto;
- sanitización de contenido inyectado;
- content scripts mínimos;
- validar remitente y origen de mensajes;
- secretos nunca embebidos.

---

# Parte X - App móvil React Native + Expo
## 34. Stack móvil

```text
Expo SDK 56
React Native 0.85
React 19.2
Expo Router
TanStack Query
React Hook Form
Zod
Expo SecureStore
Expo SQLite
Expo Notifications
Expo Network
Sentry
Maestro
```

### UI

- React Native core;
- Expo UI cuando aporte un componente nativo estable;
- tokens TypeScript compartidos;
- componentes propios pequeños;
- no usar componentes web ni CSS DOM;
- no intentar replicar tablas de escritorio en móvil.

### Development Builds

Se usarán desde el inicio porque permiten:

- notificaciones reales;
- módulos nativos;
- configuración propia;
- pruebas E2E con app ID;
- comportamiento cercano a producción.

Expo Go queda para prototipos aislados, no como entorno principal.

---

## 35. Navegación móvil

Principios:

- tabs para áreas de uso diario;
- stack para detalle;
- modal solo para tareas breves;
- deep links estables;
- botón atrás coherente;
- estado de navegación no se usa como almacenamiento de datos;
- rutas protegidas por sesión.

Deep links:

```text
leadseed://leads/{id}
leadseed://tasks/{id}
leadseed://appointments/{id}
```

Las notificaciones solo contienen ruta e identificador mínimo.

---

## 36. Offline y conectividad

Implementación por niveles:

### Nivel 1 - caché de lectura

- TanStack Query;
- stale times por entidad;
- refetch al reconectar;
- pantalla offline clara.

### Nivel 2 - borradores

- notas no enviadas;
- formularios parcialmente completos;
- SQLite local;
- cifrado adicional si el riesgo lo requiere.

### Nivel 3 - cola de mutaciones

- operaciones idempotentes;
- estado `pending`, `syncing`, `failed`;
- reintento al reconectar;
- usuario puede revisar fallos.

### Nivel 4 - conflictos

Solo cuando haya necesidad real:

- version column;
- optimistic concurrency;
- política por entidad;
- no usar “último en escribir gana” indiscriminadamente.

No se promete funcionamiento offline completo para todo el CRM en la primera versión.

---

## 37. Notificaciones push

Modelo:

```text
user_devices
- id
- user_id
- workspace_id nullable
- platform
- installation_id
- push_token
- app_version
- last_seen_at
- revoked_at
```

Flujo:

1. app solicita permiso en contexto apropiado;
2. registra instalación/token;
3. backend decide destinatarios y preferencias;
4. worker envía;
5. registra delivery;
6. app abre deep link;
7. tokens inválidos se revocan.

No se envían push directamente desde otro cliente.

---

## 38. EAS y releases móviles

Perfiles:

```text
development
preview
production
```

Canales EAS Update:

```text
development
staging
production
```

Reglas:

- runtime version con fingerprint;
- OTA solo para JS/assets compatibles;
- cambios nativos requieren nueva build;
- TestFlight y Play Internal Testing antes de producción;
- versionado automático de build number;
- release notes obligatorias;
- rollback de OTA probado.

---

# Parte XI - Diseño, UX y sistema visual

## 39. Dirección visual oficial

El sistema visual mostrado en los mockups se adopta como dirección oficial de LeadSeed. La identidad buscada es **premium, minimalista, neutral y empresarial**, con alta legibilidad, densidad controlada y una presencia de marca reconocible sin depender de grandes superficies moradas.

La evaluación general es positiva por cinco razones:

1. la jerarquía se construye principalmente con espacio, escala y contraste;
2. la interfaz se siente seria y apta para un SaaS B2B;
3. el morado funciona como firma visual y no como festival cromático;
4. los modos claro y oscuro comparten estructura y comportamiento;
5. el patrón es suficientemente flexible para extensión, web y móvil, siempre que cada plataforma adapte su shell y su densidad.

La implementación no copiará píxeles de las imágenes. Los mockups son referencias de intención. La fuente de verdad serán los tokens, componentes, contratos de interacción y criterios de aceptación definidos en esta parte y en el **Apéndice N — Sistema visual premium v3**.

### 39.1 Principio rector

```text
NEUTROS PRIMERO.
MORADO COMO ACENTO.
COLOR SEMÁNTICO SÓLO CUANDO COMUNICA.
ESPACIO Y CONTRASTE ANTES QUE DECORACIÓN.
COMPARTIR TOKENS; ESPECIALIZAR COMPONENTES POR PLATAFORMA.
```

La interfaz debe evitar el aspecto de plantilla genérica de dashboard, el exceso de badges, las sombras profundas, el glassmorphism, los gradientes decorativos y la asignación de un color saturado diferente a cada métrica.

### 39.2 Decisiones visuales no negociables

- Inter como tipografía primaria; Geist o system-ui como fallback.
- Pesos habituales 400 y 500; 600 sólo para métricas o énfasis puntual.
- Bordes de 1 px.
- Radios de 12 a 16 px.
- Sombras casi imperceptibles en claro y normalmente ausentes en oscuro.
- Modo claro y oscuro basados en los mismos tokens semánticos.
- Iconografía monoline de una sola familia.
- Morado para marca, selección, foco y acción primaria.
- Verde para éxito o mejora; rojo para riesgo o error; ámbar para advertencia.
- Fuentes y canales de adquisición representados mediante una escala monocromática morada, no con colores oficiales de marcas externas.
- Todo gráfico debe poder comprenderse sin depender únicamente del color.
- Ninguna feature puede hardcodear colores, radios, sombras, tipografía o duraciones.

---

## 39.3 Arquitectura modular del design system

El sistema visual será un conjunto de paquetes independientes. No se creará un único paquete `ui` que acumule tokens, iconos, charts y componentes de todas las plataformas.

```text
packages/design-system/
├── tokens/
│   ├── src/
│   │   ├── primitives/
│   │   ├── semantic/
│   │   ├── themes/
│   │   ├── typography/
│   │   ├── motion/
│   │   ├── breakpoints/
│   │   └── data-visualization/
│   ├── generated/
│   │   ├── css/
│   │   ├── typescript/
│   │   └── native/
│   └── package.json
│
├── icons/
│   ├── src/
│   ├── scripts/
│   └── package.json
│
├── web/
│   ├── src/
│   │   ├── primitives/
│   │   ├── controls/
│   │   ├── feedback/
│   │   ├── navigation/
│   │   ├── data-display/
│   │   ├── layout/
│   │   └── patterns/
│   └── package.json
│
├── native/
│   ├── src/
│   │   ├── primitives/
│   │   ├── controls/
│   │   ├── feedback/
│   │   ├── navigation/
│   │   ├── data-display/
│   │   └── layout/
│   └── package.json
│
├── charts/
│   ├── src/
│   │   ├── contracts/
│   │   ├── formatters/
│   │   ├── palettes/
│   │   ├── web/
│   │   └── native/
│   └── package.json
│
└── testing/
    ├── src/
    │   ├── accessibility/
    │   ├── visual-regression/
    │   ├── fixtures/
    │   └── renderers/
    └── package.json
```

### Responsabilidad de cada paquete

| Paquete | Responsabilidad | No debe contener |
|---|---|---|
| `@leadseed/tokens` | Valores primitivos, semánticos, temas y contratos de datos visuales | JSX, DOM, React Native |
| `@leadseed/icons` | Catálogo y wrappers de iconografía | lógica de negocio, colores hardcodeados |
| `@leadseed/ui-web` | Componentes DOM para web y extensión | APIs de Chrome, queries de negocio |
| `@leadseed/ui-native` | Componentes React Native | HTML, CSS, navegación de una feature |
| `@leadseed/charts` | Contratos, formato y renderers de gráficos | consultas a Supabase |
| `@leadseed/design-testing` | helpers de accesibilidad, snapshots y fixtures visuales | componentes productivos |

### Reglas de dependencia

```text
features web/extension ──> ui-web ──> icons ──> tokens
features mobile        ──> ui-native ──> icons ──> tokens
features con gráficos  ──> charts ──> tokens
```

No se permiten estas dependencias:

```text
ui-web      ─X─> ui-native
ui-native   ─X─> ui-web
tokens      ─X─> React
charts      ─X─> Supabase
feature A   ─X─> componente interno de feature B
```

---

## 39.4 Fuente de verdad y flujo de tokens

Los tokens son la API visual del producto. Deben existir en una representación canónica tipada y generar salidas para CSS y React Native.

```text
Tokens canónicos
      │
      ├── CSS custom properties → web y extensión
      ├── objetos TypeScript    → charts y tooling
      └── objetos native        → React Native
```

### Capas de tokens

1. **Primitivos**: escalas crudas de color, espacio y tamaño.
2. **Semánticos**: intención, por ejemplo `text.primary` o `status.danger`.
3. **Componentes**: decisiones específicas, por ejemplo `button.primary.background`.
4. **Datos**: paletas para fuentes, etapas y series.

Las features sólo consumen tokens semánticos o de componentes. No consumen primitivas salvo dentro del propio design system.

Ejemplo conceptual:

```ts
export const lightTheme = {
  color: {
    canvas: "#F7F8FB",
    surface: "#FFFFFF",
    text: {
      primary: "#161A24",
      secondary: "#5B6475",
      muted: "#8C95A6",
    },
    border: {
      subtle: "#E6EAF0",
      strong: "#D7DCE5",
    },
    action: {
      primary: "#635BFF",
      primaryHover: "#574FE8",
      soft: "#F1EFFF",
    },
    status: {
      success: "#16B364",
      danger: "#F04461",
      warning: "#F59E0B",
    },
  },
} as const;
```

### Versionado de tokens

- cambios aditivos: minor;
- corrección visual compatible: patch;
- eliminación o cambio de significado: major;
- cada cambio relevante requiere Changeset;
- no renombrar tokens masivamente sin codemod o periodo de deprecación;
- la CI debe detectar tokens sin uso y valores hardcodeados en features.

---

## 39.5 Paleta oficial

### Modo claro

| Token | Valor | Uso |
|---|---|---|
| `ink` | `#161A24` | texto principal |
| `text-secondary` | `#5B6475` | explicación y labels |
| `muted` | `#8C95A6` | información terciaria |
| `canvas` | `#F7F8FB` | fondo general |
| `surface` | `#FFFFFF` | cards y menús |
| `surface-subtle` | `#FAFBFD` | bloques internos |
| `border` | `#E6EAF0` | bordes y divisores |
| `border-strong` | `#D7DCE5` | controles importantes |
| `brand` | `#635BFF` | acento principal |
| `brand-hover` | `#574FE8` | hover |
| `brand-active` | `#4D46D2` | pressed |
| `brand-soft` | `#F1EFFF` | selección suave |
| `focus-ring` | `#D9D4FF` | focus |
| `success` | `#16B364` | mejora o éxito |
| `danger` | `#F04461` | riesgo o error |
| `warning` | `#F59E0B` | advertencia |

### Modo oscuro

| Token | Valor | Uso |
|---|---|---|
| `canvas` | `#0F1117` | fondo principal |
| `canvas-glow` | `#0D1A2B` | halo ambiental tenue |
| `surface` | `#171B24` | cards |
| `surface-alt` | `#1F2430` | dropdowns y overlays |
| `surface-hover` | `#222836` | hover |
| `border` | `#2A3140` | bordes |
| `border-strong` | `#394255` | foco y separación |
| `text-primary` | `#F3F5F8` | texto principal |
| `text-secondary` | `#AAB3C2` | texto auxiliar |
| `muted` | `#7F899A` | texto terciario |
| `brand` | `#8A82FF` | acento principal |
| `brand-hover` | `#9A93FF` | hover |
| `brand-soft` | `#26214A` | selección suave |
| `success` | `#22C55E` | éxito |
| `danger` | `#FB7185` | error o alerta |
| `warning` | `#FBBF24` | advertencia |

### Proporción cromática

- 80–88% neutros;
- 8–15% morado;
- 2–5% semánticos.

El halo azul del modo oscuro pertenece al canvas. No debe repetirse dentro de cada card ni convertirse en neón.

---

## 39.6 Paletas para datos y gráficos

Las fuentes mantienen el orden canónico:

```text
Web → WhatsApp → LinkedIn → Formulario → Otros
```

| Fuente | Claro | Oscuro |
|---|---|---|
| Web | `#5B3FE5` | `#8A82FF` |
| WhatsApp | `#765FEA` | `#A099FF` |
| LinkedIn | `#9C88F1` | `#BAB4FF` |
| Formulario | `#C9BFF7` | `#D4D0FF` |
| Otros | `#DDE1E8` | `#596477` |

Reglas:

- no usar verde como identidad de WhatsApp;
- no usar azul como identidad de LinkedIn;
- los logos externos se renderizan en monocromo;
- cada serie debe tener label, valor y orden estable;
- la escala de color debe acompañarse con texto o patrón;
- el tooltip y la tabla accesible usan el mismo orden;
- las barras apiladas se ordenan de claro a oscuro de abajo hacia arriba: Formulario, LinkedIn, WhatsApp, Web.

---

## 39.7 Tipografía

Fuente principal: **Inter**.

| Token | Tamaño / línea | Peso | Uso |
|---|---:|---:|---|
| `section-header` | `18 / 24` | `500` | nombre junto al menú |
| `page-title` | `24 / 30` | `500` | página de detalle |
| `card-title` | `15 / 22` | `500` | card principal |
| `subcard-title` | `14 / 20` | `500` | card secundaria |
| `metric-hero` | `32 / 36` | `500` | KPI principal |
| `metric-lg` | `24 / 30` | `500` | KPI secundario |
| `body` | `14 / 20` | `400` | texto base |
| `body-sm` | `13 / 18` | `400` | auxiliar |
| `caption` | `12 / 16` | `400` | fechas y leyendas |
| `micro` | `11 / 14` | `400` | ejes compactos |

Reglas:

- evitar mayúsculas sostenidas;
- no usar 700–900 como lenguaje habitual;
- habilitar tabular numerals en métricas y tablas;
- alinear cifras comparables;
- respetar Dynamic Type en móvil dentro de límites diseñados;
- no fijar alturas que corten texto cuando aumenta la escala del sistema.

---

## 39.8 Espaciado, radios y densidad

Sistema basado en múltiplos de 4 px:

| Token | Valor |
|---|---:|
| `space-1` | `4 px` |
| `space-2` | `8 px` |
| `space-3` | `12 px` |
| `space-4` | `16 px` |
| `space-5` | `20 px` |
| `space-6` | `24 px` |
| `space-8` | `32 px` |
| `space-10` | `40 px` |

Radios:

| Token | Valor |
|---|---:|
| `radius-sm` | `8 px` |
| `radius-md` | `10 px` |
| `radius-control` | `12 px` |
| `radius-card-secondary` | `14 px` |
| `radius-card` | `16 px` |
| `radius-pill` | `999 px` |

Alturas web/extension:

| Componente | Altura |
|---|---:|
| Header | `72 px` |
| Fila de tabs | `52 px` |
| Botón | `40 px` |
| Dropdown | `40 px` |
| Icon button | `36 × 36 px` |
| Input | `40–44 px` |

En móvil, los controles táctiles deben ser de al menos 44 × 44 puntos aunque el contenido visual sea menor.

---

## 39.9 Shell por plataforma

El lenguaje visual es compartido; la estructura de navegación no se fuerza de manera idéntica.

### Extensión Chrome

- viewport objetivo: 360 px;
- mínimo: 320 px;
- máximo: 480 px (el usuario puede ensanchar el panel de Chrome);
- header superior con hamburguesa, nombre de sección, ayuda, notificaciones y avatar;
- no existe sidebar lateral permanente;
- tabs horizontales para submódulos relacionados;
- drawer superpuesto a ancho casi completo (`min(300px, 88vw)`) para navegación global;
- scroll vertical;
- padding lateral de 16 px, reducido a 12 px bajo 340 px;
- la marca no se repite en el header de trabajo.

### Web app

La web conserva el mismo lenguaje y componentes, pero puede ampliar el canvas:

- ancho de contenido con máximo legible y gutters fluidos;
- header persistente;
- navegación global mediante drawer o rail colapsable;
- una sidebar permanente sólo puede introducirse mediante ADR y pruebas de usabilidad cuando el número de módulos lo justifique;
- dashboards de dos columnas a partir de breakpoints amplios;
- tablas avanzadas y administración completa viven principalmente aquí;
- la densidad puede ser ligeramente mayor que en móvil, nunca mayor que en la extensión sin una variante explícita.

### App móvil React Native

No se copiará la pantalla de extensión dentro del teléfono.

- navegación inferior con máximo cinco destinos principales;
- stack para detalle y acciones;
- app bar nativa y safe areas;
- tarjetas en una sola columna;
- gráficos resumidos con acceso a detalle;
- acciones frecuentes en zona inferior alcanzable;
- filtros mediante sheets;
- navegación y gestos nativos;
- las secciones administrativas complejas se mantienen en web;
- el sistema visual usa los mismos tokens y semántica, no el mismo markup.

### Regla de marca

`LeadSeed` aparece en login, onboarding, recuperación, bienvenida y estados iniciales. En pantallas operativas, el header muestra el nombre de la sección.

---

## 39.10 Componentes y taxonomía

Los componentes se clasifican para evitar un paquete monolítico.

### Primitivos

- Text;
- Box/Stack;
- Divider;
- Icon;
- Surface;
- Pressable/Interactive;
- VisuallyHidden.

### Controles

- Button;
- IconButton;
- Input;
- TextArea;
- Select;
- Checkbox;
- Radio;
- Switch;
- DateRangeSelect;
- SearchField.

### Navegación

- AppHeader;
- ModuleTabs;
- Drawer;
- Breadcrumb/BackLink;
- BottomNavigation native;
- Pagination;
- ContextMenu.

### Feedback

- AlertBanner;
- Toast;
- InlineMessage;
- EmptyState;
- ErrorState;
- Skeleton;
- Progress;
- ConfirmationDialog.

### Data display

- Card;
- KpiCard;
- Metric;
- Badge semántico;
- DataTable web;
- ListItem native;
- SourceBreakdown;
- StageConversion;
- InsightsCard;
- Timeline;
- ActivityItem.

### Charts

- LineChart;
- BarChart;
- StackedBarChart;
- DonutChart;
- ProgressRing;
- ChartTooltip;
- ChartLegend;
- AccessibleDataTable.

### Patrones de negocio

Los patrones de negocio no viven en `ui-web` ni `ui-native`. Viven en paquetes de presentación por módulo y componen primitivos del design system:

```text
presentation/web-crm/LeadSummaryCard
presentation/web-tasks/UrgentTasksPanel
presentation/native-crm/LeadActionSheet
```

Esto evita que el design system conozca conceptos como lead, campaña o workspace.

---

## 39.11 Contratos de componentes

Todos los componentes públicos deben tener:

- API tipada;
- estados default, hover, active, focus, disabled, loading y error cuando correspondan;
- soporte de claro y oscuro;
- accesibilidad por defecto;
- documentación de cuándo usar y cuándo no usar;
- ejemplos de densidad;
- pruebas de interacción;
- historia visual;
- política de deprecación.

Ejemplo conceptual:

```ts
export interface KpiCardProps {
  label: string;
  value: string | number;
  comparison?: {
    direction: "up" | "down" | "neutral";
    value: string;
    semantic: "positive" | "negative" | "neutral";
  };
  icon?: IconName;
  loading?: boolean;
  onPress?: () => void;
}
```

`KpiCard` no conoce datos, queries ni reglas de conversión. La feature prepara el view model.

---

## 39.12 Cards y superficies

### Card principal

- fondo `surface`;
- borde `border` de 1 px;
- radio 16 px;
- padding 20–24 px;
- sombra clara mínima;
- sin sombra habitual en oscuro.

### Card secundaria

- radio 14 px;
- padding 16–20 px;
- sin sombra si el borde resuelve la separación.

### KPI card

```text
[icono] Label
        Métrica
        Comparación
```

- icono neutro o brand-soft;
- métrica en texto primario;
- comparación con semántica;
- no usar un color diferente por KPI.

### Alertas

El patrón de tareas vencidas debe usar rojo de forma contenida:

- borde y fondo soft;
- icono y métrica en rojo;
- texto explicativo mayoritariamente neutro;
- no usar resplandor, gradiente o card completa saturada;
- una alerta con valor cero puede reducir intensidad visual para no competir con problemas reales.

---

## 39.13 Botones, formularios y overlays

### Botón primario

- alto 40 px web y 44–48 puntos native;
- radio 12 px;
- fondo brand;
- texto blanco;
- icono 16–18 px;
- loading sin cambiar ancho.

### Secundario

- fondo surface o transparente;
- borde fino;
- texto primario;
- hover mínimo.

### Destructivo

- rojo sólo en la acción confirmada;
- confirmación para acciones irreversibles;
- no convertir un modal completo en rojo.

### Inputs y selectores

- labels visibles cuando aportan contexto;
- placeholder no sustituye label;
- errores junto al campo;
- foco visible;
- teclado y autofill adecuados;
- máscaras sólo si no impiden pegar o usar tecnologías asistivas.

### Drawer, sheet y modal

- drawer web/extension: 200–240 ms;
- bottom sheet móvil para filtros y acciones contextuales;
- focus trap en web;
- cierre con Escape y botón explícito;
- restaurar foco al elemento invocador;
- respetar reduced motion.

---

## 39.14 Gráficos y analítica

Los gráficos son componentes informativos, no decorativos.

### Reglas generales

- sin 3D;
- sin arcoíris;
- sin sombras gruesas;
- sin neón;
- gridlines suaves;
- labels cortos;
- formato numérico consistente;
- tooltips compactos;
- tabla o resumen alternativo;
- animación breve y desactivable.

### Línea

- serie principal morada de 2 px;
- puntos de 6–8 px;
- área inferior opcional al 6–10%;
- comparación secundaria neutra.

### Barras

- una serie: un morado;
- radio superior 4–6 px;
- mismo color por mes;
- hover por luminancia, no por cambio de identidad.

### Barras apiladas

- paleta de fuentes oficial;
- orden fijo;
- tooltip con breakdown y total;
- leyenda visible;
- separadores internos discretos.

### Donut

- máximo 4–5 categorías;
- grosor de 18–24% del diámetro;
- leyenda a la derecha en web y debajo en móvil;
- sin separación exagerada;
- categoría principal con tono más oscuro.

### Formato y exactitud

- porcentajes calculados por dominio/application, no por el componente;
- el renderer no infiere métricas de negocio;
- redondeo documentado;
- valores ausentes se distinguen de cero;
- fechas y periodos usan zona horaria explícita;
- exportación PDF y pantalla deben consumir el mismo view model.

---

## 39.15 Motion

| Interacción | Duración |
|---|---:|
| Hover | 160 ms |
| Focus | 120–160 ms |
| Tooltip | 120–160 ms |
| Dropdown | 160–180 ms |
| Tab | 180–220 ms |
| Drawer | 200–240 ms |
| Modal/Sheet | 200–240 ms |

Curvas:

- hover: `ease-out`;
- tabs: `ease-in-out`;
- drawer: `cubic-bezier(.2,.8,.2,1)`.

No usar bounce, overshoot, parallax o animaciones permanentes. `prefers-reduced-motion` y la configuración equivalente móvil desactivan transiciones no esenciales.

---

## 39.16 Accesibilidad

Estándar mínimo: WCAG 2.2 AA para web/extensión y equivalentes de plataforma en móvil.

- contraste normal mínimo 4.5:1;
- texto grande mínimo 3:1;
- focus visible de 2 px;
- navegación completa por teclado;
- targets de al menos 36 × 36 px en extensión y 44 × 44 puntos en móvil;
- icon buttons con nombre accesible;
- tab activa con `aria-current` o patrón ARIA apropiado;
- feedback relevante mediante regiones live;
- no depender sólo del color;
- lectura lógica del DOM;
- VoiceOver y TalkBack;
- Dynamic Type;
- soporte de zoom y reflow;
- tablas y gráficos con alternativa textual.

Todo componente del design system debe pasar accesibilidad antes de ser usado por una feature.

---

## 39.17 Storybook, catálogo y documentación

Se añadirá una aplicación de catálogo:

```text
apps/storybook/
├── .storybook/
├── stories/
├── docs/
└── package.json
```

Debe documentar:

- foundations;
- tokens;
- modos claro y oscuro;
- todos los estados de cada componente;
- densidades;
- accesibilidad;
- contenido largo;
- números grandes;
- textos traducidos;
- loading, empty y error;
- viewport de extensión;
- breakpoints web.

Para React Native se mantendrá un catálogo de desarrollo dentro de `apps/mobile` o una app independiente cuando el volumen lo justifique. No se publicará en producción.

Cada historia crítica se convierte en contrato visual y participa en regresión de screenshots.

---

## 39.18 Pruebas del sistema visual

### Unitarias

- funciones de tema;
- formatos;
- mapeo semántico;
- orden de series;
- contrast helpers;
- variantes.

### Interacción

- teclado;
- foco;
- disabled;
- loading;
- apertura y cierre de overlays;
- callbacks.

### Accesibilidad automática

- axe para Storybook y páginas web;
- validación de nombres accesibles;
- auditoría de contraste;
- pruebas de reduced motion.

### Regresión visual

Matriz mínima:

```text
modo: claro / oscuro
viewport: extensión 320 / 360 / 480
web: 1024 / 1280 / 1440
estado: default / hover / focus / loading / error / empty
```

Los cambios de screenshot deben ser revisados, no aceptados automáticamente.

### Móvil

- snapshots sólo para estructuras estables;
- pruebas en tamaños pequeños y grandes;
- Android e iOS;
- escala de fuente normal y ampliada;
- orientación soportada;
- safe areas;
- teclado abierto.

---

## 39.19 Gobernanza del design system

### Propiedad

- el design system tiene CODEOWNERS;
- cambios en tokens o componentes públicos requieren revisión;
- nuevas variantes necesitan caso de uso real;
- no se agrega una prop booleana por cada excepción;
- la composición se prefiere sobre componentes gigantes.

### Proceso para crear un componente

1. identificar patrón repetido en al menos dos consumidores o una necesidad transversal clara;
2. definir contrato y estados;
3. validar accesibilidad;
4. implementar web o native según corresponda;
5. crear historias y pruebas;
6. documentar uso y antipatrones;
7. publicar changeset;
8. migrar consumidores gradualmente.

### Proceso de deprecación

1. marcar API como deprecated;
2. documentar reemplazo;
3. ofrecer codemod cuando el cambio sea amplio;
4. mantener al menos un ciclo compatible;
5. retirar en major version.

---

## 39.20 Reglas para las features

Una feature puede:

- componer componentes públicos;
- crear patrones específicos del dominio;
- definir layouts locales;
- mapear view models a props;
- solicitar una extensión del design system mediante ADR ligero.

Una feature no puede:

- copiar el código de un componente compartido;
- hardcodear HEX o spacing;
- importar internals del design system;
- modificar CSS global;
- crear su propia familia de iconos;
- implementar otro modal, toast o dropdown sin justificación;
- mezclar queries con componentes visuales básicos;
- usar colores semánticos para categorías neutrales.

---

## 39.21 Patrones oficiales por pantalla

### Overview

Resumen ejecutivo con:

- progreso de metas;
- conversión global;
- rendimiento del día;
- alertas;
- fuentes principales;
- conversión por etapa;
- hallazgos.

Debe resumir y enlazar, no duplicar reportes completos.

### Pipeline

- embudo;
- total de leads;
- tasa de conversión;
- adquisición mensual;
- enlaces a detalle.

### Tareas

- vencidas/urgentes;
- para hoy;
- eficiencia histórica;
- filtros;
- acceso a lista.

El rojo pertenece únicamente a vencidas o riesgo real.

### Reporte de adquisición

- back link;
- título y periodo;
- KPIs;
- gráfico principal;
- desglose por fuente;
- hallazgos;
- conversión por etapa;
- rendimiento por canal;
- exportar y compartir.

Las exportaciones deben conservar tipografía, orden y semántica, pero pueden usar un layout específico de documento.

---

## 39.22 Migración visual del proyecto existente

La migración visual será incremental. No se debe rediseñar toda la extensión en una rama gigante.

### Etapa A — Foundations

- incorporar tokens;
- configurar temas;
- unificar tipografía;
- integrar iconos;
- eliminar colores hardcodeados nuevos;
- montar Storybook.

### Etapa B — Primitivos

- Button;
- IconButton;
- Input;
- Select;
- Card;
- Text;
- Stack;
- Divider;
- Toast;
- Dialog/Sheet.

### Etapa C — Shell

- AppHeader;
- ModuleTabs;
- Drawer;
- DateRangeSelect;
- estructura de modo claro/oscuro.

### Etapa D — Primera vertical visual

Migrar Overview de extremo a extremo y usarla como referencia de aceptación.

### Etapa E — Pipeline y Tareas

Migrar reutilizando los mismos componentes, sin forks visuales.

### Etapa F — Resto del producto

- leads;
- agenda;
- comunicaciones;
- configuración;
- administración.

Las pantallas antiguas pueden coexistir temporalmente detrás de rutas o feature flags. No se mezclan tokens antiguos y nuevos dentro de un mismo componente.

---

## 39.23 Criterios de aceptación visual

Una pantalla se considera adaptada cuando:

1. utiliza exclusivamente tokens públicos;
2. funciona en claro y oscuro;
3. respeta shell y navegación de su plataforma;
4. tiene estados loading, empty, error y permiso denegado;
5. pasa accesibilidad automática y revisión de teclado o lector;
6. no depende sólo del color;
7. no introduce una variante innecesaria;
8. aparece en catálogo o Storybook;
9. tiene screenshots aprobados en viewports relevantes;
10. mantiene consistencia con Overview, Pipeline y Tareas;
11. no importa infraestructura o queries dentro de componentes del design system;
12. puede ser mantenida por otra IA sin inventar reglas nuevas.

---

## 39.24 Referencias visuales canónicas

Los siguientes archivos deben conservarse en `docs/design/references/` y utilizarse como referencias, no como especificaciones pixel-perfect:

```text
acquisition-report-light-bars.png
acquisition-report-light-stacked.png
acquisition-report-dark.png
overview-dark.png
overview-light.png
pipeline-dark.png
pipeline-light.png
tasks-dark.png
tasks-light.png
```

La especificación textual prevalece cuando una imagen contenga inconsistencias, por ejemplo logo duplicado en headers de trabajo, fecha diferente o variaciones experimentales de iconos.

---

# Parte XII - Convenciones de código
## 40. TypeScript

Configuración base:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true
  }
}
```

Reglas:

- prohibido `any` salvo wrapper documentado de librería externa;
- `unknown` y validación en boundaries;
- evitar type assertions;
- exhaustive checks para unions;
- IDs con aliases/branded types donde evite errores;
- DTO separados de entidades;
- fechas como ISO en contratos y objetos Date/controlados internamente;
- no exportar tipos internos por accidente.

---

## 41. Nombres y archivos

| Elemento | Convención |
|---|---|
| carpetas/archivos TS no componentes | kebab-case |
| componentes | PascalCase.tsx |
| hooks | useNombre.ts |
| pruebas | archivo.test.ts(x) |
| E2E | flujo.spec.ts o `.yaml` Maestro |
| SQL | snake_case |
| eventos | contexto.entidad.acción.vN |
| paquetes | `@leadseed/<grupo>-<nombre>` |

Guías de tamaño, no límites ciegos:

- componente ideal menor a 200 líneas;
- archivo de dominio menor a 250;
- función ideal menor a 40;
- más de 300 líneas exige revisión de responsabilidad;
- más de 500 líneas requiere plan de extracción al tocarlo.

---

## 42. Diseño de funciones y componentes

- una razón de cambio;
- entradas explícitas;
- efectos secundarios aislados;
- early returns;
- no boolean flags ambiguos;
- preferir objetos de parámetros para operaciones complejas;
- composición sobre herencia;
- no crear utilitarios genéricos antes de tener dos usos reales;
- no usar barrel files internos que generen ciclos;
- `index.ts` solo como API pública del paquete.

### Componentes

- componentes de presentación no consultan Supabase;
- container/hook invoca caso de uso/query;
- estados loading/error/empty/success explícitos;
- lógica de negocio fuera de JSX;
- no almacenar props derivables en estado;
- memoización solo cuando perfil o React Compiler lo justifique.

---

## 43. Documentación de paquetes

Cada paquete debe tener README con:

1. responsabilidad;
2. qué contiene;
3. qué no contiene;
4. API pública;
5. dependencias permitidas;
6. ejemplos;
7. comandos de pruebas;
8. dueño lógico;
9. ADR relacionadas.

---

# Parte XIII - Entornos
## 44. Matriz de ambientes

| Ambiente | Backend | Datos | Web | Extensión | Móvil |
|---|---|---|---|---|---|
| local | Supabase Docker | seed sintético | localhost | unpacked | dev build |
| preview PR | Supabase Branch | sintético | URL preview | build artefacto | opcional/noche |
| staging | proyecto/branch estable | sintético controlado | staging | beta interna | TestFlight/Internal |
| production | proyecto productivo | real | producción | Chrome Store | tiendas |

### Alternativa si Supabase Branching no está disponible

- tres proyectos Supabase separados: dev, staging, prod;
- migraciones idénticas;
- credenciales separadas;
- scripts para aplicar y verificar.

### Datos

- nunca copiar datos reales completos a local;
- fixtures ficticios;
- anonimizaciones solo con procedimiento aprobado;
- cuentas E2E dedicadas;
- limpieza periódica de preview.

---

## 45. Variables de entorno

Archivos de ejemplo:

```text
.env.example
apps/web/.env.example
apps/extension/.env.example
apps/mobile/.env.example
```

Clientes:

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SENTRY_DSN
APP_ENV
```

Backend:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
RESEND_API_KEY
GOOGLE_CLIENT_SECRET
SENTRY_DSN
```

Reglas:

- schema de env validado al iniciar;
- nombres prefijados según bundler;
- no valores por defecto peligrosos;
- CI usa environments de GitHub;
- producción requiere aprobación;
- claves de plataforma separadas por ambiente.

---

## 46. Desarrollo local

Requisitos:

- Node 24 LTS;
- Corepack/pnpm;
- Docker Desktop;
- Supabase CLI;
- Android Studio para emulador;
- Xcode o EAS para iOS;
- extensiones recomendadas de VS Code.

Comandos objetivo:

```bash
pnpm install
pnpm db:start
pnpm db:reset
pnpm dev:web
pnpm dev:extension
pnpm dev:mobile
pnpm test
pnpm verify
```

`pnpm verify` ejecuta:

```text
format:check
lint
typecheck
test:unit
test:db
build
```

---

# Parte XIV - Git y colaboración con IA
## 47. Estrategia de ramas

Trunk-based development:

```text
main
├── feat/crm-lead-status
├── feat/mobile-login
├── fix/extension-session-storage
├── refactor/crm-repository
└── chore/supabase-migrations
```

No mantener `develop`, `dev` y `master` paralelas.

> **Estado al `2026-08-19`:** el repositorio tiene `develop`, `master` y `design`, y ese día se
> alinearon las tres en el mismo commit. Estando idénticas, consolidar en una sola rama es hoy
> trivial; conviene hacerlo antes de que vuelvan a divergir. Llegaron a estar 104 commits atrás.

Reglas:

- ramas menores a pocos días;
- una tarea por rama;
- rebase sobre main antes de PR;
- squash merge;
- eliminar rama tras merge;
- tags/releases desde main;
- hotfix también pasa por PR salvo emergencia documentada.

---

## 48. Git worktrees para agentes

Ejemplo:

```text
C:\Proyectos\
├── leadseed-main\
├── leadseed-mobile-login\
├── leadseed-web-dashboard\
└── leadseed-extension-auth\
```

Cada IA:

- una carpeta;
- una rama;
- una tarea;
- sin cambiar de rama en un worktree ajeno;
- no toca archivos no asignados sin comunicarlo.

---

## 49. Commits y pull requests

Conventional Commits:

```text
feat(crm): add lead status transition use case
fix(extension): persist auth session in chrome storage
refactor(scheduling): split appointment repository
chore(deps): update Expo SDK patch
```

PR debe incluir:

- problema;
- solución;
- contexto afectado;
- capturas cuando hay UI;
- migraciones;
- riesgos;
- pruebas;
- rollback;
- checklist de seguridad.

CODEOWNERS por áreas cuando exista equipo.

---

## 50. Archivo `AGENTS.md`

Debe contener:

- mapa del repo;
- comandos;
- reglas de dependencia;
- “no tocar”;
- proceso de migraciones;
- política de secretos;
- definición de terminado;
- plantilla de entrega.

Cada app o paquete complejo puede tener `AGENTS.md` local con reglas adicionales, sin contradecir la raíz.

---

# Parte XV - Calidad y pruebas
## 51. Pirámide de pruebas

### Dominio y aplicación

- Vitest;
- reglas de estados;
- permisos;
- validaciones;
- casos de uso;
- idempotencia;
- errores esperados.

### UI web

- React Testing Library;
- interacción por roles accesibles;
- componentes críticos;
- estados de query.

### UI móvil

- Jest/React Native Testing Library;
- flujos de pantalla;
- validación y acciones;
- accesibilidad;
- escalado de fuente, safe areas y teclado.

### Design system y regresión visual

- Storybook para foundations, componentes y patrones web/extension;
- catálogo native de desarrollo;
- pruebas de interacción de historias;
- axe sobre historias y páginas críticas;
- screenshots en claro/oscuro y viewports definidos;
- revisión humana obligatoria de diffs visuales;
- detección de colores, spacing y tipografía hardcodeados fuera del design system.

### Backend

- pgTAP para esquema, constraints, índices y RLS;
- Deno tests para Edge Functions;
- integración con Supabase local;
- contract tests para repositorios.

### E2E web

- Playwright;
- Chromium, WebKit y Firefox para flujos críticos;
- traces y screenshots en fallo.

### E2E extensión

- Playwright con contexto persistente y extensión cargada;
- side panel;
- login;
- badge;
- almacenamiento;
- mensajes al worker.

### E2E móvil

- Maestro;
- Android e iOS;
- login;
- leads;
- tareas;
- agenda;
- deep link;
- push en entorno controlado.

---

## 52. Flujos críticos obligatorios

1. usuario inicia sesión;
2. no puede ver otro workspace;
3. crea un lead;
4. actualiza estado;
5. agrega nota;
6. crea tarea;
7. crea cita;
8. programa correo;
9. worker envía una sola vez;
10. recibe notificación y abre la entidad;
11. revoca sesión;
12. administrador actúa con auditoría;
13. shell, navegación y componentes críticos funcionan en claro y oscuro;
14. Overview, Pipeline y Tareas pasan regresión visual y accesibilidad.

Estos flujos bloquean releases si fallan.

---

## 53. Cobertura

No perseguir porcentaje sin valor. Objetivos sugeridos:

- dominio/application: alta cobertura de ramas críticas, meta 85%+;
- adaptadores: contract/integration tests;
- UI: cubrir flujos y estados, no markup trivial;
- RLS: matriz completa para tablas expuestas;
- funciones críticas: éxito, auth, validación, retry e idempotencia.

La cobertura nunca reemplaza E2E ni revisión.

---

## 54. Test data

```text
tooling/fixtures/
├── workspaces.ts
├── users.ts
├── leads.ts
├── tasks.ts
└── appointments.ts
```

- builders determinísticos;
- IDs conocidos;
- no PII real;
- seed mínimo y rápido;
- escenarios: owner, admin, member, viewer y usuario externo.

---

# Parte XVI - CI/CD
## 55. Workflows de GitHub Actions

```text
.github/workflows/
├── ci.yml
├── database.yml
├── web-preview.yml
├── extension-build.yml
├── mobile-preview.yml
├── deploy-staging.yml
├── release-web.yml
├── release-extension.yml
├── release-mobile.yml
├── security.yml
└── scheduled-maintenance.yml
```

### `ci.yml` en pull request

1. checkout;
2. configurar Node/pnpm;
3. instalar con lockfile congelado;
4. validar generación y consistencia de tokens;
5. validar formato;
6. lint y detección de estilos hardcodeados fuera del design system;
7. typecheck;
8. unit e integration tests;
9. construir Storybook y ejecutar pruebas de interacción;
10. ejecutar accesibilidad automática;
11. generar regresión visual cuando cambien componentes o pantallas;
12. builds afectados;
13. subir reportes y artifacts.

### `database.yml`

1. iniciar Supabase local;
2. `db reset`;
3. generar tipos;
4. detectar diff no comprometido;
5. pgTAP;
6. tests de Edge Functions;
7. lint SQL cuando aplique.

### Preview

- web preview por PR;
- Storybook preview por PR con diff visual;
- Supabase preview branch cuando sea viable;
- extension zip como artifact;
- screenshots de extensión en 320, 360 y 480 px para cambios visuales;
- mobile preview build solo para PR etiquetado o nightly, por costo/tiempo.

---

## 56. Pipeline de producción

Orden recomendado:

1. PR aprobado y verde;
2. despliegue staging;
3. smoke tests;
4. aprobación manual;
5. migración expand-compatible;
6. Edge Functions;
7. web;
8. extensión/móvil según release;
9. smoke producción;
10. monitoreo reforzado.

No desplegar código que requiera un esquema todavía no aplicado. Mantener compatibilidad durante rollout.

---

## 57. Releases independientes

- web: release por Git SHA y versión semántica de producto;
- extensión: `manifest.version` semántica;
- móvil: versión pública + build number;
- backend: migration version + commit SHA;
- eventos: versión en nombre/payload;
- paquetes internos: changesets cuando amerite.

### Rollback

- web: redeploy artefacto anterior;
- móvil JS: EAS Update rollback si runtime compatible;
- binario móvil: nueva build o control de feature flag;
- extensión: publicar corrección con versión superior;
- base: forward-fix y feature flags; nunca confiar en rollback destructivo improvisado.

---

# Parte XVII - Seguridad
## 58. Estándares

- OWASP ASVS 5 nivel 2 como baseline web/backend;
- OWASP MASVS para móvil;
- threat modeling STRIDE por flujo crítico;
- principio de mínimo privilegio;
- defense in depth.

---

## 59. Controles obligatorios

### Repositorio

- secret scanning y push protection;
- Dependabot;
- CodeQL donde esté disponible;
- lockfile;
- acciones GitHub fijadas a SHA o versiones confiables;
- no scripts de paquetes no autorizados.

### Aplicaciones

- CSP;
- sanitización HTML;
- protección XSS;
- validación runtime;
- sin claves secretas;
- manejo seguro de URLs y deep links;
- rate limiting en endpoints públicos;
- logs sin PII.

### Backend

- RLS;
- grants mínimos;
- esquemas privados;
- `SECURITY DEFINER` auditado;
- secretos en vault/env;
- idempotencia;
- CORS;
- verificación de webhooks;
- replay protection;
- backups y restore drills.

### Móvil

- SecureStore;
- no secretos en bundle;
- detección de dispositivo comprometido solo como señal, no garantía;
- capturas de pantalla restringidas solo en pantallas realmente sensibles si corresponde;
- deep links validados;
- datos offline mínimos.

---

## 60. Privacidad y ciclo de vida

LeadSeed maneja datos personales de prospectos. Debe existir:

- inventario de datos;
- finalidad por campo;
- minimización;
- retención por categoría;
- exportación;
- corrección;
- eliminación/anominización según política;
- registro de consentimientos cuando corresponda;
- acuerdos con proveedores;
- proceso de incidente.

No guardar cuerpo completo de comunicaciones indefinidamente sin necesidad definida.

---

# Parte XVIII - Observabilidad y operación
## 61. Sentry

Proyectos separados o etiquetas claras para:

- web;
- extensión;
- Android;
- iOS;
- Edge Functions.

Configurar:

- releases con Git SHA;
- source maps privados;
- environment;
- traces muestreadas;
- breadcrumbs redactados;
- user ID interno, no email como identificador principal;
- performance de rutas críticas.

---

## 62. Logging estructurado

Formato mínimo:

```json
{
  "timestamp": "...",
  "level": "info",
  "service": "communications-send-email",
  "environment": "production",
  "requestId": "...",
  "correlationId": "...",
  "workspaceId": "...",
  "event": "email.delivery.completed",
  "durationMs": 123,
  "result": "success"
}
```

No registrar:

- tokens;
- passwords;
- cuerpo completo de correos;
- RUT completo;
- teléfono completo;
- archivos;
- secretos de proveedor.

---

## 63. Métricas y alertas

Métricas iniciales:

- tasa de error por app;
- crash-free sessions;
- latencia p50/p95/p99;
- consultas lentas;
- queue lag;
- jobs fallidos;
- mensajes enviados/entregados/fallidos;
- push inválidos;
- Realtime reconnects;
- cron omitido;
- usuarios activos;
- tamaño de tablas;
- uso de conexiones.

Alertas:

- error rate sobre umbral;
- worker sin consumo;
- cola acumulada;
- email provider degradado;
- DB CPU/conexiones;
- fallos de login;
- incremento de 403/429;
- migración fallida.

---

## 64. Audit log

Registrar acciones sensibles:

- cambios de rol;
- acceso de soporte;
- exportación;
- eliminación;
- cambio de canal;
- reintento de envío;
- cambios de suscripción;
- impersonation o supervisión;
- modificaciones administrativas.

Campos:

```text
actor_user_id
actor_type
workspace_id
action
entity_type
entity_id
before jsonb redactado
after jsonb redactado
request_id
ip_hash
user_agent_summary
created_at
```

El audit log no debe ser editable por clientes.

---

## 65. Runbooks

Crear desde el inicio:

- credencial expuesta;
- proveedor de correo caído;
- Google Calendar desincronizado;
- queue atascada;
- migración fallida;
- incidente RLS;
- restauración de backup;
- rollback web;
- rollback EAS Update;
- extensión defectuosa publicada;
- aumento de errores tras release.

Cada runbook incluye detección, impacto, contención, recuperación y postmortem.

---

# Parte XIX - Rendimiento y escalabilidad
## 66. Base de datos

- índices por consultas reales;
- `workspace_id` primero en índices tenant-scoped;
- índices para foreign keys y RLS;
- EXPLAIN ANALYZE en consultas críticas;
- no N+1;
- RPC para agregados;
- paginación cursor-based;
- límites máximos;
- archivado/particionado de logs de alto volumen;
- snapshots para dashboard si el costo lo justifica;
- connection pooler adecuado para Edge Functions.

---

## 67. Web y extensión

- lazy loading;
- dividir administración/reportes;
- virtualización de listas solo después de medir;
- imágenes optimizadas;
- evitar renders globales por Context;
- React Query select para reducir datos;
- budgets de bundle;
- worker ligero;
- no polling agresivo si existe evento;
- cancelar requests obsoletas.

---

## 68. Móvil

- FlatList con keys estables;
- paginación;
- memoización medida;
- imágenes con tamaños definidos;
- evitar grandes objetos en navegación;
- no bloquear thread JS;
- SQLite en transacciones;
- minimizar suscripciones Realtime activas;
- AppState para pausar/reanudar;
- profiling antes de introducir librerías de optimización.

---

## 69. Umbrales para revisar arquitectura

Evaluar extracción o rediseño cuando ocurra alguno:

- tabla supera volumen que degrada consultas pese a índices;
- queue lag sostenido;
- un módulo requiere deploy independiente por frecuencia/riesgo;
- integración externa consume la mayoría de recursos;
- equipo independiente necesita ownership;
- cumplimiento exige aislamiento;
- Edge Functions no cumplen tiempo/recursos;
- disponibilidad de una función no debe afectar otra.

No crear microservicios solo porque el repositorio tenga muchas carpetas.

---

# Parte XX - Documentación y decisiones
## 70. Documentos raíz

```text
README.md           # empezar y comandos
ARCHITECTURE.md     # mapa corto y enlaces
CONTRIBUTING.md     # flujo de trabajo
SECURITY.md         # reporte y reglas
AGENTS.md           # contrato para IA
```

### `docs/architecture`

- system-context.md;
- container-diagram.md;
- dependency-rules.md;
- platform-adapters.md;
- data-flow.md;
- background-jobs.md.

### `docs/data`

- data-dictionary.md;
- rls-matrix.md;
- retention.md;
- migration-guide.md.

### `docs/adr`

Formato:

```text
ADR-0001-use-monorepo.md
ADR-0002-use-expo-for-mobile.md
ADR-0003-supabase-as-backend.md
ADR-0004-workspace-tenancy.md
ADR-0005-outbox-and-queues.md
```

Cada ADR: contexto, decisión, alternativas, consecuencias y estado.

---

# Parte XXI - Plan de ejecución por fases
## 71. Fase 0 - Seguridad y congelamiento

Objetivo: preservar y certificar el estado actual.

Tareas:

- rotar credenciales expuestas;
- sacar `.env.local` de Git;
- guardar PEM cifrado fuera del repo;
- identificar rama funcional;
- consolidar cambios;
- build limpio;
- smoke manual;
- tag `legacy-stable-*`;
- backup del repositorio y Supabase schema.

Criterio de salida:

- extensión actual instalable y probada;
- secretos rotados;
- respaldo recuperable.

---

## 72. Fase 1 - Bootstrap del monorepo

Tareas:

- crear nuevo GitHub repo;
- Node/pnpm/Turbo;
- configs TypeScript/ESLint/Prettier;
- CI básico;
- AGENTS/README/CONTRIBUTING;
- branch protection;
- secret scanning;
- crear la estructura mínima de `packages/design-system`;
- configurar tokens, temas claro/oscuro y Storybook;
- copiar las referencias visuales oficiales a `docs/design/references`;
- copiar extensión sin `.git`, builds ni secretos.

Criterio de salida:

- `pnpm install` limpio;
- `pnpm build --filter extension` funciona;
- `pnpm build --filter storybook` funciona;
- tokens se generan sin diff pendiente;
- extensión conserva comportamiento.

---

## 73. Fase 2 - Normalización Supabase

Tareas:

- mover migraciones a convención;
- resolver prefijos duplicados;
- alinear con esquema remoto;
- crear seed;
- `db reset` reproducible;
- generar tipos;
- tests pgTAP iniciales;
- revisar `SECURITY DEFINER`;
- documentar Realtime, Storage y Auth.

Criterio de salida:

- base local completa desde cero;
- no cambios manuales no versionados;
- matriz RLS inicial verde.

---

## 74. Fase 3 - Plataforma y adapters

Extraer contratos:

- StorageAdapter;
- NotificationAdapter;
- LinkAdapter;
- AuthStorageAdapter;
- NetworkAdapter;
- FileAdapter;
- ClipboardAdapter;
- Download/ShareAdapter.

Implementar primero para extensión.

Criterio de salida:

- código compartido no importa `chrome.*`;
- sesión del worker persistente;
- pruebas de adapters.

---

## 75. Fase 4 - Primera vertical: CRM Leads

Migrar:

- tipos;
- validaciones;
- repositorio;
- servicios a casos de uso;
- query keys;
- pantallas web/extension existentes;
- pruebas.

Criterio de salida:

- crear/listar/ver/cambiar estado/agregar nota funciona;
- extension consume módulo nuevo;
- no regresiones.

Esta vertical se usa como plantilla para los demás módulos.

---

## 76. Fase 5 - Web MVP

Crear shell web y reutilizar presentación web.

Módulos:

- shell visual oficial y navegación accesible;
- auth;
- Overview como vertical visual de referencia;
- dashboard básico;
- leads;
- tareas;
- agenda.

Criterio de salida:

- web staging funcional;
- E2E críticos;
- error tracking;
- responsive;
- claro/oscuro;
- regresión visual y accesibilidad de rutas críticas.

---

## 77. Fase 6 - Base móvil

Tareas:

- Expo SDK estable;
- Development Build;
- Router;
- auth/deep links;
- SecureStore;
- Query Client;
- Sentry;
- tokens y primitives;
- CI/EAS preview.

Criterio de salida:

- login real Android/iOS;
- sesión persistente;
- logout;
- navegación base;
- build interna.

---

## 78. Fase 7 - Móvil por verticales

Orden:

1. leads list/detail;
2. notas y estado;
3. tareas;
4. agenda;
5. notificaciones;
6. acciones de comunicación;
7. plantillas rápidas;
8. offline drafts.

Cada vertical exige:

- UI;
- caso de uso compartido;
- pruebas unitarias;
- Maestro smoke;
- analítica/errores;
- documentación.

---

## 79. Fase 8 - Jobs backend

Mover del cliente:

- correos programados;
- recordatorios;
- mantenimiento;
- Google sync;
- reintentos.

Implementar outbox/queues/idempotencia.

Criterio de salida:

- trabajos funcionan con apps cerradas;
- observabilidad y dead-letter;
- prueba de duplicación.

---

## 80. Fase 9 - Multi-tenancy

Aplicar expand/migrate/contract:

- workspaces;
- memberships;
- workspace_id;
- RLS;
- suscripciones por workspace;
- migración de usuarios actuales.

Criterio de salida:

- aislamiento probado;
- usuario puede cambiar workspace;
- roles y límites correctos.

---

## 81. Fase 10 - Endurecimiento y lanzamiento

- ASVS/MASVS checklist;
- load tests;
- performance advisor;
- restore drill;
- app store assets/policies;
- runbooks;
- alertas;
- beta cerrada;
- rollout progresivo.

---

# Parte XXII - Definición de terminado
## 82. Definition of Done de una tarea

- alcance completo;
- código en paquete correcto;
- sin dependencia prohibida;
- tipos estrictos;
- validación runtime en boundaries;
- pruebas relevantes;
- lint/typecheck/build verdes;
- accesibilidad considerada;
- errores y estados vacíos;
- observabilidad si aplica;
- migración y RLS si aplica;
- documentación actualizada;
- si modifica UI: usa tokens públicos, incluye claro/oscuro, estados y accesibilidad;
- si modifica un componente compartido: actualiza Storybook/catálogo, pruebas y screenshots;
- no secretos;
- PR revisado;
- rollback descrito.

---

## 83. Definition of Done de una vertical

- flujo end-to-end en plataforma objetivo;
- casos de uso compartidos;
- contract test del adapter;
- E2E crítico;
- permisos probados;
- métricas y errores;
- UX loading/error/empty/offline;
- consistencia visual en plataformas objetivo;
- accesibilidad y regresión visual aprobadas;
- release en staging;
- aceptación funcional y visual.

---

# Parte XXIII - Riesgos y mitigaciones
## 84. Registro inicial de riesgos

| Riesgo | Impacto | Mitigación |
|---|---:|---|
| migración big bang | alto | strangler y verticales |
| esquema remoto difiere de SQL | alto | dump, diff, db reset |
| RLS incompleto | crítico | matriz pgTAP y least privilege |
| credenciales expuestas | crítico | rotación y scanning |
| demasiados paquetes prematuros | medio | crear al tener consumidor |
| paquete compartido se vuelve monolito | alto | bounded contexts y boundaries |
| UI universal mediocre | alto | web/native separados |
| jobs dependen del cliente | alto | queues/cron |
| duplicación de envíos | alto | idempotencia/outbox |
| Expo upgrade rompe build | medio | una versión por vez, preview |
| service worker pierde estado | alto | chrome.storage adapter |
| IA modifica demasiadas áreas | alto | worktree, AGENTS, scope |
| ausencia de datos de prueba | medio | seed/factories |
| Realtime escala mal | medio | Broadcast y refetch |
| administradores acceden sin auditoría | crítico | support sessions y audit log |

---

# Parte XXIV - Antipatrones prohibidos
## 85. No hacer

- un `src/services.ts` o `types/index.ts` gigantesco;
- componentes que consulten Supabase directamente;
- copiar la misma regla en web y móvil;
- importar desde rutas internas de otro paquete;
- usar `any` para evitar errores;
- llamar service role desde cliente;
- cambios manuales en producción sin migración;
- cron en `useEffect`;
- timers largos en service worker;
- guardar tokens en AsyncStorage plano;
- permisos Chrome amplios;
- `select *` en listas;
- paginación solo del lado cliente;
- eventos sin versión;
- retries sin idempotencia;
- logs con PII;
- mezclar feature, refactor y upgrade en un PR;
- usar colores, radios, sombras, tipografías o motion hardcodeados en features;
- crear un componente universal web/native que degrade ambas experiencias;
- asignar un color saturado diferente a cada KPI, canal o etapa;
- usar logos externos a todo color dentro de analítica;
- introducir sidebar permanente en la extensión;
- copiar mockups pixel a pixel ignorando tokens, accesibilidad o viewport real;
- duplicar Button, Modal, Toast, Card o Chart dentro de una feature;
- crear microservicio sin criterio de extracción;
- fusionar con tests omitidos “temporalmente”.

---

# Parte XXV - Archivos de configuración de referencia
## 86. `pnpm-workspace.yaml`

```yaml
packages:
  - apps/*
  - packages/*/*

catalog:
  react: 19.2.0
  typescript: 5.9.0
  zod: ^4.0.0

minimumReleaseAge: 1440

onlyBuiltDependencies:
  - esbuild
  - sharp
```

Las versiones son referencia; se fijarán con parches estables al crear el repo.

---

## 87. `package.json` raíz conceptual

```json
{
  "name": "leadseed-platform",
  "private": true,
  "packageManager": "pnpm@<exact-version>",
  "engines": {
    "node": ">=24 <25"
  },
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "turbo run dev --filter=@leadseed/web",
    "dev:extension": "turbo run dev --filter=@leadseed/extension",
    "dev:mobile": "turbo run dev --filter=@leadseed/mobile",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "verify": "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build",
    "db:start": "supabase start",
    "db:stop": "supabase stop",
    "db:reset": "supabase db reset",
    "db:test": "supabase test db",
    "db:types": "supabase gen types typescript --local > packages/infrastructure/supabase/src/generated/database.types.ts"
  }
}
```

---

## 88. `turbo.json` conceptual

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".expo/**", "! .expo/cache/**"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "cache": false
    }
  }
}
```

Revisar espacios/outputs exactos durante implementación.

---

## 89. Interfaz de plataforma

```ts
export interface PlatformServices {
  storage: KeyValueStorage;
  secureStorage: SecureKeyValueStorage;
  notifications: NotificationPort;
  links: ExternalLinkPort;
  clipboard: ClipboardPort;
  files: FilePort;
  network: NetworkStatusPort;
}
```

Cada app registra su implementación en el composition root.

---

## 90. Contrato de evento

```ts
export interface DomainEvent<TType extends string, TPayload> {
  id: string;
  type: TType;
  version: number;
  occurredAt: string;
  workspaceId: string;
  actorId?: string;
  aggregate: {
    type: string;
    id: string;
  };
  payload: TPayload;
  correlationId: string;
  causationId?: string;
}
```

---

## 91. Plantilla de PR

```markdown
## Problema

## Solución

## Contextos/paquetes afectados

## Cambios de esquema o RLS

## Pruebas ejecutadas

## Capturas

## Riesgos

## Rollback

## Checklist
- [ ] Sin secretos
- [ ] Lint
- [ ] Typecheck
- [ ] Unit/integration
- [ ] Build
- [ ] Docs/ADR
```

---

# Parte XXVI - Checklist de aceptación de arquitectura
## 92. Repositorio

- [ ] repositorio nuevo sin historial contaminado;
- [ ] apps separadas;
- [ ] paquetes con APIs públicas;
- [ ] boundaries automatizados;
- [ ] lockfile;
- [ ] CI;
- [ ] branch protection;
- [ ] AGENTS.md;
- [ ] no secretos.

## 93. Backend

- [ ] migraciones reproducibles;
- [ ] seed;
- [ ] tipos generados;
- [ ] RLS matrix;
- [ ] workspaces;
- [ ] outbox/queue;
- [ ] cron backend;
- [ ] funciones auditadas;
- [ ] backups probados.

## 94. Extensión

- [ ] service worker reiniciable;
- [ ] auth en chrome.storage;
- [ ] permisos mínimos;
- [ ] mensajes tipados;
- [ ] E2E;
- [ ] ningún job crítico en UI.

## 95. Web

- [ ] router real;
- [ ] lazy routes;
- [ ] error boundaries;
- [ ] E2E;
- [ ] CSP/headers;
- [ ] preview deploys.

## 96. Móvil

- [ ] Development Build;
- [ ] auth/deep links;
- [ ] SecureStore;
- [ ] push;
- [ ] offline básico;
- [ ] Maestro;
- [ ] Sentry;
- [ ] TestFlight/Internal.

---

# Parte XXVII - Fuentes oficiales y referencias técnicas
Consulta vigente al 27 de julio de 2026:

1. React Native releases y arquitectura: `reactnative.dev/docs/releases`, `reactnative.dev/architecture/landing-page`.
2. React Native 0.85/0.86 release notes: `reactnative.dev/blog`.
3. Expo SDK 56: `expo.dev/changelog/sdk-56` y `docs.expo.dev/versions/v56.0.0/`.
4. Expo monorepos: `docs.expo.dev/guides/monorepos/`.
5. EAS Build monorepos: `docs.expo.dev/build-reference/build-with-monorepos/`.
6. Expo Development Builds: `docs.expo.dev/develop/development-builds/introduction/`.
7. Supabase RLS y seguridad: `supabase.com/docs/guides/database/postgres/row-level-security`.
8. Supabase Queues: `supabase.com/docs/guides/queues`.
9. Supabase Realtime Broadcast: `supabase.com/docs/guides/realtime/broadcast`.
10. Supabase Branching: `supabase.com/docs/guides/deployment/branching`.
11. Supabase testing/pgTAP: `supabase.com/docs/guides/local-development/testing/overview`.
12. Chrome Manifest V3 y service workers: `developer.chrome.com/docs/extensions/`.
13. Turborepo internal packages y TypeScript: `turbo.build/repo/docs/`.
14. TanStack Query React Native: `tanstack.com/query/v5/docs/framework/react/react-native`.
15. TypeScript strict options: `typescriptlang.org/tsconfig/`.
16. OWASP ASVS 5.0 y MASVS: `owasp.org` y `mas.owasp.org`.
17. Playwright: `playwright.dev/docs/`.
18. Maestro: `docs.maestro.dev/`.
19. Node release policy: `nodejs.org/en/about/previous-releases`.
20. Vite releases: `vite.dev/releases`.

---

# Cierre

La forma profesional de evolucionar LeadSeed no es reescribir la extensión, ni envolverla completa como móvil, ni separar todo en microservicios. Es crear un nuevo monorepo, preservar la extensión, establecer límites modulares, convertir la lógica existente en casos de uso compartidos, fortalecer Supabase como backend multi-tenant y construir una presentación móvil nativa con Expo.

La secuencia importa más que la cantidad de tecnología. Primero se estabiliza y protege. Luego se normaliza el backend. Después se extrae una vertical completa. Finalmente se agregan web y móvil sobre contratos ya probados. Cada fase tiene criterios de salida y no debe abrirse la siguiente si la anterior no está estable.

Este documento debe mantenerse vivo. Toda desviación relevante requiere un ADR, no una decisión escondida dentro de un commit.

---

# Apéndice A - Mapa de migración del repositorio actual
## A.1 Regla general de mapeo

El contenido actual no se mueve según el nombre de la carpeta; se clasifica según responsabilidad. El destino inicial puede ser temporal y después refinarse.

| Origen actual | Destino inicial | Destino final |
|---|---|---|
| `src/pages/*` | `apps/extension/src/legacy/pages` | `packages/presentation/web-*/src` |
| `src/components/*` | `apps/extension/src/legacy/components` | paquetes de presentación por contexto |
| `src/hooks/*` | `apps/extension/src/legacy/hooks` | presentación o application, según función |
| `src/services/*` | `apps/extension/src/legacy/services` | casos de uso en `modules/*/application` |
| `src/repositories/*` | `apps/extension/src/legacy/repositories` | `infrastructure/supabase/src/<contexto>` |
| `src/types/index.ts` | mantener temporalmente | contratos y tipos por módulo |
| `src/utils/*` | clasificar uno a uno | kernel, módulo o plataforma |
| `src/background.ts` | extension entrypoint | `apps/extension/src/entrypoints/service-worker` |
| `src/App.tsx` | extension legacy shell | composición web compartida + shell extension |
| `src/lib/supabaseClient.ts` | extension composition | factory en infrastructure/auth |
| `sql/migrations` | no copiar ciegamente | `supabase/migrations` normalizadas |
| `supabase/functions` | copiar y compilar | agrupar por contexto + `_shared` |
| documentación histórica | `docs/archive` | resumir en ADR/docs vigentes |

## A.2 Clasificación de hooks actuales

- Hooks que solo unen UI y queries permanecen en presentación.
- Hooks que contienen reglas de negocio se convierten en casos de uso o policies.
- Hooks Realtime se reemplazan por adaptador/event subscriptions por módulo.
- Hooks de filtros y ordenamiento pueden vivir en presentación si son exclusivamente visuales.
- Hooks de permisos/entitlements consumen Identity/Billing, no implementan autorización.

## A.3 Clasificación de utilidades actuales

| Utilidad actual | Destino recomendado |
|---|---|
| normalización RUT | `modules/crm/domain/value-objects` o shared validation si es transversal |
| parser de importación | `modules/crm/application/import` |
| exportación | `presentation/web-crm` + platform file adapter |
| WhatsApp helper | `modules/communications` + link adapter |
| email sender del cliente | retirar; caso de uso backend |
| backup local | reevaluar; export service web-only |
| iconos | presentación web/native, no dominio |
| copy de estado de citas | scheduling contracts/i18n |

## A.4 Orden de extracción de archivos grandes

### `LeadDetail.tsx`

Extraer en este orden:

1. `LeadDetailHeader`;
2. `LeadContactActions`;
3. `LeadStatusControl`;
4. `LeadNotesPanel`;
5. `LeadActivityTimeline`;
6. hooks de query/mutation;
7. reglas de estado hacia CRM domain.

### `EmailSettings.tsx`

1. lista de canales;
2. formulario de canal;
3. verificación;
4. límites;
5. secrets y operaciones hacia Edge Function;
6. UI admin web-only.

### `AgendaPage.tsx`

1. toolbar y período;
2. calendar view;
3. appointment detail;
4. appointment form;
5. availability;
6. Google sync status;
7. queries y commands de scheduling.

### `LeadsPage.tsx`

1. filtros;
2. query list;
3. selección;
4. bulk actions;
5. tabla/lista;
6. import modal;
7. routing al detalle.

---

# Apéndice B - Matriz de paquetes
## B.1 Módulos

| Paquete | Responsabilidad | Puede depender de | No puede depender de |
|---|---|---|---|
| `@leadseed/module-identity` | workspaces, membresías, permisos | kernel, validation | React, Supabase, Chrome, Expo |
| `@leadseed/module-crm` | leads, notas, pipeline | kernel, validation | UI, Supabase |
| `@leadseed/module-tasks` | tareas y seguimiento | kernel, identity contracts | UI, DB concreta |
| `@leadseed/module-communications` | plantillas y mensajes | kernel, validation | proveedor específico |
| `@leadseed/module-scheduling` | agenda y citas | kernel, validation | Google SDK directo |
| `@leadseed/module-notifications` | preferencias/eventos | kernel | Expo/Chrome directo |
| `@leadseed/module-billing` | planes y entitlements | kernel | UI/plataforma |
| `@leadseed/module-support` | soporte y acceso | kernel, identity contracts | UI concreta |

## B.2 Infraestructura

| Paquete | Responsabilidad |
|---|---|
| `@leadseed/infra-supabase` | cliente, repositorios, RPC, mappers y tipos generados |
| `@leadseed/infra-auth` | bootstrap de Supabase Auth y session ports |
| `@leadseed/infra-realtime` | channels, Broadcast, Presence y lifecycle |
| `@leadseed/infra-jobs` | contratos de outbox/queue y administración |
| `@leadseed/infra-integrations` | contratos comunes de proveedores, solo server-safe cuando corresponda |

## B.3 Presentación

| Paquete | Consumidores |
|---|---|
| `@leadseed/web-core` | web y extensión |
| `@leadseed/web-crm` | web y extensión |
| `@leadseed/web-tasks` | web y extensión |
| `@leadseed/web-scheduling` | web y extensión |
| `@leadseed/web-communications` | web y extensión |
| `@leadseed/native-core` | móvil |
| `@leadseed/native-crm` | móvil |
| `@leadseed/native-tasks` | móvil |
| `@leadseed/native-scheduling` | móvil |

## B.4 Shared

`shared/kernel` debe ser pequeño. Contendrá únicamente:

- Result/Option si se adopta;
- tipos de paginación;
- Clock/UUID ports;
- base de eventos;
- errores base;
- helpers sin semántica de negocio.

No debe convertirse en “cajón de sastre”. Si una función contiene palabras del negocio, pertenece a su módulo.

---

# Apéndice C - Feature matrix por superficie
| Capacidad | Extensión | Web | Móvil |
|---|---:|---:|---:|
| login | completo | completo | completo |
| dashboard | compacto | completo | resumen |
| leads | operativo | completo | operativo |
| pipeline | compacto | completo | vista táctil |
| importación | no/inicio simple | completo | no inicial |
| exportación | simple | completo | compartir limitado |
| tareas | completo operativo | completo | completo operativo |
| agenda | operativo | completo | operativo |
| disponibilidad | lectura/básico | completo | básico |
| plantillas | usar | administrar | usar |
| configuración email | no | completo | no |
| envío email | acción | completo | acción rápida |
| WhatsApp/llamada | completo | completo | nativo |
| reportes | mínimos | completos | KPIs mínimos |
| administración SaaS | no | completo | no |
| soporte | chat/ticket | completo | ticket/chat |
| notificaciones | Chrome | web/in-app | push/in-app |

Esta matriz evita intentar mantener tres copias idénticas.

---

# Apéndice D - DDL conceptual inicial
## D.1 Workspaces

```sql
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique,
  owner_user_id uuid not null references auth.users(id),
  status text not null default 'active'
    check (status in ('active', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','manager','member','viewer')),
  status text not null default 'active'
    check (status in ('invited','active','suspended','left')),
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx
  on public.workspace_members(user_id, status, workspace_id);
```

## D.2 Leads

```sql
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  status text not null,
  first_name text,
  last_name text,
  email_normalized text,
  phone_e164 text,
  source text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index leads_workspace_status_created_idx
  on public.leads(workspace_id, status, created_at desc)
  where deleted_at is null;

create index leads_workspace_assignee_idx
  on public.leads(workspace_id, assigned_to, updated_at desc)
  where deleted_at is null;
```

## D.3 Optimistic concurrency

```sql
update public.leads
set status = p_status,
    version = version + 1,
    updated_at = now()
where id = p_lead_id
  and workspace_id = p_workspace_id
  and version = p_expected_version
returning *;
```

Si no retorna fila, el caso de uso informa conflicto y refresca.

## D.4 Outbox

```sql
create table jobs.outbox_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  aggregate_type text not null,
  aggregate_id uuid not null,
  event_type text not null,
  event_version integer not null,
  payload jsonb not null,
  correlation_id uuid not null,
  causation_id uuid,
  occurred_at timestamptz not null default now(),
  published_at timestamptz,
  attempt_count integer not null default 0,
  last_error text
);

create index outbox_unpublished_idx
  on jobs.outbox_events(occurred_at)
  where published_at is null;
```

Estos ejemplos no se aplican sin auditar el esquema real y sus nombres.

---

# Apéndice E - Contratos de plataforma
## E.1 Storage

```ts
export interface KeyValueStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clearNamespace(namespace: string): Promise<void>;
}
```

Implementaciones:

- web: `localStorage` wrapper;
- extensión: `chrome.storage.local`;
- móvil no sensible: AsyncStorage/SQLite;
- móvil sensible: SecureStore separado.

## E.2 Links

```ts
export interface ExternalLinkPort {
  openUrl(url: string): Promise<void>;
  call(phoneE164: string): Promise<void>;
  email(input: { to: string; subject?: string; body?: string }): Promise<void>;
  whatsapp(input: { phoneE164: string; text?: string }): Promise<void>;
}
```

El módulo Communications construye intención; el adapter abre la plataforma.

## E.3 Notifications

```ts
export interface LocalNotificationPort {
  requestPermission(): Promise<'granted' | 'denied' | 'undetermined'>;
  show(input: LocalNotification): Promise<void>;
  clear(id: string): Promise<void>;
}
```

Push remoto es responsabilidad backend + registro de dispositivo, no de este port local.

---

# Apéndice F - Query y mutation pattern
## F.1 Query hook web/native

```ts
export function useLeadDetail(workspaceId: string, leadId: string) {
  const services = useServices();

  return useQuery({
    queryKey: leadKeys.detail(workspaceId, leadId),
    queryFn: () => services.crm.getLeadDetail.execute({ workspaceId, leadId }),
    enabled: Boolean(workspaceId && leadId),
    staleTime: 30_000,
  });
}
```

## F.2 Mutation

```ts
export function useChangeLeadStatus() {
  const queryClient = useQueryClient();
  const services = useServices();

  return useMutation({
    mutationFn: services.crm.changeLeadStatus.execute,
    onSuccess: (lead) => {
      queryClient.setQueryData(
        leadKeys.detail(lead.workspaceId, lead.id),
        lead,
      );
      queryClient.invalidateQueries({
        queryKey: leadKeys.lists(),
      });
    },
  });
}
```

No hacer optimistic update en acciones donde el conflicto pueda causar daño sin una estrategia de rollback.

---

# Apéndice G - CI conceptual
```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

permissions:
  contents: read

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<pinned-sha>
      - uses: pnpm/action-setup@<pinned-sha>
      - uses: actions/setup-node@<pinned-sha>
        with:
          node-version: 24
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

La versión final debe incluir jobs separados para database y E2E, timeouts, artifacts y concurrency cancellation.

---

# Apéndice H - SLO y presupuestos iniciales
Estos valores son objetivos iniciales y deben calibrarse con datos.

## H.1 Disponibilidad y confiabilidad

- operaciones principales: 99,9% mensual una vez en producción estable;
- jobs programados: 99,9% ejecutados dentro de ventana;
- cero duplicación conocida de mensajes por retry;
- crash-free mobile sessions superior a 99,5%;
- sesiones web sin error fatal superior a 99,8%.

## H.2 Rendimiento

- lista inicial de leads p95 menor a 1,5 s con red razonable;
- mutación común p95 menor a 800 ms sin proveedor externo;
- navegación móvil percibida inmediata con skeleton/caché;
- servicio worker inicia y resuelve badge sin tareas largas;
- dashboard pesado usa RPC/snapshot y no decenas de requests.

## H.3 Budgets de frontend

- vigilar bundle inicial web/extensión;
- chunks de reportes e importación fuera del inicial;
- no añadir dependencia mayor sin análisis de bundle;
- mobile startup y frozen frames monitorizados en Sentry.

---

# Apéndice I - Feature flags y entitlements
No mezclar:

- **entitlement:** el cliente pagó o tiene derecho;
- **feature flag:** control operacional de rollout;
- **permission:** el rol puede ejecutar;
- **capability:** la plataforma soporta la función.

Una acción se habilita si:

```text
platform capability
AND release flag
AND workspace entitlement
AND user permission
```

La seguridad final sigue en backend.

Feature flags deben permitir:

- rollout por porcentaje/workspace;
- kill switch;
- expiración/owner;
- auditoría;
- eliminación al completar rollout.

---

# Apéndice J - Compatibilidad de contratos
## J.1 Eventos

- agregar campos opcionales es compatible;
- eliminar/renombrar requiere nueva versión;
- consumidor ignora campos desconocidos;
- productor mantiene versión anterior durante transición;
- schema Zod por versión.

## J.2 RPC/API

- no cambiar significado de campo silenciosamente;
- nuevos parámetros tienen defaults o nueva función;
- responses complejas con versión si son públicas;
- apps antiguas deben sobrevivir durante rollout de tiendas.

La compatibilidad móvil es especialmente importante porque usuarios no actualizan inmediatamente.

---

# Apéndice K - Backlog técnico inicial sugerido
## K.1 Seguridad

- SEC-001 rotar credenciales;
- SEC-002 remover `.env.local` de tracking;
- SEC-003 guardar PEM cifrado;
- SEC-004 habilitar secret scanning;
- SEC-005 inventario de secretos;
- SEC-006 revisar grants/RLS.

## K.2 Repositorio

- REP-001 crear monorepo;
- REP-002 configurar pnpm/Turbo;
- REP-003 TypeScript configs;
- REP-004 ESLint/Prettier;
- REP-005 CI;
- REP-006 AGENTS/CONTRIBUTING;
- REP-007 branch protection;
- REP-008 worktree workflow.

## K.3 Extensión

- EXT-001 copiar proyecto estable;
- EXT-002 build reproducible;
- EXT-003 mover service worker;
- EXT-004 storage adapter;
- EXT-005 messaging contracts;
- EXT-006 smoke E2E;
- EXT-007 permisos auditados.

## K.4 Supabase

- DB-001 exportar esquema;
- DB-002 reconciliar migraciones;
- DB-003 timestamp migrations;
- DB-004 seed;
- DB-005 generated types;
- DB-006 pgTAP base;
- DB-007 auditar security definer;
- DB-008 documentar realtime/storage/auth.

## K.5 CRM vertical

- CRM-001 contracts;
- CRM-002 domain entities;
- CRM-003 repository port;
- CRM-004 Supabase adapter;
- CRM-005 query keys;
- CRM-006 create/list/detail;
- CRM-007 status transition;
- CRM-008 notes;
- CRM-009 presentation web;
- CRM-010 tests.

## K.6 Web

- WEB-001 shell/router;
- WEB-002 auth;
- WEB-003 layout;
- WEB-004 leads;
- WEB-005 tasks;
- WEB-006 agenda;
- WEB-007 preview deploy;
- WEB-008 Playwright.

## K.7 Mobile

- MOB-001 Expo app;
- MOB-002 development build;
- MOB-003 router;
- MOB-004 auth/secure storage;
- MOB-005 Sentry;
- MOB-006 design primitives;
- MOB-007 leads;
- MOB-008 tasks;
- MOB-009 agenda;
- MOB-010 push;
- MOB-011 Maestro;
- MOB-012 offline drafts.

## K.8 Jobs

- JOB-001 outbox;
- JOB-002 queues;
- JOB-003 worker;
- JOB-004 idempotency;
- JOB-005 retries/dead-letter;
- JOB-006 scheduled email migration;
- JOB-007 reminders;
- JOB-008 monitoring.

Este backlog debe convertirse en issues pequeñas con criterios de aceptación. No ejecutar todos en paralelo.

---

# Apéndice L - Secuencia de trabajo recomendada para una IA
Para cada issue:

1. leer issue y documentos;
2. localizar bounded context;
3. verificar dependencias permitidas;
4. escribir o actualizar prueba que represente el cambio;
5. implementar en dominio/application;
6. implementar adapter si aplica;
7. integrar presentación;
8. ejecutar comandos focalizados;
9. ejecutar `pnpm verify` antes del PR;
10. revisar diff por secretos y archivos no relacionados;
11. actualizar README/ADR;
12. entregar resumen estructurado.

Formato de entrega:

```text
Resultado:
Archivos principales:
Decisiones:
Pruebas:
Riesgos:
Pasos manuales:
```

---

# Apéndice M - Información pendiente para cerrar el diseño de backend
Antes de ejecutar la fase de normalización se debe obtener, sin compartir secretos ni datos reales:

- dump del esquema productivo;
- `supabase migration list`;
- configuración Auth y redirect URLs;
- lista de tablas en Realtime;
- buckets y policies;
- Security Advisor;
- Performance Advisor;
- nombres de secrets de Functions;
- volumen de tablas;
- consultas lentas;
- política actual de backup/PITR;
- dependencias externas y webhooks;
- frecuencia de jobs;
- límites comerciales por plan.

Con esta información se produce un documento adicional: `docs/data/backend-audit-and-migration.md`.

---

# Apéndice N - Sistema visual premium v3 (especificación canónica)

# LeadSeed — Sistema visual premium

> Guía maestra de diseño UX/UI para la extensión de Chrome  
> **Versión 3.0 · sistema neutral actualizado · modo claro y oscuro**  
> Documento orientado a diseñadores, desarrolladores y agentes de IA que deban crear, corregir o implementar pantallas de LeadSeed.

---

## 0. Propósito del documento

Este documento define el lenguaje visual oficial de LeadSeed para todas las pantallas de la extensión de Chrome y sus futuras superficies de producto.

El objetivo es que la interfaz se perciba como un producto:

- premium;
- empresarial;
- contemporáneo;
- minimalista;
- estable;
- fácil de leer;
- escalable como SaaS;
- coherente entre modo claro y modo oscuro.

El sistema debe alejarse del aspecto colorido, decorativo o excesivamente “dashboard”. La interfaz no debe depender de muchos colores para crear jerarquía. La jerarquía se construye principalmente mediante:

1. tamaño;
2. espacio;
3. contraste;
4. alineación;
5. proximidad;
6. peso tipográfico moderado;
7. bordes y superficies;
8. color sólo cuando comunica algo útil.

La regla principal es:

> **Menos color, más jerarquía y más significado.**

---

## 1. Principios no negociables

### 1.1 Neutralidad primero

La mayor parte de la interfaz debe estar compuesta por:

- fondos neutros;
- superficies blancas u oscuras;
- texto tinta o blanco;
- líneas finas;
- grises para información secundaria;
- un morado de marca controlado.

El morado no debe ocupar grandes áreas sin motivo. Debe funcionar como firma visual, no como ruido.

### 1.2 El color siempre debe tener una función

El color se reserva para cuatro usos:

| Uso | Color |
|---|---|
| Identidad, selección y acción primaria | Morado |
| Éxito, crecimiento o mejora | Verde |
| Error, riesgo o alerta crítica | Rojo |
| Advertencia de atención media | Ámbar |

No se debe asignar un color saturado diferente a cada tarjeta, icono, métrica o etapa.

### 1.3 Jerarquía sin negrita agresiva

La interfaz utiliza principalmente pesos `400` y `500`.

El peso `600` se reserva para:

- una métrica principal;
- un número crítico;
- un título muy importante;
- una llamada de atención puntual.

No utilizar `700`, `800` o `900` como lenguaje habitual.

Antes de aumentar el peso, revisar:

- tamaño;
- contraste;
- espaciado;
- posición;
- agrupación.

### 1.4 Espacio en blanco como componente

El espacio vacío no es espacio desperdiciado. Es una herramienta para:

- separar niveles de información;
- reducir carga cognitiva;
- dar protagonismo a métricas;
- evitar que las cards se sientan amontonadas;
- construir una percepción premium.

### 1.5 Bordes finos y superficies controladas

- Bordes de `1 px`.
- Radios entre `12 px` y `16 px`.
- Sombras mínimas.
- Sin relieve fuerte.
- Sin glassmorphism excesivo.
- Sin gradientes decorativos llamativos.
- Sin resplandores de neón.

### 1.6 Iconografía consistente

Todos los iconos deben:

- ser monoline;
- tener grosores visuales similares;
- pertenecer a una misma familia;
- usar tamaños coherentes;
- ser neutros por defecto;
- usar morado sólo en estado activo o seleccionado.

No mezclar iconos outline, fill, 3D y pictogramas decorativos.

---

## 2. Arquitectura general de la extensión

### 2.1 Regla estructural principal

**No existe sidebar lateral permanente.**

La navegación principal se resuelve mediante:

1. header superior;
2. tabs horizontales;
3. drawer superpuesto desde el menú hamburguesa;
4. enlaces contextuales dentro de las cards.

### 2.2 Header de trabajo

En pantallas de uso diario, el header debe tener:

**Izquierda**

- menú hamburguesa;
- nombre de la sección actual.

Ejemplo:

```text
[☰] Panel Analítico
```

**Derecha**

- ayuda;
- notificaciones;
- avatar.

### 2.3 Uso de la marca

La marca `LeadSeed` puede aparecer en:

- login;
- onboarding;
- bienvenida;
- recuperación de acceso;
- estados vacíos de primer uso;
- piezas de marca.

La marca **no debe repetirse en el header de las pantallas de trabajo** cuando el espacio debe utilizarse para el nombre de la sección.

Incorrecto:

```text
[☰] LeadSeed
Panel Analítico
```

Correcto:

```text
[☰] Panel Analítico
```

### 2.4 Tabs de módulo

Debajo del header se muestran las tabs:

- Overview;
- Pipeline;
- Tareas.

Reglas:

- una sola fila;
- icono lineal de `18 px`;
- texto de `14 px`;
- tab activa con texto morado;
- underline de `2 px`;
- no usar fondos saturados en toda la tab;
- no usar pills grandes para la navegación principal.

### 2.5 Filtro de fecha

El filtro de fecha se ubica a la derecha de la fila de tabs.

Ejemplos:

- Hoy;
- Últimos 7 días;
- Últimos 30 días;
- Últimos 6 meses;
- Rango personalizado.

Debe usar:

- icono de calendario;
- texto;
- chevron;
- altura de `40 px`;
- borde fino;
- fondo neutro.

### 2.6 Drawer del menú hamburguesa

Si se agregan más módulos, deben aparecer en un drawer superpuesto.

| Propiedad | Valor |
|---|---:|
| Ancho | `min(300px, 88vw)` |
| Posición | Izquierda |
| Fondo claro | `#FFFFFF` |
| Fondo oscuro | `#171B24` |
| Overlay | Negro al `28–36%` |
| Animación | `180–220 ms` |
| Comportamiento | Superpuesto, no reduce el canvas |

---

## 3. Tamaño, grid y densidad

### 3.1 Viewport de producción

| Área | Regla |
|---|---|
| Ancho base | `360 px` |
| Ancho mínimo | `320 px` |
| Ancho máximo | `480 px` |
| Ancho útil dentro de una card | `~318 px` |
| Altura | Variable |
| Scroll | Vertical |
| Sidebar | No |
| Padding lateral | `16 px` |
| Padding reducido | `12 px` bajo `340 px` |

### 3.2 Mockups de diseño

Las imágenes de presentación pueden entregarse en:

```text
1080 × 1400 px
```

Esta resolución es una representación visual de alta definición. No significa que el viewport real de la extensión mida 1080 px.

La implementación debe conservar tokens, no copiar literalmente tamaños ampliados del mockup.

> **Cuidado con "conservar proporciones" (`2026-08-19`).** Estos mockups se dibujaron cuando este
> documento daba por buenos 560 px de viewport, así que 1080 era una ampliación de ~1,93x. Contra el
> panel real de 360 px la reducción es de 3x, y las proporciones **no** se trasladan: lo que en el
> mockup ocupa media pantalla, en el panel real no cabe. Los mockups sirven como referencia de
> intención y jerarquía, no de medida. Manda la tabla 3.1.

### 3.3 Sistema base de espaciado

Usar múltiplos de `4 px`.

| Token | Valor | Uso |
|---|---:|---|
| `space-1` | `4 px` | Ajustes mínimos |
| `space-2` | `8 px` | Icono + texto, captions |
| `space-3` | `12 px` | Elementos internos |
| `space-4` | `16 px` | Separación entre bloques |
| `space-5` | `20 px` | Padding compacto |
| `space-6` | `24 px` | Padding principal |
| `space-8` | `32 px` | Separación de secciones |
| `space-10` | `40 px` | Espacios hero puntuales |

### 3.4 Alturas principales

| Componente | Altura |
|---|---:|
| Header | `72 px` |
| Fila de tabs | `52 px` |
| Botón principal | `40 px` |
| Dropdown | `40 px` |
| Icon button | `36 × 36 px` |
| Input estándar | `40 px` |
| Input amplio | `44 px` |

### 3.5 Radios

| Token | Valor |
|---|---:|
| `radius-sm` | `8 px` |
| `radius-md` | `10 px` |
| `radius-control` | `12 px` |
| `radius-card-secondary` | `14 px` |
| `radius-card` | `16 px` |
| `radius-pill` | `999 px` |

---

## 4. Tipografía

### 4.1 Fuente principal

**Inter**

Alternativas:

1. Geist;
2. Söhne;
3. SF Pro;
4. Helvetica Neue;
5. system-ui.

### 4.2 Escala tipográfica

| Token | Tamaño / línea | Peso | Uso |
|---|---:|---:|---|
| `section-header` | `18 / 24` | `500` | Nombre junto al menú |
| `page-title` | `24 / 30` | `500` | Título de página de detalle |
| `card-title` | `15 / 22` | `500` | Card principal |
| `subcard-title` | `14 / 20` | `500` | Card secundaria |
| `metric-hero` | `32 / 36` | `500` | KPI principal |
| `metric-lg` | `24 / 30` | `500` | KPI secundario |
| `body` | `14 / 20` | `400` | Texto base |
| `body-sm` | `13 / 18` | `400` | Texto auxiliar |
| `caption` | `12 / 16` | `400` | Leyendas, fechas |
| `tooltip` | `12 / 16` | `400–500` | Tooltip |
| `micro` | `11 / 14` | `400` | Ejes compactos |

### 4.3 Reglas de uso

- Evitar mayúsculas sostenidas.
- No abusar de letter spacing.
- No usar títulos enormes dentro de una extensión.
- Los números pueden tener tabular numerals.
- Alinear números en tablas a la derecha.
- Las métricas deben ser legibles sin parecer publicidad.

---

## 5. Paleta oficial — modo claro

### 5.1 Colores base

| Token | HEX | Uso |
|---|---|---|
| `ink` | `#161A24` | Texto principal |
| `text-secondary` | `#5B6475` | Explicaciones y labels |
| `muted` | `#8C95A6` | Información terciaria |
| `canvas` | `#F7F8FB` | Fondo general |
| `surface` | `#FFFFFF` | Cards y menús |
| `surface-subtle` | `#FAFBFD` | Bloques internos |
| `border` | `#E6EAF0` | Bordes y divisores |
| `border-strong` | `#D7DCE5` | Controles importantes |
| `brand` | `#635BFF` | Acento principal |
| `brand-hover` | `#574FE8` | Hover primario |
| `brand-active` | `#4D46D2` | Estado presionado |
| `brand-soft` | `#F1EFFF` | Fondo activo suave |
| `focus-ring` | `#D9D4FF` | Focus |
| `success` | `#16B364` | Crecimiento y éxito |
| `success-soft` | `#EAF8F1` | Fondo éxito |
| `danger` | `#F04461` | Riesgo y alertas |
| `danger-soft` | `#FEECEE` | Fondo alerta |
| `warning` | `#F59E0B` | Advertencia |
| `warning-soft` | `#FFF6E5` | Fondo warning |

### 5.2 Proporción de uso recomendada

- `80–88%`: neutros;
- `8–15%`: morado;
- `2–5%`: colores semánticos.

---

## 6. Paleta oficial — modo oscuro

### 6.1 Colores base

| Token | HEX | Uso |
|---|---|---|
| `dark-background` | `#0F1117` | Fondo principal |
| `dark-glow` | `#0D1A2B` | Brillo ambiental del canvas |
| `dark-surface` | `#171B24` | Cards |
| `dark-surface-alt` | `#1F2430` | Dropdowns y overlays |
| `dark-surface-hover` | `#222836` | Hover de superficie |
| `dark-border` | `#2A3140` | Bordes |
| `dark-border-strong` | `#394255` | Bordes de foco |
| `dark-text` | `#F3F5F8` | Texto principal |
| `dark-text-secondary` | `#AAB3C2` | Texto auxiliar |
| `dark-muted` | `#7F899A` | Texto terciario |
| `dark-accent` | `#8A82FF` | Acento principal |
| `dark-accent-hover` | `#9A93FF` | Hover |
| `dark-accent-soft` | `#26214A` | Fondo activo |
| `dark-focus-ring` | `#4E477D` | Focus |
| `success-dark` | `#22C55E` | Éxito |
| `danger-dark` | `#FB7185` | Error o alerta |
| `warning-dark` | `#FBBF24` | Advertencia |

### 6.2 Brillo azul ambiental

El brillo azul puede existir únicamente en el canvas general.

Correcto:

- halo muy tenue;
- baja opacidad;
- detrás de todo el contenido;
- no afecta la lectura.

Incorrecto:

- gradientes dentro de cada card;
- resplandor azul en todos los bordes;
- neón alrededor de gráficos;
- fondos saturados.

---

## 7. Nuevo sistema cromático para fuentes y canales

### 7.1 Problema que resuelve

Las pantallas anteriores utilizaban:

- azul;
- verde;
- amarillo;
- morado;
- colores propios de marcas externas.

Eso generaba una apariencia demasiado colorida y rompía la estética neutral.

La solución oficial es:

> **Las fuentes y canales utilizan una escala monocromática de morados.**

### 7.2 Orden fijo de categorías

El orden oficial es:

1. Web;
2. WhatsApp;
3. LinkedIn;
4. Formulario.

Este orden debe mantenerse en:

- legends;
- tablas;
- tooltips;
- donuts;
- barras apiladas;
- exportaciones;
- reportes.

### 7.3 Tokens para modo claro

| Fuente | Token | HEX |
|---|---|---|
| Web | `source-web` | `#5B3FE5` |
| WhatsApp | `source-whatsapp` | `#765FEA` |
| LinkedIn | `source-linkedin` | `#9C88F1` |
| Formulario | `source-form` | `#C9BFF7` |
| Otros | `source-other` | `#DDE1E8` |

### 7.4 Tokens para modo oscuro

| Fuente | Token | HEX |
|---|---|---|
| Web | `source-web-dark` | `#8A82FF` |
| WhatsApp | `source-whatsapp-dark` | `#A099FF` |
| LinkedIn | `source-linkedin-dark` | `#BAB4FF` |
| Formulario | `source-form-dark` | `#D4D0FF` |
| Otros | `source-other-dark` | `#596477` |

### 7.5 Reglas obligatorias

- Los colores de fuente no representan éxito o error.
- El verde no puede utilizarse como identidad de WhatsApp.
- El azul no puede utilizarse como identidad de LinkedIn.
- El amarillo no puede utilizarse como identidad de Formulario.
- Los logos pueden conservar su forma, pero deben renderizarse en monocromo.
- La leyenda debe incluir nombre y valor.
- Nunca depender sólo del color para diferenciar categorías.
- Mantener siempre etiquetas, orden fijo y tooltip.

### 7.6 Barras apiladas

Orden de apilado recomendado de abajo hacia arriba:

1. Formulario — tono más claro;
2. LinkedIn;
3. WhatsApp;
4. Web — tono más oscuro.

Esto crea una lectura estable y evita que el gráfico se sienta pesado.

### 7.7 Donut

- Máximo recomendado: `4–5` categorías.
- Grosor: `18–24%` del diámetro.
- Sin sombras.
- Sin separación exagerada.
- Segmentos en escala morada.
- Leyenda alineada a la derecha.
- Mostrar porcentaje y nombre.
- La categoría principal usa el tono más oscuro.

### 7.8 Desglose por fuente

Cada fila contiene:

1. icono monocromático;
2. nombre;
3. barra;
4. cantidad;
5. porcentaje.

Reglas:

- track neutro;
- fill en escala morada;
- no usar fondo coloreado por fila;
- valores alineados a la derecha;
- el total usa divisor superior;
- no usar logos saturados.

---

## 8. Colores semánticos

### 8.1 Éxito

Usar verde únicamente para:

- crecimiento positivo;
- tarea completada;
- conversión exitosa;
- comparación favorable;
- confirmación;
- estado saludable.

No usar verde para:

- decorar iconos;
- identificar WhatsApp;
- rellenar cards completas;
- indicar una categoría neutral.

### 8.2 Peligro

Usar rojo para:

- vencido;
- urgente;
- error;
- pérdida;
- caída crítica;
- riesgo;
- bloqueo.

Una alerta normal debe utilizar:

- fondo `danger-soft`;
- borde rojo tenue;
- icono rojo;
- texto principal neutro o rojo controlado.

### 8.3 Advertencia

Usar ámbar para:

- recomendación que requiere atención;
- riesgo moderado;
- dato incompleto;
- configuración pendiente.

No usar ámbar como color de Formulario.

---

## 9. Cards

### 9.1 Card principal

| Propiedad | Claro | Oscuro |
|---|---|---|
| Fondo | `#FFFFFF` | `#171B24` |
| Borde | `#E6EAF0` | `#2A3140` |
| Radio | `16 px` | `16 px` |
| Padding | `20–24 px` | `20–24 px` |
| Sombra | `0 4px 14px rgba(16,24,40,.04)` | opcional, casi imperceptible |

### 9.2 Card secundaria

- radio `14 px`;
- padding `16–20 px`;
- sin sombra si el borde es suficiente;
- título de `14 px / 500`;
- contenido compacto pero respirado.

### 9.3 KPI card

Estructura:

```text
[icono] Label
        Métrica
        Comparación
```

Reglas:

- icono neutral o fondo morado muy suave;
- métrica en tinta;
- comparación positiva en verde;
- no utilizar un color diferente por KPI;
- no llenar la card de color.

### 9.4 Footer de card

Los enlaces de detalle viven en una franja inferior:

- divisor superior;
- texto morado;
- flecha a la derecha;
- altura cómoda;
- hover con fondo mínimo.

---

## 10. Botones

### 10.1 Primario

| Propiedad | Valor |
|---|---|
| Alto | `40 px` |
| Padding horizontal | `16 px` |
| Radio | `12 px` |
| Fondo claro | `#635BFF` |
| Fondo oscuro | `#8A82FF` o variante controlada |
| Texto | Blanco |
| Peso | `500` |
| Icono | `16–18 px` |

### 10.2 Secundario

Modo claro:

- fondo blanco;
- borde `#E6EAF0`;
- texto `#161A24`.

Modo oscuro:

- fondo transparente o `#171B24`;
- borde `#394255`;
- texto `#F3F5F8`.

### 10.3 Destructivo

- no convertir toda la interfaz en rojo;
- usar rojo sólo en acción destructiva confirmada;
- siempre solicitar confirmación si la acción no es reversible.

### 10.4 Estados

| Estado | Comportamiento |
|---|---|
| Hover | oscurecer o aclarar `4–6%` |
| Active | reducir luminancia y mantener tamaño |
| Focus | ring `2 px` |
| Disabled | opacidad `45–55%` |
| Loading | spinner discreto, sin cambiar ancho |

---

## 11. Inputs, filtros y dropdowns

### 11.1 Reglas

- altura `40 px`;
- radio `12 px`;
- borde `1 px`;
- label fuera del input si requiere contexto;
- placeholder con contraste suficiente;
- icono a la izquierda cuando aporta significado;
- chevron a la derecha.

### 11.2 Dropdown de gráfico

Ejemplos:

- Línea;
- Barras;
- Barras apiladas;
- Área;
- Acumulado.

Debe:

- mostrar icono del tipo de gráfico;
- conservar ancho estable;
- usar menú flotante;
- marcar la opción activa con check y fondo suave.

---

## 12. Gráficos

### 12.1 Principios generales

- Reducir ruido.
- Evitar multicolor innecesario.
- Ejes finos.
- Labels cortos.
- Gridlines suaves.
- Tooltips claros.
- No usar 3D.
- No usar sombras gruesas.
- No usar animaciones dramáticas.
- No usar neón en modo oscuro.

### 12.2 Gráfico de línea

Uso:

- evolución temporal;
- tendencia;
- comparación simple.

Reglas:

- serie principal en morado;
- grosor `2 px`;
- puntos `6–8 px`;
- punto activo con ring;
- área inferior opcional al `6–10%`;
- sin gradiente saturado;
- comparativa secundaria en gris azulado.

### 12.3 Barras

Uso:

- comparación mensual;
- volúmenes discretos.

Reglas:

- una sola serie: morado;
- radios superiores `4–6 px`;
- ancho consistente;
- hover con mayor luminosidad;
- sin colores diferentes por mes.

### 12.4 Barras apiladas

Uso:

- evolución temporal separada por fuentes.

Reglas:

- escala monocromática de fuentes;
- orden fijo;
- separadores internos de `1 px` con baja opacidad;
- tooltip con breakdown;
- leyenda siempre visible;
- no usar colores semánticos.

### 12.5 Conversión por etapa

Si representa etapas de funnel y no fuentes:

- morado principal para etapa activa o inicial;
- grises/lavandas para el resto;
- verde sólo si existe conversión exitosa explícita;
- no asignar un color saturado distinto por etapa.

### 12.6 Ejes

Modo claro:

- texto `#8C95A6`;
- gridline `#E6EAF0`.

Modo oscuro:

- texto `#7F899A`;
- gridline `#2A3140`.

---

## 13. Tooltips

### 13.1 Apariencia

| Propiedad | Claro | Oscuro |
|---|---|---|
| Fondo | `#FFFFFF` | `#1F2430` |
| Borde | `#E6EAF0` | `#394255` |
| Radio | `10 px` | `10 px` |
| Padding | `10–12 px` | `10–12 px` |
| Sombra | ligera | ligera |
| Título | `500` | `500` |

### 13.2 Contenido recomendado

```text
Julio
598 leads
• Web          232 (38,8%)
• WhatsApp     178 (29,8%)
• LinkedIn     126 (21,1%)
• Formulario    62 (10,3%)
Total          598 (100%)
```

No utilizar tooltips gigantes ni párrafos extensos.

---

## 14. Iconografía

### 14.1 Tamaños

| Contexto | Tamaño |
|---|---:|
| Tabs | `18 px` |
| Botones | `16–18 px` |
| Header | `20 px` |
| KPI | `20–22 px` |
| Card title | `18 px` |
| Empty state | `32–40 px` |

### 14.2 Colores

- neutro por defecto;
- morado en activo;
- verde en éxito;
- rojo en alerta;
- ámbar en warning.

Los iconos de Web, WhatsApp, LinkedIn y Formulario deben utilizar el token de fuente morado correspondiente, no el color oficial externo de la marca.

---

## 15. Estados de interacción

### 15.1 Hover

- duración `160 ms`;
- curva `ease-out`;
- cambiar fondo o borde;
- evitar movimiento vertical;
- no agrandar cards.

### 15.2 Cambio de tab

- duración `180–220 ms`;
- curva `ease-in-out`;
- underline animado;
- contenido con fade ligero;
- sin slide exagerado.

### 15.3 Focus

Todo control interactivo debe tener:

- focus visible;
- contraste AA;
- ring de `2 px`;
- navegación por teclado.

### 15.4 Disabled

- no eliminar completamente el contraste;
- conservar legibilidad;
- cursor no permitido;
- tooltip opcional explicando la razón.

---

## 16. Accesibilidad

### 16.1 Reglas mínimas

- Contraste WCAG AA.
- Texto normal: mínimo `4.5:1`.
- Texto grande: mínimo `3:1`.
- Controles táctiles: mínimo `36 × 36 px`; ideal `40 × 40 px`.
- Focus visible.
- Navegación por teclado.
- No depender sólo del color.
- Tooltips accesibles.
- `aria-label` para icon buttons.
- `aria-current` en tab activa.
- `aria-live` en notificaciones relevantes.

### 16.2 Gráficos accesibles

Todo gráfico debe tener:

- título;
- descripción;
- datos alternativos;
- tabla o resumen disponible;
- labels;
- orden fijo;
- tooltip;
- leyenda.

La escala morada debe apoyarse con texto, no sólo con diferencia cromática.

---

## 17. Modo claro y oscuro

### 17.1 Coherencia estructural

Ambos modos deben compartir:

- medidas;
- layout;
- jerarquía;
- textos;
- iconos;
- estados;
- comportamiento;
- estructura de cards.

Sólo deben cambiar:

- superficies;
- bordes;
- contraste;
- tokens temáticos.

### 17.2 No invertir mecánicamente

El modo oscuro no es el modo claro con colores invertidos.

Debe:

- reducir color;
- aumentar separación entre superficies;
- controlar luminosidad;
- suavizar el morado;
- evitar blanco puro en grandes bloques;
- usar texto secundario menos brillante.

---

## 18. Patrones por pantalla

### 18.1 Overview

Objetivo: resumen ejecutivo.

Incluye:

- progreso de metas;
- conversión global;
- rendimiento del día;
- alertas;
- fuentes principales;
- conversión por etapa;
- hallazgos.

Overview no debe profundizar en todos los detalles. Debe resumir y enlazar.

### 18.2 Pipeline

Objetivo: análisis comercial.

Incluye:

- embudo de ventas;
- total de leads;
- tasa de conversión;
- etapas;
- adquisición mensual;
- links a detalle.

CTAs principales:

- Ver detalle del embudo;
- Ver reporte completo.

### 18.3 Tareas

Objetivo: operación diaria.

Incluye:

- vencidas/urgentes;
- para hoy;
- eficiencia histórica;
- filtros;
- navegación a lista.

Reglas:

- rojo sólo en vencidas;
- el resto neutral;
- no convertir toda la sección en una alarma.

### 18.4 Reporte completo de adquisición

Incluye:

- volver al pipeline;
- título y resumen;
- KPIs;
- selector de periodo;
- selector de gráfico;
- gráfico principal;
- desglose por fuente;
- hallazgos;
- conversión por etapa;
- rendimiento por canal;
- exportar;
- compartir.

El sistema de fuentes debe usar la escala monocromática morada.

---

## 19. Microcopy oficial

| Elemento | Texto |
|---|---|
| Ayuda | Centro de ayuda |
| Campana | Notificaciones |
| Campana con punto | Tienes notificaciones nuevas |
| Avatar | Cuenta y preferencias |
| Overview | Resumen general del rendimiento |
| Pipeline | Embudo y adquisición |
| Tareas | Seguimiento operativo |
| Filtro de fecha | Cambiar período de análisis |
| Tipo de gráfico | Cambiar visualización |
| Exportar | Exportar PDF |
| Compartir | Compartir reporte |
| Volver | Volver al pipeline |
| Fuentes | Ver todas las fuentes |
| Etapas | Ver detalle por etapa |
| Hallazgos | Ver todos los hallazgos |

---

## 20. Motion

### 20.1 Duraciones

| Acción | Duración |
|---|---:|
| Hover | `160 ms` |
| Focus | `120–160 ms` |
| Tooltip | `120–160 ms` |
| Dropdown | `160–180 ms` |
| Tab | `180–220 ms` |
| Drawer | `200–240 ms` |
| Modal | `200–240 ms` |

### 20.2 Curvas

- Hover: `ease-out`.
- Tabs: `ease-in-out`.
- Drawer: `cubic-bezier(.2,.8,.2,1)`.

No usar:

- bounce;
- overshoot;
- spring exagerado;
- parallax;
- animaciones decorativas constantes.

---

## 21. Tokens CSS recomendados

```css
:root {
  --ls-ink: #161a24;
  --ls-text-secondary: #5b6475;
  --ls-muted: #8c95a6;

  --ls-canvas: #f7f8fb;
  --ls-surface: #ffffff;
  --ls-surface-subtle: #fafbfd;
  --ls-border: #e6eaf0;
  --ls-border-strong: #d7dce5;

  --ls-brand: #635bff;
  --ls-brand-hover: #574fe8;
  --ls-brand-active: #4d46d2;
  --ls-brand-soft: #f1efff;
  --ls-focus-ring: #d9d4ff;

  --ls-success: #16b364;
  --ls-success-soft: #eaf8f1;
  --ls-danger: #f04461;
  --ls-danger-soft: #feecee;
  --ls-warning: #f59e0b;
  --ls-warning-soft: #fff6e5;

  --ls-source-web: #5b3fe5;
  --ls-source-whatsapp: #765fea;
  --ls-source-linkedin: #9c88f1;
  --ls-source-form: #c9bff7;
  --ls-source-other: #dde1e8;

  --ls-radius-control: 12px;
  --ls-radius-card-secondary: 14px;
  --ls-radius-card: 16px;

  --ls-shadow-card: 0 4px 14px rgba(16, 24, 40, 0.04);
}

[data-theme="dark"] {
  --ls-ink: #f3f5f8;
  --ls-text-secondary: #aab3c2;
  --ls-muted: #7f899a;

  --ls-canvas: #0f1117;
  --ls-surface: #171b24;
  --ls-surface-subtle: #1f2430;
  --ls-border: #2a3140;
  --ls-border-strong: #394255;

  --ls-brand: #8a82ff;
  --ls-brand-hover: #9a93ff;
  --ls-brand-active: #786ff0;
  --ls-brand-soft: #26214a;
  --ls-focus-ring: #4e477d;

  --ls-success: #22c55e;
  --ls-danger: #fb7185;
  --ls-warning: #fbbf24;

  --ls-source-web: #8a82ff;
  --ls-source-whatsapp: #a099ff;
  --ls-source-linkedin: #bab4ff;
  --ls-source-form: #d4d0ff;
  --ls-source-other: #596477;

  --ls-shadow-card: none;
}
```

---

## 22. Configuración de gráficos

```ts
export const sourceColors = {
  light: {
    web: "#5B3FE5",
    whatsapp: "#765FEA",
    linkedin: "#9C88F1",
    form: "#C9BFF7",
    other: "#DDE1E8",
  },
  dark: {
    web: "#8A82FF",
    whatsapp: "#A099FF",
    linkedin: "#BAB4FF",
    form: "#D4D0FF",
    other: "#596477",
  },
} as const;

export const semanticColors = {
  light: {
    success: "#16B364",
    danger: "#F04461",
    warning: "#F59E0B",
  },
  dark: {
    success: "#22C55E",
    danger: "#FB7185",
    warning: "#FBBF24",
  },
} as const;
```

### 22.1 Orden de series

```ts
export const sourceOrder = [
  "web",
  "whatsapp",
  "linkedin",
  "form",
] as const;
```

### 22.2 Orden de apilado

```ts
export const stackedSourceOrder = [
  "form",
  "linkedin",
  "whatsapp",
  "web",
] as const;
```

---

## 23. Reglas de implementación para componentes

### 23.1 Convenciones

- No hardcodear colores en componentes.
- Consumir tokens.
- Separar tokens de marca, semánticos y de datos.
- No utilizar colores oficiales de marcas externas.
- Crear variantes `light` y `dark`.
- No duplicar markup entre temas.
- El tema debe cambiar mediante variables.

### 23.2 Componentes mínimos

```text
AppHeader
ModuleTabs
DateRangeSelect
Card
KpiCard
AlertBanner
Metric
ProgressRing
ProgressBar
LineChart
BarChart
StackedBarChart
DonutChart
ChartTooltip
SourceBreakdown
StageConversion
InsightsCard
Button
IconButton
Drawer
Dropdown
EmptyState
Skeleton
```

### 23.3 API sugerida para SourceBreakdown

```ts
type SourceKey = "web" | "whatsapp" | "linkedin" | "form" | "other";

interface SourceBreakdownItem {
  key: SourceKey;
  label: string;
  value: number;
  percentage: number;
}
```

---

## 24. Migración desde diseños antiguos

Cuando se reciba una pantalla antigua:

### Fase 1 — Estructura

- eliminar sidebar fija;
- colocar nombre de sección junto al menú;
- remover logo del header de trabajo;
- mover navegación a tabs;
- ubicar fecha a la derecha.

### Fase 2 — Jerarquía

- reducir títulos demasiado grandes;
- reducir bold;
- reorganizar cards;
- crear más aire;
- alinear números;
- eliminar bordes duplicados.

### Fase 3 — Color

- eliminar festival de colores;
- conservar morado;
- reemplazar colores por neutros;
- aplicar verde/rojo sólo semánticamente;
- migrar fuentes a escala morada.

### Fase 4 — Componentes

- unificar radios;
- unificar iconos;
- corregir botones;
- aplicar hover/focus;
- normalizar tooltips.

### Fase 5 — Validación

- comparar claro y oscuro;
- validar contraste;
- comprobar estados;
- verificar scroll;
- revisar responsive;
- revisar coherencia de gráficos.

---

## 25. Anti-patrones

No hacer:

- un color diferente por KPI;
- iconos con fondos saturados;
- logos externos a todo color;
- sidebar permanente;
- repetir `LeadSeed` y el nombre de sección;
- títulos en peso `800`;
- cards con sombras pesadas;
- gradientes morado-azul-verde;
- gráficos arcoíris;
- donut con demasiadas categorías;
- rojo para elementos no críticos;
- verde como decoración;
- amarillo para Formulario;
- animaciones con rebote;
- layouts sin espacio;
- bordes dentro de bordes sin necesidad;
- cards completas coloreadas por estado leve;
- texto secundario con contraste insuficiente.

---

## 26. Checklist de calidad visual

### Estructura

- [ ] El nombre de sección está junto al menú hamburguesa.
- [ ] No existe sidebar fija.
- [ ] No se duplica LeadSeed en el header de trabajo.
- [ ] Las tabs están en una sola fila.
- [ ] El filtro de fecha está alineado a la derecha.
- [ ] El scroll es vertical.

### Color

- [ ] La interfaz es principalmente neutral.
- [ ] El morado es acento, no fondo dominante.
- [ ] El verde sólo comunica éxito o crecimiento.
- [ ] El rojo sólo comunica alerta o riesgo.
- [ ] El ámbar sólo comunica advertencia.
- [ ] Las fuentes utilizan escala morada.
- [ ] No hay colores oficiales de WhatsApp o LinkedIn.

### Tipografía

- [ ] Inter o equivalente.
- [ ] Pesos 400/500.
- [ ] Peso 600 sólo cuando es necesario.
- [ ] Los números están alineados.
- [ ] No hay títulos gritados.

### Cards

- [ ] Bordes de 1 px.
- [ ] Radios 14–16 px.
- [ ] Sombras mínimas.
- [ ] Padding suficiente.
- [ ] No hay cards innecesariamente anidadas.

### Gráficos

- [ ] Ejes discretos.
- [ ] Tooltips claros.
- [ ] Leyenda consistente.
- [ ] Orden de fuentes fijo.
- [ ] Colores por token.
- [ ] No hay multicolor innecesario.
- [ ] No se depende sólo del color.

### Accesibilidad

- [ ] Contraste AA.
- [ ] Focus visible.
- [ ] Navegación por teclado.
- [ ] Icon buttons con aria-label.
- [ ] Gráficos con descripción o tabla alternativa.

### Dark mode

- [ ] No parece una inversión automática.
- [ ] El fondo tiene profundidad sin neón.
- [ ] Los bordes son visibles.
- [ ] El morado no está sobresaturado.
- [ ] Las superficies se distinguen.
- [ ] El texto secundario sigue siendo legible.

---

## 27. Criterio de aceptación final

Una pantalla se considera correctamente adaptada cuando:

1. se reconoce como parte de LeadSeed sin depender de un logo grande;
2. comparte estructura con Overview, Pipeline y Tareas;
3. se siente limpia y empresarial;
4. utiliza morado de forma controlada;
5. utiliza semántica de color correctamente;
6. mantiene la escala morada para fuentes;
7. funciona igual en claro y oscuro;
8. puede crecer sin convertirse en un monolito visual;
9. no contiene elementos decorativos que compitan con los datos;
10. otra IA puede implementar la pantalla sin inventar reglas nuevas.

---

## 28. Resumen de reglas maestras

```text
NEUTROS PRIMERO.
MORADO COMO ACENTO.
VERDE, ROJO Y ÁMBAR SÓLO PARA SEMÁNTICA.
FUENTES Y CANALES EN ESCALA MONOCROMÁTICA MORADA.
SIN SIDEBAR FIJA.
HAMBURGUESA + NOMBRE DE SECCIÓN EN EL HEADER.
TABS HORIZONTALES.
INTER 400/500.
BORDES DE 1 PX.
RADIOS DE 12–16 PX.
SOMBRAS MÍNIMAS.
GRÁFICOS LIMPIOS.
MODO OSCURO SIN NEÓN.
ESPACIO EN BLANCO COMO PARTE DEL DISEÑO.
```
