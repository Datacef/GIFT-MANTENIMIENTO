'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import Swal from 'sweetalert2';
import { MdNotificationsActive, MdRefresh, MdScience, MdSend } from 'react-icons/md';
import { DOMINIO_MANTENIMIENTO_LABELS } from 'types/mantenimiento.types';

interface AlertaActivo {
  id: string;
  clase: string;
  dominio: string;
  nombre: string;
  identificador: string;
  servicio: string;
  ubicacion: string;
  proximaFechaMantenimientoEsperada: string;
  vencido: boolean;
}

interface AlertaLicitacion {
  id: string;
  numeroLicitacion: string;
  inventarioDestino: string;
  proveedorNombre: string;
  fechaTerminoEfectiva: string;
  estado: string;
  diasRestantes: number | null;
}

interface AlertasResponse {
  generadoEl: string;
  hoy: string;
  diasMtto: number;
  diasLicit: number;
  vencidos: AlertaActivo[];
  proximos: AlertaActivo[];
  licitacionesPorVencer: AlertaLicitacion[];
  licitacionesVencidas: AlertaLicitacion[];
  totales: {
    vencidos: number;
    proximos: number;
    licitacionesPorVencer: number;
    licitacionesVencidas: number;
  };
}

const fmtFecha = (f: string) => (f ? f.split('-').reverse().join('-') : '—');

