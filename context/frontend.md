Frontend — organización técnica

Resumen

El frontend está construido con Next.js App Router, React y Tailwind CSS, tomando como base estructural el template Horizon UI Tailwind React NextJS. La adaptación conserva la arquitectura de dashboard, layouts, sidebar, navbar, widgets y componentes visuales de Horizon UI, reemplazando el dominio demo por funcionalidades del Sistema de Gestión de Mantenimiento.

Horizon UI aporta:

- layout administrativo con sidebar y navbar
- layout de autenticación
- sistema de componentes visuales reutilizables
- estilos utilitarios y tokens de diseño en Tailwind
- estructura de dashboard orientada a vistas administrativas

El proyecto monta encima de esa base:

- autenticación con Parse Server
- gestión de perfil de usuario (incluye cambio de contraseña)
- gestión administrativa de usuarios (búsqueda y administración)
- preguntas de mantenimiento (CRUD con dominios EQ/INS/Industrial)
- inventario de equipos médicos (CRUD, importación/exportación, archivos categorizados, historial)
- dashboard adaptado al dominio de mantenimiento de establecimientos de salud

Visión general del árbol

```text
frontend/
├─ src/
│  ├─ app/                # Rutas App Router y layouts
│  ├─ components/         # Componentes visuales, layout y módulos de negocio
│  ├─ services/           # Acceso a Parse y lógica cliente
│  ├─ utils/              # Helpers y utilidades transversales
│  ├─ types/              # Tipos de dominio y definiciones auxiliares
│  ├─ contexts/           # Contextos React (SidebarContext)
│  ├─ styles/             # CSS global y estilos importados en cliente
│  ├─ actions/            # Server Actions (envío de correos)
│  └─ routes.tsx          # Configuración del menú lateral
├─ public/                # Assets públicos (fuentes, favicon, SVG)
├─ examples/              # Material legado/referencia, no usado por runtime actual
├─ next.config.js         # Configuración de Next.js
├─ tailwind.config.js     # Tema visual y tokens de diseño
├─ default.conf           # Reverse proxy nginx
└─ Dockerfile             # Build y runtime containerizado
```

Organización por capas

1. Capa de routing

La aplicación usa App Router de Next.js bajo `src/app`.

Piezas principales:

- `src/app/layout.tsx` — Root layout global, envuelve toda la app con `AppWrappers`.
- `src/app/AppWrappers.tsx` — Desactiva SSR de ciertos wrappers con `dynamic(..., { ssr: false })`. Monta `AuthGuard`.
- `src/app/AuthGuard.tsx` — Guard global de autenticación. Permite solo rutas públicas de auth. Redirige según estado de sesión.
- `src/app/page.tsx` — Ruta raíz `/`, redirige a `/admin/default`.

Rutas implementadas:

| Ruta | Descripción | Acceso |
|------|-------------|--------|
| `/admin/default` | Dashboard principal | Todos los autenticados |
| `/admin/preguntas` | Preguntas de mantenimiento | COORDINATOR, ADMIN, SUPER_ADMIN |
| `/admin/inventario` | Inventario de equipos médicos | OPERATOR, COORDINATOR, ADMIN, SUPER_ADMIN |
| `/admin/inventario-industrial` | Inventario de equipos industriales | OPERATOR, COORDINATOR, ADMIN, SUPER_ADMIN |
| `/admin/flota-vehicular` | Inventario de flota vehicular | OPERATOR, COORDINATOR, ADMIN, SUPER_ADMIN |
| `/admin/infraestructura` | Inventario de infraestructura | OPERATOR, COORDINATOR, ADMIN, SUPER_ADMIN |
| `/admin/mantenimiento` | Mantenimiento central — dashboard | OPERATOR, COORDINATOR, ADMIN, SUPER_ADMIN |
| `/admin/mantenimiento/nuevo` | Wizard de nuevo mantenimiento (5 etapas) | OPERATOR+ |
| `/admin/mantenimiento/bandeja` | Bandeja de validacion | COORDINATOR+ |
| `/admin/mantenimiento/[id]` | Detalle de registro de mantenimiento | VIEWER+ |
| `/admin/profile` | Perfil de usuario | Todos los autenticados |
| `/admin/user-management` | Gestión de usuarios | ADMIN |
| `/auth/sign-in` | Login y recuperación de contraseña | Público |
| `/auth/sign-up/default` | Registro de usuario (sin selector de establecimiento) | Público |

