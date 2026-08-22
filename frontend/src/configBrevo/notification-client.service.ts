// ============================================================
// DEPRECADO — NO USAR
// ============================================================
// Este servicio pertenecia a un proyecto anterior basado en Firebase.
// Este proyecto usa Parse Server + MongoDB; los logs de notificaciones
// se almacenan en la clase `NotificacionCorreo` del backend.
//
// Para consultar el historial de correos enviados usar el cloud
// function correspondiente (a implementar si se requiere auditoria).
// ============================================================

export const NotificationClientService = {
  async getAllLogs(_limitCount: number = 100): Promise<never[]> {
    console.warn('[NotificationClientService] Deprecado. Usar cloud functions del backend.');
    return [];
  },
};
