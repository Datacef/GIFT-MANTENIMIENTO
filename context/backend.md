Backend — organización técnica

Resumen

El backend es un Parse Server montado sobre Express.js que sirve como BaaS (Backend as a Service) para el sistema. Toda la lógica de negocio se implementa como Cloud Functions en un único archivo `cloud/main.js`. La base de datos es MongoDB, y los archivos se almacenan vía GridFS (built-in de Parse). El servidor incluye LiveQuery (WebSockets) para actualizaciones en tiempo real, health check, inicialización automática de super admin y espera activa de MongoDB al arrancar.

Dependencias principales: `parse-server@^7.3.0`, `express@^4.21.0`, `mongodb@^6.9.0`.

Estructura del directorio

```text
backend/
├─ cloud/
│  └─ main.js              # Todas las Cloud Functions (~1879 líneas)
├─ index.js                # Punto de entrada: Express + Parse Server + LiveQuery
├─ parse-config.js         # Configuración consolidada de Parse Server
├─ init-super-admin.js     # Inicialización automática de super admin al arrancar
├─ setup-super-admin.js    # Script manual para configurar super admin desde consola del navegador
├─ health-check.js         # Script de health check para Docker
├─ package.json            # Dependencias y scripts
└─ Dockerfile              # Build containerizado
```

Arquitectura de arranque

`index.js` ejecuta la siguiente secuencia:

1. **Middleware CORS** — Headers permisivos para todas las rutas
2. **waitForMongoDB()** — Espera activa hasta 60 intentos (3s entre cada uno = 3 min máximo) verificando conectividad con ping y MongoClient
3. **Parse Server start** — Inicializa con config de `parse-config.js` y cloud code de `cloud/main.js`
4. **Monta rutas Express**:
   - `GET /` — Info del servidor (status, version, appId, environment)
   - `GET /health` — Health check (status, uptime)
   - `/parse` — Parse Server API
5. **LiveQuery Server** — WebSockets sobre el mismo httpServer
6. **initSuperAdmin()** — Con 3s de delay para que Parse esté listo

Puerto por defecto: **1337** (configurable via `PARSE_PORT` o `PORT`).

Configuración de Parse Server (`parse-config.js`)

| Parámetro | Valor |
|-----------|-------|
| mountPath | `/parse` |
| serverURL | `http://backend-server:1337/parse` |
| publicServerURL | `http://localhost/api/parse` |
| allowClientClassCreation | `true` |
| enableAnonymousUsers | `false` |
| verifyUserEmails | `false` |
| enableEmailSignIn | `true` |
| revokeSessionOnPasswordReset | `true` |
| maxUploadSize | `20mb` |
| sessionLength | `31536000` (1 año) |
| maxPoolSize MongoDB | `10` |
| logLevel | `info` (dev) / `error` (prod) |
| fileUpload | Habilitado para público y usuarios autenticados |

Claves (`appId`, `masterKey`, `javascriptKey`) vienen de variables de entorno.

Modelo de datos (Parse Classes)

Las clases se crean implícitamente al guardar objetos. Las principales son:

### _User (Parse built-in)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| username | String | Nombre de usuario |
| email | String | Correo electrónico |
| firstName | String | Nombre |
| lastName | String | Apellido |
| birthDate | String | Fecha de nacimiento |
| gender | String | Género |
| phone | String | Teléfono |
| accessLevel | Number | Nivel de acceso (1-5) |
| role | String | Rol textual |
| isActive | Boolean | Estado activo/inactivo |
| avatarUrl | String | URL foto de perfil |
| servicioSaludId | String | ID del servicio de salud |
| servicioSaludNombre | String | Nombre del servicio de salud |
| establecimientoId | String | ID del establecimiento |
| establecimientoNombre | String | Nombre del establecimiento |
| establecimientoCodigo | String | Código del establecimiento |

Niveles de acceso:

| Nivel | Rol | Descripción |
|-------|-----|-------------|
| 1 | VIEWER | Solo lectura |
| 2 | OPERATOR | Operador (crear equipos, subir archivos) |
| 3 | COORDINATOR | Coordinador (editar, eliminar, importar) |
| 4 | ADMIN | Administrador (gestión de usuarios) |
| 5 | SUPER_ADMIN | Super administrador |

### PreguntaMantenimiento

| Campo | Tipo | Descripción |
|-------|------|-------------|
| dominio | String | `equipoMedico`, `equipoIndustrial`, `infraestructura`, `flotaVehicular` |
| tipoMantenimiento | String | `preventivo`, `correctivo`, `predictivo` |
| clasificacionEquipo | String | Clasificación libre del equipo |
| categoria | String | Categoría de la pregunta |
| pregunta | String | Texto de la pregunta |
| descripcion | String | Descripción complementaria |
| tipoRespuesta | String | `siNo`, `escala`, `texto`, `seleccion` |
| opcionesRespuesta | Array | Opciones si tipoRespuesta = `seleccion` |
| requiereFoto | Boolean | Exige foto como evidencia |
| requiereObservacion | Boolean | Exige observación textual |
| esCritica | Boolean | Pregunta marcada como crítica |
| estadoGeneral | String | Estado general de la pregunta |
| orden | Number | Orden de presentación |
| activo | Boolean | Activa/inactiva |
| referenciaAcreditacion | String | Referencia al manual de acreditación |
| creadoPor | String | userId del creador |

### InventarioEquipoMedico

| Campo | Tipo | Descripción |
|-------|------|-------------|
| servicio | String | Servicio clínico asignado |
| clase | String | Clase del equipo |
| subclase | String | `Alto Costo`, `Mediano Costo`, `Bajo Costo` |
| nombreEquipo | String | Nombre del equipo (obligatorio) |
| marca | String | Marca |
| modelo | String | Modelo |
| serie | String | Número de serie |
| inventario | String | Código de inventario |
| valor | String | Valor monetario |
| fechaAdquisicion | String | Fecha de adquisición |
| vidaUtil | Number | Vida útil en años |
| estado | String | `B` (Bueno), `M` (Malo), `R` (Regular), `Baja` |
| criticoApoyo | String | `C` (Crítico), `A` (Apoyo) |
| frecuencia | Number | Frecuencia de mantención |
| garantiaInicio | String | Inicio de garantía |
| garantiaFinal | String | Fin de garantía |
| fechaBaja | String | Fecha de baja |
| activo | Boolean | Activo/inactivo |
| archivos | Array | Archivos adjuntos (ver estructura abajo) |
| creadoPor | String | userId del creador |

Estructura de cada elemento en `archivos`:

```json
{
  "nombre": "acta-adquisicion.pdf",
  "url": "https://...",
  "tipo": "pdf",
  "categoria": "adquisicion",
  "subidoPor": "Juan Pérez",
  "fecha": "2026-04-05T12:00:00.000Z"
}
```

Categorías válidas: `adquisicion`, `baja`, `garantia`, `manual`, `calibracion`, `mantencion`, `otro`.

### InventarioHistorial

| Campo | Tipo | Descripción |
|-------|------|-------------|
| equipoId | String | ID del equipo referenciado |
| accion | String | `creacion`, `edicion`, `eliminacion`, `archivo_adjunto`, `archivo_eliminado` |
| cambios | Object | Mapa de campo → `{ anterior, nuevo }` |
| descripcion | String | Descripción legible de la acción |
| usuarioId | String | ID del usuario que realizó la acción |
| usuarioNombre | String | Nombre del usuario |
| archivoNombre | String | Nombre del archivo (si aplica) |
| archivoUrl | String | URL del archivo (si aplica) |

### CodigoSS

| Campo | Tipo | Descripción |
|-------|------|-------------|
| CODIGO_SERVICIO_SALUD | String | Código del servicio de salud |
| SERVICIO_SALUD | String | Nombre del servicio de salud |

### Establecimiento

