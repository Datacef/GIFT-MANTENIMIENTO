'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import Swal from 'sweetalert2';
import {
  MdFilterList,
  MdRefresh,
  MdCalendarMonth,
  MdViewModule,
  MdAssessment,
  MdCheckCircle,
  MdSchedule,
  MdCancel,
  MdHourglassEmpty,
} from 'react-icons/md';
import {
  GanttMantenimientoService,
  GanttResponse,
  CargaMensualResponse,
  PeriodoGantt,
  EstadoPeriodoGantt,
} from 'services/gantt-mantenimiento.service';

type Tab = 'gantt' | 'heatmap' | 'resumen';

const DOMINIOS = [
  { value: '', label: 'Todos los dominios' },
  { value: 'equipoMedico', label: 'Equipos Medicos' },
  { value: 'equipoIndustrial', label: 'Equipos Industriales' },
  { value: 'flotaVehicular', label: 'Flota Vehicular' },
  { value: 'infraestructura', label: 'Infraestructura' },
];

const DOMINIO_LABEL: Record<string, string> = {
  equipoMedico: 'Eq. Médicos',
  equipoIndustrial: 'Eq. Industriales',
  flotaVehicular: 'Flota',
  infraestructura: 'Infraestructura',
};

const ESTADO_COLOR: Record<EstadoPeriodoGantt, string> = {
  cumplido: 'bg-green-500',
  cumplido_pendiente: 'bg-yellow-500',
  en_curso: 'bg-blue-500',
  faltante: 'bg-red-500',
  futuro: 'bg-gray-300 dark:bg-gray-600',
  pendiente: 'bg-gray-200 dark:bg-gray-700',
};

const ESTADO_LABEL: Record<EstadoPeriodoGantt, string> = {
  cumplido: 'Cumplido',
  cumplido_pendiente: 'Cumplido (validacion pendiente)',
  en_curso: 'En curso',
  faltante: 'Vencido / Faltante',
  futuro: 'Futuro',
  pendiente: 'Pendiente',
};

function formatMesCorto(yyyymm: string): string {
  if (!yyyymm) return '';
  const [y, m] = yyyymm.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${meses[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function calcularRangoDefault() {
  const ahora = new Date();
  const desde = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - 6, 1));
  const hasta = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 12, 1));
  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
  return { desde: fmt(desde), hasta: fmt(hasta) };
}

const GanttPage = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    const lvl = user.get('accessLevel') || 1;
    if (lvl < 2) {
      router.push('/admin/default');
    } else {
      setAuthorized(true);
    }
    setAuthLoading(false);
  }, [router]);

  if (authLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }
  if (!authorized) return null;
  return <GanttContent />;
};

