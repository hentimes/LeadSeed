# Documentacion de LeadSeed

Mapa de donde vive cada cosa. Se reorganizo el `2026-08-12`: antes eran nueve `.md` sueltos en la
raiz del repositorio, sin jerarquia ni indicacion de cual seguia vigente.

## Que queda en la raiz del repo, y por que

Solo lo normativo y lo que las herramientas esperan encontrar ahi:

- `PROTOCOLO_CONTROL.md` - metodologia obligatoria de trabajo. No se mueve: es la primera lectura de
  cualquier persona o IA que entra al proyecto.
- `AI_SYNC.md` - registro de auditoria y coordinacion. No se mueve ni se reescribe: hacerlo destruye
  la trazabilidad que el protocolo exige preservar.
- `README.md` - presentacion del producto.

## docs/planning - vigente

| Archivo | Que es |
|---|---|
| `roadmap.md` | Fuente de verdad de planeacion. Secciones 12 y 13 son las tareas abiertas. |
| `ux-ui-checklist.md` | Checklist visual por fases. Pendiente de fusionar dentro del roadmap. |

## docs/integrations - vigente con reservas

| Archivo | Estado |
|---|---|
| `planespro-form-integration-contract.md` | **Incompleto.** Declara dos canales publicos cuando existen cuatro (`general`, `pb`, `retiro`, `form`) y no documenta el protocolo de dos fases. Ver roadmap 13.11. |
| `landing-gerow-cloudflare-context.md` | Contexto operativo de `landing-gerow` y Cloudflare. **Version 2.0 del `2026-08-12`**, reescrito y verificado contra `origin/master`. Lectura obligatoria (protocolo seccion 7) antes de tocar la integracion con `planespro.cl`. |

## docs/auditorias

`AUDITORIA_CONTROL_2026-08-11.md` - auditoria integral en cinco frentes con el plan de accion en 10
bloques del que sale toda la Seccion 13 del roadmap.

## docs/redesign

Material del frente de rediseño visual (bloque 7). La carpeta se llamaba `rediseño leadseed/`, con
espacio y tilde: fragil para tooling cross-platform.

## docs/design-assets

PDFs de referencia visual.

Nota honesta sobre el peso: sacarlos del control de versiones **no reduciria el tamaño del clon**,
porque los blobs siguen en el historial de git. Solo un reescritura de historial lo lograria, y eso
es disruptivo para cualquiera que tenga el repo clonado. Se opta por ordenarlos, no por purgarlos.

## docs/_revision - eliminada el 2026-08-13

Contenia tres documentos obsoletos que se conservaban a la espera de decision. Resuelto:

- `handoff-2026-07-30.md`: sus decisiones de arquitectura de alertas se extrajeron al roadmap
  (capitulo 13.1.d) y el resto estaba contradicho por el codigo. Eliminado.
- `pb-form-redesign-2026-07-29.md`: su contenido vive hoy, verificado y actualizado, en
  `integrations/planespro-form-integration-contract.md` y en `landing-gerow-cloudflare-context.md`,
  ambos en version 2.0. Eliminado.
- `implementation_plan.md`: absorbido por `planning/roadmap.md`, que es lo que ya venia pasando de
  hecho. El protocolo lo citaba en siete sitios como documento operativo de Nivel 2; esas
  referencias se redirigieron al roadmap en el mismo movimiento, porque borrarlo sin eso habria
  dejado al protocolo exigiendo mantener al dia un archivo inexistente.

