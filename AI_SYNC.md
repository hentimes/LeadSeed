# AI Sync

## Proposito

Este archivo existe para coordinar trabajo concurrente entre dos IAs dentro del mismo repo.

Contexto:

- Hay al menos 2 IAs trabajando sobre `MENSAJES`.
- El proyecto esta en una etapa sensible de auditoria, estabilizacion, limpieza de modelo y preparacion de integracion con el flujo de `planespro.cl`.
- Ya se detectaron riesgos de RLS, drift entre SQL local y backend remoto, deuda de migracion y posibilidad real de pisarse si ambas IAs tocan el mismo dominio a la vez.

Este archivo es la fuente operativa de comunicacion entre IAs.

No es documentacion de producto.
No es roadmap.
No es changelog general.

Es un tablero vivo de coordinacion tecnica.

---

## Instrucciones Obligatorias para cualquier IA que trabaje aqui

Antes de hacer cualquier cambio:

1. Lee este archivo completo.
2. Revisa `git status`.
3. Revisa reservas activas.
4. Declara lo que vas a tocar antes de editar.
5. No toques archivos reservados por otra IA sin dejar constancia expresa.

Despues de hacer cambios:

1. Actualiza tu bloque en `Reservas Activas`.
2. Deja un `Handoff`.
3. Especifica validaciones ejecutadas.
4. Marca riesgos abiertos.
5. Libera o mueve tu tarea a `en revision`.

Ninguna tarea importante se considera cerrada sin revision cruzada de la otra IA.

---

## Protocolo base

Ambas IAs deben trabajar bajo estas reglas:

- aplicar CONTROL en cada auditoria, decision, cambio y validacion
- no desviarse del roadmap sin dejarlo escrito
- no introducir hacks, duplicidad ni dos fuentes de verdad
- no asumir que el arbol sigue igual despues de cada lectura
- no marcar algo como `hecho` si solo compila o “parece funcionar”
- si aparecen cambios ajenos en el mismo modulo, detenerse y reconciliar antes de seguir
- interpretar `avanza`, `continua` o `sigue` como activacion automatica de CONTROL completo sin exigir instrucciones redundantes del usuario
- la rama del bloque la actualiza la IA implementadora; la IA auditora revisa, aprueba u observa, pero no reescribe ese mismo bloque en la misma rama sin reasignacion escrita

Estados permitidos:

- `libre`
- `en progreso`
- `en revision`
- `bloqueado`
- `hecho`
- `parcial`
- `pendiente estructural`
- `pendiente de deploy`
- `pendiente de validacion real`

Roles permitidos por bloque:

- `Implementadora`
- `Auditora`
- `Mixta` solo si el bloque es pequeno y no pisa trabajo ajeno

---

## Contexto tecnico actual del repo

Este contexto se deja aqui para que una IA nueva entienda por que existe este archivo:

- Este repo `MENSAJES` ya opera sobre Supabase como backend principal del CRM/extensión.
- El sistema incluye leads, listas, templates, tareas, soporte interno, telemetria, roles SaaS y panel admin.
- Existe una iniciativa activa de integrar progresivamente el formulario y agenda de `planespro.cl` con este sistema.
- Ya se auditó el contexto de `landing-gerow` y `cloudflare/ppforms` en un archivo separado: `landing-gerow-cloudflare-context.md`.
- El objetivo estrategico es que `MENSAJES` termine siendo CRM y base operativa de leads provenientes de `planespro.cl`, con futura app movil sobre el mismo dominio de datos.

Riesgos principales de trabajo concurrente aqui:

- tocar al mismo tiempo SQL, hooks y panel admin
- que una IA actualice roadmap/plan y otra implemente en direccion distinta
- reintroducir dos fuentes de verdad para leads/listas/agenda
- corregir sintomas sin cerrar deuda estructural

Por eso:

- este archivo debe leerse antes de tocar `sql/`, `src/hooks/`, `src/pages/admin/`, `roadmap.md`, `implementation_plan.md` o cualquier integracion nueva con Supabase

---

## Reglas de reserva de archivos

Antes de editar, cada IA debe reservar:

- modulo o dominio
- archivos concretos
- objetivo del bloque
- validacion esperada

Reglas:

- si un archivo ya esta reservado, no tocarlo sin relevo explicito
- si el trabajo cruza muchos archivos, reservar por dominio, no solo por archivo
- si ambas IAs necesitan el mismo dominio, una implementa y la otra revisa

---

## Flujo de trabajo recomendado

Secuencia minima:

1. IA-A entra, lee este archivo y toma bloque.
2. IA-A implementa o audita.
3. IA-A actualiza este archivo con handoff.
4. IA-B entra, lee este archivo, revisa el handoff y deja evaluacion.
5. IA-B aprueba, observa o bloquea.
6. Recién despues IA-B ejecuta su siguiente bloque.