2. Layouts

- `src/app/admin/layout.tsx` — Layout principal del dashboard. Renderiza Sidebar, Navbar, contenido y Footer. Usa `routes.tsx` y `utils/navigation.ts` para el texto del navbar.
- `src/app/auth/layout.tsx` — Layout de autenticación con estilo visual de Horizon UI.

3. Configuración de navegación

Definida declarativamente en `src/routes.tsx`:

```text
Dashboard           → /admin/default       (todos)
Preguntas Mant.     → /admin/preguntas     (COORDINATOR+)
Inventario Equipos  → /admin/inventario    (OPERATOR+)
Gestión Usuarios    → /admin/user-management (ADMIN)
```

Archivos relacionados:

- `src/routes.tsx` — definición de ítems del menú con `allowedRoles`
- `src/utils/navigation.ts` — helpers para ruta activa y texto de navbar
- `src/components/sidebar/index.tsx` — componente sidebar
- `src/components/sidebar/components/Links.tsx` — filtra rutas según `accessLevel` del usuario Parse

El filtrado del sidebar es solo restricción de UI; la autorización real se valida en guards y backend.

4. Módulos de páginas

Área admin:

- **Dashboard** (`src/app/admin/default/page.tsx`) — Widgets, cards y charts del estilo Horizon UI. Datos mock locales actualmente.

- **Preguntas de Mantenimiento** (`src/app/admin/preguntas/page.tsx`) — CRUD completo de preguntas organizadas por dominio (Dispositivos Médicos, Equipamiento Industrial, Infraestructura). Incluye filtros por dominio, tipo de mantenimiento, tipo de respuesta y estado general. Permite importación masiva desde CSV/Excel y exportación. Componente: `PreguntaFormModal`.

- **Inventario de Equipos Médicos** (`src/app/admin/inventario/page.tsx`) — CRUD completo de equipos médicos con filtros por servicio, clase, subclase, estado y criticidad. Funcionalidades:
  - Creación y edición de equipos (`InventarioFormModal`)
  - Vista detalle con pestañas: Detalle, Historial, Archivos (`InventarioDetailModal`)
  - Historial de cambios auditado (`InventarioHistorialPanel`)
  - Archivos adjuntos categorizados por tipo de documento (`InventarioArchivosPanel`)
  - Importación masiva desde CSV/Excel
  - Exportación a CSV

- **Perfil** (`src/app/admin/profile/page.tsx`) — Vista de perfil con componentes especializados: Banner, General, ChangePassword, Notification, Upload, etc.

- **Gestión de Usuarios** (`src/app/admin/user-management/page.tsx`) — Protegida con `AdminGuard`. Búsqueda y administración de usuarios. Componente: `UsersTable`.

Área auth:

- **Sign In** (`src/app/auth/sign-in/page.tsx`) — Login y recuperación de contraseña.
- **Sign Up** (`src/app/auth/sign-up/default/page.tsx`) — Registro de usuario.

5. Componentes

`src/components` está dividida en dos grupos:

A. Componentes de dominio (`src/components/admin/`)

| Carpeta | Componentes | Descripción |
|---------|------------|-------------|
| `inventario/` | `InventarioFormModal`, `InventarioDetailModal`, `InventarioHistorialPanel`, `InventarioArchivosPanel` | CRUD equipos medicos, detalle con pestañas, historial auditado, archivos categorizados. Incluye selector de pauta de mantenimiento asignada |
| `inventario-industrial/` | `InventarioIndustrialFormModal`, `InventarioIndustrialDetailModal`, etc. | CRUD equipos industriales con mismo patron. Incluye selector de pauta asignada |
| `flota-vehicular/` | `FlotaVehicularFormModal`, `FlotaVehicularDetailModal`, etc. | CRUD flota vehicular con mismo patron. Incluye selector de pauta asignada |
| `infraestructura/` | `InfraestructuraFormModal`, `InfraestructuraDetailModal`, etc. | CRUD infraestructura con mismo patron. Incluye selector de pauta asignada |
| `mantenimiento/` | `MantenimientoDomainSelector`, `MantenimientoActivoSearch`, `MantenimientoChecklist`, `MantenimientoChecklistItem`, `MantenimientoFotosAdicionales`, `MantenimientoSignaturePad` | Wizard de mantenimiento de 5 etapas: dominio/activo, seleccion de pauta, checklist, fotos, firma |
| `preguntas/` | `PreguntaFormModal` | Formulario de creación/edición de preguntas de mantenimiento |
| `profile/` | `Banner`, `General`, `ChangePassword` | Módulos del perfil de usuario. ChangePassword usa autoComplete="new-password" para evitar autollenado del navegador |
| `user-management/` | `UsersTable` | Tabla de administración de usuarios |
| `indicators/` | — | Indicadores (preparado, no activo en rutas) |
| `admin-indicators/` | — | Indicadores admin (preparado, no activo en rutas) |
| `audit/` | — | Auditoría (preparado, no activo en rutas) |
| `notifications/` | — | Notificaciones (preparado, no activo en rutas) |