| Campo | Tipo | Descripción |
|-------|------|-------------|
| codigo | String | Código del establecimiento |
| nombre | String | Nombre |
| servicioSaludCodigo | String | Código del servicio de salud asociado |
| servicioSaludNombre | String | Nombre del servicio de salud |
| regionNombre | String | Región |
| comunaNombre | String | Comuna |
| tipoEstablecimiento | String | Tipo |
| nivelComplejidad | String | Nivel de complejidad |
| tipoAtencion | String | Tipo de atención |
| estadoFuncionamiento | String | Estado de funcionamiento |

Cloud Functions — catálogo completo

### Utilidades (sin autenticación requerida en algunas)

| Función | Acceso | Descripción |
|---------|--------|-------------|
| `hello` | Público | Test — retorna saludo |
| `countObjects` | Público | Cuenta objetos de una clase |
| `procesarDatos` | Público | Operaciones matemáticas sobre arrays (suma, promedio, max, min) |

### Administración de usuarios

| Función | Acceso mínimo | Descripción |
|---------|---------------|-------------|
| `getAllUsers` | ADMIN (4) | Lista usuarios con paginación |
| `searchUsers` | ADMIN (4) | Busca por email, nombre o apellido |
| `getUserById` | ADMIN (4) | Obtiene usuario por ID |
| `updateUser` | ADMIN (4) | Actualiza datos de un usuario |
| `updateUserAccessLevel` | ADMIN (4) | Cambia nivel de acceso |
| `deleteUser` | ADMIN (4) | Elimina usuario |
| `setSuperAdmin` | SUPER_ADMIN (5) | Asigna nivel SUPER_ADMIN |
| `emergencyUpdateUserAccessLevel` | Especial | Actualización de emergencia con validación de masterKey |

Nota: `getAllUsers` tiene acceso temporal para configuración inicial (si el usuario no tiene `accessLevel` definido).

### Datos de referencia (públicos)

| Función | Autenticación | Descripción |
|---------|---------------|-------------|
| `getServiciosSalud` | No | Lista servicios de salud desde CodigoSS |
| `getEstablecimientos` | No | Lista establecimientos, filtro opcional por servicioSaludCodigo |
| `getServiciosSaludFromEstablecimientos` | No | Servicios de salud únicos derivados de Establecimiento |

### Preguntas de mantenimiento

| Función | Acceso mínimo | Descripción |
|---------|---------------|-------------|
| `getPreguntasMantenimiento` | OPERATOR (2) | Lista con filtros (dominio, tipo, clasificación, categoría, búsqueda) y paginación |
| `getPreguntaById` | OPERATOR (2) | Obtiene pregunta por ID |
| `createPregunta` | COORDINATOR (3) | Crea pregunta con validación de dominio, tipo y campos obligatorios |
| `updatePregunta` | COORDINATOR (3) | Actualiza pregunta existente |
| `deletePregunta` | COORDINATOR (3) | Elimina pregunta |
| `togglePreguntaActivo` | COORDINATOR (3) | Activa/desactiva pregunta |
| `getClasificacionesEquipo` | OPERATOR (2) | Valores únicos de clasificacionEquipo (filtro opcional por dominio) |
| `getCategoriasPreguntas` | No | Valores únicos de categoría (filtro opcional por dominio y clasificación) |
| `importarPreguntas` | COORDINATOR (3) | Importación masiva desde array |

### Inventario de equipos médicos

| Función | Acceso mínimo | Descripción |
|---------|---------------|-------------|
| `getInventarioEquipos` | VIEWER (1) | Lista con filtros (servicio, clase, subclase, estado, criticoApoyo, búsqueda, activo) y paginación |
| `getInventarioEquipoById` | VIEWER (1) | Obtiene equipo por ID |
| `createInventarioEquipo` | OPERATOR (2) | Crea equipo. Registra historial de creación |
| `updateInventarioEquipo` | COORDINATOR (3) | Actualiza equipo. Registra cambios campo a campo en historial |
| `deleteInventarioEquipo` | COORDINATOR (3) | Elimina equipo. Registra en historial |
| `getInventarioServicios` | VIEWER (1) | Valores únicos de servicio |
| `getInventarioClases` | VIEWER (1) | Valores únicos de clase |
| `importarInventarioEquipos` | COORDINATOR (3) | Importación masiva desde array |
| `exportarInventarioEquipos` | VIEWER (1) | Exporta todos los equipos (con filtros opcionales, limit 10000) |

