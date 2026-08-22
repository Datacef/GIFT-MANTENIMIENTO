Plataforma de Gestión de Mantenimiento — documentación general

Resumen ejecutivo

Sistema web para la gestión de mantenimiento de establecimientos de salud de atención cerrada en Chile. Gestiona mantenimiento de dispositivos médicos, equipamiento industrial e infraestructura, conforme a los ámbitos EQ (Seguridad del Equipamiento) e INS (Seguridad de las Instalaciones) del Manual de Acreditación de la Superintendencia de Salud.

La plataforma permite planificar, registrar y evidenciar el cumplimiento de los estándares de acreditación, proporcionando trazabilidad auditable de inventario, mantenciones, calibraciones y documentación asociada.

Relación con el Manual de Acreditación

El documento `context/mmtto/contexto-manual-acreditacion.md` describe los estándares normativos que este sistema debe soportar. La relación entre estándares y funcionalidades implementadas es:

### Ámbito EQ — Seguridad del Equipamiento

| Componente | Estándar | Qué exige | Cómo lo resuelve el sistema |
|------------|----------|-----------|---------------------------|
| EQ-1 | Adquisición y Reposición | Procedimiento de adquisición documentado, conocimiento de vida útil de equipos críticos (umbral ≥50%) | **Inventario de Equipos Médicos**: registro de fecha de adquisición, vida útil, estado, criticidad (C/A), archivos de acta de adquisición categorizados |
| EQ-2 | Mantenimiento Preventivo | Programa documentado de mantenimiento preventivo de equipos críticos (umbral 100%) y de apoyo (umbral ≥50%), constancia de ejecución | **Preguntas de Mantenimiento**: checklist estructurado por dominio `equipoMedico` con tipos preventivo/correctivo/predictivo. **Inventario**: frecuencia de mantención, informes de mantención como archivos adjuntos |
| EQ-3 | Operación Segura | Personal autorizado documentado para operar equipos relevantes | **Preguntas de Mantenimiento**: preguntas de verificación de operación segura, campo `referenciaAcreditacion` para vincular al estándar |

### Ámbito INS — Seguridad de las Instalaciones

| Componente | Estándar | Qué exige | Cómo lo resuelve el sistema |
|------------|----------|-----------|---------------------------|
| INS-1 | Vulnerabilidad | Evaluación periódica de riesgo de incendio, mantenimiento de extintores y sistemas de mitigación | **Preguntas de Mantenimiento**: dominio `infraestructura` con preguntas de protección contra incendios |
| INS-2 | Planes de Emergencia | Planes de evacuación actualizados, simulacros anuales, señalética funcional | **Preguntas de Mantenimiento**: preguntas de verificación de señalética y evacuación |
| INS-3 | Mantenimiento Preventivo | Programa documentado para ascensores, calderas, gases clínicos, climatización; plan de contingencia eléctrica y agua potable | **Preguntas de Mantenimiento**: dominio `equipoIndustrial` e `infraestructura` con checklist por clasificación de equipo |

### Tres dominios de mantenimiento

El sistema organiza todo el trabajo en tres dominios alineados con la acreditación:

1. **Dispositivos Médicos (EQ)** — `dominio: equipoMedico`
   - Inventario con clase/subclase, marca, modelo, serie, estado, criticidad
   - Archivos categorizados: actas de adquisición/baja, garantías, certificados de calibración, manuales técnicos, informes de mantención
   - Historial completo de cambios auditado
   - Vida útil, fechas de garantía, frecuencia de mantención

2. **Equipamiento Industrial** — `dominio: equipoIndustrial`
   - Calderas, generadores, HVAC, ascensores, lavandería/cocina industrial
   - Preguntas de mantenimiento preventivo/correctivo/predictivo
   - Clasificación por tipo de equipo

3. **Infraestructura (INS)** — `dominio: infraestructura`
   - Instalaciones eléctricas, sanitarias, gases clínicos, protección contra incendios, señalética, estructura
   - Preguntas de verificación y mantenimiento

