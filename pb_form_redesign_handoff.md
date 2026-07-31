# Handoff Tecnico - Rediseno Formulario PB

Fecha: 2026-07-29
Proyecto fuente: `C:\Users\henti\OneDrive\Documentos\ISAPRE\PlanesPro\landing-gerow`
Rama observada al cierre: `fix/agenda-url-bug`
Objetivo estrategico: mantener el rediseno de `/pb` alineado con la migracion total del backend hacia Supabase, sin reintroducir logica nueva en Cloudflare.

## 1. Contexto funcional

`/pb` es el formulario de captacion para publicidad y uso multiusuario.

No es el formulario principal de `planespro.cl`.

Diferencia operativa:
- `planespro.cl`: formulario principal de la pagina, ligado al flujo general de la marca.
- `/pb`: formulario de captacion por links individuales de usuarios/campanas.

Cada link de `/pb` debe:
- pertenecer a un usuario concreto
- poder tener nombre interno
- poder asociarse a una campana
- registrar leads propios de ese owner
- bloquear agenda del owner correcto
- persistir metadata suficiente para analitica posterior

## 2. Estado actual confirmado

### Backend / datos

Ya se confirmo que Supabase persiste correctamente la metadata nueva del journey de PB.

En particular:
- `metadata.intake_journey.step1` ya se esta guardando
- contiene respuestas tipo:
  - `motivo`
  - `necesidad`
  - `objetivo`
  - `grupo`
  - `resumen`

La conclusion importante es:
- el problema principal ya no es de persistencia backend
- el problema principal es de alineacion UI/render/build del formulario `/pb` y de su reflejo en el detalle del lead

### Frontend / links

Se avanzo en la idea de acortar links de `/pb`.

Decision de producto:
- no usar `slug` manual
- usar `short_code` corto
- el link visible/copiable debe ser realmente corto
- formato objetivo: `https://planespro.cl/pb/<short_code>`

Estado:
- se hicieron intentos de acortamiento
- hubo confusion entre `ref=pp-...`, ids largos y rutas cortas
- el objetivo final todavia debe dejarse completamente consistente en UI, routing y resolucion del owner

### UI del nuevo formulario PB

Se definio un rediseno en 3 pasos.

Paso 1:
- exploracion de necesidad del cliente
- tres preguntas encadenadas
- la experiencia debe sentirse mas humana y menos "venta automatica"

Paso 2:
- situacion del cliente
- reutiliza logica actual del formulario, pero con presentacion distinta

Paso 3:
- datos de contacto
- tambien reutiliza logica existente de validacion/captura

## 3. Decisiones de UX ya tomadas

Estas decisiones ya se discutieron y deben respetarse al retomar:

### Estructura general

- El flujo es un rediseno del formulario existente, no un formulario paralelo nuevo.
- Debe ser 100% responsive.
- Debe verse primero para movil y luego adaptarse a desktop.
- `/pb` debe verse limpio, nitido y neutral, usando azules de PlanesPro.
- No usar estilo generico de "cajas blancas AI" innecesarias ni bloques torpes.

### Paso 1

- El usuario responde 3 preguntas.
- Cada respuesta seleccionada debe comprimir/cerrar la seccion anterior.
- Al finalizar las tres respuestas, debe quedar un resumen compacto.
- Todo debe caber en una sola pantalla movil sin scroll, o con el minimo scroll fisicamente razonable.

Cambios explicitamente pedidos:
- compactar header
- compactar linea de progreso
- bajar tamano del titulo
- eliminar el texto largo:
  - "No es una venta automatica. Primero revisaremos..."
- hacer mas compactas las cajas de respuestas elegidas
- los textos de apoyo deben quedar en una sola linea
- si en la tercera pregunta se elige una opcion, las otras opciones deben desaparecer/contraerse
- el boton `Continuar` debe quedar fijo como pie/toolbar inferior

### Paso 2

Cambios explicitamente pedidos:
- eliminar subtitulo "Tu situacion"
- mover `Edad` al lado del desplegable que corresponda
- estandarizar titulo, subtitulo y secciones con el mismo lenguaje visual del paso 1 y 3
- el boton de volver no debe ser un boton textual grande
- debe ser una flecha atras junto al CTA principal
- layout del pie: proporcion aproximada 20 / 80 entre volver y continuar

### Paso 3

