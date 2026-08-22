# Módulo: Sistema de Notificaciones por Correo (Brevo SMTP)

**Fecha:** 2026-04-12
**Estado:** Implementado
**Alcance:** Envío transaccional de correos desde el backend usando Brevo SMTP (ex-Sendinblue), con logs y herramientas de diagnóstico.

---

## 1. Arquitectura

El envío de correos ocurre **exclusivamente en el backend** (Parse Cloud), nunca desde el frontend. Razón: las credenciales SMTP no pueden viajar al bundle del navegador.

```
Frontend (Next.js)                     Backend (Parse Server)                    Brevo SMTP
      │                                        │                                      │
      ├── Parse.Cloud.run('aceptarSolicitud') ─►│                                      │
      │                                        ├── enviarCorreo({ to, subject, html })─►│
      │                                        │◄────────────── messageId ─────────────┤
      │◄───────── resultado ──────────────────┤                                      │
      │                                        ├── log en NotificacionCorreo          │
```

### Archivos clave

| Ubicación | Responsabilidad |
|---|---|
| `backend/services/brevo-mailer.js` | Transporter nodemailer, `enviarCorreo()`, verificación SMTP, saneo de env |
| `backend/services/templates-solicitud.js` | 7 templates HTML para el flujo de solicitudes |
| `backend/cloud/main.js` | Cloud functions que invocan `enviarCorreo` + cloud functions de diagnóstico |
| `frontend/src/services/solicitudes/brevo-diagnostico.service.ts` | Wrapper de las cloud functions de diagnóstico |
| `frontend/src/app/admin/diagnostico-correo/page.tsx` | Página `/admin/diagnostico-correo` con test en vivo |
| `frontend/src/configBrevo/*` | **DEPRECADO** — stubs con error si se invocan (solo para legacy) |

---

## 2. Variables de entorno (backend)

En el `.env` de la raíz, **cada una en su propia línea, sin indentación, sin comillas**:

```env
BREVO_SMTP_HOST=smtp-relay.brevo.com
BREVO_SMTP_PORT=587
BREVO_SMTP_USER=a7e16b001@smtp-brevo.com
BREVO_SMTP_PASS=xsmtpsib-...
BREVO_SENDER_EMAIL=contacto@datacef.com
BREVO_SENDER_NAME=DATACEF - Mantenimiento
APP_PUBLIC_URL=http://localhost:5771
```

El `docker-compose.yml` pasa estas variables al contenedor `backend-server` vía `env_file: .env`.

**No usar el prefijo `NEXT_PUBLIC_`** — eso expondría las credenciales al frontend.

---

## 3. Saneo defensivo en el mailer

`brevo-mailer.js` incluye una función `clean()` que:

1. Trimea espacios al inicio/fin.
2. Remueve comillas envolventes accidentales.
3. Con `stripAfterSpace: true` (usado en `host`, `port`, `user`, `pass`): corta el valor en el primer espacio.

Esto protege contra errores comunes del `.env` como dos variables pegadas en una sola línea. Además, se valida explícitamente que `BREVO_SMTP_HOST` no contenga `=` ni espacios (síntoma de env mal parseado) y se loggea un warning.

---

## 4. Cloud functions de diagnóstico

| Función | Acceso | Acción |
|---|---|---|
| `getEstadoConfigBrevo` | ADMIN (4) | Devuelve host/port/user (enmascarado) + flags `userDefinido`/`passDefinida`. **No expone la contraseña.** |
| `enviarCorreoPrueba` | ADMIN (4) | Envía un correo de prueba con HTML estático al destinatario indicado |

La página `/admin/diagnostico-correo`:
- Muestra el estado de la configuración SMTP en tiempo real.
- Permite enviar un correo de prueba con un solo botón.
- Incluye checklist de troubleshooting.

---

## 5. Etapas del flujo de Solicitudes que disparan correo

| Evento | Cloud function | Destinatario | Template |
|---|---|---|---|
| Solicitud creada (formulario público) | `crearSolicitudMantenimientoPublica` | Solicitante | `templateSolicitudRecibida` |
| Admin acepta | `aceptarSolicitud` | Solicitante | `templateSolicitudAceptada` |
| Admin rechaza | `rechazarSolicitud` | Solicitante | `templateSolicitudRechazada` |
| Admin responde (sin cambiar estado) | `responderSolicitud` | Solicitante | `templateRespuestaSolicitante` |
| Admin asigna encargado | `asignarEncargadoSolicitud` | **Encargado + Solicitante** (2 correos) | `templateAsignacionEncargado` + `templateAsignacionAlSolicitante` |
| Encargado completa | `completarSolicitud` | Solicitante | `templateSolicitudCompletada` |

---

## 6. Log y auditoría

Cada intento de envío se guarda en la clase Parse `NotificacionCorreo`:

| Campo | Descripción |
|---|---|
| `solicitudId`, `folio` | Trazabilidad con la solicitud origen |
| `tipo` | `solicitud_recibida`, `solicitud_aceptada`, etc. |
| `destinatario`, `asunto` | |
| `estado` | `enviado` / `fallido` |
| `messageId` | ID devuelto por Brevo (útil para rastrear en el panel) |
| `error` | Mensaje de error si falló |

Además, los logs del contenedor `mmtto-backend` incluyen líneas `[BrevoMailer]` detalladas:
- `Configurando transporter SMTP ...` al arrancar
- `✉️ Enviando a xxx@... · asunto` por cada intento
- `✅ Correo enviado — messageId=... accepted=[...] rejected=[...]`
- `❌ Error enviando correo ...` con respuesta SMTP si falla

---

## 7. Troubleshooting conocido

### A. `queryA EBADNAME <host> BREVO_SMTP_PORT=587`
**Causa**: el `.env` tiene `BREVO_SMTP_HOST` y `BREVO_SMTP_PORT` en la **misma línea**, dotenv junta todo como valor del host.
**Fix**: cada variable en su propia línea. Verificar con:
```bash
docker exec mmtto-backend printenv BREVO_SMTP_HOST
```
Debe devolver solo `smtp-relay.brevo.com`.

### B. Correos no llegan pero el SMTP acepta
**Causa**: dominio del `BREVO_SENDER_EMAIL` no verificado en Brevo (SPF/DKIM).
**Fix**: validar dominio en https://app.brevo.com → Senders & IP → Domains.

### C. `credenciales SMTP ausentes`
**Causa**: `.env` no cargado en el contenedor.
**Fix**: `docker compose down && docker compose up --build backend-server`.

### D. Imports `NEXT_PUBLIC_BREVO_*` en código
**Estado**: todos los archivos en `frontend/src/configBrevo/` fueron **deprecados** a stubs. Si alguien los invoca, lanzan error explícito. La única fuente de verdad es `backend/services/brevo-mailer.js`.

---

## 8. Cómo añadir un nuevo tipo de correo

1. **Template**: crear función `templateMiNuevoEvento(data)` en `backend/services/templates-solicitud.js`. Debe devolver `{ subject, html }`.
2. **Cloud function**: en el handler correspondiente, importar el template y usar:
   ```js
   const { subject, html } = templateMiNuevoEvento(data);
   const r = await enviarCorreo({ to: destinatario, subject, html });
   await logCorreo({ solicitud, tipo: 'mi_tipo', destinatario, asunto: subject, estado: r.success ? 'enviado' : 'fallido', messageId: r.messageId, error: r.error });
   ```
3. **No olvidar el log** en `NotificacionCorreo` para auditoría.
