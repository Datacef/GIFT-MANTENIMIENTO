'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import Swal from 'sweetalert2';
import {
  MdSync,
  MdDownload,
  MdFilterList,
  MdRefresh,
  MdSchedule,
  MdAdd,
  MdHistory,
} from 'react-icons/md';
import CumplimientoKPICards from 'components/admin/mantenimiento/CumplimientoKPICards';
import CumplimientoPorDominioChart from 'components/admin/mantenimiento/CumplimientoPorDominioChart';
import CumplimientoTopCriticos, { ActivoCriticoRow } from 'components/admin/mantenimiento/CumplimientoTopCriticos';
import {
  ESTADO_CUMPLIMIENTO_LABELS,
  formatFechaCumplimiento,
  ULTIMO_ESTADO_MTTO_LABELS,
} from 'types/cumplimiento-mantenimiento.types';
import { DOMINIO_MANTENIMIENTO_OPTIONS, DOMINIO_MANTENIMIENTO_LABELS } from 'types/mantenimiento.types';

interface DominioStats {
  total: number;
  sin_configuracion: number;
  sin_historial: number;
  al_dia: number;
  con_retraso: number;
  critico: number;
  dado_de_baja: number;
}

interface EstadisticasResponse {
  porDominio: Record<string, DominioStats>;
  totalActivos: number;
  porcentajePromedio: number;
}

interface ProximoRow {
  id: string;
  clase: string;
  dominio: string;
  nombre: string;
  identificador: string;
  servicio: string;
  ubicacion: string;
  proximaFechaMantenimientoEsperada: string;
  ultimaFechaMantenimiento: string;
  estadoCumplimientoMantenimiento: string;
}

interface RegularizacionRow {
  id: string;
  clase: string;
  dominio: string;
  nombre: string;
  identificador: string;
  servicio: string;
  ubicacion: string;
  pautaAsignada: string;
  periodosFaltantes: number;
  periodosEsperados: number;
  periodosCumplidos: number;
  cumplimientoPorcentaje: number;
  estadoCumplimientoMantenimiento: string;
  ultimaFechaMantenimiento: string;
  ultimoEstadoMantenimiento: string;
  fechasFaltantes: string[];
  primerPeriodoFaltanteIndice: number;
}