### Historial y archivos de inventario

| Función | Acceso mínimo | Descripción |
|---------|---------------|-------------|
| `getInventarioHistorial` | VIEWER (1) | Historial de cambios de un equipo, con paginación |
| `adjuntarArchivoInventario` | OPERATOR (2) | Sube archivo con categoría. Los archivos se acumulan (no se reemplazan). Registra en historial |
| `eliminarArchivoInventario` | COORDINATOR (3) | Elimina archivo del array. Registra en historial |
| `getArchivosInventario` | VIEWER (1) | Lista archivos adjuntos de un equipo |

Función auxiliar (no expuesta como Cloud Function):

- `registrarHistorial(equipoId, accion, cambios, descripcion, user, archivoInfo)` — Crea registro en InventarioHistorial

Patrón general de las Cloud Functions

Todas las funciones siguen esta estructura:

1. **Verificar autenticación** — `request.user` existe
2. **Verificar nivel de acceso** — `accessLevel >= N`
3. **Validar parámetros** — campos requeridos y valores permitidos
4. **Ejecutar lógica** — queries/saves con `{ useMasterKey: true }`
5. **Retornar datos mapeados** — objetos planos JSON (no Parse Objects)
6. **Manejo de errores** — `Parse.Error` con código HTTP y mensaje en español

Inicialización de super admin (`init-super-admin.js`)

Se ejecuta automáticamente al arrancar el servidor (con 3s de delay). Flujo:

1. Lee credenciales de variables de entorno: `DEFAULT_ADMIN_USER`, `DEFAULT_ADMIN_PASS`, `DEFAULT_ADMIN_EMAIL`
2. Busca si el usuario ya existe via REST API con masterKey
3. Si existe pero `accessLevel !== 5`, lo actualiza
4. Si no existe, lo crea con `accessLevel: 5`

No falla el arranque si las variables no están definidas (solo imprime error en consola).

Health check (`health-check.js`)

Script Node.js independiente que hace `GET http://localhost:1337/health`. Retorna exit code 0 (OK) o 1 (fallo). Usado por Docker para verificar salud del contenedor.

Variables de entorno relevantes

| Variable | Uso |
|----------|-----|
| `PARSE_APP_ID` | ID de la aplicación Parse |
| `PARSE_MASTER_KEY` | Master key (nunca exponer al cliente) |
| `PARSE_JS_KEY` | JavaScript key (usada por frontend) |
| `PARSE_SERVER_URL` | URL interna del servidor |
| `PARSE_PUBLIC_SERVER_URL` | URL pública (usada por clientes) |
| `PARSE_SERVER_DATABASE_URI` | URI completa de MongoDB |
| `MONGO_ROOT_USER` | Usuario MongoDB (si no se usa URI completa) |
| `MONGO_ROOT_PASSWORD` | Password MongoDB |
| `MONGO_DB` | Nombre de la base de datos |
| `PARSE_PORT` / `PORT` | Puerto del servidor (default 1337) |
| `HOST` | Host de escucha (default 0.0.0.0) |
| `NODE_ENV` | Entorno (development/production) |
| `DEFAULT_ADMIN_USER` | Username del super admin inicial |
| `DEFAULT_ADMIN_PASS` | Password del super admin inicial |
| `DEFAULT_ADMIN_EMAIL` | Email del super admin inicial |
| `DEFAULT_ADMIN_FIRSTNAME` | Nombre del super admin (opcional) |
| `DEFAULT_ADMIN_LASTNAME` | Apellido del super admin (opcional) |

