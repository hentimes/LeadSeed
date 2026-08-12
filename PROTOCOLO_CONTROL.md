# Protocolo CONTROL

Version: 1.1  
Proyecto: `LeadSeed`  
Fecha base: 2026-07-16  
Ultima revision: 2026-07-31  
Estado: vigente  

> Cambio 1.1 (2026-07-31): el proyecto paso a llamarse `LeadSeed`. Se actualizaron
> nombre y rutas de este documento y del resto de la documentacion normativa.
> Ruta de trabajo actual: `C:/Users/henti/OneDrive/Documentos/IA/deepseek/PROYECTOS/LeadSeed-Project/LeadSeed`.
> Repositorio actual: `github.com/hentimes/LeadSeed` (privado).
> `AI_SYNC.md` conserva deliberadamente el nombre historico `MENSAJES` en sus
> entradas previas: es un registro de auditoria y reescribirlo destruiria trazabilidad.

---

## 1. Naturaleza del protocolo

`CONTROL` es la metodologia obligatoria de trabajo para este proyecto.

No es una sugerencia.
No es una pauta blanda.
No es un checklist opcional.

Es la capa de gobierno tecnico que define como se revisa, decide, ejecuta, valida, documenta y coordina cualquier cambio en `LeadSeed` y en su futura integracion con `planespro.cl`.

Toda IA que trabaje en este repositorio debe seguirlo.

Si hay conflicto entre rapidez y coherencia, prevalece CONTROL.
Si hay conflicto entre intuicion y evidencia, prevalece CONTROL.
Si hay conflicto entre “parece funcionar” y validacion real, prevalece CONTROL.

---

## 2. Objetivo de CONTROL

El objetivo de CONTROL es asegurar que cada cambio:

- respete el plan y roadmap vigentes
- mantenga vivos y actualizados el plan y el roadmap ante nuevos requerimientos
- no reintroduzca monolitos, hacks, parches o fuentes duplicadas de verdad
- mantenga coherencia con la arquitectura activa del proyecto
- deje trazabilidad suficiente para que otra IA o persona entienda:
  - que se hizo
  - por que se hizo
  - que se decidio no tocar
  - que riesgos siguen abiertos
- no declare avances falsos
- no rompa la futura integracion entre `LeadSeed` y `planespro.cl`

---

## 3. Alcance

CONTROL aplica a:

- codigo frontend
- codigo backend
- SQL
- RLS
- realtime
- auth
- storage
- roadmap
- implementation plan
- documentacion tecnica
- auditorias
- integraciones externas
- coordinacion entre IAs

Tambien aplica cuando una IA:

- solo revisa
- solo audita
- solo propone
- solo documenta

---

## 4. Fuentes operativas y jerarquia de verdad

Cuando una IA tenga que decidir, debe usar esta jerarquia:

### 4.1 Nivel 1: realidad verificable

La verdad operativa principal siempre es:

- codigo real del repo
- estado real del backend desplegado
- estado real del arbol git
- validacion real ejecutada

Nada puede marcarse como `hecho` si contradice esa realidad.

### 4.2 Nivel 2: documentos del proyecto

Los documentos operativos vigentes de este repo son:

- [roadmap.md](docs/planning/roadmap.md:1)
- [implementation_plan.md](docs/_revision/implementation_plan.md:1)
- [AI_SYNC.md](AI_SYNC.md:1)
- [landing-gerow-cloudflare-context.md](docs/integrations/landing-gerow-cloudflare-context.md:1)

Cada uno cumple una funcion distinta:

- `docs/planning/roadmap.md`: secuencia macro del producto
- `docs/_revision/implementation_plan.md`: estrategia de implementacion para migracion e integracion
- `AI_SYNC.md`: coordinacion viva entre IAs
- `docs/integrations/landing-gerow-cloudflare-context.md`: contexto operativo del formulario y backend actual de `planespro.cl`

Estos documentos no son estaticos.
Deben evolucionar con el proyecto.

Si aparece un nuevo requerimiento, un nuevo hallazgo o una nueva dependencia:

- el plan debe nutrirse y actualizarse
- el roadmap debe reflejarlo

No se permite usar documentos congelados mientras el trabajo real cambia por fuera.

### 4.3 Nivel 3: memoria conversacional

La conversacion con el usuario sirve como contexto, pero no reemplaza:

