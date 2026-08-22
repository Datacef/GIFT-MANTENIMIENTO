import Parse from 'utils/parseClient';
import {
  InventarioInfraestructura,
  InventarioInfraestructuraFormData,
  InventarioInfraestructuraFilters,
  InventarioInfraestructuraPaginatedResponse,
  HistorialInfraEntry,
  ArchivoAdjuntoInfra,
} from 'types/inventario-infraestructura.types';
import { mapCumplimientoFromRemote } from 'types/cumplimiento-mantenimiento.types';

export class InventarioInfraestructuraService {
  static async getInventario(
    filters: InventarioInfraestructuraFilters = {}
  ): Promise<InventarioInfraestructuraPaginatedResponse> {
    try {
      const result = await Parse.Cloud.run('getInventarioInfra', filters);
      return {
        results: (result.results || []).map(InventarioInfraestructuraService.mapItem),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getInventarioInfra:', error);
      return { results: [], total: 0 };
    }
  }

  static async getById(id: string): Promise<InventarioInfraestructura | null> {
    try {
      const result = await Parse.Cloud.run('getInventarioInfraById', { id });
      return result ? InventarioInfraestructuraService.mapItem(result) : null;
    } catch (error) {
      console.error('Error getInventarioInfraById:', error);
      return null;
    }
  }

  static async create(data: InventarioInfraestructuraFormData): Promise<InventarioInfraestructura> {
    const result = await Parse.Cloud.run('createInventarioInfra', { data });
    return InventarioInfraestructuraService.mapItem(result);
  }

  static async update(
    id: string,
    data: Partial<InventarioInfraestructuraFormData>
  ): Promise<InventarioInfraestructura> {
    const result = await Parse.Cloud.run('updateInventarioInfra', { id, data });
    return InventarioInfraestructuraService.mapItem(result);
  }

  static async delete(id: string): Promise<void> {
    await Parse.Cloud.run('deleteInventarioInfra', { id });
  }

  static async getEstadisticasFisicas(): Promise<{
    total: number;
    activos: number;
    enMantencion: number;
    dadosBaja: number;
  }> {
    try {
      const result = await Parse.Cloud.run('getInventarioEstadisticasFisicas', {
        clase: 'InventarioInfraestructura',
      });
      return {
        total: result?.total || 0,
        activos: result?.activos || 0,
        enMantencion: result?.enMantencion || 0,
        dadosBaja: result?.dadosBaja || 0,
      };
    } catch (error) {
      console.error('Error getEstadisticasFisicas (infra):', error);
      return { total: 0, activos: 0, enMantencion: 0, dadosBaja: 0 };
    }
  }

  static async getSistemas(): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getInventarioInfraSistemas');
      return result || [];
    } catch (error) {
      console.error('Error getInventarioInfraSistemas:', error);
      return [];
    }
  }

  static async getUbicaciones(): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getInventarioInfraUbicaciones');
      return result || [];
    } catch (error) {
      console.error('Error getInventarioInfraUbicaciones:', error);
      return [];
    }
  }

  static async importar(
    items: InventarioInfraestructuraFormData[]
  ): Promise<{ created: number; errors: number; total: number }> {
    return await Parse.Cloud.run('importarInventarioInfra', { items });
  }

  static async exportar(
    filters: InventarioInfraestructuraFilters = {}
  ): Promise<InventarioInfraestructura[]> {
    try {
      const result = await Parse.Cloud.run('exportarInventarioInfra', filters);
      return (result.results || []).map(InventarioInfraestructuraService.mapItem);
    } catch (error) {
      console.error('Error exportarInventarioInfra:', error);
      return [];
    }
  }

  static async getHistorial(
    componenteId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ results: HistorialInfraEntry[]; total: number }> {
    try {
      const result = await Parse.Cloud.run('getInventarioInfraHistorial', {
        componenteId,
        limit,
        skip,
      });
      return {
        results: (result.results || []).map((item: any) => ({
          id: item.id,
          componenteId: item.componenteId,
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
      console.error('Error getInventarioInfraHistorial:', error);
      return { results: [], total: 0 };
    }
  }

  static async adjuntarArchivo(
    componenteId: string,
    file: File,
    categoria: string = 'otro'
  ): Promise<ArchivoAdjuntoInfra | null> {
    try {
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save();
      const fileUrl = parseFile.url();

      const result = await Parse.Cloud.run('adjuntarArchivoInfra', {
        componenteId,
        fileName: file.name,
        fileUrl,
        categoria,
      });
      return result;
    } catch (error) {
      console.error('Error adjuntarArchivoInfra:', error);
      throw error;
    }
  }

  static async eliminarArchivo(
    componenteId: string,
    fileName: string,
    fileUrl: string
  ): Promise<void> {
    await Parse.Cloud.run('eliminarArchivoInfra', {
      componenteId,
      fileName,
      fileUrl,
    });
  }

  static async getArchivos(componenteId: string): Promise<ArchivoAdjuntoInfra[]> {
    try {
      const result = await Parse.Cloud.run('getArchivosInfra', {
        componenteId,
      });
      return result || [];
    } catch (error) {
      console.error('Error getArchivosInfra:', error);
      return [];
    }
  }

  private static mapItem(data: any): InventarioInfraestructura {
    return {
      id: data.id || data.objectId,
      sistema: data.sistema || '',
      componente: data.componente || '',
      ubicacion: data.ubicacion || '',
      descripcion: data.descripcion || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      serie: data.serie || '',
      codigoInterno: data.codigoInterno || '',
      capacidad: data.capacidad || '',
      fechaInstalacion: data.fechaInstalacion || '',
      vidaUtil: data.vidaUtil ?? 0,
      estado: data.estado || '',
      criticidad: data.criticidad || '',
      frecuencia: data.frecuencia ?? 0,
      normativaAplicable: data.normativaAplicable || '',
      fechaUltimaInspeccion: data.fechaUltimaInspeccion || '',
      proximaInspeccion: data.proximaInspeccion || '',
      responsable: data.responsable || '',
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
