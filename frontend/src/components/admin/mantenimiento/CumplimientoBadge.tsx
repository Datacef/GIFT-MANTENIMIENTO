'use client';
import {
  ESTADO_CUMPLIMIENTO_LABELS,
  ESTADO_CUMPLIMIENTO_COLORS,
  ULTIMO_ESTADO_MTTO_LABELS,
  ULTIMO_ESTADO_MTTO_COLORS,
  formatFechaCumplimiento,
} from 'types/cumplimiento-mantenimiento.types';

interface CumplimientoBadgeProps {
  estado: string;
  porcentaje?: number;
  periodosCumplidos?: number;
  periodosEsperados?: number;
  periodosFaltantes?: number;
  size?: 'sm' | 'md';
  showPercent?: boolean;
  // Etapa 2 (revision-inventarios): override inmediato cuando el activo
  // esta de baja, sin esperar al recalculo backend.
  estadoFisico?: string;
  fechaBaja?: string;
}

/**
 * Devuelve true si el activo se considera dado de baja por estado fisico
 * o por fechaBaja vigente (<= hoy).
 */
function esBajaInmediata(estadoFisico?: string, fechaBaja?: string): boolean {
  if (estadoFisico === 'Baja') return true;
  if (!fechaBaja) return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaBaja);
  if (!m) return false;
  const fb = new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)));
  const n = new Date();
  const hoy = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  return fb.getTime() <= hoy.getTime();
}

/**
 * Badge visual del estado de cumplimiento de mantenimiento.
 * Reutilizable en listados, detalles, dashboard y timeline.
 */
export function CumplimientoBadge({
  estado,
  porcentaje,
  periodosCumplidos,
  periodosEsperados,
  periodosFaltantes,
  size = 'sm',
  showPercent = true,
  estadoFisico,
  fechaBaja,
}: CumplimientoBadgeProps) {
  // Override: si el activo esta de baja, mostrar siempre "Dado de baja"
  const estadoEfectivo = esBajaInmediata(estadoFisico, fechaBaja) ? 'dado_de_baja' : estado;
  const color = ESTADO_CUMPLIMIENTO_COLORS[estadoEfectivo] || 'bg-gray-100 text-gray-700';
  const label = ESTADO_CUMPLIMIENTO_LABELS[estadoEfectivo] || estadoEfectivo;
  const padding = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm';

  const tieneMetricas =
    typeof periodosCumplidos === 'number' && typeof periodosEsperados === 'number';

  const tooltip = tieneMetricas
    ? `${periodosCumplidos}/${periodosEsperados} periodos (${porcentaje ?? 0}%)` +
      (periodosFaltantes && periodosFaltantes > 0 ? ` — ${periodosFaltantes} faltante(s)` : '')
    : label;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${padding} ${color}`}
      title={tooltip}
    >
      {label}
      {showPercent && tieneMetricas && porcentaje !== undefined && estadoEfectivo !== 'sin_configuracion' && estadoEfectivo !== 'dado_de_baja' ? (
        <span className="opacity-80">{porcentaje}%</span>
      ) : null}
    </span>
  );
}

interface UltimoMttoBadgeProps {
  fecha: string;
  estado: string;
  size?: 'sm' | 'md';
}

/**
 * Badge para la columna "Ultimo Mantto" — combina fecha + estado visual.
 */
export function UltimoMttoBadge({ fecha, estado, size = 'sm' }: UltimoMttoBadgeProps) {
  const color = ULTIMO_ESTADO_MTTO_COLORS[estado] || 'bg-gray-100 text-gray-700';
  const label = ULTIMO_ESTADO_MTTO_LABELS[estado] || 'Sin historial';
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm font-medium text-navy-700 dark:text-gray-200">
        {formatFechaCumplimiento(fecha)}
      </span>
      <span
        className={`inline-block rounded-full font-semibold ${padding} ${color}`}
        title={label}
      >
        {label}
      </span>
    </div>
  );
}

export default CumplimientoBadge;