- codigo real
- backend real
- documentos operativos
- validacion real

Si una instruccion verbal no esta reflejada aun en el repo, debe tratarse como decision pendiente de consolidacion, no como estado ya logrado.

---

## 5. Principios obligatorios

Toda IA debe respetar estos principios:

### 5.0 Semantica operativa del comando "avanza"

Cuando el usuario escriba `avanza`, `continua`, `sigue` o una instruccion equivalente de progreso, la IA debe interpretar automaticamente que debe operar bajo CONTROL completo, sin exigir que el usuario repita el protocolo.

Eso significa que `avanza` activa implicitamente este flujo:

1. leer `AI_SYNC.md`
2. revisar `git status`
3. revisar reservas activas
4. revisar `docs/planning/roadmap.md` e `docs/_revision/implementation_plan.md`
5. revisar el codigo real del bloque siguiente
6. si aplica, revisar `docs/integrations/landing-gerow-cloudflare-context.md`
7. auditar el estado real antes de ejecutar
8. reservar el bloque que tomara
9. actualizar plan y roadmap si el nuevo requerimiento o hallazgo lo exige
10. ejecutar el siguiente bloque coherente con prioridad, reservas y CONTROL
11. validar de forma proporcional al riesgo
12. actualizar `AI_SYNC.md` con handoff, estado, riesgos y solicitud de revision cruzada si corresponde

La IA no debe esperar una instruccion redundante como:

- "aplicando control"
- "revisa el sync"
- "audita antes de avanzar"

Todo eso ya queda implicito en `avanza`.

Si existe ambiguedad real sobre que bloque seguir, la IA debe decidir el siguiente bloque mas coherente segun:

- prioridad del roadmap
- estado de reservas activas
- riesgo de colision con la otra IA
- deuda estructural abierta
- ultimo handoff y ultima auditoria cruzada disponibles

Solo debe pedir aclaracion al usuario si avanzar sin esa respuesta crearia alto riesgo de romper arquitectura, pisar trabajo activo o actuar contra una dependencia externa no resuelta.

### 5.1 No desviarse del plan sin justificarlo

No se puede cambiar direccion tecnica, fase o prioridad solo por intuicion.

Si algo cambia:

- debe dejarse escrito
- debe justificarse
- debe indicarse impacto en roadmap o plan
- debe actualizarse el documento afectado, no solo mencionarse en una respuesta temporal

### 5.2 No cambiar arquitectura por impulso

No se reemplaza un modelo por otro solo porque “se ve mejor”.

Toda variacion arquitectonica debe responder a:

- una necesidad real
- una contradiccion actual
- un bloqueo tecnico verificable

### 5.3 No mezclar viejo y nuevo si eso crea dos fuentes de verdad

La convivencia temporal entre modelos solo es aceptable si:

- esta identificada como transicion
- tiene frontera clara
- tiene plan de salida

No se admite convivencia indefinida por comodidad.

### 5.4 No resolver sintomas con hacks

No usar:

- duplicacion de logica
- reglas repetidas
- fallbacks ocultos
- banderas temporales sin declaracion
- bypasses visuales o funcionales
- codigo muerto “por si acaso”

### 5.5 No marcar como hecho algo no validado

Compilar no basta.
Cargar no basta.
Ver una pantalla no basta.

Un cambio solo puede llamarse `hecho` cuando:

- resolvio el problema real
- no rompio otra parte
- tiene validacion proporcional al riesgo

### 5.6 No ocultar incertidumbre

Si una IA no sabe algo, debe decirlo.
Si un backend no fue validado, debe decirlo.
Si una tabla existe solo localmente, debe decirlo.
Si el deploy no fue comprobado, debe decirlo.

---

## 6. Integracion obligatoria con AI_SYNC

`AI_SYNC.md` no es opcional.
Forma parte del protocolo CONTROL.

### 6.1 Antes de trabajar

Toda IA debe:

1. leer `AI_SYNC.md`
2. revisar reservas activas
3. revisar `git status`
4. registrar su bloque antes de editar

### 6.2 Durante el trabajo

Toda IA debe:

- respetar reservas activas
- no tocar archivos tomados por otra IA sin relevo explicito
- no asumir que la otra IA “ya sabe” algo no escrito

### 6.3 Despues del trabajo

Toda IA debe:

