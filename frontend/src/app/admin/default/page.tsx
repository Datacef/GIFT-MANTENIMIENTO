'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MdBuild,
  MdCheckCircle,
  MdWarning,
  MdRemoveCircle,
  MdPrecisionManufacturing,
  MdApartment,
  MdLocalShipping,
  MdSync,
} from 'react-icons/md';
import Parse from 'utils/parseClient';
import Widget from 'components/widget/Widget';
import Card from 'components/card';
import Swal from 'sweetalert2';
import {
  ESTADO_CUMPLIMIENTO_LABELS,
  ESTADO_CUMPLIMIENTO_COLORS,
} from 'types/cumplimiento-mantenimiento.types';

interface DominioStats {
  total: number;
  activos: number;
  enMantencion: number;
  dadosBaja: number;
}

interface CumplimientoDominio {
  total: number;
  sin_configuracion: number;
  sin_historial: number;
  al_dia: number;
  con_retraso: number;
  critico: number;
  dado_de_baja: number;
}

interface DashboardData {
  porDominio: {
    equipoMedico: DominioStats;
    equipoIndustrial: DominioStats;
    infraestructura: DominioStats;
    flotaVehicular: DominioStats;
  };
  totales: DominioStats;
  cumplimiento: {
    porDominio: Record<string, CumplimientoDominio>;
    totalActivos: number;
    porcentajePromedio: number;
  };
}

const DOMINIO_LABELS: Record<string, string> = {
  equipoMedico: 'Dispositivos Medicos',
  equipoIndustrial: 'Equipos Industriales',
  infraestructura: 'Infraestructura',
  flotaVehicular: 'Flota Vehicular',
};

const DOMINIO_HREF: Record<string, string> = {
  equipoMedico: '/admin/inventario',
  equipoIndustrial: '/admin/inventario-industrial',
  infraestructura: '/admin/infraestructura',
  flotaVehicular: '/admin/flota-vehicular',
};

const DOMINIO_ICON: Record<string, JSX.Element> = {
  equipoMedico: <MdPrecisionManufacturing className="h-7 w-7" />,
  equipoIndustrial: <MdBuild className="h-6 w-6" />,
  infraestructura: <MdApartment className="h-7 w-7" />,
  flotaVehicular: <MdLocalShipping className="h-6 w-6" />,
};

const Dashboard = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    setAuthorized(true);
    setLoadingAuth(false);
  }, [router]);

  if (loadingAuth) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!authorized) return null;

  return <DashboardContent />;
};