Existe también el dominio `flotaVehicular` registrado como válido en el backend.

Arquitectura general

```text
┌─────────────────────────────────────────────────────────────┐
│                    Puerto 5771 (host)                        │
│                                                              │
│  ┌─────────────────── Nginx ──────────────────────────────┐ │
│  │                                                         │ │
│  │  /              → Next.js Frontend     (puerto 3000)    │ │
│  │  /api/parse/    → Parse Server Backend (puerto 1337)    │ │
│  │  /mongo-admin/  → Mongo Express        (puerto 8081)    │ │
│  │                                                         │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌──────────┐   ┌──────────────┐   ┌──────────────────────┐ │
│  │ Frontend │   │   Backend    │   │      MongoDB         │ │
│  │ Next.js  │──→│ Parse Server │──→│  (volumen persistente)│ │
│  │ React    │   │  Express.js  │   ��  GridFS (archivos)   │ │
│  │ Tailwind ���   │  Cloud Funcs │   │                      │ │
│  └──────────┘   └──────────────┘   └──────────────────────┘ │
│                                                              │
│  ┌──────────────┐                                           │
│  │Mongo Express │ — Admin UI para MongoDB                   │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

Todos los servicios corren en contenedores Docker orquestados por Docker Compose en una red interna `mmtto-net`. Solo Nginx expone el puerto 5771 al host.

Estructura del repositorio

```text
WEB-MANTENIMIENTO/
├─ frontend/                  # Aplicación Next.js (App Router + Tailwind + Parse SDK)
│  ├─ src/
│  │  ├─ app/                 # Rutas y layouts
│  │  ├─ components/          # Componentes UI (Horizon UI base + módulos de negocio)
│  │  ├─ services/            # Servicios de acceso a Parse
│  │  ├─ types/               # Tipos TypeScript por módulo
│  │  ├─ utils/               # Helpers (parseClient, navigation, dates)
│  │  ├─ contexts/            # SidebarContext
│  │  ├─ styles/              # CSS global
│  │  ├─ actions/             # Server Actions (email)
│  │  └─ routes.tsx           # Configuración del sidebar
│  ├─ default.conf            # Configuración Nginx (reverse proxy)
│  └─ Dockerfile              # Build del frontend
│
├─ backend/                   # Parse Server sobre Express
│  ├─ cloud/main.js           # Cloud Functions (~50+ funciones, ~4800+ líneas)
│  ├─ index.js                # Punto de entrada (Express + Parse + LiveQuery)
│  ├─ parse-config.js         # Configuración de Parse Server
│  ├─ init-super-admin.js     # Auto-creación de super admin al arrancar
│  ├─ setup-super-admin.js    # Script manual para consola del navegador
│  ├─ health-check.js         # Health check para Docker
│  └─ Dockerfile              # Build del backend
│
├─ scripts/                   # Scripts de utilidad (Python, ejecución manual)
│  ├─ coordinador.py          # Centro de control Docker (menú interactivo)
│  ├─ load_data_ss.py         # Carga de establecimientos desde Excel a MongoDB
│  ├─ sql_to_excel.py         # Extracción de tablas SQL a Excel
│  └─ data/                   # Archivos de datos fuente
│     ├─ establecimiento.xlsx # Catálogo de establecimientos de salud
│     ├─ localhost.sql        # Dump SQL de sistema anterior
│     ├─ inventario_inventario.xlsx  # Datos de inventario extraídos
│     └─ industriales_industriales.xlsx  # Datos de equipos industriales
│
├─ context/                   # Documentación técnica del proyecto
│  ├─ frontend.md             # Documentación del frontend
│  ├─ backend.md              # Documentación del backend
│  ├─ auth.md                 # Documentación del módulo de autenticación
│  ├─ plataforma-mantenimiento.md  # Este archivo — visión general
│  └─ mmtto/                  # Contexto de dominio
│     ├─ contexto-manual-acreditacion.md  # Estándares EQ e INS
│     ├─ modulo-inventario-equipos-medicos.md  # Spec del módulo inventario
│     └─ modulo-preguntas.md  # Spec del módulo preguntas
│
├─ example-mmtto/             # Material de referencia de sistema anterior
│  ├─ mantenimiento/          # Templates de mantenimiento
│  ├─ inspeccionVehiculos/    # Templates de inspección vehicular
│  └─ readme-mmtto.md         # Documentación del sistema de referencia
│
├─ docker-compose.yml         # Orquestación de todos los servicios
├─ CLAUDE.md                  # Instrucciones para Claude Code
├─ .env                       # Variables de entorno (no versionado)
└─ .env.local                 # Variables sensibles (no versionado)
```

Docker Compose — servicios y coordinación

El archivo `docker-compose.yml` define 5 servicios interconectados:

### 1. mongodb (`mmtto-mongodb`)

- **Imagen**: `mongo:latest`
- **Volumen**: `mongo_data` (persistente entre reinicios)
- **Health check**: `mongosh --quiet --eval "db.adminCommand('ping')"` cada 10s
- **Credenciales**: `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` desde `.env`
- **Red**: alias `mongodb` y `mongo` en `mmtto-net`

Es el primer servicio que debe estar healthy antes de que arranque el backend.

### 2. backend-server (`mmtto-backend`)

- **Build**: desde `./backend/Dockerfile`
- **Puerto interno**: 1337 (no expuesto al host)
- **Dependencia**: `mongodb` con `condition: service_healthy`
- **Variables**: todas de `.env` + `NODE_ENV=production`

Al arrancar: espera MongoDB → inicia Parse Server → monta LiveQuery → crea super admin.

### 3. frontend (`mmtto-frontend`)

- **Build**: desde `./frontend/Dockerfile`
- **Puerto interno**: 3000 (no expuesto al host)
- **Build args**: `NEXT_PUBLIC_PARSE_APP_ID`, `NEXT_PUBLIC_PARSE_JS_KEY`, `NEXT_PUBLIC_PARSE_SERVER_URL` (se bajan al build de Next.js)
- **Dependencia**: `backend-server`

Las variables `NEXT_PUBLIC_*` se inyectan en build-time porque Next.js las necesita durante la compilación.

### 4. mongo-express (`mmtto-mongo-express`)

- **Imagen**: `mongo-express:1.0.2`
- **Puerto interno**: 8081 (no expuesto al host)
- **Dependencia**: `mongodb` con `condition: service_healthy`
- **Acceso**: `http://localhost:5771/mongo-admin/` con autenticación básica (mismas credenciales de MongoDB)
- **Base URL**: configurado con `ME_CONFIG_SITE_BASEURL: /mongo-admin/` para funcionar detrás de Nginx

