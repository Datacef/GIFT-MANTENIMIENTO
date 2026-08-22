// ============================================================
// DEPRECADO — NO USAR
// ============================================================
// El envio de correos se realiza EXCLUSIVAMENTE desde el backend
// (Parse Cloud Functions) usando `backend/services/brevo-mailer.js`.
//
// Este archivo existia para un proyecto anterior que enviaba SMTP
// directamente desde el frontend, lo que expondria las credenciales
// al bundle del navegador. INSEGURO.
//
// Las credenciales Brevo viven en variables de entorno del backend:
//   BREVO_SMTP_HOST, BREVO_SMTP_PORT, BREVO_SMTP_USER,
//   BREVO_SMTP_PASS, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME
//
// Para disparar un correo desde el frontend, usar los Cloud Functions
// correspondientes (ej. `enviarCorreoPrueba`, o las acciones del
// modulo de Solicitudes que envian correos automaticamente en cada
// transicion de estado).
// ============================================================

export const sendEmail = async (_to: string, _subject: string, _html: string) => {
  throw new Error(
    '[configBrevo] El envio directo desde el frontend esta deshabilitado. ' +
    'Usa Parse.Cloud.run() con los cloud functions del modulo Solicitudes.'
  );
};
