'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import {
  MdCheckCircle,
  MdCancel,
  MdSchedule,
  MdAdd,
  MdHistory,
  MdOpenInNew,
  MdRefresh,
  MdWarning,
} from 'react-icons/md';
import {
  CumplimientoBadge,
  UltimoMttoBadge,
} from 'components/admin/mantenimiento/CumplimientoBadge';
import {
  ESTADO_CUMPLIMIENTO_LABELS,
  ULTIMO_ESTADO_MTTO_LABELS,
  formatFechaCumplimiento,
} from 'types/cumplimiento-mantenimiento.types';
import {
  TIPO_MANTENIMIENTO_LABELS,
  ESTADO_VALIDACION_COLORS,
  ESTADO_VALIDACION_LABELS,
  RegistroMantenimiento,
} from 'types/mantenimiento.types';
import { MantenimientoService } from 'services/mantenimiento.service';

interface PeriodoCalculado {
  indice: number;
  desde: string;
  hasta: string;
  estado: string; // cumplido | faltante | en_curso | pendiente
  registroId?: string;
  fechaRealizado?: string;
  tipoMantenimientoRealizado?: string;
  extras?: { registroId: string; fecha: string; tipo: string }[];
}

interface ResultadoCumplimiento {
  estadoCumplimiento: string;
  periodos: PeriodoCalculado[];
  periodosEsperados: number;
  periodosCumplidos: number;
  periodosFaltantes: number;
  cumplimientoPorcentaje: number;
  ultimaFechaMantenimiento: string;
  ultimoRegistroId: string;
  ultimoTipoMantenimiento: string;
  ultimoEstadoMantenimiento: string;
  proximaFechaMantenimientoEsperada: string;
}

interface Props {
  activoId: string;
  activoClase: string;
  dominio: string; // equipoMedico | equipoIndustrial | flotaVehicular | infraestructura
  fechaBase?: string;
  frecuencia?: number;
  fechaBaja?: string;
  userAccessLevel?: number;
}

function diffDiasDesdeHoy(fecha: string): number {
  if (!fecha) return 0;
  const f = new Date(fecha + 'T00:00:00Z');
  if (isNaN(f.getTime())) return 0;
  const hoy = new Date();
  const hoyUTC = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return Math.round((f.getTime() - hoyUTC) / (24 * 60 * 60 * 1000));
}