Cambios explicitamente pedidos:
- estandarizar titulos y subtitulos con pasos anteriores
- mantener botones inferiores en la misma posicion que en pasos previos
- consistencia vertical y de altura de pantalla

### Stepper / progreso

Cambios explicitamente pedidos:
- la linea horizontal debe cruzar los circulos por el centro real
- el stepper debe verse alineado en movil y desktop

## 4. Problemas de UI detectados en la ultima iteracion

Se detectaron estos problemas concretos:

- el formulario nuevo de `/pb` se veia dentro de un marco/simulador que no corresponde a produccion final
- exceso de altura y scroll innecesario
- textos de apoyo demasiado largos
- las cajas de respuestas seleccionadas quedaban demasiado grandes
- la tercera pregunta seguia mostrando opciones no contraidas
- pie inferior inconsistente entre pasos
- paso 2 y 3 no seguian el mismo criterio visual del paso 1
- la linea del progreso no cruzaba el centro de los puntos

## 5. Integracion con MENSAJES / extension

La extension debe poder mostrar las nuevas respuestas de exploracion de paso 1 en el modal de detalle del lead.

No basta con guardarlas en backend.

Pendiente funcional:
- renderizar en el detalle del lead las nuevas respuestas del journey de PB
- mantener orden legible dentro de la ficha
- hacerlo sin desordenar el modal ni romper el resto de campos ya existentes

Lo ya confirmado:
- los datos nuevos ya pueden estar llegando a Supabase
- la UI del detalle del lead todavia no estaba reflejando correctamente esa nueva metadata en todas las pruebas

## 6. Restricciones tecnicas importantes

Estas restricciones deben respetarse al continuar:

- No mezclar el formulario principal de `planespro.cl` con el flujo de `/pb`.
- No reintroducir backend nuevo en Cloudflare para resolver `/pb`.
- Si se toca routing o resolucion de links, debe quedar encaminado a Supabase.
- No romper el formulario principal de `planespro.cl`.
- No romper noticias/blog ni otras rutas publicas.
- No tocar el bloque de Leads de la otra IA si sigue reservado.

## 7. Lo que falta para cerrar `/pb`

### Bloque A - Links cortos

- hacer que la generacion visible del link use `short_code` corto real
- mostrar y copiar en Ajustes > Links solo `https://planespro.cl/pb/<short_code>`
- asegurar resolucion correcta del owner desde ese `short_code`

### Bloque B - UI 3 pasos

- dejar el flujo 3 pasos visualmente terminado
- responsive real para movil
- footer inferior consistente
- altura calculada correctamente para que quepa en pantalla
- progresion visual limpia y uniforme

### Bloque C - Persistencia visible en CRM

- mostrar respuestas nuevas de step 1 en detalle del lead
- validar orden y etiquetado
- dejarlo listo para futuras metricas

### Bloque D - Analitica futura

Luego:
- explotar `motivo`, `necesidad`, `objetivo`, `grupo` y `resumen`
- usar esos datos por link/campana/owner
- incorporarlo a dashboard o analitica de adquisicion

## 8. Recomendacion para la siguiente sesion

Orden recomendado de trabajo:

1. Confirmar en codigo y en una prueba real que `/pb/<short_code>` resuelve al owner correcto.
2. Terminar el layout responsive del formulario de 3 pasos.
3. Hacer prueba end-to-end enviando un lead desde `/pb`.
4. Verificar en Supabase la metadata `intake_journey.step1`.
5. Reflejar esas respuestas en el modal de detalle del lead en MENSAJES.

## 9. Resumen corto para pegar en una nueva conversacion

Estamos retomando el rediseno del formulario `https://planespro.cl/pb/<short_code>`.

El backend en Supabase ya persiste `metadata.intake_journey.step1` con respuestas nuevas de exploracion. El problema principal pendiente no es backend sino UI/routing/render:
- links PB deben verse cortos y copiarse como `/pb/<short_code>`
- el formulario PB debe quedar en 3 pasos, responsive real y compacto
- el paso 1 debe contraer respuestas y caber en pantalla movil
- el stepper debe alinearse correctamente
- el footer de acciones debe quedar consistente
- la extension MENSAJES debe mostrar esas nuevas respuestas en el detalle del lead

No mezclar esto con el formulario principal de `planespro.cl` y no reintroducir logica nueva en Cloudflare.