### 5. nginx (`mmtto-nginx`)

- **Imagen**: `nginx:alpine`
- **Puerto**: `5771:80` (único puerto expuesto al host)
- **Configuración**: monta `frontend/default.conf` como read-only
- **Dependencia**: frontend, backend-server, mongo-express
- **Funciones**: gzip, CORS, WebSocket upgrade, proxy de headers Parse

Routing de Nginx:

| Ruta | Destino | Uso |
|------|---------|-----|
| `/` | `frontend:3000` | Aplicación Next.js |
| `/api/parse/` | `backend-server:1337/parse/` | API Parse Server + WebSockets |
| `/mongo-admin/` | `mongo-express:8081/mongo-admin/` | Admin de MongoDB |
| `/health` | Nginx directo | Health check (retorna 200 OK) |

### Cadena de dependencias

```text
mongodb (healthy) → backend-server → frontend → nginx
mongodb (healthy) → mongo-express           ↗
```

### Red

Todos los servicios están en `mmtto-net` (bridge). La comunicación interna usa nombres de servicio como hostnames DNS.

### Volúmenes

- `mongo_data` — datos de MongoDB, persiste entre `docker compose down` y `docker compose up`
- Se pierde solo con `docker compose down -v` (reset total)

Scripts — herramientas de utilidad

### coordinador.py

