# Roadmap Estrategico: PlanesPro CRM (v2.1)

Este documento ha sido reestructurado aplicando `CONTROL` para limpiar redundancias, reflejar el estado real y registrar nuevos requerimientos obligatorios de UI y arquitectura.

---

## Fase 1: MVP (Producto Minimo Viable) Local [COMPLETADA]
*Validacion de idea e interfaz UI base.*
- [x] Configuracion React (Vite) + Extension.
- [x] Interfaz de visualizacion tabular y panel de detalles.

## Fase 2: Infraestructura Cloud y Refactorizacion [COMPLETADA]
*Migracion de IndexedDB a la nube.*
- [x] Base de datos en Supabase (PostgreSQL).
- [x] Autenticacion con Google OAuth 2.0.
- [x] Refactorizacion de TypeScript (UUIDs).

## Fase 3: Monetizacion, Roles y SaaS [COMPLETADA]
*Sistema de permisos dinamicos.*
- [x] Base de datos: tablas de planes, features y overrides.
- [x] Funcion RPC para calculo instantaneo de permisos (`get_my_features`).
- [x] UI: panel de administracion para crear planes y gestionar usuarios.
- [x] UI defensiva: ocultar menus dinamicamente y proteger rutas.

---

## Fase 4: Sincronizacion Real-Time, Presencia y Telemetria [COMPLETADA]
*Carga instantanea, comunicacion en tiempo real y analitica profunda de usuarios.*

- [x] Sincronizacion automatica de perfiles.
- [x] Presencia y estado online con realtime.
- [x] Telemetria de productividad.
- [x] Sincronizacion en vivo y carga optimista.
- [x] Personalizacion de avatar con Storage.
- [x] Chat interno, soporte tecnico y flujos de requerimientos.

---

## Fase 5: Estandarizacion Final de Datos a Supabase [PENDIENTE]
*Mover lo ultimo que queda en codigo duro o modelos hibridos a Supabase.*
- [ ] Creacion de tablas SQL para listas de leads.
- [ ] Creacion de tablas SQL para plantillas de mensajes.
- [ ] Cerrar el modelo hibrido actual entre arrays locales y tablas relacionales de listas.

---

## Fase 6: Sistema Avanzado de Agenda y Calendario [PENDIENTE]
*Construir agenda sin romper la compacidad del producto.*
- [ ] Definir patron de agenda compacto y responsive para sidebar de extension y movil antes de expandir vistas complejas.
- [ ] Vista de calendario modular que funcione en sidebar y pueda crecer a mensual/semanal sin duplicar UI.
- [ ] Logica para reprogramacion de citas.
- [ ] Notificaciones push antes de una cita importante.

---

## Fase 7: Ecosistema Externo e Integracion Web [PENDIENTE]
*Conectar el CRM con el flujo externo de captura.*
- [ ] Habilitar endpoint en Supabase para inyectar leads desde el formulario web de `planespro.cl`.
- [ ] Guardar PDFs o certificados adjuntos en Supabase Storage y vincularlos al lead en el CRM.
- [ ] Consolidar contrato visual y funcional para que los leads capturados desde `planespro.cl` aterricen en una UX compacta coherente con `MENSAJES`.
- [ ] Evaluar migracion progresiva de backend `Cloudflare -> Supabase` sin romper el contrato publico actual.

---

## Fase 8: Marketplace y Subastas de Leads [PENDIENTE]
*Plataforma interna de intercambio comercial entre vendedores.*
- [ ] Bolsa de leads.
- [ ] Filtros de subasta con metadatos parciales.
- [ ] Motor real-time de pujas y ofertas.
- [ ] Transferencia automatizada de propiedad del lead.

---

## Fase 9: Growth, Marketing y Retencion (SuperAdmin) [PENDIENTE]
*Herramientas nativas para vender a los propios usuarios y gestionar comunicacion interna.*
- [ ] CRM interno de listas de usuarios.
- [ ] Gestor de anuncios o pop-ups.
- [ ] Banners dinamicos ubicados de forma nativa en el sidebar.
- [ ] Promociones temporales globales.
- [ ] Roles de staff delegables.

---

## Criterios transversales vigentes

- [ ] Toda interfaz nueva o refactorizada debe validar funcionamiento en sidebar angosto de extension y en movil.
- [ ] No usar como patron dominante cajas blancas con bordes redondeados para agrupar contenido.
- [ ] Mantener lenguaje visual compacto y consistente con `MENSAJES`.
- [ ] No usar emoticones ni emojis en UI ni en documentacion operativa del proyecto.
