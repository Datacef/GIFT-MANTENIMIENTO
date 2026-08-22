import Parse from 'utils/parseClient';
import {
  InventarioIndustrial,
  InventarioIndustrialFormData,
  InventarioIndustrialFilters,
  InventarioIndustrialPaginatedResponse,
  HistorialIndustrialEntry,
  ArchivoAdjuntoIndustrial,
} from 'types/inventario-industrial.types';
import { mapCumplimientoFromRemote } from 'types/cumplimiento-mantenimiento.types';

export class InventarioIndustrialService {
  static async getInventario(
    filters: InventarioIndustrialFilters = {}
  ): Promise<InventarioIndustrialPaginatedResponse> {
    try {
      const result = await Parse.Cloud.run('getInventarioIndustrial', filters);
      return {
        results: (result.results || []).map(InventarioIndustrialService.mapItem),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getInventarioIndustrial:', error);
      return { results: [], total: 0 };
    }
  }

  static async getById(id: string): Promise<InventarioIndustrial | null> {
    try {
      const result = await Parse.Cloud.run('getInventarioIndustrialById', { id });
      return result ? InventarioIndustrialService.mapItem(result) : null;
    } catch (error) {
      console.error('Error getInventarioIndustrialById:', error);
      return null;
    }
  }

  static async create(data: InventarioIndustrialFormData): Promise<InventarioIndustrial> {
    const result = await Parse.Cloud.run('createInventarioIndustrial', { data });
    return InventarioIndustrialService.mapItem(result);
  }

  static async update(
    id: string,
    data: Partial<InventarioIndustrialFormData>
  ): Promise<InventarioIndustrial> {
    const result = await Parse.Cloud.run('updateInventarioIndustrial', { id, data });
    return InventarioIndustrialService.mapItem(result);
  }

  static async delete(id: string): Promise<void> {
    await Parse.Cloud.run('deleteInventarioIndustrial', { id });
  }

  static async getEstadisticasFisicas(): Promise<{
    total: number;
    activos: number;
    enMantencion: number;
    dadosBaja: number;
  }> {
    try {
      const result = await Parse.Cloud.run('getInventarioEstadisticasFisicas', {
        clase: 'InventarioEquipoIndustrial',
      });
      return {
        total: result?.total || 0,
        activos: result?.activos || 0,
        enMantencion: result?.enMantencion || 0,
        dadosBaja: result?.dadosBaja || 0,
      };
    } catch (error) {
      console.error('Error getEstadisticasFisicas (industrial):', error);
      return { total: 0, activos: 0, enMantencion: 0, dadosBaja: 0 };
    }
  }

  static async getUbicaciones(): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getInventarioIndustrialUbicaciones');
      return result || [];
    } catch (error) {
      console.error('Error getInventarioIndustrialUbicaciones:', error);
      return [];
    }
  }

  static async getTiposEquipo(): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getInventarioIndustrialTipos');
      return result || [];
    } catch (error) {
      console.error('Error getInventarioIndustrialTipos:', error);
      return [];
    }
  }

  static async importar(
    items: InventarioIndustrialFormData[]
  ): Promise<{ created: number; errors: number; total: number }> {
    return await Parse.Cloud.run('importarInventarioIndustrial', { items });
  }

  static async exportar(
    filters: InventarioIndustrialFilters = {}
  ): Promise<InventarioIndustrial[]> {
    try {
      const result = await Parse.Cloud.run('exportarInventarioIndustrial', filters);
      return (result.results || []).map(InventarioIndustrialService.mapItem);
    } catch (error) {
      console.error('Error exportarInventarioIndustrial:', error);
      return [];
    }
  }

  static async getHistorial(
    equipoId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ results: HistorialIndustrialEntry[]; total: number }> {
    try {
      const result = await Parse.Cloud.run('getInventarioIndustrialHistorial', {
        equipoId,
        limit,
        skip,
      });
      return {
        results: (result.results || []).map((item: any) => ({
          id: item.id,
          equipoId: item.equipoId,
          accion: item.accion,
          cambios: item.cambios,
          descripcion: item.descripcion,
          usuarioId: item.usuarioId,
          usuarioNombre: item.usuarioNombre,
          archivoNombre: item.archivoNombre,
          archivoUrl: item.archivoUrl,
          createdAt: item.createdAt,
        })),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getInventarioIndustrialHistorial:', error);
      return { results: [], total: 0 };
    }
  }

  static async adjuntarArchivo(
    equipoId: string,
    file: File,
    categoria: string = 'otro'
  ): Promise<ArchivoAdjuntoIndustrial | null> {
    try {
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save();
      const fileUrl = parseFile.url();

      const result = await Parse.Cloud.run('adjuntarArchivoIndustrial', {
        equipoId,
        fileName: file.name,
        fileUrl,
        categoria,
      });
      return result;
    } catch (error) {
      console.error('Error adjuntarArchivoIndustrial:', error);
      throw error;
    }
  }

  static async eliminarArchivo(
    equipoId: string,
    fileName: string,
    fileUrl: string
  ): Promise<void> {
    await Parse.Cloud.run('eliminarArchivoIndustrial', {
      equipoId,
      fileName,
      fileUrl,
    });
  }

  static async getArchivos(equipoId: string): Promise<ArchivoAdjuntoIndustrial[]> {
    try {
      const result = await Parse.Cloud.run('getArchivosIndustrial', {
        equipoId,
      });
      return result || [];
    } catch (error) {
      console.error('Error getArchivosIndustrial:', error);
      return [];
    }
  }

  private static mapItem(data: any): InventarioIndustrial {
    return {
      id: data.id || data.objectId,
      ubicacion: data.ubicacion || '',
      tipoEquipo: data.tipoEquipo || '',
      nombreEquipo: data.nombreEquipo || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      serie: data.serie || '',
      inventario: data.inventario || '',
      capacidad: data.capacidad || '',
      combustible: data.combustible || '',
      fechaInstalacion: data.fechaInstalacion || '',
      vidaUtil: data.vidaUtil ?? 0,
      estado: data.estado || '',
      criticidad: data.criticidad || '',
      frecuencia: data.frecuencia ?? 0,
      garantiaInicio: data.garantiaInicio || '',
      garantiaFinal: data.garantiaFinal || '',
      fechaBaja: data.fechaBaja || '',
      pautaAsignada: data.pautaAsignada || '',
      requiereAutorizacion: data.requiereAutorizacion === true,
      activo: data.activo !== false,
      convenioActivo: data.convenioActivo || false,
      proveedorRut: data.proveedorRut || '',
      proveedorNombre: data.proveedorNombre || '',
      numeroLicitacion: data.numeroLicitacion || '',
      fechaTerminoConvenio: data.fechaTerminoConvenio || '',
      ...mapCumplimientoFromRemote(data),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