Centro de control interactivo para gestión de contenedores Docker. Menú con 14 opciones:

| Opción | Acción |
|--------|--------|
| 1 | Rebuild completo (down → build sin cache → up) |
| 2 | Actualizar sin rebuild (down → up) |
| 3 | Reiniciar todos los servicios |
| 4 | Rebuild solo backend |
| 5 | Rebuild solo frontend |
| 6 | Reiniciar Nginx |
| 7 | Reiniciar Mongo Express |
| 8 | Estado de servicios (ps + stats) |
| 9 | Logs en tiempo real (seleccionar servicio) |
| 10 | Parar todos (preserva volúmenes) |
| 11 | Levantar todos |
| 12 | Reset total (borra volumen MongoDB, requiere confirmación "CONFIRMAR") |
| 13 | Limpieza Docker (prune de imágenes, contenedores, volúmenes, redes, cache) |
| 14 | Cargar establecimientos desde Excel |
| r | Rescate rápido (inicia servicios en orden de dependencia con esperas) |

Uso:
```bash
python scripts/coordinador.py        # Menú interactivo
python scripts/coordinador.py 4      # Ejecución directa (rebuild backend)
```

### load_data_ss.py

Carga el catálogo de establecimientos de salud de Chile desde `scripts/data/establecimiento.xlsx` a la colección `Establecimiento` en MongoDB vía REST API de Parse.

Flujo:
1. Lee Excel con pandas
2. Mapea columnas del Excel a campos de Parse (17 campos: código, nombre, región, comuna, servicio de salud, tipo, complejidad, etc.)
3. Elimina todos los registros existentes de la colección
4. Inserta en lotes de 50 usando batch API de Parse
5. Usa masterKey para autenticación

### sql_to_excel.py

Herramienta de migración que extrae datos de un dump SQL (`scripts/data/localhost.sql`) del sistema anterior y los exporta a Excel. Parsea sentencias CREATE TABLE e INSERT INTO.

Uso:
```bash
python scripts/sql_to_excel.py inventario_inventario        # Tabla específica
python scripts/sql_to_excel.py nombre_tabla salida.xlsx     # Con archivo de salida
```

Los archivos Excel generados (`inventario_inventario.xlsx`, `industriales_industriales.xlsx`) sirven como fuente para importación masiva al nuevo sistema.

### scripts/data/

| Archivo | Contenido |
|---------|-----------|
| `establecimiento.xlsx` | Catálogo oficial de establecimientos de salud |
| `localhost.sql` | Dump SQL del sistema anterior (MySQL) |
| `inventario_inventario.xlsx` | Datos de inventario extraídos del dump |
| `industriales_industriales.xlsx` | Datos de equipos industriales extraídos |

Carpeta example-mmtto

Material de referencia del sistema anterior de mantenimiento. Contiene templates y estructuras que sirven como guía para futuras implementaciones:

- `mantenimiento/` — Templates de módulos de mantenimiento
- `inspeccionVehiculos/` — Templates de inspección vehicular
- `readme-mmtto.md` — Documentación del sistema de referencia

No es código activo. No está importado desde el frontend ni el backend.

Carpeta context

Documentación técnica organizada por capa y dominio:

| Archivo | Contenido |
|---------|-----------|
| `frontend.md` | Arquitectura, rutas, componentes, servicios, tipos del frontend |
| `backend.md` | Arquitectura, modelo de datos, Cloud Functions, variables de entorno |
| `auth.md` | Flujos de autenticación, guards, roles, sesión, super admin |
| `plataforma-mantenimiento.md` | Este archivo — visión general del proyecto |
| `mmtto/contexto-manual-acreditacion.md` | Estándares EQ e INS del Manual de Acreditación |
| `mmtto/modulo-inventario-equipos-medicos.md` | Especificación del módulo de inventario equipos medicos (incluye campo `pautaAsignada`) |
| `mmtto/modulo-equipos-industriales.md` | Especificación del módulo de inventario equipos industriales (incluye campo `pautaAsignada`) |
| `mmtto/modulo-inventario-infraestructura.md` | Especificación del módulo de inventario infraestructura (incluye campo `pautaAsignada`) |
| `mmtto/modulo-mantenimiento-central.md` | Especificación del módulo de mantenimiento central — wizard de 5 etapas con seleccion de pauta |
| `mmtto/modulo-preguntas.md` | Especificación del módulo de preguntas |

