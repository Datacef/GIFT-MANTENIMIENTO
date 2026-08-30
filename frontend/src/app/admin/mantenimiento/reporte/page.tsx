'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import Swal from 'sweetalert2';
import { MdPrint, MdRefresh } from 'react-icons/md';
import { DOMINIO_MANTENIMIENTO_OPTIONS, DOMINIO_MANTENIMIENTO_LABELS } from 'types/mantenimiento.types';
import './reporte-print.css';

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

type Preset = 'semana' | 'mes' | 'rango';
type Agrupacion = 'servicio' | 'ubicacion' | 'dominio';

function hoyStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function lunesDeSemanaActual(): Date {
  const d = new Date();
  const dia = d.getDay(); // 0 domingo
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d;
}

function fmtLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rangoPreset(p: Preset): { desde: string; hasta: string } {
  const hoy = new Date();
  if (p === 'semana') {
    const lunes = lunesDeSemanaActual();
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return { desde: fmtLocal(lunes), hasta: fmtLocal(domingo) };
  }
  if (p === 'mes') {
    const primero = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimo = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    return { desde: fmtLocal(primero), hasta: fmtLocal(ultimo) };
  }
  return { desde: fmtLocal(hoy), hasta: fmtLocal(hoy) };
}

const ReporteMantenimientosPage = () => {
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
    if (level >= 2) {
      setAuthorized(true);
    } else {
      router.push('/admin/default');
    }
    setAuthLoading(false);
  }, [router]);

  const [preset, setPreset] = useState<Preset>('semana');
  const [dominioFilter, setDominioFilter] = useState('');
  const [agrupacion, setAgrupacion] = useState<Agrupacion>('servicio');
  const [desdeCustom, setDesdeCustom] = useState('');
  const [hastaCustom, setHastaCustom] = useState('');
  const [rows, setRows] = useState<ProximoRow[]>([]);
  const [rango, setRango] = useState<{ desde: string; hasta: string }>({ desde: '', hasta: '' });
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    if (!authorized) return;
    setLoading(true);
    try {
      const r = preset === 'rango' ? { desde: desdeCustom, hasta: hastaCustom } : rangoPreset(preset);
      const params: Record<string, unknown> = { desde: r.desde, hasta: r.hasta, limit: 500 };
      if (dominioFilter) params.dominio = dominioFilter;
      const resp: any = await Parse.Cloud.run('getProximosMantenimientos', params);
      setRows((resp?.results || []) as ProximoRow[]);
      setRango({ desde: resp?.desde || r.desde, hasta: resp?.hasta || r.hasta });
    } catch (e: any) {
      Swal.fire('Error', e?.message || 'Error al cargar el reporte', 'error');
    } finally {
      setLoading(false);
    }
  }, [authorized, preset, dominioFilter, desdeCustom, hastaCustom]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const grupos = useMemo(() => {
    const map = new Map<string, ProximoRow[]>();
    for (const r of rows) {
      const clave =
        agrupacion === 'servicio' ? r.servicio || '(sin servicio)'
        : agrupacion === 'ubicacion' ? r.ubicacion || '(sin ubicación)'
        : DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio;
      if (!map.has(clave)) map.set(clave, []);
      map.get(clave)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows, agrupacion]);

  const estadoItem = (fecha: string): { texto: string; clase: string } => {
    const hoy = hoyStr();
    if (!fecha) return { texto: 'SIN FECHA', clase: 'text-gray-500' };
    if (fecha < hoy) return { texto: 'VENCIDO', clase: 'text-red-600 font-bold' };
    if (fecha === hoy) return { texto: 'HOY', clase: 'text-orange-600 font-bold' };
    return { texto: 'PROGRAMADO', clase: 'text-gray-700' };
  };

  const usuario = Parse.User.current();
  const emitidoPor = usuario
    ? usuario.get('name') || `${usuario.get('firstName') || ''} ${usuario.get('lastName') || ''}`.trim() || usuario.get('username') || ''
    : '';
  const hoyFmt = hoyStr().split('-').reverse().join('-');

  if (authLoading || !authorized) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Controles (no se imprimen) */}
      <Card extra="p-4 no-print">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value as Preset)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="rango">Rango personalizado</option>
          </select>

          {preset === 'rango' && (
            <>
              <input
                type="date"
                value={desdeCustom}
                onChange={(e) => setDesdeCustom(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              />
              <input
                type="date"
                value={hastaCustom}
                onChange={(e) => setHastaCustom(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              />
            </>
          )}

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
            value={agrupacion}
            onChange={(e) => setAgrupacion(e.target.value as Agrupacion)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="servicio">Agrupar por servicio</option>
            <option value="ubicacion">Agrupar por ubicación</option>
            <option value="dominio">Agrupar por dominio</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={cargar}
              disabled={loading}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300"
            >
              <MdRefresh className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              onClick={() => window.print()}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <MdPrint className="h-4 w-4" />
              Imprimir
            </button>
          </div>
        </div>
      </Card>

      {/* Area imprimible */}
      <div id="area-imprimible">
        <div className="print-header">
          <h2 className="text-lg font-bold text-navy-700 dark:text-white">
            Reporte de Mantenimientos — {DOMINIO_MANTENIMIENTO_LABELS[dominioFilter] || 'Todos los dominios'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Período: {rango.desde?.split('-').reverse().join('-')} al {rango.hasta?.split('-').reverse().join('-')} · Emitido: {hoyFmt} por {emitidoPor || '—'} · {rows.length} ítem{rows.length !== 1 ? 's' : ''}
          </p>
        </div>

        {loading ? (
          <div className="no-print flex items-center justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-400">
            No hay mantenimientos programados en el período seleccionado.
          </div>
        ) : (
          grupos.map(([clave, items]) => (
            <div key={clave} className="print-card mb-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-navy-700 dark:bg-navy-800">
              <h3 className="mb-2 text-sm font-bold text-navy-700 dark:text-white">
                {clave} <span className="text-xs font-normal text-gray-400">({items.length})</span>
              </h3>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 24 }}></th>
                    <th style={{ textAlign: 'left' }}>Equipo / Activo</th>
                    <th style={{ textAlign: 'left' }}>Identificador</th>
                    <th style={{ textAlign: 'center', width: 80 }}>Fecha</th>
                    <th style={{ textAlign: 'center', width: 90 }}>Estado</th>
                    <th style={{ textAlign: 'left' }}>Observaciones</th>
                    <th style={{ textAlign: 'center', width: 100 }}>Firma</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => {
                    const est = estadoItem(r.proximaFechaMantenimientoEsperada);
                    return (
                      <tr key={r.id}>
                        <td style={{ textAlign: 'center' }}>☐</td>
                        <td>{r.nombre}</td>
                        <td>{r.identificador || '—'}</td>
                        <td style={{ textAlign: 'center' }}>{r.proximaFechaMantenimientoEsperada?.split('-').reverse().join('-')}</td>
                        <td style={{ textAlign: 'center' }}>{est.texto}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}

        <p className="mt-3 text-[10px] text-gray-400">
          Resumen: {rows.length} mantenimientos · Sistema de Gestión de Mantenimiento — DATACEF · Documento generado automáticamente
        </p>
      </div>
    </div>
  );
};

export default ReporteMantenimientosPage;
