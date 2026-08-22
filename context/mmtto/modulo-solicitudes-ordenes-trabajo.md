# Módulo: Solicitudes y Órdenes de Trabajo

**Fecha:** 2026-04-12
**Estado:** Diseño (pendiente de implementación)
**Alcance:** Captura pública de solicitudes de mantenimiento + seguimiento administrativo completo con notificaciones por correo (Brevo/SMTP).

---

## 1. Objetivo

Permitir que **cualquier usuario del hospital** (clínico, administrativo, operador) pueda solicitar mantenimiento mediante un **formulario público sin necesidad de login**. Las solicitudes entran a una **bandeja administrativa** donde el SUPER_ADMIN o ADMIN las revisa, las aprueba (convirtiéndolas en Órdenes de Trabajo) y las deriva al **encargado** adecuado. Todo el ciclo genera correos automáticos al solicitante y al encargado, y queda registrado en un historial auditable.

---

## 2. Desafío principal: acceso sin login

El formulario debe funcionar **sin autenticación Parse** (el solicitante no es usuario de la plataforma). Esto implica:

- Endpoint público en Parse Cloud (`Parse.Cloud.define(..., { requireMaster: false })`)
- Validación sin `request.user` — usar rate-limit y CAPTCHA para evitar spam
- **ID público corto** (ej. `SOL-2026-00123`) para que el solicitante pueda consultar el estado de su solicitud por enlace (ej. `/solicitud/estado/SOL-2026-00123?token=abcd`)
- Token opaco en el correo para permitir consulta sin login

Rutas:
- `/solicitud/nueva` — pública, sin AuthGuard
- `/solicitud/estado/[folio]` — pública, consulta por folio + token
- `/admin/solicitudes` — privada (ADMIN+)
- `/admin/solicitudes/[id]` — privada (ADMIN+)
- `/admin/encargados` — privada (ADMIN+)

---

## 3. Modelo de datos (Parse Classes)

### 3.1 `SolicitudMantenimiento`

Captura la solicitud y su progresión hasta convertirse en orden de trabajo.

| Campo | Tipo | Descripción |
|---|---|---|
| `folio` | String (unique) | `SOL-2026-00001`. Formato auto-generado |
| `tokenConsulta` | String | Token opaco para consulta pública por el solicitante |
| `solicitanteNombre` | String | Nombre del solicitante |
| `solicitanteCargo` | String | Cargo |
| `solicitanteAnexo` | String | Número interno (anexo) |
| `solicitanteTelefono` | String | Teléfono |
| `solicitanteEmail` | String | Para notificaciones |
| `solicitanteServicio` | String | Servicio/unidad de donde se origina |
| `descripcion` | String | Texto de la solicitud |
| `imagenes` | Array<{nombre, url}> | Fotos referenciales (Parse.File) |
| `dominioSugerido` | String | (opcional) equipoMedico / infraestructura / ... |
| `estado` | String | `pendiente` / `aceptada` / `rechazada` / `asignada` / `en_proceso` / `devuelta` / `completada` / `cerrada` |
| `motivoRechazo` | String | Si estado=rechazada |
| `respuestaAdmin` | String | Comentario del admin al aprobar/rechazar |
| `ordenTrabajoNumero` | String | `OT-2026-00001` (se asigna al aceptar) |
| `fechaAceptacion` | Date | |
| `aceptadoPorId` | String | User ID del admin |
| `aceptadoPorNombre` | String | |
| `encargadoId` | String | objectId del `EncargadoMantenimiento` |
| `encargadoNombre` | String | Snapshot |
| `encargadoEmail` | String | Snapshot |
| `instruccionesAdmin` | String | Indicaciones adicionales que agrega el admin al asignar |
| `fechaAsignacion` | Date | |
| `observacionesEncargado` | String | Feedback del encargado |
| `fechaCompletada` | Date | |
| `archivosVerificables` | Array<{nombre, url, tipo, subidoPor, fecha}> | Adjuntos de cierre |
| `registroMantenimientoId` | String | (opcional) Link al `RegistroMantenimiento` si se generó una pauta |
| `createdAt` / `updatedAt` | Date | Auto Parse |

**Estados y transiciones:**

```
  pendiente ──aceptar──► aceptada ──asignar──► asignada
      │                                            │
      └──rechazar──► rechazada                     ├──devolver(encargado)──► devuelta ──► (admin reasigna)
                                                   │
                                                   ├──iniciar──► en_proceso ──completar──► completada ──cerrar(admin)──► cerrada
```