1. actualizar `AI_SYNC.md`
2. dejar handoff
3. indicar validacion ejecutada
4. marcar riesgos abiertos
5. mover el bloque a `en revision` o liberarlo

### 6.4 Revision cruzada

Ningun bloque importante queda realmente cerrado hasta que la otra IA:

- lo lea
- lo revise
- lo audite aplicando CONTROL
- lo clasifique como:
  - `aprobado`
  - `aprobado con observaciones`
  - `bloqueado`

La revision cruzada no es un gesto informal.
Es una auditoria obligatoria del bloque finalizado.

La IA revisora debe auditar, como minimo:

- coherencia con roadmap
- coherencia con implementation plan
- coherencia con arquitectura activa
- riesgo de regresion
- duplicidad de logica
- deuda tecnica agregada o removida
- validez de la clasificacion del estado final
- suficiencia de la validacion ejecutada

La IA revisora debe dejar su auditoria por escrito.

La IA autora del bloque puede:

- estar de acuerdo
- estar parcialmente de acuerdo
- no estar de acuerdo

Pero no puede ignorar la auditoria.

Si no esta de acuerdo, debe responder tambien por escrito con razon tecnica concreta.

---

## 7. Lectura obligatoria antes de integrar con planespro.cl

Cuando una tarea toque cualquiera de estos dominios:

- formulario publico
- disponibilidad
- agenda
- archivos adjuntos
- capture links
- Google Calendar
- migracion desde Cloudflare
- reemplazo de rutas publicas del formulario

la IA debe leer obligatoriamente:

- [landing-gerow-cloudflare-context.md](docs/integrations/landing-gerow-cloudflare-context.md:1)

Ese documento es la fuente contextual obligatoria para la integracion con `landing-gerow`.

No se permite iniciar una tarea de integracion con `planespro.cl` sin revisar ese archivo primero.

### 7.1 Motivo

Ese archivo ya documenta:

- el contrato publico actual de `ppforms`
- la atribucion por `ref`
- la frontera real del worker en Cloudflare
- las dependencias de Google Calendar, Resend, D1 y R2
- el modelo funcional actual del dominio formulario/agenda

Por lo tanto, cualquier integracion nueva que ignore ese documento corre alto riesgo de:

- romper el contrato publico
- crear doble fuente de verdad
- perder atribucion comercial
- mezclar mal la migracion

---

## 8. Relacion con el roadmap actual

El roadmap vigente debe respetarse como fuente operativa, pero con una precision importante:

### 8.1 El roadmap expresa direccion y fases

`docs/planning/roadmap.md` define:

- que fases existen
- que esta marcado como completado
- que sigue pendiente

### 8.2 El roadmap no reemplaza la validacion real

Si `docs/planning/roadmap.md` dice `completada` pero el codigo o backend muestran una brecha real:

- no se falsifica la realidad para proteger el roadmap
- se deja constancia de la contradiccion
- se clasifica el hallazgo correctamente

Ejemplo:

- una fase puede estar “completada” a nivel de intencion
- pero aun tener `pendiente estructural` o `pendiente de validacion real` en algun punto

### 8.3 El implementation plan tampoco reemplaza la realidad

`docs/_revision/implementation_plan.md` puede describir arquitectura objetivo o pasos de migracion, pero si sobredeclara estado no desplegado:

- debe tratarse como plan
- no como evidencia de implementacion productiva

### 8.4 El plan y el roadmap deben mantenerse vivos

Cada nuevo requerimiento relevante debe evaluarse para ver si:

- entra como nueva tarea en `docs/_revision/implementation_plan.md`
- entra como nueva tarea o sub-tarea en `docs/planning/roadmap.md`
- cambia prioridad de una fase existente
- obliga a reclasificar una tarea ya existente

Toda IA debe asumir que mantener esos documentos actualizados forma parte del trabajo, no un extra administrativo.

### 8.5 Regla de actualizacion obligatoria

Si durante un bloque aparece cualquiera de estas situaciones:

- nuevo requerimiento del usuario
- hallazgo tecnico no contemplado
- nueva dependencia estructural
- riesgo de arquitectura
- tarea que ya no corresponde al estado que tenia en el roadmap

la IA debe:

1. decidir si el cambio pertenece al plan, al roadmap o a ambos
2. actualizar el documento correspondiente
3. dejar constancia en `AI_SYNC.md`

### 8.6 Estado real de tareas