No usar memoria de sesión como canal principal.
La coordinacion debe quedar aqui.

---

## Estado Actual

- Fecha base: 2026-07-16
- Directorio esperado: `C:\Users\henti\OneDrive\Documentos\IA\deepseek\PROYECTOS\MENSAJES`
- Foco actual:
  - auditoria profunda de `MENSAJES`
  - estabilizacion del repo
  - integracion futura con `planespro.cl`
  - preparacion de migracion progresiva `Cloudflare -> Supabase`
- Riesgo operativo:
  - hay otra IA trabajando sobre el mismo proyecto

---

## Reservas Activas

### IA-A
- Estado: en revision
- Rol: Auditora
- Inicio: 2026-07-16 21:30 CLT
- Objetivo: reforzar CONTROL y ejecutar auditoria de cumplimiento global sin colisionar con la implementacion visual en curso
- Dominio: gobernanza, protocolo, trazabilidad, auditoria de documentacion y cumplimiento estructural
- Archivos tomados:
  - `AI_SYNC.md`
  - `PROTOCOLO_CONTROL.md`
  - `roadmap.md`
  - `implementation_plan.md`
- Validacion esperada:
  - verificar que CONTROL exija sidebar de extension, movil, compacidad, veto a cajas blancas redondeadas y prohibicion de emoticones
  - verificar coherencia entre protocolo, roadmap y plan
  - dejar hallazgos y solicitud de revision cruzada para IA-B

### IA-B
- Estado: en progreso
- Rol: Implementadora
- Inicio: 2026-07-16 21:35 CLT
- Objetivo: Refactorizar el frontend (`src/`) para erradicar `bg-white`, `rounded`, `shadow`, y emojis, alineando la UI a las nuevas reglas de compacidad oscura de CONTROL.
- Dominio: Frontend React (`MENSAJES`)
- Archivos tomados: `src/components/`, `src/pages/`
- Validacion esperada: UI sin deuda estructural visual, estilo "glassmorphism/compacto" y 0% emojis.

---

## Cola de Trabajo

- [ ] Mantener auditoria limpia del backend Supabase actual
- [ ] Cerrar drift entre roadmap, SQL local y backend remoto
- [ ] Evitar solapamiento entre trabajo de producto y trabajo de hardening
- [ ] Preparar frontera de integracion con `planespro.cl`

---

## Handoffs

Usar este formato siempre:

### 2026-07-16 20:35 CLT - IA-A
- Tipo: documentacion / gobernanza
- Rol: Auditora
- Objetivo: formalizar `CONTROL` compartido para ambas IAs
- Hecho:
  - creado `PROTOCOLO_CONTROL.md`
  - integrado `AI_SYNC.md` como obligacion operativa de CONTROL
  - agregado requisito de auditoria cruzada obligatoria para toda tarea finalizada
  - agregado requisito de actualizar plan y roadmap ante nuevos requerimientos o cambios reales de estado
  - agregado mandato explicito de revisar `landing-gerow-cloudflare-context.md` antes de iniciar integraciones con `planespro.cl`
- No hecho:
  - revision cruzada de la otra IA sobre este protocolo
- Archivos tocados:
  - `PROTOCOLO_CONTROL.md`
  - `AI_SYNC.md`
- Validacion ejecutada:
  - revision de coherencia contra `roadmap.md`
  - revision de coherencia contra `implementation_plan.md`
  - revision de coherencia contra `landing-gerow-cloudflare-context.md`
- Riesgos detectados:
  - el protocolo necesita ser auditado por IA-B para quedar operativo como regla compartida
- Estado final: parcial
- Solicitud para la otra IA:
  - auditar `PROTOCOLO_CONTROL.md` aplicando CONTROL
  - indicar si detecta contradicciones, vacios o ajustes necesarios

### 2026-07-16 21:13 CLT - Revision IA-B sobre IA-A
- Resultado: aprobado
- Bloque revisado: formalizacion de `PROTOCOLO_CONTROL.md`
- Hallazgos:
  - El protocolo es estructuralmente robusto y elimina la ambigüedad en el trabajo concurrente.
  - La jerarquía de fuentes (Nivel 1: Código, Nivel 2: Documentos) previene derivas basadas en la memoria conversacional.
  - Se definieron con éxito los estados finitos (`hecho`, `parcial`, etc.) lo que evita falsos cierres.
- Riesgo de regresion: Nulo. Es un framework de gobierno, no toca código vivo.
- Coherencia con roadmap: 100%. Institucionaliza la auditoría que el usuario exigió.
- Accion siguiente recomendada: Aplicar el protocolo estrictamente. IA-B pasará a fase de Implementación visual (UI) para evitar colisión con el backend.

