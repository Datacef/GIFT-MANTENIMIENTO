'use client';
import Card from 'components/card';
import { useRouter } from 'next/navigation';
import { MdOpenInNew, MdAdd } from 'react-icons/md';
import { CumplimientoBadge } from 'components/admin/mantenimiento/CumplimientoBadge';
import { DOMINIO_MANTENIMIENTO_LABELS, DOMINIO_MANTENIMIENTO_COLORS } from 'types/mantenimiento.types';
import { formatFechaCumplimiento } from 'types/cumplimiento-mantenimiento.types';

export interface ActivoCriticoRow {
  id: string;
  clase: string;
  dominio: string;
  nombre: string;
  identificador: string;
  servicio: string;
  ubicacion: string;
  estadoCumplimientoMantenimiento: string;
  periodosCumplidos: number;
  periodosEsperados: number;
  periodosFaltantes: number;
  cumplimientoPorcentaje: number;
  ultimaFechaMantenimiento: string;
  proximaFechaMantenimientoEsperada: string;
}

interface Props {
  rows: ActivoCriticoRow[];
  loading?: boolean;
  userAccessLevel?: number;
}

const DOMINIO_TO_INVENTARIO_PATH: Record<string, string> = {
  equipoMedico: 'inventario',
  equipoIndustrial: 'inventario-industrial',
  flotaVehicular: 'flota-vehicular',
  infraestructura: 'infraestructura',
};

export default function CumplimientoTopCriticos({ rows, loading, userAccessLevel = 1 }: Props) {
  const router = useRouter();

  const irAInventario = (dominio: string) => {
    const path = DOMINIO_TO_INVENTARIO_PATH[dominio];
    if (path) router.push(`/admin/${path}`);
  };

  const registrarRetroactivo = (row: ActivoCriticoRow) => {
    const params = new URLSearchParams({
      dominio: row.dominio,
      activoId: row.id,
      activoClase: row.clase,
      retroactivo: '1',
    });
    router.push(`/admin/mantenimiento/nuevo?${params.toString()}`);
  };

  return (
    <Card extra="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-base font-bold text-navy-700 dark:text-white">
            Top Activos Criticos
          </h4>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Ordenados por cantidad de periodos faltantes (mayor primero)
          </p>
        </div>
        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {rows.length} activo{rows.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-400">
          No hay activos criticos con los filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-700">
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">#</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Activo</th>
                <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">Dominio</th>
                <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">Ubicacion / Servicio</th>
                <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Estado</th>
                <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Faltantes</th>
                <th className="hidden px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 sm:table-cell">Ultimo</th>
                <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50">
                  <td className="px-3 py-2 text-xs font-bold text-gray-500">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <p className="text-sm font-semibold text-navy-700 dark:text-white line-clamp-1">{r.nombre}</p>
                    {r.identificador && (
                      <span className="text-[10px] text-gray-400">{r.identificador}</span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${DOMINIO_MANTENIMIENTO_COLORS[r.dominio] || 'bg-gray-100 text-gray-700'}`}>
                      {DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio}
                    </span>
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-gray-600 dark:text-gray-300 lg:table-cell">
                    {r.ubicacion || r.servicio || '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <CumplimientoBadge
                      estado={r.estadoCumplimientoMantenimiento}
                      porcentaje={r.cumplimientoPorcentaje}
                      periodosCumplidos={r.periodosCumplidos}
                      periodosEsperados={r.periodosEsperados}
                      periodosFaltantes={r.periodosFaltantes}
                      size="sm"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="font-bold text-red-600">{r.periodosFaltantes}</span>
                    <span className="text-[10px] text-gray-400">/{r.periodosEsperados}</span>
                  </td>
                  <td className="hidden px-3 py-2 text-center text-xs text-gray-600 dark:text-gray-300 sm:table-cell">
                    {r.ultimaFechaMantenimiento ? formatFechaCumplimiento(r.ultimaFechaMantenimiento) : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => irAInventario(r.dominio)}
                        className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
                        title="Ir al inventario"
                      >
                        <MdOpenInNew className="h-4 w-4" />
                      </button>
                      {userAccessLevel >= 2 && (
                        <button
                          onClick={() => registrarRetroactivo(r)}
                          className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Registrar mantenimiento retroactivo"
                        >
                          <MdAdd className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