El roadmap y el plan deben reflejar estado real.

Eso incluye:

- ingresar tareas nuevas
- marcar tareas finalizadas cuando realmente esten cerradas
- marcar tareas parciales cuando aun no cierran completamente
- marcar tareas pendientes cuando aun no corresponda cerrarlas
- reclasificar tareas si se descubrio que estaban marcadas de forma incorrecta

No se permite dejar tareas “completadas” por inercia si en realidad quedaron:

- parciales
- pendientes estructurales
- pendientes de deploy
- pendientes de validacion real

---

## 9. Clasificacion obligatoria de estado

Toda IA debe usar solo estas clasificaciones:

- `hecho`
- `parcial`
- `pendiente estructural`
- `pendiente de deploy`
- `pendiente de validacion real`
- `bloqueado`

Definiciones:

### 9.1 Hecho

El cambio existe, fue validado y no deja contradiccion abierta relevante.

### 9.2 Parcial

El trabajo avanzo pero aun no cubre toda la necesidad o deja una dependencia clara pendiente.

### 9.3 Pendiente estructural

El problema es de modelo, arquitectura, RLS, fuente de verdad, frontera de modulos o coherencia del sistema.

### 9.4 Pendiente de deploy

El cambio existe localmente o en documento, pero no esta promovido al backend o al entorno activo.

### 9.5 Pendiente de validacion real

Hay implementacion, pero falta build, smoke test, prueba de integracion o validacion operativa.

### 9.6 Bloqueado

No se puede avanzar sin una dependencia externa, definicion del usuario o resolucion de otro bloque.

---

## 10. Angulos obligatorios de auditoria

Cada pasada de CONTROL debe mirar el proyecto desde estos angulos:

- arquitectura
- modularidad
- coherencia con roadmap
- coherencia con implementation plan
- frontera entre modulos
- seguridad
- RLS
- rendimiento
- escalabilidad
- deuda tecnica
- riesgo de regresion
- consistencia funcional
- consistencia visual si aplica
- impacto en deploy
- impacto en trabajo concurrente con otra IA
- compatibilidad con futura app movil
- compatibilidad con la integracion `planespro.cl -> LeadSeed`

### 10.1 Restricciones obligatorias de UX y UI para este proyecto

Toda auditoria visual y toda implementacion de interfaz deben respetar estas reglas:

- la UI debe verse bien en ancho reducido de sidebar de Google Chrome Extension
- la UI debe verse bien en movil porque el dominio evolucionara a app movil
- la interfaz debe priorizar compacidad real, jerarquia clara y densidad de informacion util
- no esta permitido resolver pantallas con cajas blancas genericas de bordes redondeados como patron por defecto
- la referencia visual esperada es el lenguaje mas compacto y sobrio de `LeadSeed`, no el patron generico de tarjetas aisladas
- no se deben usar emoticones, emojis ni adornos visuales infantiles en UI, documentos operativos o microcopy de producto salvo instruccion explicita del usuario

#### Precision 10.1.a - Frontera exacta de la prohibicion de emojis

Definicion del usuario, `2026-08-12`. Esta precision cierra la ambiguedad detectada en la auditoria
`docs/auditorias/AUDITORIA_CONTROL_2026-08-11.md` y no debe reabrirse.

La frontera no es "donde se ve el emoji", es **quien lo escribe**:

- `PROHIBIDO` - todo emoji escrito en el codigo por un desarrollador o una IA. Sin excepcion. Esto
  incluye:
  - iconos decorativos en JSX
  - microcopy, etiquetas, placeholders y mensajes de error
  - valores centinela, fingerprints o marcas internas aunque nunca se rendericen
  - comentarios de codigo, commits y documentacion operativa
- `PERMITIDO` - emojis que el usuario final elige y envia como contenido de un mensaje. Son dato del
  usuario, no diseno de interfaz.

Corolario operativo: un catalogo de emojis existe legitimamente si su unico destino es que el usuario
inserte uno en un mensaje. Deja de ser legitimo en el momento en que el producto usa alguno de esos
glifos para construir su propia interfaz.

Regla practica para una IA auditora: si el emoji desaparece al borrar el codigo, esta prohibido. Si
desaparece solo al borrar un mensaje que escribio una persona, esta permitido.

