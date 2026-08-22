import Parse from 'utils/parseClient';

export type ClaseInventario =
  | 'InventarioEquipoMedico'
  | 'InventarioEquipoIndustrial'
  | 'InventarioFlotaVehicular'
  | 'InventarioInfraestructura';

export const DOMINIO_LABELS: Record<ClaseInventario, string> = {
  InventarioEquipoMedico: 'Equipos Medicos',
  InventarioEquipoIndustrial: 'Equipos Industriales',
  InventarioFlotaVehicular: 'Flota Vehicular',
  InventarioInfraestructura: 'Infraestructura',
};

export const DOMINIO_HREF: Record<ClaseInventario, string> = {
  InventarioEquipoMedico: '/admin/inventario',
  InventarioEquipoIndustrial: '/admin/inventario-industrial',
  InventarioFlotaVehicular: '/admin/flota-vehicular',
  InventarioInfraestructura: '/admin/infraestructura',
};

export interface ActivoEliminado {
  id: string;
  nombre: string;
  eliminadoEn?: string;
  eliminadoPor?: string;
  estado?: string;
  fechaBaja?: string;
  serie?: string;
  inventario?: string;
  patente?: string;
  numeroInterno?: string;
  vin?: string;
  codigoInterno?: string;
  servicio?: string;
  clase?: string;
  subclase?: string;
  marca?: string;
  modelo?: string;
  ubicacion?: string;
  tipoEquipo?: string;
  tipoVehiculo?: string;
  asignadoA?: string;
  sistema?: string;
  estadoCumplimientoMantenimiento?: string;
}

export interface DuplicadoResult {
  encontrado: boolean;
  activo?: ActivoEliminado;
  totalRegistros?: number;
}

export class InventarioSharedService {
  /**
   * Lista los activos en papelera de una clase. ADMIN+.
   */
  static async getEliminados(
    clase: ClaseInventario,
    busqueda: string = '',
    limit: number = 50,
    skip: number = 0
  ): Promise<{ total: number; results: ActivoEliminado[] }> {
    try {
      const result = await Parse.Cloud.run('getInventarioEliminados', { clase, busqueda, limit, skip });
      return { total: result?.total || 0, results: result?.results || [] };
    } catch (error) {
      console.error('Error getEliminados:', error);
      return { total: 0, results: [] };
    }
  }

  /**
   * Restaura un activo desde la papelera. ADMIN+.
   */
  static async restaurar(clase: ClaseInventario, id: string): Promise<void> {
    await Parse.Cloud.run('restaurarInventario', { clase, id });
  }

  /**
   * Restaura un activo y aplica nuevos datos. COORDINATOR+.
   */
  static async restaurarYActualizar(
    clase: ClaseInventario,
    id: string,
    data: Record<string, any>
  ): Promise<void> {
    await Parse.Cloud.run('restaurarYActualizar', { clase, id, data });
  }

  /**
   * Migra registros, logs e historial huerfanos de un objectId anterior
   * al objectId nuevo. ADMIN+.
   */
  static async adoptarHuerfanos(
    clase: ClaseInventario,
    idNuevo: string,
    idAnterior: string
  ): Promise<{ migradosRegistros: number; migradosLogs: number; migradosHistorial: number }> {
    const r: any = await Parse.Cloud.run('adoptarRegistrosHuerfanos', { clase, idNuevo, idAnterior });
    return {
      migradosRegistros: r?.migradosRegistros || 0,
      migradosLogs: r?.migradosLogs || 0,
      migradosHistorial: r?.migradosHistorial || 0,
    };
  }

  /**
   * Hard delete de un activo ya eliminado (purga). SUPER_ADMIN.
   */
  static async purgar(clase: ClaseInventario, id: string): Promise<void> {
    await Parse.Cloud.run('purgarInventario', { clase, id });
  }

  /**
   * Diagnostica historial visible vs huerfanos del activo actual.
   */
  static async diagnosticarHistorial(
    clase: ClaseInventario,
    id: string
  ): Promise<{
    activoId: string;
    clase: string;
    identificadores: string[];
    totalDirectos: number;
    totalHuerfanos: number;
    huerfanosPorActivoIdPrevio: Record<string, number>;
    idsPrevios: string[];
    licitacionesHuerfanas: number;
    sample: any[];
  }> {
    const r: any = await Parse.Cloud.run('diagnosticarHistorialActivo', { clase, id });
    return {
      activoId: r?.activoId || id,
      clase: r?.clase || clase,
      identificadores: r?.identificadores || [],
      totalDirectos: r?.totalDirectos || 0,
      totalHuerfanos: r?.totalHuerfanos || 0,
      huerfanosPorActivoIdPrevio: r?.huerfanosPorActivoIdPrevio || {},
      idsPrevios: r?.idsPrevios || [],
      licitacionesHuerfanas: r?.licitacionesHuerfanas || 0,
      sample: r?.sample || [],
    };
  }

  /**
   * Reasigna registros, logs, historial y LicitacionEquipo huerfanos (que
   * coinciden por identificador) al objectId del activo actual. ADMIN+.
   */
  static async reconciliarHuerfanos(
    clase: ClaseInventario,
    id: string
  ): Promise<{
    migradosRegistros: number;
    migradosLogs: number;
    migradosHistorial: number;
    migradosLicitaciones: number;
    idsPrevios: string[];
  }> {
    const r: any = await Parse.Cloud.run('reconciliarHuerfanosPorIdentidad', { clase, id });
    return {
      migradosRegistros: r?.migradosRegistros || 0,
      migradosLogs: r?.migradosLogs || 0,
      migradosHistorial: r?.migradosHistorial || 0,
      migradosLicitaciones: r?.migradosLicitaciones || 0,
      idsPrevios: r?.idsPrevios || [],
    };
  }

  /**
   * Busca duplicado por identificadores antes de crear (operacion segura).
   */
  static async buscarDuplicado(
    clase: ClaseInventario,
    identificadores: Record<string, string>
  ): Promise<DuplicadoResult> {
    try {
      const r: any = await Parse.Cloud.run('buscarDuplicadoEliminado', { clase, identificadores });
      return {
        encontrado: !!r?.encontrado,
        activo: r?.activo,
        totalRegistros: r?.totalRegistros || 0,
      };
    } catch (error) {
      console.error('Error buscarDuplicado:', error);
      return { encontrado: false };
    }
  }
}
