import Parse from 'utils/parseClient';

export interface BrevoConfigEstado {
  host: string;
  port: number;
  userDefinido: boolean;
  passDefinida: boolean;
  senderEmail: string;
  senderName: string;
  userPreview?: string | null;
}

export const BrevoDiagnosticoService = {
  async getEstado(): Promise<BrevoConfigEstado> {
    return Parse.Cloud.run('getEstadoConfigBrevo');
  },

  async enviarPrueba(destinatario: string): Promise<{ success: boolean; messageId?: string; error?: string; config: BrevoConfigEstado }> {
    return Parse.Cloud.run('enviarCorreoPrueba', { destinatario });
  },
};
