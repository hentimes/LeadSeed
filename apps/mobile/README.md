# App movil de LeadSeed

Todavia no existe. Esta carpeta es el hueco reservado, y este archivo explica en
que estado esta el resto del proyecto para recibirla.

## Que hay que hacer para arrancarla

Un proyecto Expo con React Native aca dentro. El workspace ya la reconoce
(`workspaces: ["apps/*", "packages/*"]` en la raiz), asi que sus dependencias se
declaran en su propio `package.json` y no contaminan la extension.

## Lo que ya esta preparado

- **La capa de dominio no toca el navegador.** `services`, `repositories` y
  `config` tienen cero usos de API del navegador, y ESLint lo hace cumplir:
  `window`, `document`, `chrome`, `navigator`, `localStorage`, `FileReader`,
  `ResizeObserver` e `Image` estan prohibidos en `hooks`, `utils`, `services`,
  `repositories` y `config`.
- **Cero imports de dominio hacia interfaz.** Medido, no supuesto. Es la
  condicion que permite extraer el nucleo a un paquete cuando haga falta.
- **Los puertos ya existen**, en `apps/extension/src/platform/`: dialogos,
  navegacion, almacenamiento, enlaces externos, portapapeles, bus de mensajes,
  OAuth, guardado de archivos, bloqueo de scroll y archivos protegidos. Portar
  significa escribir un `native.ts` que los implemente, no reescribir la app.
- **La lista de exenciones** de `eslint.config.js` enumera, con su razon, lo
  unico que NO se porta: los puntos de entrada de la extension, `platform/`
  entero, los atajos de teclado, el cierre con Escape, la medicion del ancho del
  panel y la compresion de imagen con canvas. Ninguno es dominio.

## Lo que falta, y por que no se hizo antes

**Extraer `packages/core`.** El nucleo portable son unas 23.500 lineas -el 38%
del codigo- repartidas en `services`, `repositories`, `hooks`, `utils`, `config`,
`types`, `contexts` y `platform`. Hoy siguen dentro de `apps/extension/src/`.

No se movieron a proposito. Sacarlas obliga a reescribir el especificador de
cada import que cruce la frontera, y la frontera correcta no se conoce hasta que
existe el segundo consumidor: se descubre escribiendo la app movil y viendo que
pide de verdad. Moverlas antes es elegir una frontera a ciegas y despues pelearse
con ella.

El orden recomendado es: arrancar Expo aca, importar del nucleo por ruta relativa
mientras se explora, y recien cuando el conjunto se estabilice extraerlo a
`packages/core` con un solo movimiento informado.

**`design/` no se porta.** Es Tailwind y DOM. La app movil tendra su propio
sistema de componentes hablando los mismos tokens de `design/tokens.css`, que si
son dato portable.