Si una propuesta visual incumple cualquiera de estas reglas, CONTROL debe marcarla al menos como observacion y, si afecta el patron general de interfaz, como hallazgo estructural.

---

## 11. Antes de tocar cualquier cosa

Toda IA debe revisar:

- `AI_SYNC.md`
- `git status`
- `docs/planning/roadmap.md`
- `docs/_revision/implementation_plan.md`
- codigo real del modulo a tocar
- si aplica, backend remoto real
- si aplica, `docs/integrations/landing-gerow-cloudflare-context.md`

Luego debe determinar:

- que se va a tocar exactamente
- por que se va a tocar
- por que corresponde ahora segun fase y prioridad
- que riesgo tiene
- que podria romper
- como se va a validar
- si el nuevo requerimiento obliga a nutrir o corregir plan y roadmap

Si no puede responder eso con claridad, no deberia ejecutar todavia.

---

## 12. Durante la ejecucion

Mientras ejecuta, una IA debe:

- mantener el alcance acotado
- evitar mezclar arreglos estructurales con cambios cosmeticos innecesarios
- no tocar dominios no reservados
- no aprovechar el bloque para meter “ya que estamos”
- no convertir una tarea focalizada en refactor abierto sin control

---

## 13. Despues de ejecutar

Toda IA debe volver a revisar:

- si resolvio el problema real
- si rompio otra parte
- si dejo codigo muerto
- si dejo duplicidad funcional
- si dejo workaround no declarado
- si cambia el estado del roadmap o del implementation plan
- si otra IA debe revisar algo puntual

Y debe dejar trazabilidad en:

- `AI_SYNC.md`
- documento tecnico si el cambio lo amerita
- `docs/planning/roadmap.md` y/o `docs/_revision/implementation_plan.md` si el bloque cambio el estado real del trabajo

Si el trabajo recibio un requerimiento nuevo o abrio una tarea no contemplada, la actualizacion del plan y del roadmap deja de ser opcional y pasa a ser parte del cierre del bloque.

---

## 14. Coordinacion entre dos IAs

### 14.1 Regla principal

Una IA ejecuta.
La otra revisa o trabaja en otra zona.

No deben tocar simultaneamente el mismo bloque.

### 14.2 Conducta esperada de la IA no activa en ese bloque

Mientras otra IA implementa, la segunda puede:

- revisar el handoff anterior
- auditar otra zona del proyecto
- preparar otro bloque no conflictivo
- esperar si la tarea pisaria el mismo dominio

### 14.3 Prohibiciones

No hacer:

- doble implementacion del mismo flujo
- ediciones concurrentes del mismo archivo sin acuerdo
- correcciones cruzadas invisibles sin handoff
- asumir aprobacion sin revision escrita

### 14.3.1 Regla de rama y autoria de cambios

La rama de trabajo del bloque la actualiza la IA que implementa el codigo.

Eso significa:

- la IA implementadora es quien modifica archivos, hace avanzar el bloque y deja el resultado listo para revision
- la IA auditora revisa, valida, aprueba, observa o bloquea, pero no debe avanzar ese mismo bloque con cambios de codigo en la misma rama salvo reasignacion escrita
- la IA auditora no debe mezclar revision con reimplementacion silenciosa del mismo bloque

Separar estos roles es obligatorio porque evita:

- que la misma IA sea implementadora y aprobadora efectiva del mismo bloque
- que la revision se convierta en otra implementacion no trazada
- que ambas IAs actualicen la misma rama sobre el mismo bloque al mismo tiempo

Si la IA auditora detecta correcciones necesarias, debe:

1. dejarlas por escrito en `AI_SYNC.md`
2. aprobar con observaciones o bloquear
3. esperar reasignacion explicita si le corresponde a ella ejecutar la correccion

### 14.4 Auditoria obligatoria de tarea finalizada

Cada vez que una IA cierre un bloque como:

- `hecho`
- `parcial`
- `pendiente estructural`
- `pendiente de deploy`
- `pendiente de validacion real`

la otra IA debe producir una auditoria del bloque aplicando CONTROL.

Esa auditoria debe quedar visible en `AI_SYNC.md`.

Debe contener al menos:

- resultado
- hallazgos
- desacuerdos si existen
- riesgos remanentes
- recomendacion de accion siguiente

### 14.5 Derecho de desacuerdo tecnico

La IA que ejecuta no esta obligada a aceptar automaticamente la auditoria de la otra IA.