### 3.2 `EncargadoMantenimiento`

CRUD administrativo de los técnicos a quienes se derivan las órdenes.

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | String | Nombre completo |
| `cargo` | String | Ej: "Técnico electromecánico" |
| `especialidades` | Array<String> | `["HVAC", "Electricidad", "Gases clínicos"]` |
| `telefono` | String | |
| `email` | String | Obligatorio para notificaciones |
| `usuarioParseId` | String | (opcional) enlace a `_User` si el encargado tiene cuenta |
| `dominios` | Array<String> | `["equipoMedico", "infraestructura"]` para sugerencia de asignación |
| `activo` | Boolean | Soft delete |
| `createdAt` / `updatedAt` | Date | |

### 3.3 `SolicitudHistorial`

Traza inmutable de cada cambio de estado o interacción.

| Campo | Tipo | Descripción |
|---|---|---|
| `solicitudId` | String | objectId de la solicitud |
| `folio` | String | denormalizado para búsqueda |
| `accion` | String | `creada`, `aceptada`, `rechazada`, `asignada`, `reasignada`, `devuelta`, `observada`, `completada`, `cerrada`, `correo_enviado` |
| `descripcion` | String | Texto humano |
| `estadoAnterior` | String | |
| `estadoNuevo` | String | |
| `usuarioId` | String | vacío si fue acción pública (solicitante) |
| `usuarioNombre` | String | `"Sistema"` / `"Solicitante"` / nombre admin |
| `detalles` | Object | Datos adicionales (ej. `{ encargadoAnterior, encargadoNuevo }`) |
| `createdAt` | Date | |

### 3.4 `NotificacionCorreo` (log de Brevo)

| Campo | Tipo | Descripción |
|---|---|---|
| `solicitudId` | String | FK |
| `folio` | String | |
| `tipo` | String | `solicitud_recibida` / `solicitud_aceptada` / `solicitud_rechazada` / `asignacion_encargado` / `solicitud_completada` |
| `destinatario` | String | Email |
| `asunto` | String | |
| `estado` | String | `enviado` / `fallido` |
| `messageId` | String | Devuelto por Brevo |
| `error` | String | Si falla |
| `createdAt` | Date | |

---

## 4. Flujo funcional completo

### Etapa 1 — Captura pública
1. Usuario entra a `/solicitud/nueva` sin login.
2. Completa: nombre, cargo, anexo, teléfono, email, servicio, descripción, sube imágenes.
3. CAPTCHA simple (hCaptcha o matemático).
4. Submit → `crearSolicitudMantenimientoPublica` (cloud function, sin `requireUser`).
5. Se asigna `folio` (`SOL-AAAA-NNNNN`) y `tokenConsulta`.
6. Se guarda con estado `pendiente`.
7. Se envía correo al solicitante: **"Hemos recibido tu solicitud [folio]"** con link `/solicitud/estado/[folio]?t=[token]`.
8. Se registra en `SolicitudHistorial`: acción `creada`.

### Etapa 2 — Triage (ADMIN / SUPER_ADMIN)
1. Admin entra a `/admin/solicitudes` — ve la bandeja.
2. Filtros: estado, fecha, servicio, texto.
3. Abre detalle → ve datos del solicitante e imágenes.
4. Opción **Aceptar** → modal con: comentario opcional, número de OT autogenerado (`OT-AAAA-NNNNN`). Estado → `aceptada`. Se envía correo: **"Tu solicitud fue aceptada, OT asignada: OT-..."**.
5. Opción **Rechazar** → modal con motivo obligatorio. Estado → `rechazada`. Correo: **"Tu solicitud no corresponde / no procede"** con el motivo.
6. Opción **Responder** (sin cambiar estado, solo para dudas). Correo: **"Actualización sobre tu solicitud [folio]"** con el texto.

### Etapa 3 — Asignación al encargado
1. Desde una solicitud `aceptada`, admin pulsa **Asignar encargado**.
2. Modal con selector de `EncargadoMantenimiento` (filtrable por especialidad/dominio).
3. Admin escribe **instrucciones adicionales** (opcional).
4. Estado → `asignada`. Correo al encargado: **"Nueva orden de trabajo asignada"** con detalle completo (datos solicitante, descripción, imágenes, instrucciones admin).
5. Correo al solicitante: **"Tu OT fue asignada al técnico [nombre]"**.
6. Historial: acción `asignada` con `detalles = { encargadoId, encargadoNombre }`.

