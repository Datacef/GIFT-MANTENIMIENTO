// ============================================================
// Templates HTML para correos del modulo de Solicitudes
// Todas las funciones devuelven { subject, html }.
// El APP_PUBLIC_URL se lee de ENV para construir enlaces.
// ============================================================

const APP_URL = process.env.APP_PUBLIC_URL || 'http://localhost:5771';

const escapeHtml = (str) =>
  (str || '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

function layout(contenidoHtml) {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; color:#1f2937; max-width:620px; margin:0 auto; padding:24px; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">
    <div style="border-bottom:2px solid #2563eb; padding-bottom:12px; margin-bottom:20px;">
      <h1 style="margin:0; color:#1e3a8a; font-size:20px;">DATACEF · Sistema de Mantenimiento</h1>
    </div>
    ${contenidoHtml}
    <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:11px; color:#9ca3af; text-align:center;">
      Este correo fue generado automaticamente. Por favor no respondas directamente.<br/>
      DATACEF — Especialistas en Tecnologia Informatica
    </div>
  </div>`;
}

function linkSeguimiento(folio, token) {
  return `${APP_URL}/solicitud/estado/${encodeURIComponent(folio)}?t=${encodeURIComponent(token || '')}`;
}

function tablaActivo(sol) {
  return `
  <table style="width:100%; border-collapse:collapse; font-size:13px; margin:12px 0;">
    <tr><td style="padding:6px; background:#f9fafb; width:40%;"><strong>Folio</strong></td><td style="padding:6px;">${escapeHtml(sol.folio)}</td></tr>
    ${sol.ordenTrabajoNumero ? `<tr><td style="padding:6px; background:#f9fafb;"><strong>N° Orden de Trabajo</strong></td><td style="padding:6px;"><strong style="color:#2563eb;">${escapeHtml(sol.ordenTrabajoNumero)}</strong></td></tr>` : ''}
    <tr><td style="padding:6px; background:#f9fafb;"><strong>Solicitante</strong></td><td style="padding:6px;">${escapeHtml(sol.solicitanteNombre)} (${escapeHtml(sol.solicitanteCargo || '')})</td></tr>
    <tr><td style="padding:6px; background:#f9fafb;"><strong>Anexo / Telefono</strong></td><td style="padding:6px;">${escapeHtml(sol.solicitanteAnexo || '-')} / ${escapeHtml(sol.solicitanteTelefono || '-')}</td></tr>
    <tr><td style="padding:6px; background:#f9fafb;"><strong>Servicio / Unidad</strong></td><td style="padding:6px;">${escapeHtml(sol.solicitanteServicio || '-')}</td></tr>
    <tr><td style="padding:6px; background:#f9fafb; vertical-align:top;"><strong>Descripcion</strong></td><td style="padding:6px; white-space:pre-wrap;">${escapeHtml(sol.descripcion)}</td></tr>
  </table>`;
}

// --- Plantilla 1: Solicitud recibida (al solicitante) ---
function templateSolicitudRecibida(sol) {
  const link = linkSeguimiento(sol.folio, sol.tokenConsulta);
  return {
    subject: `[${sol.folio}] Hemos recibido tu solicitud de mantenimiento`,
    html: layout(`
      <h2 style="color:#2563eb; margin-top:0;">Solicitud recibida</h2>
      <p>Hola <strong>${escapeHtml(sol.solicitanteNombre)}</strong>,</p>
      <p>Confirmamos la recepcion de tu solicitud. Nuestro equipo la revisara a la brevedad.</p>
      ${tablaActivo(sol)}
      <p>Puedes consultar el estado en cualquier momento:</p>
      <p style="text-align:center;"><a href="${link}" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:bold;">Ver estado de mi solicitud</a></p>
    `),
  };
}

// --- Plantilla 2: Solicitud aceptada (al solicitante) ---
function templateSolicitudAceptada(sol) {
  const link = linkSeguimiento(sol.folio, sol.tokenConsulta);
  return {
    subject: `[${sol.folio}] Tu solicitud fue aceptada — ${sol.ordenTrabajoNumero}`,
    html: layout(`
      <h2 style="color:#16a34a; margin-top:0;">Solicitud aceptada</h2>
      <p>Hola <strong>${escapeHtml(sol.solicitanteNombre)}</strong>,</p>
      <p>Tu solicitud fue aprobada y se genero la orden de trabajo <strong>${escapeHtml(sol.ordenTrabajoNumero || '')}</strong>.</p>
      ${sol.respuestaAdmin ? `<div style="background:#ecfdf5; padding:12px; border-left:4px solid #16a34a; margin:12px 0; font-size:13px;"><strong>Comentario:</strong><br/>${escapeHtml(sol.respuestaAdmin)}</div>` : ''}
      ${tablaActivo(sol)}
      <p style="text-align:center;"><a href="${link}" style="display:inline-block; background:#16a34a; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:bold;">Ver seguimiento</a></p>
    `),
  };
}

// --- Plantilla 3: Solicitud rechazada ---
function templateSolicitudRechazada(sol) {
  const link = linkSeguimiento(sol.folio, sol.tokenConsulta);
  return {
    subject: `[${sol.folio}] Actualizacion de tu solicitud`,
    html: layout(`
      <h2 style="color:#dc2626; margin-top:0;">Solicitud no procede</h2>
      <p>Hola <strong>${escapeHtml(sol.solicitanteNombre)}</strong>,</p>
      <p>Lamentamos informarte que tu solicitud no pudo ser aceptada con el motivo:</p>
      <div style="background:#fef2f2; padding:12px; border-left:4px solid #dc2626; margin:12px 0; font-size:13px; white-space:pre-wrap;">${escapeHtml(sol.motivoRechazo || '')}</div>
      ${tablaActivo(sol)}
      <p>Si tienes dudas, puedes responder con mas detalle desde el enlace de seguimiento.</p>
      <p style="text-align:center;"><a href="${link}" style="display:inline-block; background:#6b7280; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:bold;">Ver detalle</a></p>
    `),
  };
}

// --- Plantilla 4: Respuesta/actualizacion sin cambiar estado ---
function templateRespuestaSolicitante(sol, mensaje) {
  const link = linkSeguimiento(sol.folio, sol.tokenConsulta);
  return {
    subject: `[${sol.folio}] Mensaje del equipo de mantenimiento`,
    html: layout(`
      <h2 style="color:#2563eb; margin-top:0;">Nuevo mensaje sobre tu solicitud</h2>
      <p>Hola <strong>${escapeHtml(sol.solicitanteNombre)}</strong>,</p>
      <div style="background:#eff6ff; padding:12px; border-left:4px solid #2563eb; margin:12px 0; font-size:13px; white-space:pre-wrap;">${escapeHtml(mensaje || '')}</div>
      ${tablaActivo(sol)}
      <p style="text-align:center;"><a href="${link}" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:bold;">Abrir seguimiento</a></p>
    `),
  };
}

// --- Plantilla 5: Asignacion a encargado (al encargado) ---
function templateAsignacionEncargado(sol, encargado) {
  const link = `${APP_URL}/admin/solicitudes/${sol.objectId || sol.id}`;
  return {
    subject: `[${sol.ordenTrabajoNumero || sol.folio}] Nueva orden de trabajo asignada`,
    html: layout(`
      <h2 style="color:#f59e0b; margin-top:0;">Orden de trabajo asignada</h2>
      <p>Hola <strong>${escapeHtml(encargado.nombre)}</strong>,</p>
      <p>Se te asigno la orden de trabajo <strong>${escapeHtml(sol.ordenTrabajoNumero || '')}</strong>.</p>
      ${tablaActivo(sol)}
      ${sol.instruccionesAdmin ? `<div style="background:#fffbeb; padding:12px; border-left:4px solid #f59e0b; margin:12px 0; font-size:13px; white-space:pre-wrap;"><strong>Instrucciones de la administracion:</strong><br/>${escapeHtml(sol.instruccionesAdmin)}</div>` : ''}
      <p>Ingresa a la plataforma para revisar el detalle completo, adjuntos y dejar registro de avance.</p>
      <p style="text-align:center;"><a href="${link}" style="display:inline-block; background:#f59e0b; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:bold;">Abrir en plataforma</a></p>
    `),
  };
}

// --- Plantilla 6: Asignacion (notificacion al solicitante) ---
function templateAsignacionAlSolicitante(sol, encargado) {
  const link = linkSeguimiento(sol.folio, sol.tokenConsulta);
  return {
    subject: `[${sol.folio}] Tu orden de trabajo fue asignada`,
    html: layout(`
      <h2 style="color:#2563eb; margin-top:0;">Tecnico asignado</h2>
      <p>Hola <strong>${escapeHtml(sol.solicitanteNombre)}</strong>,</p>
      <p>Tu orden de trabajo <strong>${escapeHtml(sol.ordenTrabajoNumero || '')}</strong> fue asignada a:</p>
      <table style="width:100%; border-collapse:collapse; font-size:13px; margin:12px 0;">
        <tr><td style="padding:6px; background:#f9fafb;"><strong>Encargado</strong></td><td style="padding:6px;">${escapeHtml(encargado.nombre)}</td></tr>
        <tr><td style="padding:6px; background:#f9fafb;"><strong>Cargo / Especialidad</strong></td><td style="padding:6px;">${escapeHtml(encargado.cargo || '')} — ${escapeHtml((encargado.especialidades || []).join(', '))}</td></tr>
        <tr><td style="padding:6px; background:#f9fafb;"><strong>Contacto</strong></td><td style="padding:6px;">${escapeHtml(encargado.telefono || '')}</td></tr>
      </table>
      <p style="text-align:center;"><a href="${link}" style="display:inline-block; background:#2563eb; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:bold;">Ver seguimiento</a></p>
    `),
  };
}

// --- Plantilla 7: Solicitud completada (al solicitante) ---
function templateSolicitudCompletada(sol) {
  const link = linkSeguimiento(sol.folio, sol.tokenConsulta);
  return {
    subject: `[${sol.folio}] Tu solicitud fue atendida`,
    html: layout(`
      <h2 style="color:#16a34a; margin-top:0;">Solicitud atendida</h2>
      <p>Hola <strong>${escapeHtml(sol.solicitanteNombre)}</strong>,</p>
      <p>El tecnico marco tu orden de trabajo <strong>${escapeHtml(sol.ordenTrabajoNumero || '')}</strong> como completada.</p>
      ${sol.observacionesEncargado ? `<div style="background:#ecfdf5; padding:12px; border-left:4px solid #16a34a; margin:12px 0; font-size:13px; white-space:pre-wrap;"><strong>Observaciones:</strong><br/>${escapeHtml(sol.observacionesEncargado)}</div>` : ''}
      ${tablaActivo(sol)}
      <p style="text-align:center;"><a href="${link}" style="display:inline-block; background:#16a34a; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; font-weight:bold;">Ver resultado</a></p>
    `),
  };
}

module.exports = {
  templateSolicitudRecibida,
  templateSolicitudAceptada,
  templateSolicitudRechazada,
  templateRespuestaSolicitante,
  templateAsignacionEncargado,
  templateAsignacionAlSolicitante,
  templateSolicitudCompletada,
};
