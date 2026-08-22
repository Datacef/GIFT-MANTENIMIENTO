'use client';
import Card from 'components/card';
import { DOMINIO_MANTENIMIENTO_LABELS } from 'types/mantenimiento.types';
import { ESTADO_CUMPLIMIENTO_LABELS } from 'types/cumplimiento-mantenimiento.types';

interface DominioStats {
  total: number;
  sin_configuracion: number;
  sin_historial: number;
  al_dia: number;
  con_retraso: number;
  critico: number;
  dado_de_baja: number;
}

interface Props {
  porDominio: Record<string, DominioStats>;
}

const ESTADO_BAR_COLORS: Record<string, string> = {
  al_dia: 'bg-green-500',
  con_retraso: 'bg-yellow-500',
  critico: 'bg-red-500',
  sin_historial: 'bg-red-700',
  sin_configuracion: 'bg-gray-400',
  dado_de_baja: 'bg-gray-600',
};

const ESTADO_ORDER = ['al_dia', 'con_retraso', 'critico', 'sin_historial', 'sin_configuracion', 'dado_de_baja'];

export default function CumplimientoPorDominioChart({ porDominio }: Props) {
  const dominios = Object.keys(porDominio);

  return (
    <Card extra="p-5">
      <h4 className="text-base font-bold text-navy-700 dark:text-white">
        Distribucion de Cumplimiento por Dominio
      </h4>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Estados de cumplimiento por cada coleccion de inventario
      </p>

      <div className="mt-5 space-y-4">
        {dominios.map((dom) => {
          const stats = porDominio[dom];
          const total = stats.total || 0;
          return (
            <div key={dom}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-navy-700 dark:text-gray-200">
                  {DOMINIO_MANTENIMIENTO_LABELS[dom] || dom}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {total} activo{total !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex h-6 w-full overflow-hidden rounded-lg bg-gray-100 dark:bg-navy-800">
                {ESTADO_ORDER.map((estado) => {
                  const count = (stats as any)[estado] || 0;
                  if (count === 0) return null;
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div
                      key={estado}
                      className={`flex items-center justify-center ${ESTADO_BAR_COLORS[estado] || 'bg-gray-300'} text-[10px] font-bold text-white`}
                      style={{ width: `${pct}%` }}
                      title={`${ESTADO_CUMPLIMIENTO_LABELS[estado] || estado}: ${count} (${pct.toFixed(1)}%)`}
                    >
                      {pct >= 8 ? count : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-5 flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-navy-700">
        {ESTADO_ORDER.map((estado) => (
          <div key={estado} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded ${ESTADO_BAR_COLORS[estado] || 'bg-gray-300'}`} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {ESTADO_CUMPLIMIENTO_LABELS[estado] || estado}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