### Etapa 4 — Trabajo del encargado
El encargado debe tener cuenta `_User` con nivel ≥ OPERATOR para entrar a la plataforma.

1. Encargado entra a `/admin/solicitudes/mis-asignaciones`.
2. Ve sus OTs. Abre una.
3. Opciones:
   - **Iniciar trabajo** → `en_proceso`.
   - **Devolver / Reasignar** → escribe observación (ej. "Esto corresponde a infraestructura, no a mi equipo"). Estado → `devuelta`. El admin ve la devolución y reasigna. Historial: `devuelta`.
   - **Agregar observación** (sin cambiar estado). Historial: `observada`.
   - **Marcar como completada** → modal para subir archivos verificables (fotos, informe técnico, acta) + observaciones finales. Estado → `completada`.
4. Correo al admin: **"OT completada, requiere cierre"**.
5. Correo al solicitante: **"Tu solicitud fue atendida"**.

### Etapa 5 — Cierre (admin)
1. Admin revisa la OT completada y su evidencia.
2. Opción **Cerrar** (definitivo) → `cerrada`.
3. Opcional: **Vincular a pauta formal** → genera un `RegistroMantenimiento` con los datos de la OT (si corresponde a mantenimiento planificable).

---

## 5. Arquitectura de correos (Brevo)

### 5.1 Decisión: SMTP desde el backend, no desde el frontend

El código actual en `frontend/src/configBrevo/config.brevo.ts` usa `nodemailer` directamente con credenciales — esto **no puede ejecutarse en el frontend** porque expondría el SMTP password al navegador. Se debe mover al backend (Parse Cloud).

### 5.2 Variables de entorno (backend)

Añadir a `.env` y cargar en `backend-server`:

```env
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=a7e16b001@smtp-brevo.com
BREVO_SMTP_PASS=xsmtpsib-...
BREVO_SENDER_EMAIL=contacto@datacef.com
BREVO_SENDER_NAME=DATACEF - Mantenimiento
APP_PUBLIC_URL=http://localhost:5771
```

**Nota:** las variables ya existentes en el `.env` con prefijo `NEXT_PUBLIC_BREVO_*` son inseguras (quedan en el bundle). Se reemplazarán por las de arriba, sin prefijo `NEXT_PUBLIC_`, para que solo el backend las lea.

### 5.3 Servicio centralizado en backend

Archivo nuevo: `backend/services/brevo-mailer.js`

```js
const nodemailer = require('nodemailer');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: parseInt(process.env.BREVO_SMTP_PORT || '587', 10),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function enviarCorreo({ to, subject, html }) {
  const info = await getTransporter().sendMail({
    from: `"${process.env.BREVO_SENDER_NAME}" <${process.env.BREVO_SENDER_EMAIL}>`,
    to,
    subject,
    html,
  });
  return { success: true, messageId: info.messageId };
}

module.exports = { enviarCorreo };
```

### 5.4 Templates

Archivo nuevo: `backend/services/templates-solicitud.js` — funciones puras que devuelven HTML:

- `templateSolicitudRecibida(solicitud)` → al solicitante cuando llega el formulario
- `templateSolicitudAceptada(solicitud)` → "tu OT es OT-..."
- `templateSolicitudRechazada(solicitud)` → "no corresponde, motivo..."
- `templateAsignacionEncargado(solicitud, encargado)` → al encargado con todo el detalle
- `templateAsignacionAlSolicitante(solicitud, encargado)` → al solicitante informando el técnico
- `templateSolicitudCompletada(solicitud)` → al solicitante al cerrar

Todos usan un layout común (header DATACEF, footer con disclaimer, link a `/solicitud/estado/[folio]?t=[token]`).

### 5.5 Dependencia `nodemailer` en backend

Actualizar `backend/package.json` → añadir `"nodemailer": "^6.9.x"`.

---

## 6. Estructura de archivos propuesta

