import Parse from 'utils/parseClient';
import {
  MantenimientoExportFilters,
  RegistroMantenimientoExport,
} from 'types/mantenimiento.types';

// Parse Server limita cada query a 1000 registros por llamada (con masterKey).
// Esta capa hace paginacion automatica acumulando bloques hasta agotar resultados.
const PAGE_SIZE = 1000;

export interface ExportProgress {
  loaded: number;
  total: number; // 0 si se desconoce hasta terminar
  hasMore: boolean;
}

export class MantenimientoExportService {
  /**
   * Descarga todos los registros que cumplan los filtros, paginando en bloques de 1000.
   * @param filters Filtros a aplicar
   * @param onProgress Callback opcional para avance (UI de progreso)
   */
  static async fetchAll(
    filters: MantenimientoExportFilters,
    onProgress?: (p: ExportProgress) => void
  ): Promise<RegistroMantenimientoExport[]> {
    const acumulado: RegistroMantenimientoExport[] = [];
    let skip = 0;
    let hasMore = true;
    let total = 0;

    while (hasMore) {
      const response = await Parse.Cloud.run('exportarRegistrosMantenimiento', {
        ...filters,
        skip,
        pageSize: PAGE_SIZE,
      });

      const pagina: RegistroMantenimientoExport[] = response?.results || [];
      acumulado.push(...pagina);

      if (skip === 0 && typeof response?.total === 'number' && response.total > 0) {
        total = response.total;
      }
      hasMore = Boolean(response?.hasMore);
      skip += pagina.length;

      if (onProgress) {
        onProgress({
          loaded: acumulado.length,
          total,
          hasMore,
        });
      }

      // Guard-rail: si Parse devuelve 0 resultados pero hasMore=true, cortamos.
      if (pagina.length === 0) break;
    }

    return acumulado;
  }
}
