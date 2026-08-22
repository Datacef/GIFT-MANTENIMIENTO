import Parse from 'utils/parseClient';
import {
  PreguntaMantenimiento,
  PreguntaFormData,
  PreguntaFilters,
  PreguntaPaginatedResponse,
} from 'types/pregunta-mantenimiento.types';

export class PreguntaMantenimientoService {
  /**
   * Obtiene preguntas con filtros y paginacion
   */
  static async getPreguntas(
    filters: PreguntaFilters = {}
  ): Promise<PreguntaPaginatedResponse> {
    try {
      const result = await Parse.Cloud.run('getPreguntasMantenimiento', filters);
      return {
        results: (result.results || []).map(PreguntaMantenimientoService.mapPregunta),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getPreguntasMantenimiento:', error);
      return { results: [], total: 0 };
    }
  }

  /**
   * Obtiene una pregunta por ID
   */
  static async getPreguntaById(id: string): Promise<PreguntaMantenimiento | null> {
    try {
      const result = await Parse.Cloud.run('getPreguntaById', { id });
      return result ? PreguntaMantenimientoService.mapPregunta(result) : null;
    } catch (error) {
      console.error('Error getPreguntaById:', error);
      return null;
    }
  }

  /**
   * Crea una nueva pregunta
   */
  static async createPregunta(data: PreguntaFormData): Promise<PreguntaMantenimiento> {
    const result = await Parse.Cloud.run('createPregunta', { data });
    return PreguntaMantenimientoService.mapPregunta(result);
  }

  /**
   * Actualiza una pregunta existente
   */
  static async updatePregunta(
    id: string,
    data: Partial<PreguntaFormData>
  ): Promise<PreguntaMantenimiento> {
    const result = await Parse.Cloud.run('updatePregunta', { id, data });
    return PreguntaMantenimientoService.mapPregunta(result);
  }

  /**
   * Elimina una pregunta (soft o hard delete)
   */
  static async deletePregunta(id: string, hard = false): Promise<void> {
    await Parse.Cloud.run('deletePregunta', { id, hard });
  }

  /**
   * Alterna el estado activo/inactivo
   */
  static async toggleActivo(id: string): Promise<{ activo: boolean }> {
    return await Parse.Cloud.run('togglePreguntaActivo', { id });
  }

  /**
   * Obtiene clasificaciones de equipo distintas
   */
  static async getClasificaciones(dominio?: string): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getClasificacionesEquipo', { dominio });
      return result || [];
    } catch (error) {
      console.error('Error getClasificacionesEquipo:', error);
      return [];
    }
  }

  /**
   * Obtiene categorias distintas
   */
  static async getCategorias(
    dominio?: string,
    clasificacionEquipo?: string
  ): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getCategoriasPreguntas', {
        dominio,
        clasificacionEquipo,
      });
      return result || [];
    } catch (error) {
      console.error('Error getCategoriasPreguntas:', error);
      return [];
    }
  }

  /**
   * Importacion masiva de preguntas
   */
  static async importarPreguntas(
    preguntas: PreguntaFormData[]
  ): Promise<{ created: number; errors: number }> {
    return await Parse.Cloud.run('importarPreguntas', { preguntas });
  }

  private static mapPregunta(data: any): PreguntaMantenimiento {
    return {
      id: data.id || data.objectId,
      dominio: data.dominio,
      tipoMantenimiento: data.tipoMantenimiento,
      clasificacionEquipo: data.clasificacionEquipo || '',
      categoria: data.categoria || '',
      pregunta: data.pregunta || '',
      descripcion: data.descripcion || undefined,
      tipoRespuesta: data.tipoRespuesta || 'siNo',
      opcionesRespuesta: data.opcionesRespuesta || [],
      estadoGeneral: data.estadoGeneral || 'bueno',
      requiereFoto: data.requiereFoto === true,
      requiereObservacion: data.requiereObservacion === true,
      esCritica: data.esCritica === true,
      orden: data.orden ?? 0,
      activo: data.activo !== false,
      referenciaAcreditacion: data.referenciaAcreditacion || undefined,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