const AlertasPage = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [accessLevel, setAccessLevel] = useState(1);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    const level = user.get('accessLevel') || 1;
    setAccessLevel(level);
    if (level >= 3) {
      setAuthorized(true);
    } else {
      router.push('/admin/default');
    }
    setAuthLoading(false);
  }, [router]);

  const [data, setData] = useState<AlertasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [ejecutando, setEjecutando] = useState(false);

  const cargar = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const resp: any = await Parse.Cloud.run('getAlertasVencimientos', {});
      setData(resp as AlertasResponse);
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'Error al cargar alertas', 'error');
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const ejecutar = async (modo: 'prueba' | 'enviar') => {
    if (accessLevel < 4) return;
    if (modo === 'enviar') {
      const confirm = await Swal.fire({
        title: 'Enviar alertas ahora',
        text: 'Se enviara el digest por correo a los usuarios nivel 3+ (respetando la idempotencia diaria). Continuar?',
        icon: 'warning',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Enviar',
        confirmButtonColor: '#422AFB',
      });
      if (!confirm.isConfirmed) return;
    }
    setEjecutando(true);
    try {
      const r: any = await Parse.Cloud.run('ejecutarAlertasManualmente', { modo });
      if (modo === 'prueba') {
        await Swal.fire({
          title: 'Modo prueba',
          html: `
            <div style="text-align:left">
              <p>Asunto: <strong>${r.subject || ''}</strong></p>
              <p>Destinatarios: <strong>${(r.destinatarios || []).length}</strong></p>
              <p>Vencidos: <strong style="color:#dc2626">${r.totales?.vencidos ?? 0}</strong> ·
                 Proximos: <strong style="color:#d97706">${r.totales?.proximos ?? 0}</strong> ·
                 Lic. por vencer: <strong>${r.totales?.licitacionesPorVencer ?? 0}</strong> ·
                 Lic. vencidas: <strong>${r.totales?.licitacionesVencidas ?? 0}</strong></p>
              <p style="color:#6b7280;font-size:12px;">No se envio ningun correo (modo prueba).</p>
            </div>`,
          icon: 'info',
        });
      } else {
        await Swal.fire({
          title: 'Envio completado',
          html: `<div style="text-align:left">
            <p>Enviados: <strong>${r.enviados}</strong></p>
            <p>Omitidos (ya enviados hoy): <strong>${r.omitidos}</strong></p>
          </div>`,
          icon: r.enviados > 0 ? 'success' : 'info',
        });
      }
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'Error al ejecutar alertas', 'error');
    } finally {
      setEjecutando(false);
    }
  };

  const tablaActivos = (items: AlertaActivo[], colorTexto: string) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-navy-700">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Activo</th>
            <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">Dominio</th>
            <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">Servicio/Ubicacion</th>
            <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
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
              <td className={`px-3 py-2 text-center text-sm font-semibold ${colorTexto}`}>
                {fmtFecha(r.proximaFechaMantenimientoEsperada)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tablaLicitaciones = (items: AlertaLicitacion[], colorTexto: string) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-navy-700">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Licitacion</th>
            <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">Proveedor</th>
            <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Termino efectivo</th>
            <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Dias</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 dark:border-navy-700">
              <td className="px-3 py-2">
                <p className="text-sm font-semibold text-navy-700 dark:text-white">{r.numeroLicitacion || '—'}</p>
                <span className="text-[10px] text-gray-400">{r.inventarioDestino || ''}</span>
              </td>
              <td className="hidden px-3 py-2 text-xs text-gray-600 dark:text-gray-300 md:table-cell">{r.proveedorNombre || '—'}</td>
              <td className={`px-3 py-2 text-center text-sm font-semibold ${colorTexto}`}>{fmtFecha(r.fechaTerminoEfectiva)}</td>
              <td className="px-3 py-2 text-center text-xs text-gray-600 dark:text-gray-300">
                {r.diasRestantes !== null ? (r.diasRestantes >= 0 ? `en ${r.diasRestantes} d` : `${Math.abs(r.diasRestantes)} d atras`) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (authLoading || !authorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const vacio = (msg: string) => (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-400">
      {msg}
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
            <MdNotificationsActive className="h-6 w-6 text-orange-500" />
            Alertas de Vencimiento
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Mantenimientos vencidos/proximos (ventana {data?.diasMtto ?? 7} dias) y licitaciones (ventana {data?.diasLicit ?? 30} dias)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={cargar}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            <MdRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
          {accessLevel >= 4 && (
            <>
              <button
                onClick={() => ejecutar('prueba')}
                disabled={ejecutando}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
                title="Muestra que se enviaria, sin enviar correos"
              >
                <MdScience className="h-4 w-4" />
                Modo prueba
              </button>
              <button
                onClick={() => ejecutar('enviar')}
                disabled={ejecutando}
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
                title="Envia el digest por correo a usuarios nivel 3+"
              >
                <MdSend className="h-4 w-4" />
                Enviar ahora
              </button>
            </>
          )}
        </div>
      </div>

      {/* Resumen */}
      {data && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Card extra="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Vencidos</p>
            <p className="mt-2 text-2xl font-bold text-red-500">{data.totales.vencidos}</p>
          </Card>
          <Card extra="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Proximos</p>
            <p className="mt-2 text-2xl font-bold text-yellow-500">{data.totales.proximos}</p>
          </Card>
          <Card extra="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Lic. por vencer</p>
            <p className="mt-2 text-2xl font-bold text-blue-500">{data.totales.licitacionesPorVencer}</p>
          </Card>
          <Card extra="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Lic. vencidas</p>
            <p className="mt-2 text-2xl font-bold text-red-700">{data.totales.licitacionesVencidas}</p>
          </Card>
        </div>
      )}

      {loading || !data ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <Card extra="p-5">
            <h4 className="mb-3 text-base font-bold text-navy-700 dark:text-white">🔴 Mantenimientos vencidos ({data.totales.vencidos})</h4>
            {data.vencidos.length === 0 ? vacio('Sin mantenimientos vencidos.') : tablaActivos(data.vencidos, 'text-red-600')}
          </Card>

          <Card extra="p-5">
            <h4 className="mb-3 text-base font-bold text-navy-700 dark:text-white">🟠 Mantenimientos proximos ({data.totales.proximos})</h4>
            {data.proximos.length === 0 ? vacio('Sin mantenimientos proximos.') : tablaActivos(data.proximos, 'text-yellow-600')}
          </Card>

          <Card extra="p-5">
            <h4 className="mb-3 text-base font-bold text-navy-700 dark:text-white">🔵 Licitaciones por vencer ({data.totales.licitacionesPorVencer})</h4>
            {data.licitacionesPorVencer.length === 0 ? vacio('Sin licitaciones por vencer en la ventana.') : tablaLicitaciones(data.licitacionesPorVencer, 'text-blue-600')}
          </Card>

          <Card extra="p-5">
            <h4 className="mb-3 text-base font-bold text-navy-700 dark:text-white">🔴 Licitaciones vencidas ({data.totales.licitacionesVencidas})</h4>
            {data.licitacionesVencidas.length === 0 ? vacio('Sin licitaciones vencidas.') : tablaLicitaciones(data.licitacionesVencidas, 'text-red-600')}
          </Card>
        </>
      )}
    </div>
  );
};

export default AlertasPage;
