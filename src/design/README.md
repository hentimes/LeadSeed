# Sistema de diseño de LeadSeed

Todo el aspecto visual de la extensión sale de acá. La regla es una sola:

> **Ningún componente escribe un color, radio o tamaño literal.**
> Se usa el token, siempre.

## Cómo cambiar algo en toda la extensión

| Quiero cambiar | Toco | Efecto |
|---|---|---|
| El color de marca | `tokens.css` → `--ls-primary` | Botones, badges, iconos, gráficos, estados activos |
| El tamaño de los títulos | `tokens.css` → `--ls-text-page-title` | Todas las secciones |
| Los bordes redondeados | `tokens.css` → `--ls-radius-*` | Tarjetas, botones, inputs, modales |
| El ancho de una sección | `AppPageRenderer.tsx` → `PAGE_WIDTH` | Solo esa sección |
| La estructura del encabezado | `PageShell.tsx` | Todas las secciones |

No hace falta buscar y reemplazar en 46 archivos: se cambia el token.

## Archivos

```
design/
  tokens.css     Fuente única: color, radio, sombra, tipografía, espaciado.
                 Incluye modo oscuro y alias de compatibilidad.
  palette.ts     Puente para SVG/Recharts, que necesitan un color literal
                 en la prop. Lee los tokens en runtime.
  Surface.tsx    Card, Panel
  Button.tsx     Button, IconButton
  Badge.tsx      Badge
  Text.tsx       PageTitle, SectionTitle, CardTitle, GroupLabel, Body, Hint
  PageShell.tsx  PageShell (armazón), SectionHeader, EmptyState
  index.ts       Punto de entrada
```

## Uso

```tsx
import { Card, Button, Badge, SectionTitle } from '../design';

<Card>
  <SectionTitle>Mis leads</SectionTitle>
  <Badge tone="success">Convertido</Badge>
  <Button variant="primary">Guardar</Button>
</Card>
```

En clases sueltas, las utilidades de Tailwind derivan de los mismos tokens:

```
bg-primary  bg-primary-soft  text-ink  text-ink-secondary  text-ink-muted
border-line  bg-surface  bg-surface-muted  shadow-card  rounded-md
text-page-title  text-section-title  text-body  text-micro
```

## Excepciones legítimas a la regla

Solo tres, y están documentadas en el código:

1. **Paleta de listas** (`ListsPage`): colores que el usuario elige para
   sus listas. Son datos, no estilo.
2. **Marcas ajenas**: el verde de WhatsApp (`#25D366`) es de WhatsApp, no
   nuestro.
3. **SVG y gráficos**: no aceptan clases CSS. Usan `chartColors` de
   `palette.ts`, que lee los tokens en runtime.

## Al agregar un componente

1. ¿Existe ya una primitiva? Úsala.
2. ¿Le falta una variante? Agrégala **a la primitiva**, no resuelvas con
   clases sueltas en el consumidor.
3. ¿Necesitás un color que no existe? Agregá el token primero.
