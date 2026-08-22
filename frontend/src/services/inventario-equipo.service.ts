import Parse from 'utils/parseClient';
import {
  InventarioEquipo,
  InventarioEquipoFormData,
  InventarioEquipoFilters,
  InventarioEquipoPaginatedResponse,
  HistorialEntry,
  ArchivoAdjunto,
} from 'types/inventario-equipo.types';
import { mapCumplimientoFromRemote } from 'types/cumplimiento-mantenimiento.types';

export class InventarioEquipoService {
  static async getInventario(
    filters: InventarioEquipoFilters = {}
  ): Promise<InventarioEquipoPaginatedResponse> {
    try {
      const result = await Parse.Cloud.run('getInventarioEquipos', filters);
      return {
        results: (result.results || []).map(InventarioEquipoService.mapItem),
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error getInventarioEquipos:', error);
      return { results: [], total: 0 };
    }
  }

  static async getById(id: string): Promise<InventarioEquipo | null> {
    try {
      const result = await Parse.Cloud.run('getInventarioEquipoById', { id });
      return result ? InventarioEquipoService.mapItem(result) : null;
    } catch (error) {
      console.error('Error getInventarioEquipoById:', error);
      return null;
    }
  }

  static async create(data: InventarioEquipoFormData): Promise<InventarioEquipo> {
    const result = await Parse.Cloud.run('createInventarioEquipo', { data });
    return InventarioEquipoService.mapItem(result);
  }

  static async update(
    id: string,
    data: Partial<InventarioEquipoFormData>
  ): Promise<InventarioEquipo> {
    const result = await Parse.Cloud.run('updateInventarioEquipo', { id, data });
    return InventarioEquipoService.mapItem(result);
  }

  static async delete(id: string): Promise<void> {
    await Parse.Cloud.run('deleteInventarioEquipo', { id });
  }

  static async getServicios(): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getInventarioServicios');
      return result || [];
    } catch (error) {
      console.error('Error getInventarioServicios:', error);
      return [];
    }
  }

  static async getEstadisticasFisicas(): Promise<{
    total: number;
    activos: number;
    enMantencion: number;
    dadosBaja: number;
  }> {
    try {
      const result = await Parse.Cloud.run('getInventarioEstadisticasFisicas', {
        clase: 'InventarioEquipoMedico',
      });
      return {
        total: result?.total || 0,
        activos: result?.activos || 0,
        enMantencion: result?.enMantencion || 0,
        dadosBaja: result?.dadosBaja || 0,
      };
    } catch (error) {
      console.error('Error getEstadisticasFisicas (medico):', error);
      return { total: 0, activos: 0, enMantencion: 0, dadosBaja: 0 };
    }
  }

  static async getClases(): Promise<string[]> {
    try {
      const result = await Parse.Cloud.run('getInventarioClases');
      return result || [];
    } catch (error) {
      console.error('Error getInventarioClases:', error);
      return [];
    }
  }

  static async importar(
    items: InventarioEquipoFormData[]
  ): Promise<{ created: number; errors: number; total: number }> {
    return await Parse.Cloud.run('importarInventarioEquipos', { items });
  }

  static async exportar(
    filters: InventarioEquipoFilters = {}
  ): Promise<InventarioEquipo[]> {
    try {
      const result = await Parse.Cloud.run('exportarInventarioEquipos', filters);
      return (result.results || []).map(InventarioEquipoService.mapItem);
    } catch (error) {
      console.error('Error exportarInventarioEquipos:', error);
      return [];
    }
  }

  static async getHistorial(
    equipoId: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<{ results: HistorialEntry[]; total: number }> {
    try {
      const result = await Parse.Cloud.run('getInventarioHistorial', {
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
      console.error('Error getInventarioHistorial:', error);
      return { results: [], total: 0 };
    }
  }

  static async adjuntarArchivo(
    equipoId: string,
    file: File,
    categoria: string = 'otro'
  ): Promise<ArchivoAdjunto | null> {
    try {
      const parseFile = new Parse.File(file.name, file);
      await parseFile.save();
      const fileUrl = parseFile.url();

      const result = await Parse.Cloud.run('adjuntarArchivoInventario', {
        equipoId,
        fileName: file.name,
        fileUrl,
        categoria,
      });
      return result;
    } catch (error) {
      console.error('Error adjuntarArchivo:', error);
      throw error;
    }
  }

  static async eliminarArchivo(
    equipoId: string,
    fileName: string,
    fileUrl: string
  ): Promise<void> {
    await Parse.Cloud.run('eliminarArchivoInventario', {
      equipoId,
      fileName,
      fileUrl,
    });
  }

  static async getArchivos(equipoId: string): Promise<ArchivoAdjunto[]> {
    try {
      const result = await Parse.Cloud.run('getArchivosInventario', {
        equipoId,
      });
      return result || [];
    } catch (error) {
      console.error('Error getArchivosInventario:', error);
      return [];
    }
  }

  private static mapItem(data: any): InventarioEquipo {
    return {
      id: data.id || data.objectId,
      servicio: data.servicio || '',
      clase: data.clase || '',
      subclase: data.subclase || '',
      nombreEquipo: data.nombreEquipo || '',
      marca: data.marca || '',
      modelo: data.modelo || '',
      serie: data.serie || '',
      inventario: data.inventario || '',
      valor: data.valor || '',
      fechaAdquisicion: data.fechaAdquisicion || '',
      vidaUtil: data.vidaUtil ?? 0,
      estado: data.estado || '',
      criticoApoyo: data.criticoApoyo || '',
      frecuencia: data.frecuencia ?? 0,
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