Pero si discrepa, debe:

- dejar respuesta escrita
- explicar el desacuerdo con base tecnica
- indicar si cambia o no cambia el estado del bloque

Esto evita dos problemas:

- auditorias mudas que no afectan nada
- desacuerdos invisibles que el usuario no puede ver

### 14.6 El usuario debe quedar informado

Toda auditoria cruzada y toda respuesta a esa auditoria debe quedar registrada en `AI_SYNC.md`.

Ese archivo existe, entre otras cosas, para que el usuario pueda ver:

- que hizo cada IA
- como fue auditado ese trabajo
- en que puntos estuvieron de acuerdo
- en que puntos no estuvieron de acuerdo
- que quedo realmente cerrado y que no

### 14.7 Obligacion explicita de informar al usuario

CONTROL exige que el resultado del trabajo concurrente sea visible para el usuario sin depender de memoria conversacional.

Por lo tanto:

- toda tarea terminada debe dejar handoff
- toda tarea terminada debe recibir auditoria cruzada
- todo desacuerdo tecnico debe quedar escrito
- toda reclasificacion del estado del bloque debe quedar escrita

La salida minima visible para el usuario debe permitir reconstruir:

- que hizo IA-A
- que hizo IA-B
- como audito IA-B a IA-A
- como audito IA-A a IA-B
- que observaciones quedaron abiertas
- si hubo desacuerdo y como se resolvio o si sigue abierto

Si esa trazabilidad no existe en `AI_SYNC.md`, entonces CONTROL considera incompleta la coordinacion del bloque.

---

## 15. Reglas especificas para SQL y Supabase

Cada vez que una IA entregue SQL o una instruccion para Supabase, debe clasificarla explicitamente como:

- `Query de un solo uso`
- `Query permanente`

### 15.1 Si es Query de un solo uso

Debe informar:

- Tipo
- Proposito
- Impacto
- Reversibilidad

### 15.2 Si es Query permanente

Debe informar:

- Tipo
- Objeto
- Clase
- Descripcion
- Proposito
- Dependencias
- Impacto
- Persistencia

### 15.3 Nombres

Si crea objetos permanentes:

- no usar nombres genericos
- no usar `test`, `temp`, `fix_fn`, `new_table`
- usar nombres claros y consistentes con el dominio

### 15.4 Politicas y RLS

Cualquier cambio de RLS debe tratarse como cambio de alto riesgo.

### 15.5 Edge Functions: dueño unico

Regla vigente desde el `2026-08-12`: **todas las Edge Functions se despliegan solo desde LeadSeed.**
`landing-gerow` no debe contener una carpeta `supabase/functions/`.

Esta regla reemplaza al modelo anterior de propiedad repartida, que decia que las funciones de los
formularios publicos vivian en `landing-gerow`. Ese reparto fallo: `form-leads` termino existiendo
divergente en los dos repos sin que ninguna herramienta lo detectara, y la copia de este repo, al
desplegarse, habria creado un lead duplicado por cada envio en `/form/` y `/retiro/`. El detalle esta
en `supabase/functions/README.md` y en `docs/auditorias/AUDITORIA_CONTROL_2026-08-11.md`.

Estado al `2026-08-12`: **las doce Edge Functions tienen su source en este repo.** `form-progress` se
adopto obteniendo el codigo realmente desplegado con `supabase functions download`, no copiandolo del
otro repo, porque el HEAD commiteado de `landing-gerow` tenia una version anterior.

Excepcion abierta, distinta de la anterior: `form-leads` tiene su source aqui pero **la funcion
desplegada sigue registrada como propiedad de `landing-gerow`**, asi que un deploy desde alla puede
sobrescribirla. Comprobable con `npm run check:functions`, que hoy falla por ese motivo. Hasta que se
redespliegue desde este repo, la regla de dueño unico esta escrita pero no cumplida.

LeadSeed y `landing-gerow` comparten el mismo proyecto Supabase, asi que un deploy desde el repo
equivocado sobrescribe produccion. Por eso esta regla es de dueño unico y no de reparto por dominio.

Antes de reportar una Edge Function como "faltante" o "rota" por no
encontrarla en `supabase/functions/` de este repo, correr
`npx supabase functions list` y revisar `entrypoint_path` para confirmar en
que repo vive realmente. Este punto se agrego tras un hallazgo real de la
auditoria cruzada CONTROL 14.4 del 2026-08-05 (`form-progress`), documentado
en `AI_SYNC.md`.