B. Componentes de infraestructura visual

Bloques reutilizables heredados y adaptados de Horizon UI:

`card/`, `charts/`, `fields/`, `dropdown/`, `navbar/`, `sidebar/`, `footer/`, `widget/`, `icons/`, `auth/`, `calendar/`, `checkbox/`, `fixedPlugin/`, `image/`, `link/`, `popover/`, `progress/`, `radio/`, `rtlProvider/`, `scrollbar/`, `switch/`, `tooltip/`

6. Servicios

La lógica de acceso a datos está en `src/services/`.

Servicios principales:

- **`auth.service.ts`** — Login, registro, logout, reset de contraseña, actualización de perfil, mapeo de `Parse.User` a perfil frontend.

- **`user.service.ts`** — Perfil extendido de usuario, actualización de atributos, subida de foto de perfil con `Parse.File`.

- **`user-management.service.ts`** — Administración de usuarios: listado mediante Cloud Functions, cambio de roles/niveles, activación/desactivación, eliminación.

- **`pregunta-mantenimiento.service.ts`** — CRUD de preguntas de mantenimiento: listar con filtros, crear, actualizar, eliminar, importar masivamente, exportar.

- **`inventario-equipo.service.ts`** — CRUD de inventario de equipos médicos: listar con filtros y paginación, crear, actualizar, eliminar, importar/exportar. Gestión de archivos adjuntos (subir con categoría, eliminar, listar). Historial de cambios. Incluye campo `pautaAsignada`.

- **`inventario-industrial.service.ts`** — CRUD de inventario de equipos industriales. Mismo patron que equipos medicos. Incluye campo `pautaAsignada`.

- **`inventario-flota.service.ts`** — CRUD de inventario de flota vehicular. Incluye campo `pautaAsignada`.

- **`inventario-infraestructura.service.ts`** — CRUD de inventario de infraestructura. Incluye campo `pautaAsignada`.

- **`mantenimiento.service.ts`** — Servicio del modulo de mantenimiento central: busqueda de activos, CRUD de registros, validacion (aprobar/rechazar), historial, archivos, preguntas, clasificaciones con preguntas, estadisticas. Metodo `getClasificacionesConPreguntas()` retorna pautas disponibles por dominio + tipo.

Servicios auxiliares (`src/services/utils/`):

- **`codigo.ss.service.ts`** — Códigos de servicio de salud.
- **`establecimiento.service.ts`** — Datos de establecimientos.
- **`selectores.service.ts`** — Selectores y catálogos compartidos.

Patrón general:

- Consumen Parse JS SDK directamente
- Invocan `Parse.Cloud.run(...)` para operaciones que requieren privilegios de backend
- Estado de sesión manejado por Parse SDK, sin store global

7. Tipos

`src/types/` centraliza contratos TypeScript:

| Archivo | Contenido principal |
|---------|-------------------|
| `user.types.ts` | `UserRole`, equivalencia `role`/`accessLevel`, contratos de usuarios |
| `pregunta-mantenimiento.types.ts` | `PreguntaMantenimiento`, `PreguntaFilters`, enums `Dominio`, `TipoMantenimiento`, `TipoRespuesta` con labels y colores |
| `inventario-equipo.types.ts` | `InventarioEquipo`, `InventarioEquipoFormData` (incluye `pautaAsignada`), `ArchivoAdjunto` (con `categoria`), `HistorialEntry`, constantes de estado/criticidad/subclase, `ARCHIVO_CATEGORIA_OPTIONS` con 7 tipos de documento |
| `inventario-industrial.types.ts` | `InventarioIndustrial`, `InventarioIndustrialFormData` (incluye `pautaAsignada`), constantes de estado/criticidad/tipoEquipo/combustible |
| `inventario-flota.types.ts` | `InventarioFlota`, `InventarioFlotaFormData` (incluye `pautaAsignada`), constantes de estado/tipoVehiculo/combustible |
| `inventario-infraestructura.types.ts` | `InventarioInfraestructura`, `InventarioInfraestructuraFormData` (incluye `pautaAsignada`), constantes de estado/criticidad/sistema |
| `mantenimiento.types.ts` | `RegistroMantenimiento`, `MantenimientoFormData`, `ActivoBusquedaResult` (incluye `pautaAsignada`), `ChecklistItem`, constantes de dominio/tipo/estado |
| `navigation.d.ts` | Contrato de rutas del sidebar/navbar |
| `indicator.types.ts` | Tipos de indicadores (preparado) |
| `notification.types.ts` | Tipos de notificaciones (preparado) |
| `evidence.types.ts` | Tipos de evidencias (preparado) |
| `admin-indicator.types.ts` | Tipos de indicadores admin (preparado) |

Categorías de archivos adjuntos definidas en `inventario-equipo.types.ts`:

- Acta de adquisición, Acta de baja, Garantía, Manual técnico, Certificado de calibración, Informe de mantención, Otro

8. Utilidades

`src/utils/`:

- `parseClient.ts` — Inicialización única de Parse SDK, base para auth y acceso a datos.
- `navigation.ts` — Helpers para detectar ruta activa y texto del navbar.
- `date-helpers.ts` — Utilidades de fechas.
- `period.utils.ts` — Utilidades de períodos.

9. Contextos

`src/contexts/SidebarContext.ts` — Coordina estado del sidebar (abierto/cerrado).

10. Estilos

Base visual de Horizon UI sobre Tailwind:

- `tailwind.config.js` — Tokens visuales: colores `brand`, `navy`, `gray`, tipografías `DM Sans` y `Poppins`, breakpoints personalizados, dark mode por clase.
- `src/styles/index.css` — Estilos globales.
- `src/styles/App.css` — Estilos de la app.
- `src/styles/Contact.css` — Estilos de contacto (heredado).
- `src/styles/MiniCalendar.css` — Estilos del mini calendario.

El proyecto mezcla utilidades Tailwind con algunos CSS globales heredados del template.

11. Server Actions

`src/actions/email.actions.ts` — Server action para envío de correos. Encapsula lógica que debe ejecutarse solo en servidor.

12. Configuración de plataforma

- `package.json` — Stack: `next`, `react`, `tailwindcss`, `parse`, `react-apexcharts`, `sweetalert2`, `react-icons`, `xlsx`.
- `tsconfig.json` — `baseUrl: "src"`, imports absolutos (`components/...`, `services/...`), `strict` desactivado.
- `next.config.js` — `output: 'standalone'`, `images.unoptimized = true`, ignora errores TypeScript/ESLint en build.
- `default.conf` — Nginx: frontend en `/`, Parse Server en `/api/parse`, mongo-express en `/mongo-admin/`.
- `Dockerfile` — Build y runtime containerizado. Usa `npm install --legacy-peer-deps`.

Convenciones para trabajar en este frontend

1. Agregar una pantalla nueva:
   - Crear ruta en `src/app/admin/...`
   - Añadir entrada en `src/routes.tsx` con `allowedRoles`
   - Reutilizar layout admin existente

2. Agregar funcionalidad de dominio:
   - UI específica en `src/components/admin/<modulo>/`
   - Tipos en `src/types/<modulo>.types.ts`
   - Servicio en `src/services/<modulo>.service.ts`
   - Bloques genéricos en `src/components/` compartidos

3. Agregar acceso a backend:
   - Usar `src/services/...`
   - Operaciones privilegiadas mediante Cloud Functions