const GanttContent = () => {
  const rango = useMemo(() => calcularRangoDefault(), []);
  const [desde, setDesde] = useState(rango.desde);
  const [hasta, setHasta] = useState(rango.hasta);
  const [dominio, setDominio] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [estadoCumplimientoFilter, setEstadoCumplimientoFilter] = useState('');
  const [convenioFilter, setConvenioFilter] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('heatmap');

  const [gantt, setGantt] = useState<GanttResponse>({ total: 0, rangoDesde: '', rangoHasta: '', meses: [], filas: [] });
  const [carga, setCarga] = useState<CargaMensualResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filtros: Record<string, any> = {};
      if (busqueda.trim()) filtros.busqueda = busqueda.trim();
      if (estadoCumplimientoFilter) filtros.estadoCumplimiento = estadoCumplimientoFilter;
      if (convenioFilter) filtros.convenio = convenioFilter;
      const [g, c] = await Promise.all([
        GanttMantenimientoService.getGantt({ desde, hasta, dominio: dominio || undefined, filtrosInventario: filtros, limit: 200 }),
        GanttMantenimientoService.getCargaMensual({ desde, hasta, filtrosInventario: filtros }),
      ]);
      setGantt(g);
      setCarga(c);
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'No se pudo cargar la carta Gantt', 'error');
    } finally {
      setLoading(false);
    }
  }, [desde, hasta, dominio, busqueda, estadoCumplimientoFilter, convenioFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Resumen ejecutivo
  const resumen = useMemo(() => {
    if (!carga) return { totalRango: 0, picoMes: '', picoCantidad: 0, mesActualCarga: 0, proximoMesCarga: 0 };
    const ahora = new Date();
    const mesActualKey = `${ahora.getUTCFullYear()}-${String(ahora.getUTCMonth() + 1).padStart(2, '0')}`;
    const proximoMesDate = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() + 1, 1));
    const proximoMesKey = `${proximoMesDate.getUTCFullYear()}-${String(proximoMesDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const idxActual = carga.meses.indexOf(mesActualKey);
    const idxProximo = carga.meses.indexOf(proximoMesKey);
    const picoIdx = carga.totales.reduce((bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx), 0);
    return {
      totalRango: carga.totales.reduce((a, b) => a + b, 0),
      picoMes: carga.meses[picoIdx] || '',
      picoCantidad: carga.totales[picoIdx] || 0,
      mesActualCarga: idxActual >= 0 ? carga.totales[idxActual] : 0,
      proximoMesCarga: idxProximo >= 0 ? carga.totales[idxProximo] : 0,
    };
  }, [carga]);

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white flex items-center gap-2">
            <MdCalendarMonth className="h-6 w-6 text-brand-500" />
            Carta Gantt de Mantenimiento
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Visualiza la carga futura de mantenimientos y los periodos cumplidos / faltantes de cada activo.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
        >
          <MdRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Cargando...' : 'Refrescar'}
        </button>
      </div>

      {/* Filtros */}
      <Card extra="p-4">
        <div className="mb-3 flex items-center gap-2">
          <MdFilterList className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Filtros</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Dominio</label>
            <select
              value={dominio}
              onChange={(e) => setDominio(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            >
              {DOMINIOS.map((d) => (<option key={d.value} value={d.value}>{d.label}</option>))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Cumplimiento</label>
            <select
              value={estadoCumplimientoFilter}
              onChange={(e) => setEstadoCumplimientoFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="al_dia">Al dia</option>
              <option value="con_retraso">Con retraso</option>
              <option value="critico">Critico</option>
              <option value="sin_historial">Sin historial</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-500">Convenio</label>
            <select
              value={convenioFilter}
              onChange={(e) => setConvenioFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="con_convenio">Con convenio</option>
              <option value="sin_convenio">Sin convenio</option>
            </select>
          </div>
          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs text-gray-500">Buscar (nombre / serie / inventario)</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej: ECOGRAFO, SN-12345..."
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>
        </div>
      </Card>

      {/* Resumen ejecutivo siempre visible */}
      {carga && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card extra="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/40"><MdAssessment className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
              <div>
                <p className="text-xs text-gray-500">Total en el rango</p>
                <p className="text-2xl font-bold text-navy-700 dark:text-white">{resumen.totalRango}</p>
              </div>
            </div>
          </Card>
          <Card extra="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/40"><MdSchedule className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
              <div>
                <p className="text-xs text-gray-500">Mes actual</p>
                <p className="text-2xl font-bold text-navy-700 dark:text-white">{resumen.mesActualCarga}</p>
              </div>
            </div>
          </Card>
          <Card extra="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/40"><MdHourglassEmpty className="h-5 w-5 text-yellow-600 dark:text-yellow-400" /></div>
              <div>
                <p className="text-xs text-gray-500">Próximo mes</p>
                <p className="text-2xl font-bold text-navy-700 dark:text-white">{resumen.proximoMesCarga}</p>
              </div>
            </div>
          </Card>
          <Card extra="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/40"><MdCancel className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
              <div>
                <p className="text-xs text-gray-500">Pico ({formatMesCorto(resumen.picoMes)})</p>
                <p className="text-2xl font-bold text-navy-700 dark:text-white">{resumen.picoCantidad}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-navy-900">
        {(['heatmap', 'gantt', 'resumen'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === t
                ? 'bg-white text-navy-700 shadow dark:bg-navy-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {t === 'heatmap' && <><MdViewModule className="h-4 w-4" />Heatmap</>}
            {t === 'gantt' && <><MdCalendarMonth className="h-4 w-4" />Gantt</>}
            {t === 'resumen' && <><MdAssessment className="h-4 w-4" />Resumen</>}
          </button>
        ))}
      </div>

      {/* HEATMAP */}
      {activeTab === 'heatmap' && carga && (
        <Card extra="p-4 overflow-x-auto">
          <h5 className="mb-3 text-base font-bold text-navy-700 dark:text-white">Carga mensual por dominio</h5>
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white dark:bg-navy-800 px-2 py-2 text-left font-bold text-gray-500">Dominio</th>
                {carga.meses.map((m) => (
                  <th key={m} className="px-2 py-2 text-center font-bold text-gray-500">{formatMesCorto(m)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(['equipoMedico', 'equipoIndustrial', 'flotaVehicular', 'infraestructura'] as const).map((dom) => (
                <tr key={dom}>
                  <td className="sticky left-0 bg-white dark:bg-navy-800 px-2 py-2 font-semibold text-navy-700 dark:text-white">
                    {DOMINIO_LABEL[dom]}
                  </td>
                  {carga.porDominio[dom].map((v, i) => {
                    let bg = 'bg-green-50 dark:bg-green-900/20';
                    if (v > carga.cuartiles.p90) bg = 'bg-red-200 dark:bg-red-900/60';
                    else if (v > carga.cuartiles.p75) bg = 'bg-orange-200 dark:bg-orange-900/50';
                    else if (v > carga.cuartiles.p25) bg = 'bg-yellow-100 dark:bg-yellow-900/30';
                    if (v === 0) bg = 'bg-gray-50 dark:bg-navy-700/40 text-gray-400';
                    return (
                      <td key={i} className={`px-2 py-2 text-center font-bold ${bg}`}>{v || '·'}</td>
                    );
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 dark:border-navy-600">
                <td className="sticky left-0 bg-white dark:bg-navy-800 px-2 py-2 font-bold text-navy-700 dark:text-white">TOTAL</td>
                {carga.totales.map((v, i) => {
                  let bg = 'bg-green-100 dark:bg-green-900/30';
                  if (v > carga.cuartiles.p90) bg = 'bg-red-300 dark:bg-red-900/70';
                  else if (v > carga.cuartiles.p75) bg = 'bg-orange-300 dark:bg-orange-900/60';
                  else if (v > carga.cuartiles.p25) bg = 'bg-yellow-200 dark:bg-yellow-900/40';
                  if (v === 0) bg = 'bg-gray-100 dark:bg-navy-700/60 text-gray-400';
                  return (
                    <td key={i} className={`px-2 py-2 text-center font-bold ${bg}`}>{v || '·'}</td>
                  );
                })}
              </tr>
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span>Cuartiles:</span>
            <span className="rounded bg-green-50 dark:bg-green-900/20 px-2 py-0.5">≤ p25 ({carga.cuartiles.p25})</span>
            <span className="rounded bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5">p25–p75</span>
            <span className="rounded bg-orange-200 dark:bg-orange-900/50 px-2 py-0.5">p75–p90 ({carga.cuartiles.p75})</span>
            <span className="rounded bg-red-200 dark:bg-red-900/60 px-2 py-0.5">≥ p90 ({carga.cuartiles.p90})</span>
            <span>· Pico: {carga.cuartiles.max}</span>
          </div>
        </Card>
      )}

      {/* GANTT */}
      {activeTab === 'gantt' && (
        <Card extra="p-4 overflow-x-auto">
          <h5 className="mb-3 text-base font-bold text-navy-700 dark:text-white">
            Gantt de activos ({gantt.filas.length})
          </h5>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            {(['cumplido', 'cumplido_pendiente', 'en_curso', 'faltante', 'futuro'] as EstadoPeriodoGantt[]).map((e) => (
              <span key={e} className="flex items-center gap-1">
                <span className={`inline-block h-3 w-3 rounded ${ESTADO_COLOR[e]}`} />
                <span className="text-gray-600 dark:text-gray-400">{ESTADO_LABEL[e]}</span>
              </span>
            ))}
          </div>
          {gantt.filas.length === 0 ? (
            <p className="py-10 text-center text-gray-500">Sin activos en el rango filtrado.</p>
          ) : (
            <div className="min-w-full">
              <div
                className="grid border-b border-gray-200 dark:border-navy-600"
                style={{ gridTemplateColumns: `300px repeat(${gantt.meses.length}, minmax(40px, 1fr))` }}
              >
                <div className="sticky left-0 z-10 bg-white dark:bg-navy-800 px-2 py-2 text-xs font-bold uppercase text-gray-500">Activo</div>
                {gantt.meses.map((m) => (
                  <div key={m} className="px-1 py-2 text-center text-[10px] font-bold uppercase text-gray-500">
                    {formatMesCorto(m)}
                  </div>
                ))}
              </div>
              {gantt.filas.map((fila) => (
                <FilaGanttRow key={fila.activoId} fila={fila} meses={gantt.meses} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* RESUMEN */}
      {activeTab === 'resumen' && (
        <Card extra="p-4">
          <h5 className="mb-3 text-base font-bold text-navy-700 dark:text-white">Top 10 activos con más periodos faltantes</h5>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-600">
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">Activo</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">Identificador</th>
                <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">Servicio / Ubicación</th>
                <th className="px-3 py-2 text-center text-xs font-bold uppercase text-red-600">Faltantes</th>
                <th className="px-3 py-2 text-center text-xs font-bold uppercase text-green-600">Cumplidos</th>
                <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500">% Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {gantt.filas.slice(0, 10).map((f) => (
                <tr key={f.activoId} className="border-b border-gray-100 dark:border-navy-700">
                  <td className="px-3 py-2 font-semibold text-navy-700 dark:text-white">{f.nombre}</td>
                  <td className="px-3 py-2 text-gray-500">{f.identificador}</td>
                  <td className="px-3 py-2 text-gray-500">{f.grupo}</td>
                  <td className="px-3 py-2 text-center font-bold text-red-600">{f.periodosFaltantes}</td>
                  <td className="px-3 py-2 text-center font-bold text-green-600">{f.periodosCumplidos}</td>
                  <td className="px-3 py-2 text-center">{f.cumplimientoPorcentaje}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

const FilaGanttRow = ({ fila, meses }: { fila: any; meses: string[] }) => {
  const periodosPorMes = useMemo(() => {
    const m: Record<string, PeriodoGantt[]> = {};
    for (const p of fila.periodos as PeriodoGantt[]) {
      const key = (p.hasta || '').slice(0, 7);
      if (!key) continue;
      if (!m[key]) m[key] = [];
      m[key].push(p);
    }
    return m;
  }, [fila]);

  return (
    <div
      className="grid border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/40"
      style={{ gridTemplateColumns: `300px repeat(${meses.length}, minmax(40px, 1fr))` }}
    >
      <div className="sticky left-0 z-10 bg-white px-2 py-2 dark:bg-navy-800">
        <p className="line-clamp-1 text-sm font-semibold text-navy-700 dark:text-white">{fila.nombre}</p>
        <p className="line-clamp-1 text-[10px] text-gray-500">{fila.identificador} · {fila.grupo}</p>
        <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {fila.frecuencia}m
          </span>
          {fila.periodosFaltantes > 0 && (
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-800 dark:bg-red-900 dark:text-red-200">
              {fila.periodosFaltantes} faltantes
            </span>
          )}
          {fila.convenioActivo && (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-800 dark:bg-green-900 dark:text-green-200">
              Convenio
            </span>
          )}
        </div>
      </div>
      {meses.map((m) => {
        const ps = periodosPorMes[m] || [];
        if (ps.length === 0) {
          return <div key={m} className="border-l border-gray-100 dark:border-navy-700" />;
        }
        return (
          <div key={m} className="flex items-center justify-center gap-0.5 border-l border-gray-100 px-1 dark:border-navy-700">
            {ps.map((p) => (
              <div
                key={p.indice}
                className={`h-5 w-5 rounded ${ESTADO_COLOR[p.estado]} cursor-pointer`}
                title={`${ESTADO_LABEL[p.estado]} · ${p.desde} → ${p.hasta}${p.fechaRealizado ? ` · realizado ${p.fechaRealizado}` : ''}`}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default GanttPage;