```
backend/
  cloud/
    main.js                                    [+ añadir 6-8 cloud functions nuevas]
  services/                                    [NUEVO — extraer lógica de mailer]
    brevo-mailer.js
    templates-solicitud.js
  package.json                                 [+ nodemailer]

frontend/src/
  types/
    solicitud.types.ts                         [NUEVO]
    encargado.types.ts                         [NUEVO]
  services/
    solicitudes/                               [NUEVA subcarpeta — aislada]
      solicitud-publica.service.ts             (llamadas sin auth)
      solicitud-admin.service.ts               (llamadas con auth)
      encargado.service.ts
      solicitud-historial.service.ts
  components/
    admin/
      solicitudes/                             [NUEVA carpeta]
        BandejaSolicitudes.tsx
        SolicitudDetailView.tsx
        SolicitudFilters.tsx
        ModalAceptarSolicitud.tsx
        ModalRechazarSolicitud.tsx
        ModalAsignarEncargado.tsx
        ModalResponderSolicitud.tsx
        ModalDevolverSolicitud.tsx
        ModalCompletarSolicitud.tsx
        SolicitudHistorialPanel.tsx
        SolicitudArchivosPanel.tsx
        SolicitudImagenesUploader.tsx
      encargados/                              [NUEVA carpeta]
        EncargadosList.tsx
        EncargadoFormModal.tsx
        EncargadoDetailModal.tsx
    public/
      solicitudes/                             [NUEVA carpeta — componentes del form público]
        FormularioSolicitudPublica.tsx
        ConsultaEstadoSolicitud.tsx
        CaptchaSimple.tsx
  app/
    solicitud/                                 [NUEVA carpeta — rutas PÚBLICAS, sin AuthGuard]
      layout.tsx                               (layout minimal sin sidebar admin)
      nueva/page.tsx
      estado/[folio]/page.tsx
    admin/
      solicitudes/                             [NUEVA carpeta]
        page.tsx                               (bandeja)
        [id]/page.tsx                          (detalle)
        mis-asignaciones/page.tsx              (vista encargado)
      encargados/                              [NUEVA carpeta]
        page.tsx                               (CRUD)

context/mmtto/
  modulo-solicitudes-ordenes-trabajo.md        [ESTE ARCHIVO]
```

**Principio de orden:** todo lo relacionado al módulo vive en carpetas nombradas `solicitudes/` y `encargados/` — no se mezcla con `mantenimiento/`, `inventario/`, etc.

---

## 7. Cloud Functions nuevas

| Función | Nivel acceso | Descripción |
|---|---|---|
| `crearSolicitudMantenimientoPublica` | PÚBLICO | Recibe formulario anónimo + captcha. Genera folio, token, persiste, envía correo recibido. |
| `consultarSolicitudPublica` | PÚBLICO | Params `{ folio, token }` → devuelve datos limitados (estado + historial público, sin datos admin) |
| `getSolicitudes` | ADMIN (4) | Bandeja con filtros y paginación |
| `getSolicitudById` | ADMIN (4) | Detalle + historial |
| `aceptarSolicitud` | ADMIN (4) | Aprueba, genera OT, envía correo |
| `rechazarSolicitud` | ADMIN (4) | Rechaza con motivo, envía correo |
| `responderSolicitud` | ADMIN (4) | Envía correo sin cambiar estado |
| `asignarEncargadoSolicitud` | ADMIN (4) | Asigna encargado + instrucciones, envía 2 correos |
| `devolverSolicitud` | OPERATOR (2) | Encargado devuelve con observación |
| `observarSolicitud` | OPERATOR (2) | Agrega nota sin cambiar estado |
| `iniciarSolicitud` | OPERATOR (2) | `aceptada/asignada` → `en_proceso` |
| `completarSolicitud` | OPERATOR (2) | Marca completada + verificables |
| `cerrarSolicitud` | ADMIN (4) | Cierra definitivamente |
| `getMisAsignaciones` | OPERATOR (2) | Lista OTs del encargado logueado |
| `getEncargados` | ADMIN (4) | Lista paginada |
| `crearEncargado` | ADMIN (4) | |
| `actualizarEncargado` | ADMIN (4) | |
| `eliminarEncargado` | ADMIN (4) | Soft delete |
| `getSolicitudHistorial` | ADMIN (4) | |

---

## 8. Generación de folios y OTs

- **Folio solicitud:** `SOL-{año}-{secuencia 5 dígitos}`
- **Orden de trabajo:** `OT-{año}-{secuencia 5 dígitos}`

Implementación: clase Parse `Contador` con `{ tipo: 'SOL'|'OT', anio, ultimo }` y operación atómica `increment('ultimo')` bajo master key para evitar colisiones.

---

## 9. Seguridad del endpoint público