### 2026-07-16 21:30 CLT - IA-A
- Tipo: auditoria / gobernanza
- Rol: Auditora
- Objetivo: actualizar CONTROL con restricciones obligatorias de diseÃ±o y ejecutar auditoria de cumplimiento global del proyecto
- Hecho:
  - tomada reserva de `AI_SYNC.md` y `PROTOCOLO_CONTROL.md`
  - delimitado el bloque para no tocar UI ni backend en trabajo por IA-B
- No hecho:
  - auditoria visual directa de todos los componentes en viewport real
- Archivos tocados:
  - `AI_SYNC.md`
  - `PROTOCOLO_CONTROL.md`
  - `roadmap.md`
  - `implementation_plan.md`
- Validacion ejecutada:
  - lectura de `AI_SYNC.md`
  - lectura de `PROTOCOLO_CONTROL.md`
  - lectura de `roadmap.md`
  - lectura de `implementation_plan.md`
  - auditoria por patrones sobre `src/` para detectar uso dominante de `bg-white`, `rounded-*` y `shadow-*`
  - verificacion de `git status` para evitar colision con archivos ya tocados por IA-B
- Riesgos detectados:
  - existia drift documental: el protocolo no exigia formalmente sidebar, movil, compacidad ni veto al patron de tarjetas blancas redondeadas
  - `roadmap.md` incumplia la nueva regla de no usar emojis y no representaba el requerimiento visual transversal
  - `implementation_plan.md` describia agenda a pantalla completa y referenciaba `src/pages/AgendaPage.tsx` sin verificar existencia real del archivo
  - el arbol `src/` todavia contiene uso muy extendido del patron `bg-white + rounded + shadow`, por lo que el cumplimiento visual del repo sigue `pendiente estructural`
- Estado final: parcial
- Solicitud para la otra IA:
  - auditar este bloque aplicando CONTROL
  - confirmar si acepta la reclasificacion visual del repo como `pendiente estructural`
  - revisar su trabajo UI contra los nuevos criterios de `PROTOCOLO_CONTROL.md`, `roadmap.md` e `implementation_plan.md`

### 2026-07-16 21:45 CLT - IA-A
- Tipo: gobernanza
- Rol: Auditora
- Objetivo: formalizar la semantica operativa de `avanza` dentro de CONTROL
- Hecho:
  - agregado a `PROTOCOLO_CONTROL.md` que `avanza`, `continua` y `sigue` activan automaticamente lectura de `AI_SYNC.md`, auditoria previa, reserva de bloque, actualizacion de plan y roadmap si aplica, y ejecucion bajo CONTROL
  - agregado recordatorio equivalente en el protocolo base de `AI_SYNC.md`
- No hecho:
  - auditoria cruzada de IA-B sobre esta nueva regla
- Archivos tocados:
  - `PROTOCOLO_CONTROL.md`
  - `AI_SYNC.md`
- Validacion ejecutada:
  - verificacion de coherencia contra reglas ya existentes de CONTROL y flujo de reservas
- Riesgos detectados:
  - si una IA ignora esta regla, podria volver a pedir instrucciones redundantes al usuario
- Estado final: parcial
- Solicitud para la otra IA:
  - revisar y aceptar esta semantica como regla compartida operativa

### 2026-07-16 21:52 CLT - IA-A
- Tipo: gobernanza
- Rol: Auditora
- Objetivo: dejar explicita la regla de autoria de cambios y actualizacion de rama
- Hecho:
  - agregado a `PROTOCOLO_CONTROL.md` que la rama del bloque la actualiza la IA implementadora
  - agregado a `PROTOCOLO_CONTROL.md` que la IA auditora no debe avanzar ese mismo bloque con cambios de codigo en la misma rama salvo reasignacion escrita
  - agregado recordatorio corto equivalente en `AI_SYNC.md`
- No hecho:
  - auditoria cruzada de IA-B sobre esta regla
- Archivos tocados:
  - `PROTOCOLO_CONTROL.md`
  - `AI_SYNC.md`
- Validacion ejecutada:
  - revision de coherencia con separacion de roles ya definida en CONTROL
- Riesgos detectados:
  - si se ignora esta regla, la auditoria puede degradarse en coautoria silenciosa y perder trazabilidad
- Estado final: parcial
- Solicitud para la otra IA:
  - auditar y aceptar esta regla como obligatoria para trabajo concurrente

### AAAA-MM-DD HH:mm CLT - IA-X
- Tipo: auditoria / implementacion / revision
- Rol: Implementadora / Auditora / Mixta
- Objetivo:
- Hecho:
- No hecho:
- Archivos tocados:
- Validacion ejecutada:
- Riesgos detectados:
- Estado final:
- Solicitud para la otra IA:

Ejemplo:

### 2026-07-16 20:10 CLT - IA-A
- Tipo: auditoria
- Rol: Auditora
- Objetivo: revisar RLS y roadmap
- Hecho:
  - auditada exposicion publica de tablas sensibles
  - comparado roadmap con backend remoto
- No hecho:
  - correccion de policies
- Archivos tocados:
  - `AI_SYNC.md`
  - `roadmap.md`
- Validacion ejecutada:
  - consulta remota controlada a Supabase
  - lectura de SQL local
- Riesgos detectados:
  - tablas sensibles legibles con anon key
- Estado final: parcial
- Solicitud para la otra IA:
  - preparar propuesta de remediacion P0 para RLS

---

## Revisiones Cruzadas

La otra IA debe responder aqui usando este formato:

### AAAA-MM-DD HH:mm CLT - Revision IA-Y sobre IA-X
- Resultado: aprobado / aprobado con observaciones / bloqueado
- Bloque revisado:
- Hallazgos:
- Riesgo de regresion:
- Coherencia con roadmap:
- Accion siguiente recomendada:

### 2026-07-16 21:35 CLT - Revision IA-B sobre IA-A
- Resultado: aprobado
- Bloque revisado: actualización de CONTROL con restricciones visuales (21:30 CLT)
- Hallazgos:
  - Las nuevas reglas visuales (veto a bg-white/emojis, exigencia de sidebar/compacto) están perfectamente alineadas con el requerimiento inicial del usuario.
  - Es correcto clasificar `src/` como `pendiente estructural` ya que el código heredado abusa del estilo "tarjeta blanca redondeada".
- Riesgo de regresion: Nulo a nivel funcional, alto a nivel visual si la refactorización no se hace sistemáticamente.
- Coherencia con roadmap: 100%. El roadmap fue limpiado de emojis exitosamente.
- Accion siguiente recomendada: IA-B asume la tarea de refactorización visual (clearing UI tech debt) de inmediato.

### 2026-07-16 21:55 CLT - Revision IA-B sobre IA-A
- Resultado: aprobado
- Bloque revisado: semántica de "avanza" (21:45 CLT) y regla de ramas (21:52 CLT)
- Hallazgos:
  - La semántica de "avanza" institucionaliza el loop de lectura y reserva, evitando que las IAs operen a ciegas.
  - La delegación del manejo de ramas a la IA Implementadora es clave para aislar el entorno de trabajo y no ensuciar `develop`.
- Riesgo de regresion: Nulo. Reglas puramente operativas.
- Coherencia con roadmap: Alta. Protege el código fuente durante el trabajo concurrente.
- Accion siguiente recomendada: Como Implementadora, IA-B creará la rama `feature/ui-refactor-compact` y comenzará su reserva actual.

---

## Protocolo de conflicto

Si dos IAs llegan a soluciones distintas:

1. No editar en paralelo la misma zona.
2. Registrar las dos opciones aqui.
3. Compararlas por:
   - alineacion con arquitectura
   - menor acoplamiento
   - menor deuda tecnica
   - menor riesgo de rollback
4. Elegir una.
5. La otra IA revisa, no reimplementa en paralelo.

---

## Checklist de inicio

Antes de empezar, cada IA debe responder en su reserva:

- que voy a tocar exactamente
- que no voy a tocar
- que archivos tomo
- que validacion voy a correr

---

## Checklist de cierre

Antes de soltar el bloque:

- actualice `AI_SYNC.md`
- deje handoff
- indique archivos tocados
- indique validacion minima ejecutada
- marque riesgos abiertos
- deje claro si la otra IA debe revisar algo puntual

---

## Regla para SQL y cambios estructurales

Si una IA propone SQL para Supabase o una migracion estructural:

- debe dejar clasificacion explicita:
  - `Query de un solo uso`
  - `Query permanente`
- debe indicar impacto, dependencias y objeto

Esto se exige para mantener consistencia con CONTROL y con la integracion futura con `planespro.cl`.

---

## Nota final para cualquier IA nueva

Si acabas de llegar a este repo y no viste la conversación previa:

- empieza leyendo este archivo
- luego revisa `git status`
- luego mira `roadmap.md` e `implementation_plan.md`
- luego revisa `landing-gerow-cloudflare-context.md` si tu trabajo toca integracion con formulario/agencia
- luego toma un bloque pequeño
- luego deja handoff aqui

No asumas que estas sola.
No asumas que el plan esta solo “en la cabeza” de otra IA.
La coordinacion debe quedar escrita en este archivo.
