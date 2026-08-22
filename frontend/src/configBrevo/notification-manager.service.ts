// ============================================================
// DEPRECADO — NO USAR
// ============================================================
// Este servicio pertenecia a un proyecto anterior basado en Firebase
// y gestionaba notificaciones de indicadores DIGERA.
//
// Para el Sistema de Mantenimiento DATACEF, la gestion de correos
// se hace server-side en Parse Cloud:
//   - backend/services/brevo-mailer.js  (envio SMTP Brevo)
//   - backend/services/templates-solicitud.js  (plantillas HTML)
//   - backend/cloud/main.js  (cloud functions del modulo Solicitudes)
// ============================================================

export const NotificationManagerService = {
  getAllLogs: async () => {
    console.warn('[NotificationManagerService] Deprecado.');
    return [];
  },
};