Riesgos: spam, ataques automatizados, subida masiva de imágenes.

Mitigaciones:
1. **CAPTCHA** (matemático o hCaptcha) validado en el backend.
2. **Rate limit por IP**: máximo 3 solicitudes/hora. Implementable con una colección `RateLimitSolicitud { ip, contador, ventanaInicio }`.
3. **Validación de imágenes:** máximo 5, tamaño máx 5MB cada una, MIME `image/*`.
4. **Sanitización** del texto libre (escape HTML al renderizar en correos).
5. **Token de consulta** de 32 chars aleatorios URL-safe.

---

## 10. Roles y permisos resumen

| Acción | VIEWER 1 | OPERATOR 2 | COORD 3 | ADMIN 4 | SUPER 5 |
|---|:-:|:-:|:-:|:-:|:-:|
| Formulario público | ✅ (sin login) | ✅ | ✅ | ✅ | ✅ |
| Ver mis asignaciones | — | ✅ | ✅ | ✅ | ✅ |
| Devolver / observar / iniciar / completar propia | — | ✅ | ✅ | ✅ | ✅ |
| Ver bandeja completa | — | — | 👁️ | ✅ | ✅ |
| Aceptar / rechazar / asignar / cerrar | — | — | — | ✅ | ✅ |
| CRUD encargados | — | — | — | ✅ | ✅ |

---

## 11. Orden de implementación sugerido (5 fases)

1. **Fase 1 — Cimientos (backend)**
   - Extraer Brevo al backend, cargar envs, crear `brevo-mailer.js` + templates base.
   - Crear clases Parse (`SolicitudMantenimiento`, `EncargadoMantenimiento`, `SolicitudHistorial`, `NotificacionCorreo`, `Contador`).
   - Cloud functions de contador y helper de historial.

2. **Fase 2 — CRUD Encargados**
   - Cloud functions CRUD.
   - Frontend: página `/admin/encargados`, servicio, lista y modal de form.

3. **Fase 3 — Formulario público + bandeja**
   - Ruta pública `/solicitud/nueva` sin AuthGuard.
   - Cloud `crearSolicitudMantenimientoPublica` + captcha.
   - Correo de recibido.
   - Bandeja `/admin/solicitudes` con filtros y detalle.

4. **Fase 4 — Triage y asignación**
   - Aceptar / rechazar / responder / asignar con sus respectivos modales y correos.
   - Vista del encargado `/admin/solicitudes/mis-asignaciones`.

5. **Fase 5 — Ejecución y cierre**
   - Iniciar / devolver / observar / completar con archivos verificables.
   - Cierre por admin.
   - Consulta pública por folio+token.
   - (Opcional) vinculación con `RegistroMantenimiento`.

---

## 12. Decisiones confirmadas (2026-04-12)

1. ✅ **Email obligatorio** en el formulario público.
2. ✅ **CAPTCHA matemático** (sin dependencias externas).
3. ✅ **Encargado siempre con cuenta Parse** (`_User`). El CRUD de encargados crea/vincula un usuario Parse al darse de alta.
4. ✅ **Numeración OT**: formato `OT-{NNNNN}-{YYYYMMDD}`, reiniciada por año. Ej: `OT-00001-20260412`. El folio de solicitud mantiene `SOL-{año}-{NNNNN}`.
5. ✅ **Adjuntos**: máximo **2 imágenes** + archivos (PDF/DOC/DOCX/XLS/XLSX), cada archivo máx **10 MB**.
6. ✅ **Rechazo reabrible** — el admin puede reabrir una solicitud rechazada (vuelve a `pendiente`).

## 13. Variables de entorno a añadir en `.env` (raíz)

Reemplazar las variables `NEXT_PUBLIC_BREVO_*` (inseguras) por:

```env
# --- Brevo SMTP (BACKEND ONLY — no exponer al frontend) ---
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=a7e16b001@smtp-brevo.com
BREVO_SMTP_PASS=xsmtpsib-08757249aca01a501589a383b4b1707043e10bb85be4c4deb081e6645c7bc4a7-1gKjegwJolBuQiGC
BREVO_SENDER_EMAIL=contacto@datacef.com
BREVO_SENDER_NAME=DATACEF - Mantenimiento
APP_PUBLIC_URL=http://localhost:5771
```

Estas variables las lee el servicio `backend-server` (Parse Server). Tras añadirlas hay que recompilar: `docker compose up --build backend-server`.

