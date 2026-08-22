import Parse from 'utils/parseClient';
import {
  Licitacion,
  LicitacionFormData,
  LicitacionFilters,
  LicitacionPaginatedResponse,
  LicitacionHistorialEntry,
  LicitacionEquipo,
  ExtensionContrato,
  CargaMasivaResult,
} from 'types/licitacion.types';

export class LicitacionService {
  static async getLicitaciones(
    filters: LicitacionFilters = {}
  ): Promise<LicitacionPaginatedResponse> {
    try {
      const result = await Parse.Cloud.run('getLicitaciones', filters);
      return {
        results: (result.results || []).map(LicitacionService.mapItem),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getLicitaciones:', error);
      return { results: [], total: 0 };
    }
  }

  static async getById(id: string): Promise<Licitacion | null> {
    try {
      const result = await Parse.Cloud.run('getLicitacionById', { id });
      return result ? LicitacionService.mapItem(result) : null;
    } catch (error) {
      console.error('Error getLicitacionById:', error);
      return null;
    }
  }

  static async create(data: LicitacionFormData): Promise<Licitacion> {
    const result = await Parse.Cloud.run('createLicitacion', { data });
    return LicitacionService.mapItem(result);
  }

  static async update(
    id: string,
    data: Partial<LicitacionFormData>
  ): Promise<Licitacion> {
    const result = await Parse.Cloud.run('updateLicitacion', { id, data });
    return LicitacionService.mapItem(result);
  }

  static async delete(id: string): Promise<void> {
    await Parse.Cloud.run('deleteLicitacion', { id });
  }

  static async agregarExtension(
    licitacionId: string,
    extension: ExtensionContrato
  ): Promise<Licitacion> {
    const result = await Parse.Cloud.run('agregarExtensionLicitacion', {
      licitacionId,
      extension,
    });
    return LicitacionService.mapItem(result);
  }

  static async getHistorial(
    licitacionId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ results: LicitacionHistorialEntry[]; total: number }> {
    try {
      const result = await Parse.Cloud.run('getLicitacionHistorial', {
        licitacionId,
        limit,
        skip,
      });
      return {
        results: (result.results || []).map((item: any) => ({
          id: item.id,
          licitacionId: item.licitacionId,
          accion: item.accion,
          cambios: item.cambios,
          descripcion: item.descripcion,
          usuarioId: item.usuarioId,
          usuarioNombre: item.usuarioNombre,
          createdAt: item.createdAt,
        })),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getLicitacionHistorial:', error);
      return { results: [], total: 0 };
    }
  }

  static async getEquipos(
    licitacionId: string
  ): Promise<LicitacionEquipo[]> {
    try {
      const result = await Parse.Cloud.run('getEquiposLicitacion', { licitacionId });
      return (result || []).map((item: any) => ({
        id: item.id || item.objectId,
        licitacionId: item.licitacionId || '',
        proveedorRut: item.proveedorRut || '',
        equipoId: item.equipoId || '',
        inventarioTipo: item.inventarioTipo || '',
        nombreEquipo: item.nombreEquipo || '',
        marca: item.marca || '',
        modelo: item.modelo || '',
        serie: item.serie || '',
        inventario: item.inventario || '',
        createdAt: item.createdAt,
      }));
    } catch (error) {
      console.error('Error getEquiposLicitacion:', error);
      return [];
    }
  }

  static async cargarEquipos(
    licitacionId: string,
    items: any[]
  ): Promise<CargaMasivaResult> {
    return await Parse.Cloud.run('cargarEquiposLicitacion', { licitacionId, items });
  }

  static async desasociarEquipo(id: string): Promise<void> {
    await Parse.Cloud.run('desasociarEquipoLicitacion', { id });
  }

  static async getLicitacionesByProveedor(proveedorId: string): Promise<Licitacion[]> {
    try {
      const result = await Parse.Cloud.run('getLicitaciones', {
        proveedorId,
        limit: 1000,
      });
      return (result.results || []).map(LicitacionService.mapItem);
    } catch (error) {
      console.error('Error getLicitacionesByProveedor:', error);
      return [];
    }
  }

  private static mapItem(data: any): Licitacion {
    return {
      id: data.id || data.objectId,
      proveedorId: data.proveedorId || '',
      proveedorRut: data.proveedorRut || '',
      proveedorNombre: data.proveedorNombre || '',
      numeroLicitacion: data.numeroLicitacion || '',
      inventarioDestino: data.inventarioDestino || '',
      fechaInicio: data.fechaInicio || '',
      fechaTermino: data.fechaTermino || '',
      fechaTerminoEfectiva: data.fechaTerminoEfectiva || '',
      extensiones: data.extensiones || [],
      estado: data.estado || '',
      activo: data.activo !== false,
      totalEquipos: data.totalEquipos || 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
