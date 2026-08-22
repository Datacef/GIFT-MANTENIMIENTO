import Parse from 'utils/parseClient';

export type EstadoPeriodoGantt =
  | 'cumplido'
  | 'cumplido_pendiente'
  | 'en_curso'
  | 'faltante'
  | 'futuro'
  | 'pendiente';

export interface PeriodoGantt {
  indice: number;
  desde: string;
  hasta: string;
  estado: EstadoPeriodoGantt;
  registroId?: string;
  fechaRealizado?: string;
  tipoMantenimientoRealizado?: string;
  estadoValidacion?: string;
}

export interface FilaGantt {
  activoId: string;
  activoClase: string;
  dominio: string;
  nombre: string;
  identificador: string;
  grupo: string;
  pautaAsignada: string;
  frecuencia: number;
  fechaBase: string;
  fechaBaja: string;
  estado: string;
  convenioActivo: boolean;
  proveedorNombre: string;
  numeroLicitacion: string;
  ultimaFechaMantenimiento: string;
  proximaFechaMantenimientoEsperada: string;
  estadoCumplimiento: string;
  cumplimientoPorcentaje: number;
  periodosEsperados: number;
  periodosCumplidos: number;
  periodosFaltantes: number;
  periodos: PeriodoGantt[];
}

export interface GanttResponse {
  total: number;
  rangoDesde: string;
  rangoHasta: string;
  meses: string[];
  filas: FilaGantt[];
}

export interface CargaMensualResponse {
  meses: string[];
  porDominio: {
    equipoMedico: number[];
    equipoIndustrial: number[];
    flotaVehicular: number[];
    infraestructura: number[];
  };
  totales: number[];
  cuartiles: { p25: number; p50: number; p75: number; p90: number; max: number };
}

export interface GanttFilters {
  desde?: string;
  hasta?: string;
  dominio?: string;
  filtrosInventario?: Record<string, any>;
  limit?: number;
  skip?: number;
}

export class GanttMantenimientoService {
  static async getGantt(filters: GanttFilters = {}): Promise<GanttResponse> {
    try {
      const r = await Parse.Cloud.run('getGanttMantenimiento', filters);
      return {
        total: r?.total || 0,
        rangoDesde: r?.rangoDesde || '',
        rangoHasta: r?.rangoHasta || '',
        meses: r?.meses || [],
        filas: r?.filas || [],
      };
    } catch (error) {
      console.error('Error getGanttMantenimiento:', error);
      return { total: 0, rangoDesde: '', rangoHasta: '', meses: [], filas: [] };
    }
  }

  static async getCargaMensual(filters: Omit<GanttFilters, 'dominio' | 'limit' | 'skip'> = {}): Promise<CargaMensualResponse> {
    try {
      const r = await Parse.Cloud.run('getCargaMantenimientoPorMes', filters);
      return {
        meses: r?.meses || [],
        porDominio: r?.porDominio || { equipoMedico: [], equipoIndustrial: [], flotaVehicular: [], infraestructura: [] },
        totales: r?.totales || [],
        cuartiles: r?.cuartiles || { p25: 0, p50: 0, p75: 0, p90: 0, max: 0 },
      };
    } catch (error) {
      console.error('Error getCargaMantenimientoPorMes:', error);
      return {
        meses: [],
        porDominio: { equipoMedico: [], equipoIndustrial: [], flotaVehicular: [], infraestructura: [] },
        totales: [],
        cuartiles: { p25: 0, p50: 0, p75: 0, p90: 0, max: 0 },
      };
    }
  }
}