Flujo de datos — de extremo a extremo

### Ejemplo: crear un equipo en inventario y adjuntar archivos

```text
1. Usuario (OPERATOR+) abre /admin/inventario
2. Frontend: InventarioFormModal → servicio adjuntarArchivo()
3. Servicio: Parse.Cloud.run('createInventarioEquipo', { data })
4. Nginx: /api/parse/ → proxy → backend-server:1337/parse/
5. Backend: Cloud Function valida accessLevel ≥ 2, valida datos
6. Backend: crea objeto en InventarioEquipoMedico (MongoDB)
7. Backend: registra historial en InventarioHistorial
8. Respuesta regresa por la misma cadena al frontend

Adjuntar archivo:
9. Frontend: new Parse.File(file) → save() → obtiene URL (GridFS)
10. Frontend: Parse.Cloud.run('adjuntarArchivoInventario', { equipoId, fileName, fileUrl, categoria })
11. Backend: push al array archivos[] del equipo (no reemplaza, acumula)
12. Backend: registra en InventarioHistorial como 'archivo_adjunto'
```

### Ejemplo: evaluar mantenimiento con preguntas

```text
1. COORDINATOR+ configura preguntas en /admin/preguntas
2. Preguntas organizadas por dominio (equipoMedico, equipoIndustrial, infraestructura)
3. Cada pregunta tiene tipo de mantenimiento (preventivo, correctivo, predictivo)
4. Tipo de respuesta: sí/no, escala, texto, selección
5. Campo referenciaAcreditacion vincula la pregunta al estándar EQ/INS específico
6. Importación masiva desde CSV/Excel para cargar bancos de preguntas completos
```

Módulos implementados

### 1. Autenticación y usuarios
- Login/registro con Parse SDK
- Guards de autenticación (AuthGuard) y autorización (AdminGuard)
- 5 niveles de acceso: VIEWER → OPERATOR → COORDINATOR → ADMIN → SUPER_ADMIN
- Gestión de usuarios: búsqueda, cambio de roles, activación/desactivación
- Super admin auto-creado al arrancar
- Detalle completo en `context/auth.md`

### 2. Preguntas de mantenimiento
- CRUD completo de preguntas organizadas por dominio y tipo
- Filtros: dominio, tipo mantenimiento, clasificación equipo, categoría, búsqueda textual
- Importación masiva desde CSV/Excel
- Campos: pregunta, descripción, tipo respuesta, opciones, requiere foto/observación, es crítica, referencia acreditación
- Acceso: lectura OPERATOR+, escritura COORDINATOR+

### 3. Inventario de equipos médicos
- CRUD completo con 19 campos por equipo (incluye `pautaAsignada` para pre-asignar pauta de mantenimiento)
- Filtros: servicio, clase, subclase, estado, criticidad, búsqueda
- Paginación server-side
- Vista detalle con 3 pestañas: Detalle, Historial, Archivos
- Archivos categorizados: acta de adquisición, acta de baja, garantía, manual técnico, certificado de calibración, informe de mantención, otro
- Los archivos se acumulan (nunca se reemplazan) — historial documental completo
- Historial de cambios auditado campo a campo
- Importación masiva desde CSV/Excel
- Exportación a CSV
- Acceso: lectura VIEWER+, creación OPERATOR+, edición/eliminación COORDINATOR+

### 4. Inventario de equipos industriales
- CRUD completo con campo `pautaAsignada`
- Mismo patron que equipos medicos: detalle, historial, archivos

### 5. Inventario de flota vehicular
- CRUD completo con campo `pautaAsignada`
- Campos especificos: patente, VIN, kilometraje, revision tecnica, seguro

