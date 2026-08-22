import Parse from 'utils/parseClient';
import {
  RegistroMantenimiento,
  MantenimientoFormData,
  MantenimientoFilters,
  MantenimientoPaginatedResponse,
  BandejaValidacionResponse,
  HistorialMttoEntry,
  ArchivoAdjuntoMtto,
  ActivoBusquedaResult,
  EstadisticasMantenimiento,
} from 'types/mantenimiento.types';

export class MantenimientoService {
  // -----------------------------------------------
  // Busqueda de activos (4 dominios)
  // -----------------------------------------------

  static async buscarActivo(
    dominio: string,
    busqueda: string
  ): Promise<ActivoBusquedaResult[]> {
    try {
      const result = await Parse.Cloud.run('buscarActivoMantenimiento', {
        dominio,
        busqueda,
      });
      return result || [];
    } catch (error) {
      console.error('Error buscarActivoMantenimiento:', error);
      return [];
    }
  }

  // -----------------------------------------------
  // CRUD de registros de mantenimiento
  // -----------------------------------------------

  static async crearRegistro(
    data: MantenimientoFormData
  ): Promise<RegistroMantenimiento> {
    const result = await Parse.Cloud.run('crearRegistroMantenimiento', { data });
    return MantenimientoService.mapRegistro(result);
  }

