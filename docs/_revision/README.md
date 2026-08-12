# Candidatos a eliminacion

Estos documentos ya no reflejan el estado real del proyecto. Se movieron aca en vez de borrarlos
para que la decision sea del usuario, no de una IA.

Nada de lo que esta en esta carpeta debe usarse como fuente de verdad. Si necesitas el estado actual,
ve a `docs/planning/roadmap.md`.

## handoff-2026-07-30.md

Antes `HANDOFF_NEXT_SESSION.md` en la raiz.

**Por que esta obsoleto:** declara explicitamente que comunidad, foro, chat, intercambio de leads,
reputacion y marketplace "no es el alcance actual". Chat, comunidad y foro se construyeron despues
(commits `22e1a3a`, `e4e3f5a`). El documento contradice el codigo y, estando en la raiz, cualquier
sesion nueva lo leia como vigente.

**Valor residual:** las decisiones de arquitectura de la seccion 2 (Supabase como fuente de las
alertas, Cloudflare fuera de la cadena, realtime primario con `chrome.alarms` a 30s solo como
reconciliacion) siguen siendo validas y no estan registradas en otro lado. Conviene extraerlas al
roadmap antes de borrar este archivo.

**Recomendacion:** extraer la seccion 2 al roadmap, despues eliminar.

## pb-form-redesign-2026-07-29.md

Antes `pb_form_redesign_handoff.md` en la raiz.

**Por que esta obsoleto:** es un handoff sobre el rediseño de `/pb`, que vive en el repo
`landing-gerow`. Ese frente avanzo bastante despues de la fecha del documento.

**Recomendacion:** verificar vigencia contra el estado real de `landing-gerow` antes de reusarlo. Si
no aporta nada que el roadmap no tenga, eliminar.

## implementation_plan.md

2314 lineas. Misma fecha de control que el roadmap antes de esta pasada: `2026-07-22`.

**Por que esta aca:** solapa fuertemente con `docs/planning/roadmap.md`. Es la version "auditoria
arquitectonica" del mismo estado que el roadmap resume como plan de tareas. Mantener dos documentos
de planeacion desincronizados fue una de las causas de la deriva documental que encontro la auditoria
del `2026-08-11`.

**Cuidado antes de borrar:** el protocolo lo cita como documento operativo de Nivel 2 en su seccion
4.2, y varias secciones del protocolo mandan actualizarlo. Si se elimina, **hay que actualizar
`PROTOCOLO_CONTROL.md` en el mismo movimiento**, o el protocolo quedara exigiendo mantener al dia un
archivo que no existe.

**Recomendacion:** decidir explicitamente si el roadmap absorbe su contenido unico. Es el unico de
los tres que requiere un cambio normativo para poder eliminarse.