### 6. Inventario de infraestructura
- CRUD completo con campo `pautaAsignada`
- Campos especificos: sistema, normativa aplicable, inspecciones

### 7. Mantenimiento central
- Wizard de 5 etapas para crear mantenimiento sobre cualquiera de los 4 inventarios
- Etapas: dominio/activo → seleccion de pauta → checklist → fotos → firma
- Campo `pautaAsignada` en inventarios permite pre-seleccionar la pauta (el tecnico siempre puede cambiarla)
- Cloud function `getClasificacionesConPreguntas` retorna pautas disponibles por dominio + tipo
- Bandeja de validacion para coordinadores/admins
- Detalle completo con checklist, fotos, firmas

### 8. Dashboard
- Vista principal con widgets y charts (actualmente datos mock)
- Base visual de Horizon UI

### 9. Perfil de usuario
- Datos personales, foto de perfil, cambio de contraseña
- Inputs de contraseña con `autoComplete="new-password"` para evitar autollenado del navegador

Módulos pendientes (planificados)

Basado en componentes ya creados en `components/admin/` pero sin rutas activas:

- **Indicadores** — Métricas de cumplimiento de mantenimiento
- **Indicadores Admin** — Gestión administrativa de indicadores
- **Auditoría** — Registros de auditoría del sistema
- **Notificaciones** — Sistema de notificaciones

Variables de entorno

Definidas en `.env` y `.env.local` en la raíz del proyecto:

| Variable | Capa | Descripción |
|----------|------|-------------|
| `MONGO_ROOT_USER` | Docker/Backend | Usuario root de MongoDB |
| `MONGO_ROOT_PASSWORD` | Docker/Backend | Password root de MongoDB |
| `MONGO_DB` | Docker/Backend | Nombre de la base de datos |
| `PARSE_APP_ID` | Backend | ID de la aplicación Parse |
| `PARSE_MASTER_KEY` | Backend | Master key (solo servidor) |
| `PARSE_JS_KEY` | Backend | JavaScript key |
| `PARSE_SERVER_URL` | Backend | URL interna del servidor |
| `PARSE_PUBLIC_SERVER_URL` | Backend | URL pública |
| `NEXT_PUBLIC_PARSE_APP_ID` | Frontend (build-time) | App ID para el cliente |
| `NEXT_PUBLIC_PARSE_JS_KEY` | Frontend (build-time) | JS key para el cliente |
| `NEXT_PUBLIC_PARSE_SERVER_URL` | Frontend (build-time) | URL de Parse desde el navegador |
| `DEFAULT_ADMIN_USER` | Backend | Username del super admin inicial |
| `DEFAULT_ADMIN_PASS` | Backend | Password del super admin inicial |
| `DEFAULT_ADMIN_EMAIL` | Backend | Email del super admin inicial |

Comandos principales

```bash
# Levantar todo el sistema
docker compose up --build

# Rebuild solo backend (tras cambiar cloud functions)
docker compose up --build backend-server

# Rebuild solo frontend (tras cambiar componentes)
docker compose up --build frontend

# Ver estado
docker compose ps

# Ver logs
docker compose logs -f backend-server

# Parar todo (preserva datos)
docker compose down

# Reset total (borra MongoDB)
docker compose down -v

# Cargar establecimientos
python scripts/load_data_ss.py

# Menú de gestión interactivo
python scripts/coordinador.py
```

URLs de acceso (desarrollo local)

| URL | Servicio |
|-----|----------|
| `http://localhost:5771` | Aplicación web |
| `http://localhost:5771/api/parse` | API Parse Server |
| `http://localhost:5771/mongo-admin/` | Administración MongoDB |

Convenciones del proyecto

- **Idioma**: todo el UI, comentarios, datos y documentación en español
- **Sin store global**: componentes consumen servicios directamente, estado local con React hooks
- **Parse como BaaS**: toda la lógica de backend es Cloud Functions, sin endpoints REST propios
- **Archivos en GridFS**: subidos con Parse.File, almacenados automáticamente en MongoDB
- **Permisos en dos capas**: sidebar filtra por rol (UI), Cloud Functions validan accessLevel (backend)
- **TypeScript ignorado en build**: `typescript.ignoreBuildErrors: true`, build exitoso no garantiza tipo-seguridad
- **Frontend install**: requiere `--legacy-peer-deps` por conflictos de dependencias

