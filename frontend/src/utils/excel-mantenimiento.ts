import {
  RegistroMantenimientoExport,
  DOMINIO_MANTENIMIENTO_LABELS,
  TIPO_MANTENIMIENTO_LABELS,
  ESTADO_VALIDACION_LABELS,
} from 'types/mantenimiento.types';

// Mapeo de clase Parse a etiqueta legible
const CLASE_PARSE_LABELS: Record<string, string> = {
  InventarioEquipoMedico: 'Equipo Medico',
  InventarioEquipoIndustrial: 'Equipo Industrial',
  InventarioFlotaVehicular: 'Flota Vehicular',
  InventarioInfraestructura: 'Infraestructura',
};

const formatIso = (iso?: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toISOString().replace('T', ' ').substring(0, 19);
  } catch {
    return iso;
  }
};

/**
 * Transforma los registros en filas planas para la hoja de calculo.
 * IMPORTANTE: solo columnas NO dinamicas (sin preguntas del checklist).
 * El ID de la pauta va como primera columna para permitir busqueda inversa.
 */
export function mapRegistrosToSheetRows(registros: RegistroMantenimientoExport[]) {
  return registros.map((r) => ({
    'ID Pauta': r.id,
    'Fecha Mantenimiento': r.fecha,
    'Dominio': DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio,
    'Tipo Mantenimiento': TIPO_MANTENIMIENTO_LABELS[r.tipoMantenimiento] || r.tipoMantenimiento,
    'Clasificacion Equipo': r.clasificacionEquipo,
    'Estado Validacion': ESTADO_VALIDACION_LABELS[r.estadoValidacion] || r.estadoValidacion,
    'Tecnico': r.tecnicoNombre,
    'Validador': r.validadorNombre,
    'Fecha Validacion': r.fechaValidacion,
    'Motivo Rechazo': r.motivoRechazo,
    'Proximo Mantenimiento': r.proximoMantenimiento,
    'Observaciones Generales': r.observacionesGenerales,
    'Clase Activo': CLASE_PARSE_LABELS[r.activoClase] || r.activoClase,
    'ID Activo': r.activoId,
    'Nombre Activo': r.activoNombre,
    'Identificador (Serie/Inv./Patente/Codigo)': r.activoIdentificador,
    'Estado Activo': r.activoEstado,
    'Ubicacion': r.activoUbicacion,
    'Fecha Creacion': formatIso(r.createdAt),
    'Fecha Actualizacion': formatIso(r.updatedAt),
  }));
}

export function buildExcelFileName(filters: {
  dominio?: string;
  fechaDesde?: string;
  fechaHasta?: string;
}) {
  const partes: string[] = ['mantenimientos'];
  if (filters.dominio) partes.push(filters.dominio);
  if (filters.fechaDesde) partes.push(`desde-${filters.fechaDesde}`);
  if (filters.fechaHasta) partes.push(`hasta-${filters.fechaHasta}`);
  if (!filters.fechaDesde && !filters.fechaHasta) {
    const hoy = new Date().toISOString().substring(0, 10);
    partes.push(hoy);
  }
  return `${partes.join('_')}.xlsx`;
}

/**
 * Genera y descarga el archivo .xlsx. Carga xlsx dinamicamente para evitar
 * inflar el bundle inicial.
 */
export async function generarExcelMantenimientos(
  registros: RegistroMantenimientoExport[],
  filters: { dominio?: string; fechaDesde?: string; fechaHasta?: string }
): Promise<void> {
  const XLSX = await import('xlsx');
  const rows = mapRegistrosToSheetRows(registros);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-ancho basico en base al contenido maximo por columna
  const headers = Object.keys(rows[0] || { 'Sin datos': '' });
  ws['!cols'] = headers.map((h) => {
    const max = rows.reduce((acc, r: any) => {
      const val = (r[h] ?? '').toString();
      return Math.max(acc, val.length);
    }, h.length);
    return { wch: Math.min(Math.max(max + 2, 12), 60) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mantenimientos');
  XLSX.writeFile(wb, buildExcelFileName(filters));
}