  static async getRegistros(
    filters: MantenimientoFilters = {}
  ): Promise<MantenimientoPaginatedResponse> {
    try {
      const result = await Parse.Cloud.run('getRegistrosMantenimiento', filters);
      return {
        results: (result.results || []).map(MantenimientoService.mapRegistro),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getRegistrosMantenimiento:', error);
      return { results: [], total: 0 };
    }
  }

  static async getRegistroById(id: string): Promise<RegistroMantenimiento | null> {
    try {
      const result = await Parse.Cloud.run('getRegistroMantenimientoById', { id });
      return result ? MantenimientoService.mapRegistro(result) : null;
    } catch (error) {
      console.error('Error getRegistroMantenimientoById:', error);
      return null;
    }
  }

  static async deleteRegistro(id: string): Promise<void> {
    await Parse.Cloud.run('deleteRegistroMantenimiento', { id });
  }

  // -----------------------------------------------
  // Validacion (aprobar / rechazar)
  // -----------------------------------------------

  static async aprobar(id: string, firmaValidadorUrl: string): Promise<RegistroMantenimiento> {
    const result = await Parse.Cloud.run('aprobarMantenimiento', {
      id,
      firmaValidadorUrl,
    });
    return MantenimientoService.mapRegistro(result);
  }

  static async rechazar(id: string, motivoRechazo: string): Promise<RegistroMantenimiento> {
    const result = await Parse.Cloud.run('rechazarMantenimiento', {
      id,
      motivoRechazo,
    });
    return MantenimientoService.mapRegistro(result);
  }

  static async getBandeja(
    filters: MantenimientoFilters = {}
  ): Promise<BandejaValidacionResponse> {
    try {
      const result = await Parse.Cloud.run('getBandejaValidacion', filters);
      return {
        results: (result.results || []).map(MantenimientoService.mapRegistro),
        total: result.total || 0,
        pendientes: result.pendientes || 0,
        aprobados: result.aprobados || 0,
        rechazados: result.rechazados || 0,
      };
    } catch (error) {
      console.error('Error getBandejaValidacion:', error);
      return { results: [], total: 0, pendientes: 0, aprobados: 0, rechazados: 0 };
    }
  }

  // -----------------------------------------------
  // Historial
  // -----------------------------------------------

  static async getHistorial(
    registroId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ results: HistorialMttoEntry[]; total: number }> {
    try {
      const result = await Parse.Cloud.run('getMantenimientoHistorial', {
        registroId,
        limit,
        skip,
      });
      return {
        results: (result.results || []).map((item: any) => ({
          id: item.id,
          registroId: item.registroId,
          accion: item.accion,
          descripcion: item.descripcion,
          usuarioId: item.usuarioId,
          usuarioNombre: item.usuarioNombre,
          detalles: item.detalles,
          archivoNombre: item.archivoNombre,
          archivoUrl: item.archivoUrl,
          createdAt: item.createdAt,
        })),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getMantenimientoHistorial:', error);
      return { results: [], total: 0 };
    }
  }

  // -----------------------------------------------
  // Archivos adjuntos
  // -----------------------------------------------

  static async adjuntarArchivo(
    registroId: string,
    file: File,
    categoria: string = 'otro'
  ): Promise<ArchivoAdjuntoMtto | null> {
    try {
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save();
      const fileUrl = parseFile.url();

      const result = await Parse.Cloud.run('adjuntarArchivoMantenimiento', {
        registroId,
        fileName: file.name,
        fileUrl,
        categoria,
      });
      return result;
    } catch (error) {
      console.error('Error adjuntarArchivoMantenimiento:', error);
      throw error;
    }
  }

  static async eliminarArchivo(
    registroId: string,
    fileName: string,
    fileUrl: string
  ): Promise<void> {
    await Parse.Cloud.run('eliminarArchivoMantenimiento', {
      registroId,
      fileName,
      fileUrl,
    });
  }

  static async getArchivos(registroId: string): Promise<ArchivoAdjuntoMtto[]> {
    try {
      const result = await Parse.Cloud.run('getArchivosMantenimiento', {
        registroId,
      });
      return result || [];
    } catch (error) {
      console.error('Error getArchivosMantenimiento:', error);
      return [];
    }
  }

  // -----------------------------------------------
  // Preguntas de mantenimiento (para el checklist)
  // -----------------------------------------------

  static async getClasificacionesConPreguntas(
    dominio: string,
    tipoMantenimiento: string
  ): Promise<{ clasificacion: string; cantidadPreguntas: number; categorias: string[] }[]> {
    try {
      const result = await Parse.Cloud.run('getClasificacionesConPreguntas', {
        dominio,
        tipoMantenimiento,
      });
      return result?.clasificaciones || [];
    } catch (error) {
      console.error('Error getClasificacionesConPreguntas:', error);
      return [];
    }
  }

  static async getPreguntas(
    dominio: string,
    tipoMantenimiento: string,
    clasificacionEquipo: string
  ): Promise<any[]> {
    try {
      const result = await Parse.Cloud.run('getPreguntasMantenimiento', {
        dominio,
        tipoMantenimiento,
        clasificacionEquipo,
        activo: true,
      });
      const items = result?.results || result || [];
      return (Array.isArray(items) ? items : []).map((p: any) => ({
        id: p.id || p.objectId,
        pregunta: p.pregunta,
        categoria: p.categoria || 'General',
        tipoRespuesta: p.tipoRespuesta || 'siNo',
        opcionesRespuesta: p.opcionesRespuesta,
        esCritica: p.esCritica || false,
        requiereFoto: p.requiereFoto || false,
        requiereObservacion: p.requiereObservacion || false,
        referenciaAcreditacion: p.referenciaAcreditacion,
        orden: p.orden || 0,
      }));
    } catch (error) {
      console.error('Error getPreguntasMantenimiento:', error);
      return [];
    }
  }

  // -----------------------------------------------
  // Subida de archivos y firma
  // -----------------------------------------------

  static async subirArchivoParse(
    file: File,
    nombre?: string
  ): Promise<string> {
    // Asegurar que el nombre tenga la extension correcta del archivo original
    const ext = file.name.split('.').pop() || 'bin';
    const finalName = nombre ? `${nombre}.${ext}` : file.name;
    const parseFile = new Parse.File(finalName, file);
    await parseFile.save();
    return parseFile.url();
  }

  static async subirFirma(
    blob: Blob,
    nombre: string
  ): Promise<string> {
    const file = new File([blob], `${nombre}.png`, { type: 'image/png' });
    const parseFile = new Parse.File(file.name, file);
    await parseFile.save();
    return parseFile.url();
  }

  // -----------------------------------------------
  // Estadisticas y consultas especiales
  // -----------------------------------------------

  static async getEstadisticas(): Promise<EstadisticasMantenimiento> {
    try {
      const result = await Parse.Cloud.run('getEstadisticasMantenimiento');
      return result;
    } catch (error) {
      console.error('Error getEstadisticasMantenimiento:', error);
      return { porEstado: {}, porDominio: {}, porTipo: {}, total: 0 };
    }
  }

  static async getMantenimientosActivo(
    activoId: string,
    activoClase: string
  ): Promise<RegistroMantenimiento[]> {
    try {
      const result = await Parse.Cloud.run('getMantenimientosActivo', {
        activoId,
        activoClase,
      });
      return (result || []).map(MantenimientoService.mapRegistro);
    } catch (error) {
      console.error('Error getMantenimientosActivo:', error);
      return [];
    }
  }

  // -----------------------------------------------
  // Mapper
  // -----------------------------------------------

  private static mapRegistro(data: any): RegistroMantenimiento {
    return {
      id: data.id || data.objectId,
      dominio: data.dominio || '',
      tipoMantenimiento: data.tipoMantenimiento || '',
      clasificacionEquipo: data.clasificacionEquipo || '',
      activoId: data.activoId || '',
      activoClase: data.activoClase || '',
      activoResumen: data.activoResumen || { nombre: '', identificador: '', estado: '', ubicacion: '' },
      fecha: data.fecha || '',
      checklist: data.checklist || { items: [] },
      fotosAdicionales: data.fotosAdicionales || {},
      observacionesGenerales: data.observacionesGenerales || '',
      proximoMantenimiento: data.proximoMantenimiento || '',
      tecnicoId: data.tecnicoId || '',
      tecnicoNombre: data.tecnicoNombre || '',
      firmaTecnico: data.firmaTecnico || '',
      estadoValidacion: data.estadoValidacion || 'pendiente',
      validadorId: data.validadorId,
      validadorNombre: data.validadorNombre,
      firmaValidador: data.firmaValidador,
      fechaValidacion: data.fechaValidacion,
      motivoRechazo: data.motivoRechazo,
      registroAnteriorId: data.registroAnteriorId,
      archivos: data.archivos,
      creadoPor: data.creadoPor || '',
      activo: data.activo !== false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