---

## Actualización 2026-04-12 — Nuevos módulos y capacidades

### Módulos añadidos

1. **Solicitudes / Órdenes de Trabajo** (`modulo-solicitudes-ordenes-trabajo.md`)
   - Formulario público (sin login) para capturar solicitudes desde cualquier usuario del hospital
   - Bandeja administrativa con flujo completo: aceptar → asignar a encargado → seguimiento → completar → cerrar
   - Máquina de estados: `pendiente → aceptada/rechazada → asignada → en_proceso → devuelta → completada → cerrada`
   - Rechazo reabrible
   - Folios `SOL-YYYY-NNNNN` y Órdenes de Trabajo `OT-NNNNN-YYYYMMDD`
   - Captcha matemático en formulario público

2. **Encargados de Mantenimiento**
   - CRUD con especialidades y dominios
   - Cada encargado obtiene cuenta `_User` Parse (OPERATOR) automáticamente al crearse

3. **Notificaciones por Correo (Brevo SMTP)** (`modulo-notificaciones-brevo.md`)
   - Backend-only; credenciales en `.env` sin prefijo `NEXT_PUBLIC_`
   - 7 templates HTML para los eventos del flujo de solicitudes
   - Panel de diagnóstico en `/admin/diagnostico-correo`
   - Logs auditables en la clase `NotificacionCorreo`

4. **Exportación Excel de Mantenimientos** (`modulo-exportacion-excel-mantenimiento.md`)
   - Paginación automática en bloques de 1000 (respeta límite Parse)
   - Filtros en cascada por dominio, fechas, identificador contextual, ID de pauta
   - ID Pauta como primera columna para búsqueda inversa

### Cambios en proveedores/licitaciones
- Extensiones de contrato funcionales (fix z-index modal anidado)
- Validación: nueva fecha término debe ser posterior a la efectiva actual
- Sincronización automática con los 4 inventarios tras agregar extensión

### Nuevas convenciones del proyecto

| Aspecto | Regla |
|---|---|
| **Credenciales** | Nunca en frontend ni con prefijo `NEXT_PUBLIC_`. Solo en `.env` del backend. |
| **Envío de correos** | Siempre desde Parse Cloud Functions. Nunca desde server actions del frontend. |
| **Rutas públicas** | Registradas en `AuthGuard.publicPermanentRoutes` |
| **Z-index modales** | `z-50` base, `z-[60]` modales padre, `z-[70]` modales hijos |
| **Estructura de servicios** | Servicios relacionados agrupados en subcarpeta (ej. `services/solicitudes/`) |
| **Documentación de cambios** | Todo cambio estructural se documenta en `context/mmtto/` |

### Archivos deprecados

`frontend/src/configBrevo/*` y `frontend/src/actions/email.actions.ts` fueron convertidos en stubs que lanzan error. Heredados de proyecto anterior; no deben usarse.

### Dependencias añadidas

- Backend: `nodemailer@^6.9.14`
- Frontend: ya existía `xlsx@^0.18.5` (solo se añadió uso en `utils/excel-mantenimiento.ts`)

### Cheat sheet — Ubicación de cambios importantes

| Cambio | Archivo documento |
|---|---|
| Flujo de solicitudes | `mmtto/modulo-solicitudes-ordenes-trabajo.md` |
| Sistema de correos | `mmtto/modulo-notificaciones-brevo.md` |
| Export Excel mantenimiento | `mmtto/modulo-exportacion-excel-mantenimiento.md` |
| Extensiones de licitación | `mmtto/actualizacion-modulo-proveedores.md` (sección final) |
| Rutas frontend nuevas | `frontend.md` (sección final) |
| Cloud functions nuevas | `backend.md` (sección final) |