Antes de proponerlo o aplicarlo, una IA debe:

- identificar quien debe leer
- quien debe escribir
- si el acceso es anonimo, autenticado, admin o service role
- si el cambio abre informacion sensible

---

## 16. Reglas especificas para la integracion planespro.cl -> LeadSeed

La integracion futura debe obedecer estas reglas:

### 16.1 No romper el contrato publico antes de tiempo

Mientras `planespro.cl` siga usando el flujo actual, debe preservarse compatibilidad con:

- `GET /api/public/availability`
- `POST /api/form/leads`
- `POST /api/form/leads/abandoned`

### 16.2 No migrar solo media solucion

No se debe migrar solo “guardar el lead” si:

- disponibilidad
- appointments
- archivos
- atribucion por `ref`
- Google Calendar

siguen resolviendose en otro backend sin frontera clara.

Eso crearia doble fuente de verdad.

### 16.3 Orden recomendado

El orden arquitectonicamente correcto es:

1. modelar el dominio equivalente a `ppforms` en Supabase
2. definir funciones/Edge Functions compatibles
3. integrar archivos, disponibilidad, submit y agenda
4. conectar `LeadSeed` como consumidor nativo
5. recien despues cambiar el frontend publico

### 16.4 Fuente obligatoria

Toda decision en esta area debe contrastarse con:

- [landing-gerow-cloudflare-context.md](docs/integrations/landing-gerow-cloudflare-context.md:1)

---

## 17. Cosas que una IA no debe hacer bajo CONTROL

No debe:

- improvisar arquitectura
- hacer cambios masivos sin auditoria previa
- proponer migraciones sin frontera clara
- mezclar codigo nuevo con legado sin declararlo
- ocultar incertidumbre
- inventar estados de avance
- declarar cerrado algo sin revision cruzada cuando hay otra IA activa
- ignorar `AI_SYNC.md`
- iniciar integracion con `planespro.cl` sin leer el contexto operativo ya documentado
- lanzar SQL sin clasificarlo
- crear objetos permanentes sin nombre y descripcion consistentes
- introducir patrones visuales genericos incompatibles con sidebar y movil
- usar cajas blancas redondeadas como solucion por defecto para estructurar contenido
- usar emoticones o emojis en entregables, interfaz o documentacion operativa del proyecto

---

## 18. Salidas minimas esperadas por bloque

Cada bloque importante debe dejar:

- actualizacion de `AI_SYNC.md`
- handoff
- validacion minima proporcionada al riesgo
- estado clasificado correctamente
- riesgos abiertos si existen
- actualizacion del plan o del roadmap si aparecio un requerimiento nuevo o cambio el estado real de una tarea existente
- auditoria cruzada posterior de la otra IA aplicando CONTROL
- respuesta escrita si existe desacuerdo tecnico sobre esa auditoria

Si el bloque afecta arquitectura o integracion:

- debe dejar tambien actualizacion en documento tecnico o constancia explicita de que no fue necesario

---

## 19. Relacion entre CONTROL y AI_SYNC

Regla final y sin excepcion:

`AI_SYNC.md` es el brazo operativo de CONTROL para trabajo concurrente.

Por lo tanto:

- si una IA no actualiza `AI_SYNC.md`, no esta cumpliendo CONTROL
- si una IA trabaja sin leer `AI_SYNC.md`, no esta cumpliendo CONTROL
- si una IA toca integracion con `planespro.cl` sin revisar el contexto operativo documentado, no esta cumpliendo CONTROL

---

## 20. Version corta operativa

Antes de tocar algo:

1. lee `AI_SYNC.md`
2. lee roadmap/plan
3. si toca integracion con formulario/agencia, lee `docs/integrations/landing-gerow-cloudflare-context.md`
4. revisa codigo y estado real
5. reserva bloque

Despues de tocar algo:

1. valida
2. deja handoff
3. espera o solicita auditoria cruzada de la otra IA
4. responde por escrito si no estas de acuerdo con la auditoria
5. clasifica estado real
6. actualiza `AI_SYNC.md`

Si no puedes explicar con claridad que hiciste, por que, que riesgo tiene y que falta validar, entonces el bloque no esta cerrado.