Convenciones para extender el backend

1. **Agregar una Cloud Function**: añadir en `cloud/main.js` siguiendo el patrón existente (auth → accessLevel → validación → lógica → respuesta).

2. **Agregar una clase/colección**: no hace falta esquema previo (`allowClientClassCreation: true`). Crear objetos con `Parse.Object.extend('NombreClase')`.

3. **Agregar historial**: usar la función auxiliar `registrarHistorial()` para registrar acciones auditables.

4. **Archivos**: subir con `Parse.File` desde frontend, pasar URL a cloud function para asociar al objeto. GridFS almacena los binarios automáticamente.

5. **Permisos**: siempre validar `request.user` y `accessLevel` al inicio de cada función. No confiar en validaciones del frontend.

---

## Actualización 2026-04-12 — Nuevos módulos y servicios

### Nuevo directorio `backend/services/`

Centraliza servicios reutilizables fuera del `main.js`:

| Archivo | Responsabilidad |
|---|---|
| `brevo-mailer.js` | Transporter nodemailer, `enviarCorreo({to, subject, html})`, saneo de env, verificación SMTP |
| `templates-solicitud.js` | 7 templates HTML para correos del flujo de solicitudes |

Detalle completo en `context/mmtto/modulo-notificaciones-brevo.md`.

### Nuevas clases Parse

| Clase | Descripción |
|---|---|
| `SolicitudMantenimiento` | Solicitudes públicas convertidas en OTs (estado, asignación, verificables) |
| `EncargadoMantenimiento` | CRUD del equipo técnico (cada uno tiene cuenta `_User` asociada) |
| `SolicitudHistorial` | Traza inmutable de acciones sobre solicitudes |
| `NotificacionCorreo` | Log de intentos de envío SMTP (messageId, estado, error) |
| `Contador` | Secuencias atómicas por `{tipo, anio}` para folios `SOL-` y `OT-` |

### Nuevas cloud functions (módulo Solicitudes)

**Públicas (sin auth):**
- `crearSolicitudMantenimientoPublica` — recibe formulario + captcha matemático
- `consultarSolicitudPublica` — consulta por `folio + token`

**Admin:**
- `getSolicitudes`, `getSolicitudById`, `getSolicitudHistorial`
- `aceptarSolicitud`, `rechazarSolicitud`, `responderSolicitud`
- `asignarEncargadoSolicitud` — envía 2 correos (encargado + solicitante)
- `devolverSolicitud`, `iniciarSolicitud`, `completarSolicitud`, `cerrarSolicitud`
- `getMisAsignaciones` — vista del encargado

**CRUD encargados:**
- `getEncargados`, `crearEncargado`, `actualizarEncargado`, `eliminarEncargado` (soft delete)
- `crearEncargado` crea automáticamente un `_User` Parse con `accessLevel=2` (OPERATOR) y flag `esEncargado=true`

**Diagnóstico SMTP:**
- `getEstadoConfigBrevo` — estado de config (sin exponer secretos)
- `enviarCorreoPrueba` — test de envío para admin

**Mantenimiento (nueva):**
- `exportarRegistrosMantenimiento` — paginación en bloques de 1000 para exportación Excel

### Modificación a `getRegistrosMantenimiento`

Ahora acepta:
- `registroId` — bypass directo de filtros (usado para búsqueda inversa desde Excel)
- `tecnicoNombre` — filtro explícito

### Nueva dependencia

`nodemailer@^6.9.14` añadida a `backend/package.json`. Requiere `docker compose up --build backend-server` para instalarse.

### Formato `.env` — variables sin `NEXT_PUBLIC_`

Toda credencial sensible usa variables sin prefijo (solo backend):
```env
BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER, BREVO_SMTP_PASS,
BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, APP_PUBLIC_URL
```

El mailer incluye saneo defensivo contra errores de formato (newlines faltantes, indentación, comillas).
