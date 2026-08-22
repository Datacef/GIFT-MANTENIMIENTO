// ===============================================
// Etapa 2 — Tipos compartidos para cumplimiento de mantenimiento
// Ref: context/mmtto/actualizacion-modulo-inventario-mantenimiento.md
// ===============================================

export interface CumplimientoMantenimientoCampos {
  ultimaFechaMantenimiento: string;
  ultimoRegistroMantenimientoId: string;
  ultimoTipoMantenimiento: string;
  ultimoEstadoMantenimiento: string; // sin_historial | pendiente | aprobado | rechazado
  proximaFechaMantenimientoEsperada: string;
  periodosEsperados: number;
  periodosCumplidos: number;
  periodosFaltantes: number;
  cumplimientoPorcentaje: number;
  estadoCumplimientoMantenimiento: string; // sin_configuracion | sin_historial | al_dia | con_retraso | critico | dado_de_baja
  ultimoCalculoCumplimiento?: string | null;
}

export interface CumplimientoFiltros {
  estadoCumplimiento?: string;
  ultimoMttoDesde?: string;
  ultimoMttoHasta?: string;
}

export const ESTADO_CUMPLIMIENTO_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'sin_configuracion', label: 'Sin configuracion' },
  { value: 'sin_historial', label: 'Sin historial' },
  { value: 'al_dia', label: 'Al dia' },
  { value: 'con_retraso', label: 'Con retraso' },
  { value: 'critico', label: 'Critico' },
  { value: 'dado_de_baja', label: 'Dado de baja' },
];

export const ESTADO_CUMPLIMIENTO_LABELS: Record<string, string> = {
  sin_configuracion: 'Sin configuracion',
  sin_historial: 'Sin historial',
  al_dia: 'Al dia',
  con_retraso: 'Con retraso',
  critico: 'Critico',
  dado_de_baja: 'Dado de baja',
};

export const ESTADO_CUMPLIMIENTO_COLORS: Record<string, string> = {
  sin_configuracion: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  sin_historial: 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200',
  al_dia: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  con_retraso: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  critico: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  dado_de_baja: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200',
};

export const ULTIMO_ESTADO_MTTO_LABELS: Record<string, string> = {
  sin_historial: 'Sin historial',
  pendiente: 'En validacion',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export const ULTIMO_ESTADO_MTTO_COLORS: Record<string, string> = {
  sin_historial: 'bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200',
  pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  aprobado: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rechazado: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

/**
 * Normaliza un objeto remoto del backend agregando defaults seguros.
 * Usar desde cada service `.mapItem`.
 */
export function mapCumplimientoFromRemote(data: any): CumplimientoMantenimientoCampos {
  return {
    ultimaFechaMantenimiento: data?.ultimaFechaMantenimiento || '',
    ultimoRegistroMantenimientoId: data?.ultimoRegistroMantenimientoId || '',
    ultimoTipoMantenimiento: data?.ultimoTipoMantenimiento || '',
    ultimoEstadoMantenimiento: data?.ultimoEstadoMantenimiento || 'sin_historial',
    proximaFechaMantenimientoEsperada: data?.proximaFechaMantenimientoEsperada || '',
    periodosEsperados: data?.periodosEsperados ?? 0,
    periodosCumplidos: data?.periodosCumplidos ?? 0,
    periodosFaltantes: data?.periodosFaltantes ?? 0,
    cumplimientoPorcentaje: data?.cumplimientoPorcentaje ?? 0,
    estadoCumplimientoMantenimiento: data?.estadoCumplimientoMantenimiento || 'sin_configuracion',
    ultimoCalculoCumplimiento: data?.ultimoCalculoCumplimiento || null,
  };
}

/**
 * Formatea fecha YYYY-MM-DD a dd/mm/yyyy para visualizacion.
 */
export function formatFechaCumplimiento(fecha: string): string {
  if (!fecha) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return fecha;
}
