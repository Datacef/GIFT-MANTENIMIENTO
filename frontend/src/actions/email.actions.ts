// ============================================================
// DEPRECADO — NO USAR
// ============================================================
// Server Action anterior que invocaba nodemailer directamente.
// En este proyecto el envio de correos se hace desde Parse Cloud
// Functions (backend) usando `backend/services/brevo-mailer.js`.
//
// Desde el frontend utilizar `Parse.Cloud.run('nombreCloudFunction')`.
// ============================================================

'use server';

export async function sendEmailAction(_to: string, _subject: string, _html: string) {
  throw new Error(
    '[email.actions] Deprecado. Invoca el cloud function correspondiente via Parse.Cloud.run().'
  );
}