const DashboardContent = () => {
  const userAccessLevel = Parse.User.current()?.get('accessLevel') || 1;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const result = await Parse.Cloud.run('getDashboardInventarios');
      setData(result as DashboardData);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleSyncAll = async () => {
    const confirm = await Swal.fire({
      title: 'Sincronizar todos los inventarios',
      text: 'Recalcula el cumplimiento de mantenimiento de los 4 dominios. Puede tardar varios segundos.',
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
      await Swal.fire(
        'Sincronizacion completada',
        `Procesados: ${r?.procesados ?? 0} / OK: ${r?.ok ?? 0} / Errores: ${r?.errores ?? 0}`,
        r?.errores > 0 ? 'warning' : 'success'
      );
      fetchDashboard();
    } catch (error: any) {
      Swal.fire('Error', error?.message || 'No se pudo sincronizar', 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const dominios = ['equipoMedico', 'equipoIndustrial', 'infraestructura', 'flotaVehicular'] as const;

  return (
    <div>
      {/* Bienvenida */}
      <div className="mb-5">
        <Card extra="w-full p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-navy-700 dark:text-white mb-2">
                Sistema de Gestion de Mantenimiento
              </h2>
              <p className="text-base text-gray-600 dark:text-gray-400">
                Resumen consolidado de los 4 inventarios y su cumplimiento de mantenimiento.
              </p>
            </div>
            {userAccessLevel >= 4 && (
              <button
                onClick={handleSyncAll}
                disabled={syncing}
                className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
              >
                <MdSync className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Sincronizando...' : 'Sincronizar todo'}
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Fila 1: total por dominio (4 cards clicables) */}
      <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {dominios.map((dom) => {
          const s = data.porDominio[dom];
          return (
            <Link key={dom} href={DOMINIO_HREF[dom]} className="block transition-transform hover:scale-[1.02]">
              <Widget
                icon={DOMINIO_ICON[dom]}
                title={DOMINIO_LABELS[dom]}
                subtitle={String(s?.total ?? 0)}
              />
            </Link>
          );
        })}
      </div>

      {/* Fila 2: totales globales (3 cards) */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Card extra="w-full p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/40">
              <MdCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Operativos (Bueno)</p>
              <p className="text-2xl font-bold text-navy-700 dark:text-white">
                {data.totales.activos}
              </p>
            </div>
          </div>
        </Card>
        <Card extra="w-full p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-3 dark:bg-yellow-900/40">
              <MdWarning className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">En Mantencion (M / R)</p>
              <p className="text-2xl font-bold text-navy-700 dark:text-white">
                {data.totales.enMantencion}
              </p>
            </div>
          </div>
        </Card>
        <Card extra="w-full p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-gray-100 p-3 dark:bg-gray-700">
              <MdRemoveCircle className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Dados de Baja</p>
              <p className="text-2xl font-bold text-navy-700 dark:text-white">
                {data.totales.dadosBaja}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Estado de cumplimiento por dominio */}
      <div className="mt-5">
        <Card extra="w-full p-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-lg font-bold text-navy-700 dark:text-white">
              Estado de cumplimiento de mantenimiento
            </h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Cumplimiento promedio: <strong>{data.cumplimiento.porcentajePromedio}%</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-navy-600">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                    Dominio
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500">
                    Total
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-green-600">
                    Al dia
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-yellow-600">
                    Con retraso
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-red-600">
                    Critico
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-red-700">
                    Sin historial
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500">
                    Sin config.
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500">
                    De baja
                  </th>
                </tr>
              </thead>
              <tbody>
                {dominios.map((dom) => {
                  const c = data.cumplimiento.porDominio[dom] || {
                    total: 0, sin_configuracion: 0, sin_historial: 0, al_dia: 0,
                    con_retraso: 0, critico: 0, dado_de_baja: 0,
                  };
                  return (
                    <tr key={dom} className="border-b border-gray-100 dark:border-navy-700">
                      <td className="px-3 py-3">
                        <Link href={DOMINIO_HREF[dom]} className="font-semibold text-brand-500 hover:underline">
                          {DOMINIO_LABELS[dom]}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-navy-700 dark:text-white">
                        {c.total}
                      </td>
                      <td className="px-3 py-3 text-center">{c.al_dia}</td>
                      <td className="px-3 py-3 text-center">{c.con_retraso}</td>
                      <td className="px-3 py-3 text-center">{c.critico}</td>
                      <td className="px-3 py-3 text-center">{c.sin_historial}</td>
                      <td className="px-3 py-3 text-center">{c.sin_configuracion}</td>
                      <td className="px-3 py-3 text-center">{c.dado_de_baja}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Leyenda con badges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(['al_dia', 'con_retraso', 'critico', 'sin_historial', 'sin_configuracion', 'dado_de_baja'] as const).map((est) => (
              <span
                key={est}
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_CUMPLIMIENTO_COLORS[est]}`}
              >
                {ESTADO_CUMPLIMIENTO_LABELS[est]}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Detalle por dominio: estado fisico */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {dominios.map((dom) => {
          const s = data.porDominio[dom];
          return (
            <Card key={dom} extra="w-full p-5">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-full bg-lightPrimary p-2 dark:bg-navy-700">
                  <span className="text-brand-500 dark:text-white">{DOMINIO_ICON[dom]}</span>
                </div>
                <h5 className="text-sm font-bold text-navy-700 dark:text-white">
                  {DOMINIO_LABELS[dom]}
                </h5>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Total</span>
                  <span className="font-bold text-navy-700 dark:text-white">{s.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-600">Operativos</span>
                  <span className="font-semibold text-green-600">{s.activos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-600">En mantencion</span>
                  <span className="font-semibold text-yellow-600">{s.enMantencion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Dados de baja</span>
                  <span className="font-semibold text-gray-500">{s.dadosBaja}</span>
                </div>
              </div>
              <Link
                href={DOMINIO_HREF[dom]}
                className="mt-3 block text-center text-xs font-semibold text-brand-500 hover:underline"
              >
                Ver inventario →
              </Link>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
