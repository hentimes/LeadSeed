# LeadSeed

Extensión de Chrome para gestionar leads, enviar mensajes de WhatsApp y correos electrónicos desde un panel lateral.

## Características

### Leads
- CRUD completo con campos: nombre, teléfono (+569 normalizado), email, empresa, RUT chileno, notas
- **5 estados**: Nuevo → Contactado → Interesado → Convertido → Descartado
- **Pipeline kanban** con drag & drop entre estados
- Importación desde **Excel** o **JSON** con detección automática de columnas
- Exportación a **JSON** o **Excel** (configurable)
- Selección múltiple con **Shift+click**
- Filtros por texto, lista, estado y fecha de ingreso
- Columnas configurables (mostrar/ocultar) y reordenables por arrastre
- Modo compacto (2 filas por lead)
- Modo oscuro

### Mensajes
- **Plantillas de WhatsApp y Email** con variables `{nombre}`, `{empresa}`, etc.
- Categorías con colores para organizar plantillas
- Envío masivo por WhatsApp Web y EmailJS
- **Programación de emails** para fecha y hora futura
- Vista previa con datos de ejemplo

### Tareas
- Asignación a leads individuales o listas completas
- Fecha y hora de vencimiento
- Alertas: badge de "Vencida" (rojo) y "Hoy" (ámbar) en la UI
- **Notificaciones nativas** de Chrome al abrir la extensión
- Creación automática de tarea al mover un lead en el Pipeline

### Historial y seguimiento
- **Historial de envíos** con link al contenido de la plantilla
- **Vista de detalle del lead** con notas cronológicas, historial de envíos y datos completos
- Notas con timestamp, visibles en timeline
- Detección y fusión de leads duplicados

### Datos
- Base de datos local con **IndexedDB** (Dexie.js)
- **Respaldo y restauración** completa (JSON)
- **Papelera de reciclaje** (30 días antes de eliminación definitiva)
- Sincronización de configuración entre dispositivos vía `chrome.storage.sync`

### Atajos de teclado
| Tecla | Acción |
|---|---|
| `Ctrl+1` | Leads |
| `Ctrl+2` | Enviar |
| `Ctrl+3` | Tareas |
| `Ctrl+4` | Historial |
| `Ctrl+5` | Ajustes |

## Instalación

### Desarrollo
```bash
npm install
npm run dev
```
Luego cargá la carpeta `dist/` como extensión sin empaquetar en `chrome://extensions`.

### Producción
```bash
npm run build
```
La carpeta `dist/` es autocontenida. Cargala en Chrome o publicala en la Chrome Web Store.

## Stack
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (con modo oscuro `class`)
- **Dexie.js** (IndexedDB)
- **CRXJS** (Chrome Extension tooling)
- **EmailJS** (envío de correos)
- **SheetJS** (xlsx, importación/exportación Excel)

## Permisos
- `sidePanel` — panel lateral de Chrome
- `storage` — IndexedDB + chrome.storage.sync
- `notifications` — alertas de tareas vencidas
- `alarms` — chequeo de emails programados

## Estructura
```
src/
├── components/     # Componentes React (tabla, formularios, modales, senders)
├── pages/          # Páginas (Leads, Listas, Templates, Enviar, Tareas, Pipeline, Dashboard, Historial, Ajustes)
├── hooks/          # Custom hooks (useLeads, useLists, useSort, useTemplates)
├── db/             # Base de datos Dexie
├── types/          # Tipos TypeScript
├── utils/          # Utilidades (normalización, export/import, backup, email, WhatsApp)
├── App.tsx         # Componente raíz con navegación
├── main.tsx        # Punto de entrada React
└── background.ts   # Service worker (alarms, action click)
```
