import Parse from 'utils/parseClient';
import {
  ArchivoSolicitud,
  SolicitudPublicaEstado,
} from 'types/solicitud.types';

// Servicio PUBLICO — no requiere sesion Parse.
// Las cloud functions declaran requireMaster/requireUser internamente.

export interface CrearSolicitudInput {
  solicitanteNombre: string;
  solicitanteCargo: string;
  solicitanteAnexo: string;
  solicitanteTelefono: string;
  solicitanteEmail: string;
  solicitanteServicio: string;
  descripcion: string;
  imagenes: ArchivoSolicitud[];
  archivos: ArchivoSolicitud[];
  dominioSugerido?: string;
  captchaRespuesta: number;
  captchaEsperado: number;
}

export const SolicitudPublicaService = {
  async crear(input: CrearSolicitudInput): Promise<{ folio: string; tokenConsulta: string; estado: string; id: string }> {
    return Parse.Cloud.run('crearSolicitudMantenimientoPublica', input);
  },

  async consultar(folio: string, token: string): Promise<SolicitudPublicaEstado> {
    return Parse.Cloud.run('consultarSolicitudPublica', { folio, token });
  },

  async subirArchivo(file: File): Promise<ArchivoSolicitud> {
    const parseFile = new Parse.File(file.name, file);
    await parseFile.save();
    return {
      nombre: file.name,
      url: parseFile.url(),
      tipo: file.type,
      tamano: file.size,
    };
  },
};
