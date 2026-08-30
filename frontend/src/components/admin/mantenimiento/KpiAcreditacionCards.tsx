'use client';
import type { ReactNode } from 'react';
import Card from 'components/card';
import { MdVerified, MdWarning, MdError, MdCheckCircle } from 'react-icons/md';

export interface KpiAcreditacion {
  porcentaje?: number;
  cantidad?: number;
  cumplen?: number;
  total?: number;
  totalActivos?: number;
  umbral?: number;
  estado?: string;
  referencia?: string;
  criticos_alta?: { total: number; al_dia: number };
  vigentes?: number;
  vencidas?: number;
  porVencer60Dias?: number;
}

export interface KpisAcreditacion {
  k1_cumplimiento_global: KpiAcreditacion;
  k2_criticos_eq2: KpiAcreditacion;
  k3_apoyo_eq2: KpiAcreditacion;
  k4_infraestructura_ins3: KpiAcreditacion;
  k5_industrial: KpiAcreditacion;
  k6_vencidos: KpiAcreditacion;
  k7_proximos_30d: KpiAcreditacion;
  k8_sin_datos: KpiAcreditacion;
  k9_licitaciones: KpiAcreditacion;
}

interface Props {
  kpis: KpisAcreditacion | null;
  loading?: boolean;
}

const ESTADO_STYLES: Record<string, { border: string; badge: string; icon: ReactNode; label: string }> = {
  cumple: {
    border: 'border-green-200 dark:border-green-800',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    icon: <MdCheckCircle className="h-4 w-4" />,
    label: 'CUMPLE',
  },
  riesgo: {
    border: 'border-yellow-200 dark:border-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    icon: <MdWarning className="h-4 w-4" />,
    label: 'RIESGO',
  },
  no_cumple: {
    border: 'border-red-200 dark:border-red-800',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    icon: <MdError className="h-4 w-4" />,
    label: 'NO CUMPLE',
  },
};

function TarjetaKpi({
  titulo,
  referencia,
  valor,
  detalle,
  estado,
  umbral,
}: {
  titulo: string;
  referencia?: string;
  valor: string;
  detalle: string;
  estado?: string;
  umbral?: number;
}) {
  const style = estado ? ESTADO_STYLES[estado] : undefined;
  return (
    <Card extra={`p-4 border-2 ${style?.border || 'border-gray-100 dark:border-navy-700'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{titulo}</p>
          <p className="mt-2 text-2xl font-bold text-navy-700 dark:text-white">{valor}</p>
          <p className="mt-1 text-[11px] text-gray-400">{detalle}</p>
          {referencia && <p className="mt-1 text-[10px] italic text-gray-400 line-clamp-2">{referencia}</p>}
        </div>
        {estado && (
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${style!.badge}`}>
            {style!.icon}
            {umbral !== undefined ? ` ${style!.label} (${umbral}%)` : ` ${style!.label}`}
          </span>
        )}
      </div>
    </Card>
  );
}

export default function KpiAcreditacionCards({ kpis, loading }: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (!kpis) return null;

  const { k1_cumplimiento_global, k2_criticos_eq2, k3_apoyo_eq2, k4_infraestructura_ins3, k5_industrial, k6_vencidos, k7_proximos_30d, k8_sin_datos, k9_licitaciones } = kpis;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <MdVerified className="h-5 w-5 text-brand-500" />
        <h4 className="text-base font-bold text-navy-700 dark:text-white">Indicadores de Acreditación (EQ / INS)</h4>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        <TarjetaKpi
          titulo="EQ-2 · Equipos críticos al día"
          valor={`${k2_criticos_eq2.porcentaje ?? 0}%`}
          detalle={`${k2_criticos_eq2.cumplen ?? 0} de ${k2_criticos_eq2.total ?? 0} equipos (criticoApoyo=C)`}
          referencia={k2_criticos_eq2.referencia}
          estado={k2_criticos_eq2.estado}
          umbral={k2_criticos_eq2.umbral}
        />
        <TarjetaKpi
          titulo="EQ-2 · Equipos de apoyo al día"
          valor={`${k3_apoyo_eq2.porcentaje ?? 0}%`}
          detalle={`${k3_apoyo_eq2.cumplen ?? 0} de ${k3_apoyo_eq2.total ?? 0} equipos (criticoApoyo=A)`}
          referencia={k3_apoyo_eq2.referencia}
          estado={k3_apoyo_eq2.estado}
          umbral={k3_apoyo_eq2.umbral}
        />
        <TarjetaKpi
          titulo="INS-3 · Infraestructura al día"
          valor={`${k4_infraestructura_ins3.porcentaje ?? 0}%`}
          detalle={`${k4_infraestructura_ins3.cumplen ?? 0} de ${k4_infraestructura_ins3.total ?? 0} activos`}
          referencia={k4_infraestructura_ins3.referencia}
          estado={k4_infraestructura_ins3.estado}
        />
        <TarjetaKpi
          titulo="Cumplimiento global"
          valor={`${k1_cumplimiento_global.porcentaje ?? 0}%`}
          detalle={`${k1_cumplimiento_global.totalActivos ?? 0} activos en los 4 inventarios`}
        />
        <TarjetaKpi
          titulo="Industrial al día"
          valor={`${k5_industrial.porcentaje ?? 0}%`}
          detalle={`${k5_industrial.cumplen ?? 0} de ${k5_industrial.total ?? 0} · criticidad Alta: ${k5_industrial.criticos_alta?.al_dia ?? 0}/${k5_industrial.criticos_alta?.total ?? 0}`}
        />
        <TarjetaKpi
          titulo="Mantenimientos vencidos"
          valor={`${k6_vencidos.cantidad ?? 0}`}
          detalle={`Próximos 30 días: ${k7_proximos_30d.cantidad ?? 0} · Sin datos: ${k8_sin_datos.cantidad ?? 0}`}
          estado={(k6_vencidos.cantidad ?? 0) === 0 ? 'cumple' : 'no_cumple'}
        />
        <TarjetaKpi
          titulo="Licitaciones (convenios)"
          valor={`${k9_licitaciones.vigentes ?? 0} vigentes`}
          detalle={`${k9_licitaciones.porVencer60Dias ?? 0} por vencer (≤60d) · ${k9_licitaciones.vencidas ?? 0} vencidas`}
          estado={(k9_licitaciones.vencidas ?? 0) === 0 ? 'cumple' : 'riesgo'}
        />
      </div>
    </div>
  );
}