export default function ActivoMantenimientosPanel({
  activoId,
  activoClase,
  dominio,
  fechaBaja,
  userAccessLevel = 1,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCumplimiento | null>(null);
  const [registros, setRegistros] = useState<RegistroMantenimiento[]>([]);
  const [filtroValidacion, setFiltroValidacion] = useState<string>('todos');

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [calc, regs] = await Promise.all([
        Parse.Cloud.run('calcularCumplimientoMantenimiento', { activoId, activoClase }),
        MantenimientoService.getMantenimientosActivo(activoId, activoClase),
      ]);
      setResultado(calc as ResultadoCumplimiento);
      setRegistros(regs);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar cumplimiento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activoId && activoClase) cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activoId, activoClase]);

  const registrosFiltrados = useMemo(() => {
    if (filtroValidacion === 'todos') return registros;
    return registros.filter((r) => r.estadoValidacion === filtroValidacion);
  }, [registros, filtroValidacion]);

  const handleNuevoMantenimiento = (fechaSugerida?: string, periodoIndice?: number) => {
    const params = new URLSearchParams({ dominio, activoId, activoClase });
    if (fechaSugerida) params.set('fechaSugerida', fechaSugerida);
    if (periodoIndice !== undefined && periodoIndice !== null) {
      params.set('retroactivo', '1');
      params.set('periodoIndice', String(periodoIndice));
    }
    router.push(`/admin/mantenimiento/nuevo?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
        <div className="flex items-start gap-2">
          <MdWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Error al cargar cumplimiento de mantenimiento
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={cargarDatos}
              className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-200"
            >
              <MdRefresh className="h-3 w-3" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!resultado) return null;

  const proximoDias = diffDiasDesdeHoy(resultado.proximaFechaMantenimientoEsperada);

  return (
    <div className="space-y-6">
      {/* Acciones header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">
          Cumplimiento de Mantenimiento
        </h4>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarDatos}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
            title="Recargar"
          >
            <MdRefresh className="h-4 w-4" />
          </button>
          {userAccessLevel >= 2 && !fechaBaja && (
            <button
              onClick={() => handleNuevoMantenimiento()}
              className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-600"
            >
              <MdAdd className="h-3 w-3" />
              Nuevo Mantenimiento
            </button>
          )}
        </div>
      </div>

      {/* SECCION A — Tarjetas de metricas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Ultimo mantenimiento */}
        <div className="rounded-xl border border-gray-200 p-3 dark:border-navy-600">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Ultimo Mantenimiento
          </p>
          <p className="mt-2 text-base font-bold text-navy-700 dark:text-white">
            {resultado.ultimaFechaMantenimiento
              ? formatFechaCumplimiento(resultado.ultimaFechaMantenimiento)
              : '—'}
          </p>
          {resultado.ultimoTipoMantenimiento && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {TIPO_MANTENIMIENTO_LABELS[resultado.ultimoTipoMantenimiento] || resultado.ultimoTipoMantenimiento}
            </p>
          )}
          <div className="mt-2">
            <UltimoMttoBadge
              fecha={resultado.ultimaFechaMantenimiento}
              estado={resultado.ultimoEstadoMantenimiento}
              size="sm"
            />
          </div>
          {resultado.ultimoRegistroId && (
            <button
              onClick={() => router.push(`/admin/mantenimiento/${resultado.ultimoRegistroId}`)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline"
            >
              <MdOpenInNew className="h-3 w-3" />
              Ver registro
            </button>
          )}
        </div>

        {/* Proximo esperado */}
        <div className="rounded-xl border border-gray-200 p-3 dark:border-navy-600">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Proximo esperado
          </p>
          <p className="mt-2 text-base font-bold text-navy-700 dark:text-white">
            {resultado.proximaFechaMantenimientoEsperada
              ? formatFechaCumplimiento(resultado.proximaFechaMantenimientoEsperada)
              : '—'}
          </p>
          {resultado.proximaFechaMantenimientoEsperada && (
            <p
              className={`mt-1 text-xs font-semibold ${
                proximoDias < 0
                  ? 'text-red-600'
                  : proximoDias <= 30
                  ? 'text-yellow-600'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {proximoDias < 0
                ? `Vencido hace ${Math.abs(proximoDias)} dias`
                : proximoDias === 0
                ? 'Vence hoy'
                : `Faltan ${proximoDias} dias`}
            </p>
          )}
        </div>

        {/* Cumplimiento (porcentaje) */}
        <div className="rounded-xl border border-gray-200 p-3 dark:border-navy-600">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Cumplimiento
          </p>
          <p className="mt-2 text-2xl font-bold text-navy-700 dark:text-white">
            {resultado.cumplimientoPorcentaje}%
          </p>
          <div className="mt-2">
            <CumplimientoBadge
              estado={resultado.estadoCumplimiento}
              porcentaje={resultado.cumplimientoPorcentaje}
              periodosCumplidos={resultado.periodosCumplidos}
              periodosEsperados={resultado.periodosEsperados}
              periodosFaltantes={resultado.periodosFaltantes}
              size="sm"
              showPercent={false}
            />
          </div>
        </div>

        {/* Periodos */}
        <div className="rounded-xl border border-gray-200 p-3 dark:border-navy-600">
          <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Periodos
          </p>
          <p className="mt-2 text-2xl font-bold text-navy-700 dark:text-white">
            {resultado.periodosCumplidos} / {resultado.periodosEsperados}
          </p>
          {resultado.periodosFaltantes > 0 && (
            <p className="mt-1 text-xs font-semibold text-red-600">
              {resultado.periodosFaltantes} faltante{resultado.periodosFaltantes > 1 ? 's' : ''}
            </p>
          )}
          <div className="mt-2 h-2 w-full rounded-full bg-gray-200 dark:bg-navy-700">
            <div
              className={`h-2 rounded-full ${
                resultado.cumplimientoPorcentaje >= 100
                  ? 'bg-green-500'
                  : resultado.cumplimientoPorcentaje >= 70
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(100, resultado.cumplimientoPorcentaje)}%` }}
            />
          </div>
        </div>
      </div>

      {/* SECCION B — Timeline de periodos */}
      <div>
        <h5 className="mb-3 text-sm font-bold uppercase text-gray-600 dark:text-gray-300">
          Linea de Tiempo de Periodos
        </h5>
        {resultado.periodos.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-400">
            {resultado.estadoCumplimiento === 'sin_configuracion'
              ? 'El activo no tiene frecuencia o fecha base configurada. Edite el activo para habilitar el calculo de periodos.'
              : resultado.estadoCumplimiento === 'dado_de_baja'
              ? 'Activo dado de baja. No se calculan periodos posteriores a la fecha de baja.'
              : 'No hay periodos calculados.'}
          </div>
        ) : (
          <div className="space-y-2">
            {resultado.periodos.map((p) => (
              <PeriodoNodo
                key={p.indice}
                periodo={p}
                onAbrirRegistro={(id) => router.push(`/admin/mantenimiento/${id}`)}
                onRegistrarRetroactivo={
                  userAccessLevel >= 2
                    ? () => handleNuevoMantenimiento(p.desde, p.indice)
                    : undefined
                }
                onIniciarMantenimiento={
                  userAccessLevel >= 2
                    ? () => handleNuevoMantenimiento()
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* SECCION C — Tabla cronologica de TODOS los registros */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h5 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">
            <MdHistory className="mr-1 inline h-4 w-4" />
            Historial de Mantenimientos del Activo
          </h5>
          <select
            value={filtroValidacion}
            onChange={(e) => setFiltroValidacion(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="todos">Todos los estados</option>
            <option value="aprobado">Aprobados</option>
            <option value="pendiente">Pendientes</option>
            <option value="rechazado">Rechazados</option>
          </select>
        </div>
        {registrosFiltrados.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-400">
            Sin registros de mantenimiento para este activo.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-navy-600">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-navy-900">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Tipo
                  </th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">
                    Pauta
                  </th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 sm:table-cell">
                    Tecnico
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Validacion
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100 dark:border-navy-700">
                    <td className="px-3 py-2 text-sm text-navy-700 dark:text-gray-200">
                      {formatFechaCumplimiento(r.fecha)}
                    </td>
                    <td className="px-3 py-2 text-sm text-navy-700 dark:text-gray-200">
                      {TIPO_MANTENIMIENTO_LABELS[r.tipoMantenimiento] || r.tipoMantenimiento}
                    </td>
                    <td className="hidden px-3 py-2 text-sm text-navy-700 dark:text-gray-200 md:table-cell">
                      {r.clasificacionEquipo || '—'}
                    </td>
                    <td className="hidden px-3 py-2 text-sm text-navy-700 dark:text-gray-200 sm:table-cell">
                      {r.tecnicoNombre || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          ESTADO_VALIDACION_COLORS[r.estadoValidacion] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ESTADO_VALIDACION_LABELS[r.estadoValidacion] || r.estadoValidacion}
                      </span>
                      {r.esRetroactivo && (
                        <span
                          className="ml-1 inline-block rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          title={r.motivoRetroactivo || 'Mantenimiento registrado de forma retroactiva'}
                        >
                          RETRO
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => router.push(`/admin/mantenimiento/${r.id}`)}
                        className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
                        title="Ver detalle"
                      >
                        <MdOpenInNew className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// Sub-componente: nodo de timeline
// =====================================================================
interface PeriodoNodoProps {
  periodo: PeriodoCalculado;
  onAbrirRegistro?: (id: string) => void;
  onRegistrarRetroactivo?: () => void;
  onIniciarMantenimiento?: () => void;
}

function PeriodoNodo({
  periodo,
  onAbrirRegistro,
  onRegistrarRetroactivo,
  onIniciarMantenimiento,
}: PeriodoNodoProps) {
  const isCumplido = periodo.estado === 'cumplido';
  const isFaltante = periodo.estado === 'faltante';
  const isEnCurso = periodo.estado === 'en_curso';

  const colorBorder = isCumplido
    ? 'border-l-green-500 bg-green-50 dark:bg-green-900/10'
    : isFaltante
    ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10'
    : 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/10';

  const Icon = isCumplido ? MdCheckCircle : isFaltante ? MdCancel : MdSchedule;
  const iconColor = isCumplido
    ? 'text-green-500'
    : isFaltante
    ? 'text-red-500'
    : 'text-blue-500';

  return (
    <div
      className={`flex items-start gap-3 rounded-r-lg border-l-4 ${colorBorder} p-3 dark:border-navy-600`}
    >
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${iconColor}`} />
      <div className="flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-navy-700 dark:text-white">
            Periodo #{periodo.indice + 1}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatFechaCumplimiento(periodo.desde)} → {formatFechaCumplimiento(periodo.hasta)}
          </span>
          {periodo.extras && periodo.extras.length > 0 && (
            <span
              className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
              title="Mantenimientos adicionales en este periodo"
            >
              +{periodo.extras.length} adicional{periodo.extras.length > 1 ? 'es' : ''}
            </span>
          )}
        </div>

        <div className="mt-1 text-xs">
          {isCumplido && (
            <span className="text-green-700 dark:text-green-400">
              Cumplido el {formatFechaCumplimiento(periodo.fechaRealizado || '')}
              {periodo.tipoMantenimientoRealizado && (
                <span className="text-gray-500 dark:text-gray-400">
                  {' '}— {TIPO_MANTENIMIENTO_LABELS[periodo.tipoMantenimientoRealizado] || periodo.tipoMantenimientoRealizado}
                </span>
              )}
            </span>
          )}
          {isFaltante && (
            <span className="font-semibold text-red-700 dark:text-red-400">
              No ejecutado
            </span>
          )}
          {isEnCurso && (
            <span className="font-semibold text-blue-700 dark:text-blue-400">
              Periodo actual (vence {formatFechaCumplimiento(periodo.hasta)})
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-2">
          {isCumplido && periodo.registroId && onAbrirRegistro && (
            <button
              onClick={() => onAbrirRegistro(periodo.registroId!)}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-500 hover:bg-brand-50 dark:bg-navy-800"
            >
              <MdOpenInNew className="h-3 w-3" />
              Ver registro
            </button>
          )}
          {isFaltante && onRegistrarRetroactivo && (
            <button
              onClick={onRegistrarRetroactivo}
              className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-red-600"
            >
              <MdAdd className="h-3 w-3" />
              Registrar retroactivo
            </button>
          )}
          {isEnCurso && onIniciarMantenimiento && (
            <button
              onClick={onIniciarMantenimiento}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-600"
            >
              <MdAdd className="h-3 w-3" />
              Iniciar mantenimiento
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
