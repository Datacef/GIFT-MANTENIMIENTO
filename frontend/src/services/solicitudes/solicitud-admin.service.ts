import Parse from 'utils/parseClient';
import {
  SolicitudMantenimiento,
  SolicitudHistorialEntry,
  ArchivoVerificable,
} from 'types/solicitud.types';

export interface SolicitudesFilters {
  estado?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  busqueda?: string;
  encargadoId?: string;
  limit?: number;
  skip?: number;
}

export const SolicitudAdminService = {
  async listar(filters: SolicitudesFilters = {}): Promise<{ results: SolicitudMantenimiento[]; total: number }> {
    return Parse.Cloud.run('getSolicitudes', filters);
  },

  async getById(id: string): Promise<SolicitudMantenimiento> {
    return Parse.Cloud.run('getSolicitudById', { id });
  },

  async historial(solicitudId: string): Promise<{ results: SolicitudHistorialEntry[] }> {
    return Parse.Cloud.run('getSolicitudHistorial', { solicitudId });
  },

  async aceptar(id: string, comentario: string): Promise<SolicitudMantenimiento> {
    return Parse.Cloud.run('aceptarSolicitud', { id, comentario });
  },

  async rechazar(id: string, motivo: string): Promise<SolicitudMantenimiento> {
    return Parse.Cloud.run('rechazarSolicitud', { id, motivo });
  },

  async responder(id: string, mensaje: string): Promise<void> {
    await Parse.Cloud.run('responderSolicitud', { id, mensaje });
  },

  async asignar(id: string, encargadoId: string, instrucciones: string): Promise<SolicitudMantenimiento> {
    return Parse.Cloud.run('asignarEncargadoSolicitud', { id, encargadoId, instrucciones });
  },

  async devolver(id: string, observacion: string): Promise<SolicitudMantenimiento> {
    return Parse.Cloud.run('devolverSolicitud', { id, observacion });
  },

  async iniciar(id: string): Promise<SolicitudMantenimiento> {
    return Parse.Cloud.run('iniciarSolicitud', { id });
  },

  async completar(id: string, observaciones: string, archivosVerificables: ArchivoVerificable[]): Promise<SolicitudMantenimiento> {
    return Parse.Cloud.run('completarSolicitud', { id, observaciones, archivosVerificables });
  },

  async cerrar(id: string): Promise<SolicitudMantenimiento> {
    return Parse.Cloud.run('cerrarSolicitud', { id });
  },

  async misAsignaciones(): Promise<{ results: SolicitudMantenimiento[]; total: number }> {
    return Parse.Cloud.run('getMisAsignaciones', {});
  },

  async subirArchivo(file: File): Promise<ArchivoVerificable> {
    const pf = new Parse.File(file.name, file);
    await pf.save();
    const user = Parse.User.current();
    return {
      nombre: file.name,
      url: pf.url(),
      tipo: file.type,
      tamano: file.size,
      subidoPor: user ? user.id : '',
      fecha: new Date().toISOString(),
    };
  },
};
