// ============================================================
// Brevo SMTP Mailer (backend-only)
// Credenciales desde variables de entorno (NO prefijadas con NEXT_PUBLIC_).
// Incluye logs detallados y verificacion SMTP al primer uso.
// ============================================================

const nodemailer = require('nodemailer');

let transporter = null;
let verifyAttempted = false;

function log(...args) {
  console.log('[BrevoMailer]', ...args);
}
function logErr(...args) {
  console.error('[BrevoMailer]', ...args);
}

// Sanea valores de .env: remueve espacios, saltos de linea, comillas accidentales
// y corta cualquier basura despues del primer espacio (defensa contra el caso
// donde dos variables se concatenan por falta de newline).
function clean(val, { stripAfterSpace = false } = {}) {
  if (!val) return val;
  let s = String(val).trim();
  // Remover comillas simples/dobles envolventes
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  // Si el valor debe ser atomico (host, port, user, pass): corta en el primer espacio
  if (stripAfterSpace && s.includes(' ')) {
    s = s.split(/\s+/)[0];
  }
  return s;
}

function getConfig() {
  return {
    host: clean(process.env.BREVO_SMTP_HOST, { stripAfterSpace: true }) || 'smtp-relay.brevo.com',
    port: parseInt(clean(process.env.BREVO_SMTP_PORT, { stripAfterSpace: true }) || '587', 10),
    user: clean(process.env.BREVO_SMTP_USER, { stripAfterSpace: true }),
    pass: clean(process.env.BREVO_SMTP_PASS, { stripAfterSpace: true }),
    senderEmail: clean(process.env.BREVO_SENDER_EMAIL, { stripAfterSpace: true }) || 'contacto@datacef.com',
    senderName: clean(process.env.BREVO_SENDER_NAME) || 'DATACEF - Mantenimiento',
  };
}

function getTransporter() {
  if (transporter) return transporter;
  const cfg = getConfig();
  if (!cfg.user || !cfg.pass) {
    logErr('‼️  Variables BREVO_SMTP_USER / BREVO_SMTP_PASS no definidas en .env');
    logErr('   Los correos NO se enviaran. Revisar archivo .env y reiniciar el contenedor backend-server.');
  } else {
    log(`Configurando transporter SMTP ${cfg.host}:${cfg.port} (user: ${cfg.user})`);
  }
  // Validacion explicita: el host no debe contener caracteres sospechosos
  if (/[=\s]/.test(cfg.host)) {
    logErr('‼️  BREVO_SMTP_HOST contiene caracteres invalidos: "' + cfg.host + '"');
    logErr('   Probable causa: dos variables en la misma linea del .env. Revisar formato y reiniciar.');
  }
  transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: false,
    auth: cfg.user && cfg.pass ? { user: cfg.user, pass: cfg.pass } : undefined,
    logger: false,
  });
  return transporter;
}

// Verifica la conectividad SMTP una sola vez (al primer envio real)
async function verifyOnce() {
  if (verifyAttempted) return;
  verifyAttempted = true;
  try {
    await getTransporter().verify();
    log('✅ SMTP Brevo conectado correctamente. Listo para enviar correos.');
  } catch (err) {
    logErr('❌ Fallo la verificacion SMTP:', err && err.message);
    logErr('   Revisa credenciales Brevo y/o conectividad saliente al puerto 587.');
  }
}

async function enviarCorreo({ to, subject, html }) {
  const cfg = getConfig();

  if (!to) {
    logErr('No se puede enviar correo: destinatario vacio. Asunto:', subject);
    return { success: false, error: 'destinatario vacio' };
  }
  if (!cfg.user || !cfg.pass) {
    logErr('No se puede enviar correo: credenciales SMTP no configuradas.');
    return { success: false, error: 'credenciales SMTP ausentes' };
  }

  await verifyOnce();
  log(`✉️  Enviando a ${to}  ·  ${subject}`);

  try {
    const info = await getTransporter().sendMail({
      from: `"${cfg.senderName}" <${cfg.senderEmail}>`,
      to,
      subject,
      html,
    });
    log(`✅ Correo enviado — messageId=${info.messageId}  ·  accepted=${JSON.stringify(info.accepted)}  ·  rejected=${JSON.stringify(info.rejected)}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logErr(`❌ Error enviando correo a ${to}:`, error && error.message);
    if (error && error.response) logErr('   Respuesta SMTP:', error.response);
    return { success: false, error: error && error.message };
  }
}

// Diagnostico: devuelve estado de configuracion (sin exponer la contrasena)
function estadoConfig() {
  const cfg = getConfig();
  return {
    host: cfg.host,
    port: cfg.port,
    userDefinido: Boolean(cfg.user),
    passDefinida: Boolean(cfg.pass),
    senderEmail: cfg.senderEmail,
    senderName: cfg.senderName,
    userPreview: cfg.user ? cfg.user.replace(/(.{4}).*(@.*)/, '$1***$2') : null,
  };
}

module.exports = { enviarCorreo, estadoConfig };
