import Parse from 'utils/parseClient';
import {
  InventarioFlota,
  InventarioFlotaFormData,
  InventarioFlotaFilters,
  InventarioFlotaPaginatedResponse,
  HistorialFlotaEntry,
  ArchivoAdjuntoFlota,
} from 'types/inventario-flota.types';
import { mapCumplimientoFromRemote } from 'types/cumplimiento-mantenimiento.types';

export class InventarioFlotaService {
  static async getInventario(
    filters: InventarioFlotaFilters = {}
  ): Promise<InventarioFlotaPaginatedResponse> {
    try {
      const result = await Parse.Cloud.run('getInventarioFlota', filters);
      return {
        results: (result.results || []).map(InventarioFlotaService.mapItem),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getInventarioFlota:', error);
      return { results: [], total: 0 };
    }
  }

  static async getById(id: string): Promise<InventarioFlota | null> {
    try {
      const result = await Parse.Cloud.run('getInventarioFlotaById', { id });
      return result ? InventarioFlotaService.mapItem(result) : null;
    } catch (error) {
      console.error('Error getInventarioFlotaById:', error);
      return null;
    }
  }

  static async create(data: InventarioFlotaFormData): Promise<InventarioFlota> {
    const result = await Parse.Cloud.run('createInventarioFlota', { data });
    return InventarioFlotaService.mapItem(result);
  }

  static async update(
    id: string,
    data: Partial<InventarioFlotaFormData>
  ): Promise<InventarioFlota> {
    const result = await Parse.Cloud.run('updateInventarioFlota', { id, data });
    return InventarioFlotaService.mapItem(result);
  }

  static async delete(id: string): Promise<void> {
    await Parse.Cloud.run('deleteInventarioFlota', { id });
  }

  static async getEstadisticasFisicas(): Promise<{
    total: number;
    activos: number;
    enMantencion: number;
    dadosBaja: number;
  }> {
    try {
      const result = await Parse.Cloud.run('getInventarioEstadisticasFisicas', {
        clase: 'InventarioFlotaVehicular',
      });
      return {
        total: result?.total || 0,
        activos: result?.activos || 0,
        enMantencion: result?.enMantencion || 0,
        dadosBaja: result?.dadosBaja || 0,
      };
    } catch (error) {
      console.error('Error getEstadisticasFisicas (flota):', error);
      return { total: 0, activos: 0, enMantencion: 0, dadosBaja: 0 };
    }
  }

  static async getTiposVehiculo(): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getInventarioFlotaTipos');
      return result || [];
    } catch (error) {
      console.error('Error getInventarioFlotaTipos:', error);
      return [];
    }
  }

  static async getAsignaciones(): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getInventarioFlotaAsignaciones');
      return result || [];
    } catch (error) {
      console.error('Error getInventarioFlotaAsignaciones:', error);
      return [];
    }
  }

  static async importar(
    items: InventarioFlotaFormData[]
  ): Promise<{ created: number; errors: number; total: number }> {
    return await Parse.Cloud.run('importarInventarioFlota', { items });
  }

  static async exportar(
    filters: InventarioFlotaFilters = {}
  ): Promise<InventarioFlota[]> {
    try {
      const result = await Parse.Cloud.run('exportarInventarioFlota', filters);
      return (result.results || []).map(InventarioFlotaService.mapItem);
    } catch (error) {
      console.error('Error exportarInventarioFlota:', error);
      return [];
    }
  }

  static async getHistorial(
    vehiculoId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ results: HistorialFlotaEntry[]; total: number }> {
    try {
      const result = await Parse.Cloud.run('getInventarioFlotaHistorial', {
        vehiculoId,
        limit,
        skip,
      });
      return {
        results: (result.results || []).map((item: any) => ({
          id: item.id,
          vehiculoId: item.vehiculoId,
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
      console.error('Error getInventarioFlotaHistorial:', error);
      return { results: [], total: 0 };
    }
  }

  static async adjuntarArchivo(
    vehiculoId: string,
    file: File,
    categoria: string = 'otro'
  ): Promise<ArchivoAdjuntoFlota | null> {
    try {
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save();
      const fileUrl = parseFile.url();

      const result = await Parse.Cloud.run('adjuntarArchivoFlota', {
        vehiculoId,
        fileName: file.name,
        fileUrl,
        categoria,
      });
      return result;
    } catch (error) {
      console.error('Error adjuntarArchivoFlota:', error);
      throw error;
    }
  }

  static async eliminarArchivo(
    vehiculoId: string,
    fileName: string,
    fileUrl: string
  ): Promise<void> {
    await Parse.Cloud.run('eliminarArchivoFlota', {
      vehiculoId,
      fileName,
      fileUrl,
    });
  }

  static async getArchivos(vehiculoId: string): Promise<ArchivoAdjuntoFlota[]> {
    try {
      const result = await Parse.Cloud.run('getArchivosFlota', {
        vehiculoId,
      });
      return result || [];
    } catch (error) {
      console.error('Error getArchivosFlota:', error);
      return [];
    }
  }

  private static mapItem(data: any): InventarioFlota {
    return {
      id: data.id || data.objectId,
      tipoVehiculo: data.tipoVehiculo || '',
      nombreVehiculo: data.nombreVehiculo || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      anio: data.anio ?? 0,
      patente: data.patente || '',
      numeroInterno: data.numeroInterno || '',
      vin: data.vin || '',
      color: data.color || '',
      combustible: data.combustible || '',
      kilometraje: data.kilometraje ?? 0,
      capacidadPasajeros: data.capacidadPasajeros ?? 0,
      asignadoA: data.asignadoA || '',
      fechaAdquisicion: data.fechaAdquisicion || '',
      vidaUtil: data.vidaUtil ?? 0,
      estado: data.estado || '',
      frecuencia: data.frecuencia ?? 3,
      revisionTecnicaVigente: data.revisionTecnicaVigente || '',
      permisoCirculacion: data.permisoCirculacion || '',
      seguroVigente: data.seguroVigente || '',
      garantiaInicio: data.garantiaInicio || '',
      garantiaFinal: data.garantiaFinal || '',
      fechaBaja: data.fechaBaja || '',
      pautaAsignada: data.pautaAsignada || '',
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