4. Agregar control de acceso:
   - Guards en frontend para UX
   - Validar permisos en backend siempre
   - `allowedRoles` en `routes.tsx` para sidebar

5. Agregar estilos:
   - Priorizar Tailwind y tokens de `tailwind.config.js`
   - CSS global solo cuando sea necesario

Mapa rápido de responsabilidad

```text
src/app                   → rutas y layouts
src/components/admin      → módulos de negocio (inventario, preguntas, perfil, usuarios)
src/components            → UI base y componentes genéricos (Horizon UI)
src/services              → acceso a Parse y Cloud Functions
src/services/utils        → servicios auxiliares (códigos SS, establecimientos, selectores)
src/utils                 → helpers reutilizables
src/types                 → contratos TypeScript por módulo
src/styles                → estilos globales y soporte visual
src/actions               → lógica server-only
src/routes.tsx            → menú lateral y metadatos de navegación
frontend/examples         → legado / referencia (no activo)
```

---

## Actualización 2026-04-12 — Nuevas rutas y módulos

### Rutas añadidas

**Públicas (fuera de AuthGuard):**
- `/solicitud/nueva` — formulario público para solicitar mantenimiento (sin login)
- `/solicitud/estado/[folio]?t=[token]` — consulta pública por folio + token

El `AuthGuard` fue actualizado con el array `publicPermanentRoutes = ['/solicitud']` para que estas rutas no redirijan aunque haya o no sesión Parse.

**Administrativas:**
- `/admin/solicitudes` (COORDINATOR+) — bandeja de solicitudes recibidas
- `/admin/solicitudes/[id]` (OPERATOR+) — detalle + acciones (aceptar/rechazar/asignar/completar/cerrar)
- `/admin/solicitudes/mis-asignaciones` (OPERATOR+) — vista del encargado con sus OTs
- `/admin/encargados` (ADMIN+) — CRUD del equipo técnico (crea cuenta Parse automáticamente)
- `/admin/diagnostico-correo` (ADMIN+) — panel de diagnóstico SMTP Brevo

### Carpetas nuevas (estructura aislada por módulo)

```
frontend/src/
├── app/
│   ├── solicitud/                                    [PÚBLICO]
│   │   ├── layout.tsx
│   │   ├── nueva/page.tsx
│   │   └── estado/[folio]/page.tsx
│   └── admin/
│       ├── solicitudes/
│       │   ├── page.tsx
│       │   ├── [id]/page.tsx
│       │   └── mis-asignaciones/page.tsx
│       ├── encargados/page.tsx
│       └── diagnostico-correo/page.tsx
├── components/
│   ├── public/solicitudes/                            [PÚBLICO]
│   │   ├── FormularioSolicitudPublica.tsx
│   │   └── CaptchaMatematico.tsx
│   ├── admin/solicitudes/
│   │   └── ModalesAccionesSolicitud.tsx
│   └── admin/encargados/
│       └── EncargadoFormModal.tsx
├── services/
│   └── solicitudes/                                   [subcarpeta aislada]
│       ├── solicitud-publica.service.ts
│       ├── solicitud-admin.service.ts
│       ├── encargado.service.ts
│       └── brevo-diagnostico.service.ts
└── types/
    ├── solicitud.types.ts
    └── encargado.types.ts
```

### Carpeta `configBrevo/` — DEPRECADA

Todos los archivos de `frontend/src/configBrevo/` (config.brevo.ts, templates.ts, notification-client.service.ts, notification-manager.service.ts) fueron reemplazados por stubs que lanzan error. También `frontend/src/actions/email.actions.ts`. La razón: pertenecían a un proyecto anterior y exponían credenciales SMTP en el frontend. El envío de correos ahora vive exclusivamente en el backend — ver `context/mmtto/modulo-notificaciones-brevo.md`.

### Nuevas utilidades

- `frontend/src/utils/excel-mantenimiento.ts` — generación de xlsx para exportación de mantenimientos con carga dinámica de `xlsx`.

### Convenciones de z-index para modales anidados

- Modales simples: `z-50`
- Modal que abre sobre otro modal (ej. `LicitacionDetailModal`): `z-[60]`
- Modal hijo de un modal anidado (ej. `ExtensionFormModal`): `z-[70]`

Regla: si un modal A puede abrir un modal B, B debe tener z-index mayor que A.