const CumplimientoPage = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [userAccessLevel, setUserAccessLevel] = useState(1);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    const level = user.get('accessLevel') || 1;
    setUserAccessLevel(level);
    if (level >= 3) {
      setAuthorized(true);
    } else {
      router.push('/admin/default');
    }
    setAuthLoading(false);
  }, [router]);

  const [stats, setStats] = useState<EstadisticasResponse | null>(null);
  const [topCriticos, setTopCriticos] = useState<ActivoCriticoRow[]>([]);
  const [proximos, setProximos] = useState<ProximoRow[]>([]);
  const [regularizaciones, setRegularizaciones] = useState<RegularizacionRow[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingCriticos, setLoadingCriticos] = useState(false);
  const [loadingProximos, setLoadingProximos] = useState(false);
  const [loadingRegular, setLoadingRegular] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [dominioFilter, setDominioFilter] = useState('');
  const [diasProximos, setDiasProximos] = useState(30);
  const [mesesMinRetraso, setMesesMinRetraso] = useState(0);

  const cargar = useCallback(async () => {
    if (!authorized) return;
    setLoadingStats(true);
    setLoadingCriticos(true);
    setLoadingProximos(true);
    setLoadingRegular(true);
    try {
      const dominioParam = dominioFilter || undefined;
      const [s, c, p, r] = await Promise.all([
        Parse.Cloud.run('getEstadisticasCumplimiento', dominioParam ? { dominio: dominioParam } : {}),
        Parse.Cloud.run('getTopActivosCriticos', { limit: 20, ...(dominioParam ? { dominio: dominioParam } : {}) }),
        Parse.Cloud.run('getProximosMantenimientos', { dias: diasProximos, ...(dominioParam ? { dominio: dominioParam } : {}) }),
        Parse.Cloud.run('getRegularizacionesPendientes', { limit: 50, mesesMinRetraso, ...(dominioParam ? { dominio: dominioParam } : {}) }),
      ]);
      setStats(s as EstadisticasResponse);
      setTopCriticos((c as any).results || []);
      setProximos((p as any).results || []);
      setRegularizaciones((r as any).results || []);
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'Error al cargar el dashboard', 'error');
    } finally {
      setLoadingStats(false);
      setLoadingCriticos(false);
      setLoadingProximos(false);
      setLoadingRegular(false);
    }
  }, [authorized, dominioFilter, diasProximos, mesesMinRetraso]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const handleSincronizarMasivo = async () => {
    if (userAccessLevel < 4) return;
    const confirm = await Swal.fire({
      title: 'Sincronizar todos los cumplimientos',
      text: 'Se recalculara el cumplimiento de TODOS los activos (los 4 inventarios). Esto puede tomar varios segundos. Continuar?',
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sincronizar',
      confirmButtonColor: '#422AFB',
    });
    if (!confirm.isConfirmed) return;

    setSyncing(true);
    try {
      const r: any = await Parse.Cloud.run('sincronizarCumplimientoMasivo', {});
      await Swal.fire({
        title: 'Sincronizacion completada',
        html: `
          <div style="text-align:left">
            <p>Procesados: <strong>${r.procesados}</strong></p>
            <p>OK: <strong style="color:#16a34a">${r.ok}</strong></p>
            <p>Errores: <strong style="color:${r.errores > 0 ? '#dc2626' : '#6b7280'}">${r.errores}</strong></p>
          </div>
        `,
        icon: r.errores > 0 ? 'warning' : 'success',
      });
      cargar();
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'Error al sincronizar', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportarExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      // Top criticos + proximos en hojas separadas
      const wb = XLSX.utils.book_new();

      const topData = topCriticos.map((r) => ({
        Activo: r.nombre,
        Identificador: r.identificador,
        Dominio: DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio,
        'Servicio/Ubicacion': r.ubicacion || r.servicio || '',
        'Estado Cumplimiento': ESTADO_CUMPLIMIENTO_LABELS[r.estadoCumplimientoMantenimiento] || r.estadoCumplimientoMantenimiento,
        'Periodos Cumplidos': r.periodosCumplidos,
        'Periodos Esperados': r.periodosEsperados,
        'Periodos Faltantes': r.periodosFaltantes,
        'Cumplimiento (%)': r.cumplimientoPorcentaje,
        'Ultimo Mantto': formatFechaCumplimiento(r.ultimaFechaMantenimiento),
        'Proximo Mantto': formatFechaCumplimiento(r.proximaFechaMantenimientoEsperada),
      }));
      const wsTop = XLSX.utils.json_to_sheet(topData);
      XLSX.utils.book_append_sheet(wb, wsTop, 'Top Criticos');

      const proxData = proximos.map((r) => ({
        Activo: r.nombre,
        Identificador: r.identificador,
        Dominio: DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio,
        'Servicio/Ubicacion': r.ubicacion || r.servicio || '',
        'Proximo Mantto': formatFechaCumplimiento(r.proximaFechaMantenimientoEsperada),
        'Ultimo Mantto': formatFechaCumplimiento(r.ultimaFechaMantenimiento),
        'Estado Cumplimiento': ESTADO_CUMPLIMIENTO_LABELS[r.estadoCumplimientoMantenimiento] || r.estadoCumplimientoMantenimiento,
      }));
      const wsProx = XLSX.utils.json_to_sheet(proxData);
      XLSX.utils.book_append_sheet(wb, wsProx, `Proximos ${diasProximos}d`);

      // Resumen por dominio
      if (stats) {
        const resumenData = Object.keys(stats.porDominio).map((dom) => {
          const s = stats.porDominio[dom];
          return {
            Dominio: DOMINIO_MANTENIMIENTO_LABELS[dom] || dom,
            Total: s.total,
            'Al dia': s.al_dia,
            'Con retraso': s.con_retraso,
            Critico: s.critico,
            'Sin historial': s.sin_historial,
            'Sin configuracion': s.sin_configuracion,
            'Dado de baja': s.dado_de_baja,
          };
        });
        const wsRes = XLSX.utils.json_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen por Dominio');
      }

      // Fecha local (Chile) para el nombre de archivo, no UTC
      const d = new Date();
      const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(wb, `cumplimiento_mantenimiento_${stamp}.xlsx`);
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'Error al exportar', 'error');
    }
  };

  // Etapa 7.5 — Exportacion dedicada de regularizaciones pendientes
  const handleExportarRegularizaciones = async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const data = regularizaciones.map((r) => ({
        Dominio: DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio,
        Activo: r.nombre,
        Identificador: r.identificador,
        'Pauta asignada': r.pautaAsignada || '',
        'Periodos faltantes': r.periodosFaltantes,
        'Periodos esperados': r.periodosEsperados,
        'Periodos cumplidos': r.periodosCumplidos,
        'Cumplimiento (%)': r.cumplimientoPorcentaje,
        'Fechas periodos faltantes': (r.fechasFaltantes || [])
          .map((f) => formatFechaCumplimiento(f))
          .join('; '),
        'Ultimo mantenimiento': r.ultimaFechaMantenimiento ? formatFechaCumplimiento(r.ultimaFechaMantenimiento) : '',
        'Ultimo estado': ULTIMO_ESTADO_MTTO_LABELS[r.ultimoEstadoMantenimiento] || '',
        'Estado cumplimiento': ESTADO_CUMPLIMIENTO_LABELS[r.estadoCumplimientoMantenimiento] || '',
        'Servicio / Ubicacion': r.ubicacion || r.servicio || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Regularizaciones');
      const d2 = new Date();
      const stamp2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`;
      XLSX.writeFile(wb, `regularizaciones_pendientes_${stamp2}.xlsx`);
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'Error al exportar regularizaciones', 'error');
    }
  };

  // Construir URL al wizard con retroactivo + periodoIndice + fechaSugerida del primer faltante
  const irRetroactivo = (r: RegularizacionRow) => {
    const params = new URLSearchParams({
      dominio: r.dominio,
      activoId: r.id,
      activoClase: r.clase,
      retroactivo: '1',
    });
    if (typeof r.primerPeriodoFaltanteIndice === 'number' && r.primerPeriodoFaltanteIndice >= 0) {
      params.set('periodoIndice', String(r.primerPeriodoFaltanteIndice));
    }
    if (r.fechasFaltantes && r.fechasFaltantes.length > 0) {
      params.set('fechaSugerida', r.fechasFaltantes[0]);
    }
    router.push(`/admin/mantenimiento/nuevo?${params.toString()}`);
  };

  if (authLoading || !authorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // Calcular totales agregados desde stats
  let totalAlDia = 0, totalConRetraso = 0, totalCriticos = 0, totalSinHistorial = 0;
  if (stats) {
    Object.values(stats.porDominio).forEach((s) => {
      totalAlDia += s.al_dia || 0;
      totalConRetraso += s.con_retraso || 0;
      totalCriticos += s.critico || 0;
      totalSinHistorial += s.sin_historial || 0;
    });
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            Cumplimiento de Mantenimientos
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Vista global del cumplimiento de mantenimientos en los 4 inventarios
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={cargar}
            disabled={loadingStats}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            <MdRefresh className={`h-4 w-4 ${loadingStats ? 'animate-spin' : ''}`} />
            Recargar
          </button>
          <button
            onClick={handleExportarExcel}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            <MdDownload className="h-4 w-4" />
            Descargar Reporte
          </button>
          {userAccessLevel >= 4 && (
            <button
              onClick={handleSincronizarMasivo}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300"
            >
              <MdSync className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar todos'}
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card extra="p-4">
        <div className="mb-3 flex items-center gap-2">
          <MdFilterList className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Filtros</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            value={dominioFilter}
            onChange={(e) => setDominioFilter(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los dominios</option>
            {DOMINIO_MANTENIMIENTO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={diasProximos}
            onChange={(e) => setDiasProximos(parseInt(e.target.value, 10))}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            title="Ventana de proximos vencimientos"
          >
            <option value={7}>Proximos 7 dias</option>
            <option value={15}>Proximos 15 dias</option>
            <option value={30}>Proximos 30 dias</option>
            <option value={60}>Proximos 60 dias</option>
            <option value={90}>Proximos 90 dias</option>
          </select>

          <select
            value={mesesMinRetraso}
            onChange={(e) => setMesesMinRetraso(parseInt(e.target.value, 10))}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            title="Filtro de regularizaciones por meses minimos de retraso"
          >
            <option value={0}>Regularizaciones: Todas</option>
            <option value={3}>Retraso &gt;= 3 meses</option>
            <option value={6}>Retraso &gt;= 6 meses</option>
            <option value={12}>Retraso &gt;= 12 meses</option>
            <option value={24}>Retraso &gt;= 24 meses</option>
          </select>
        </div>
      </Card>

      {/* KPIs */}
      {stats && (
        <CumplimientoKPICards
          porcentajePromedio={stats.porcentajePromedio}
          totalActivos={stats.totalActivos}
          totalAlDia={totalAlDia}
          totalConRetraso={totalConRetraso}
          totalCriticos={totalCriticos}
          totalSinHistorial={totalSinHistorial}
        />
      )}

      {/* Grafico por dominio */}
      {stats && <CumplimientoPorDominioChart porDominio={stats.porDominio} />}

      {/* Top Criticos */}
      <CumplimientoTopCriticos
        rows={topCriticos}
        loading={loadingCriticos}
        userAccessLevel={userAccessLevel}
      />

      {/* Proximos vencimientos */}
      <Card extra="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h4 className="text-base font-bold text-navy-700 dark:text-white">
              <MdSchedule className="mr-1.5 inline h-5 w-5" />
              Proximos Vencimientos ({diasProximos} dias)
            </h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Activos cuyo proximo mantenimiento esperado vence en la ventana seleccionada
            </p>
          </div>
          <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
            {proximos.length} activo{proximos.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loadingProximos ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : proximos.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-400">
            No hay vencimientos programados en esta ventana.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-navy-700">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Activo</th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">Dominio</th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">Servicio/Ubicacion</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Proximo</th>
                  <th className="hidden px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 sm:table-cell">Ultimo</th>
                </tr>
              </thead>
              <tbody>
                {proximos.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-navy-700">
                    <td className="px-3 py-2">
                      <p className="text-sm font-semibold text-navy-700 dark:text-white line-clamp-1">{r.nombre}</p>
                      {r.identificador && <span className="text-[10px] text-gray-400">{r.identificador}</span>}
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-gray-600 dark:text-gray-300 md:table-cell">
                      {DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio}
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-gray-600 dark:text-gray-300 lg:table-cell">
                      {r.ubicacion || r.servicio || '—'}
                    </td>
                    <td className="px-3 py-2 text-center text-sm font-semibold text-yellow-700">
                      {formatFechaCumplimiento(r.proximaFechaMantenimientoEsperada)}
                    </td>
                    <td className="hidden px-3 py-2 text-center text-xs text-gray-500 dark:text-gray-400 sm:table-cell">
                      {r.ultimaFechaMantenimiento ? formatFechaCumplimiento(r.ultimaFechaMantenimiento) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Etapa 7.4 — Regularizaciones pendientes */}
      <Card extra="p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-bold text-navy-700 dark:text-white">
              <MdHistory className="mr-1.5 inline h-5 w-5" />
              Regularizaciones Pendientes
              {mesesMinRetraso > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (retraso ≥ {mesesMinRetraso} meses)
                </span>
              )}
            </h4>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Activos con periodos faltantes — registrar mantenimientos retroactivos para regularizar
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
              {regularizaciones.length} activo{regularizaciones.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleExportarRegularizaciones}
              disabled={regularizaciones.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
            >
              <MdDownload className="h-3.5 w-3.5" />
              Exportar regularizaciones
            </button>
          </div>
        </div>

        {loadingRegular ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : regularizaciones.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-400">
            No hay regularizaciones pendientes con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-navy-700">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Activo</th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">Pauta</th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">Servicio/Ubicacion</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Faltantes</th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 xl:table-cell">Fechas faltantes</th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {regularizaciones.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50">
                    <td className="px-3 py-2">
                      <p className="text-sm font-semibold text-navy-700 dark:text-white line-clamp-1">{r.nombre}</p>
                      {r.identificador && <span className="text-[10px] text-gray-400">{r.identificador}</span>}
                      <span className="ml-2 inline-block rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio}
                      </span>
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-gray-600 dark:text-gray-300 md:table-cell">
                      {r.pautaAsignada || '—'}
                    </td>
                    <td className="hidden px-3 py-2 text-xs text-gray-600 dark:text-gray-300 lg:table-cell">
                      {r.ubicacion || r.servicio || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="font-bold text-orange-600">{r.periodosFaltantes}</span>
                      <span className="text-[10px] text-gray-400">/{r.periodosEsperados}</span>
                    </td>
                    <td className="hidden px-3 py-2 text-[11px] text-gray-600 dark:text-gray-300 xl:table-cell">
                      {(r.fechasFaltantes || []).slice(0, 3).map((f) => formatFechaCumplimiento(f)).join('; ')}
                      {(r.fechasFaltantes || []).length > 3 && <span className="text-gray-400"> +{r.fechasFaltantes.length - 3} mas</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {userAccessLevel >= 2 ? (
                        <button
                          onClick={() => irRetroactivo(r)}
                          className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-orange-600"
                          title="Registrar mantenimiento retroactivo del primer periodo faltante"
                        >
                          <MdAdd className="h-3 w-3" />
                          Registrar atrasado
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CumplimientoPage;
