'use client';
import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import Swal from 'sweetalert2';
import { MdHealthAndSafety, MdRefresh, MdCheckCircle, MdWarning, MdError, MdMemory } from 'react-icons/md';

interface Check {
  id: string;
  nombre: string;
  estado: 'ok' | 'advertencia' | 'fallo';
  detalle: string;
  datos: Record<string, unknown> | null;
}

interface EstadoPlataforma {
  version: string;
  generadoEl: string;
  resumen: { ok: number; advertencias: number; fallos: number };
  checks: Check[];
  info: { node: string; uptimeSegundos: number; memoriaMB: number; entorno: string };
}

const ESTILO_ESTADO: Record<string, { borde: string; texto: string; icono: ReactNode; etiqueta: string }> = {
  ok: { borde: 'border-green-300 dark:border-green-700', texto: 'text-green-600 dark:text-green-400', icono: <MdCheckCircle />, etiqueta: 'OK' },
  advertencia: { borde: 'border-yellow-300 dark:border-yellow-700', texto: 'text-yellow-600 dark:text-yellow-400', icono: <MdWarning />, etiqueta: 'ATENCIÓN' },
  fallo: { borde: 'border-red-300 dark:border-red-700', texto: 'text-red-600 dark:text-red-400', icono: <MdError />, etiqueta: 'CAÍDO' },
};

const SaludPage = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    const level = user.get('accessLevel') || 1;
    if (level >= 4) {
      setAuthorized(true);
    } else {
      router.push('/admin/default');
    }
    setAuthLoading(false);
  }, [router]);

  const [estado, setEstado] = useState<EstadoPlataforma | null>(null);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const r: any = await Parse.Cloud.run('getEstadoPlataforma', {});
      setEstado(r as EstadoPlataforma);
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'Error al verificar el estado de la plataforma', 'error');
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const hora = estado ? new Date(estado.generadoEl).toLocaleTimeString('es-CL') : '';

  if (authLoading || !authorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const resumenTarjeta = (valor: number | undefined, etiqueta: string, color: string) => (
    <Card extra="p-4">
      <p className="text-xs text-gray-500 dark:text-gray-400">{etiqueta}</p>
      <p className={`mt-2 text-3xl font-bold ${color}`}>{valor ?? '—'}</p>
    </Card>
  );

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
            <MdHealthAndSafety className="h-6 w-6 text-green-500" />
            Estado del Sistema
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Chequeo completo de la plataforma{estado ? ` · v${estado.version} · verificado ${hora}` : ''}
          </p>
        </div>
        <button
          onClick={cargar}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
        >
          <MdRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Re-verificar
        </button>
      </div>

      {/* Resumen */}
      {estado && (
        <div className="grid grid-cols-3 gap-3">
          {resumenTarjeta(estado.resumen.ok, 'Correctos', 'text-green-500')}
          {resumenTarjeta(estado.resumen.advertencias, 'Con atención', 'text-yellow-500')}
          {resumenTarjeta(estado.resumen.fallos, 'Caídos', 'text-red-500')}
        </div>
      )}

      {/* Info del proceso */}
      {estado && (
        <Card extra="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <MdMemory className="h-4 w-4" />
            Node {estado.info.node}
          </span>
          <span>Uptime: {Math.floor(estado.info.uptimeSegundos / 3600)}h {Math.floor((estado.info.uptimeSegundos % 3600) / 60)}m</span>
          <span>Memoria: {estado.info.memoriaMB} MB</span>
          <span>Entorno: {estado.info.entorno}</span>
        </Card>
      )}

      {/* Registro de veredictos */}
      <Card extra="p-5">
        <h4 className="mb-3 text-base font-bold text-navy-700 dark:text-white">Componentes verificados</h4>
        {loading && !estado ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : !estado ? (
          <p className="py-6 text-center text-sm text-gray-400">Sin datos aún — pulsa Re-verificar.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {estado.checks.map((c) => {
              const e = ESTILO_ESTADO[c.estado] || ESTILO_ESTADO.advertencia;
              return (
                <div
                  key={c.id}
                  className={`flex items-start gap-3 rounded-xl border-2 bg-white p-3 dark:bg-navy-800 ${e.borde}`}
                >
                  <span className={`mt-0.5 text-xl ${e.texto}`}>{e.icono}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-navy-700 dark:text-white">{c.nombre}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.texto}`}>{e.etiqueta}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{c.detalle}</p>
                    {c.datos && (
                      <p className="mt-1 font-mono text-[11px] text-gray-400">
                        {Object.entries(c.datos)
                          .map(([k, v]) => `${k}: ${typeof v === 'boolean' ? (v ? 'sí' : 'no') : String(v)}`)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default SaludPage;
