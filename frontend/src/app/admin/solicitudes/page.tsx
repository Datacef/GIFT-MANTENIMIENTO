'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import { SolicitudAdminService, SolicitudesFilters } from 'services/solicitudes/solicitud-admin.service';
import {
  SolicitudMantenimiento,
  ESTADO_SOLICITUD_LABELS,
  ESTADO_SOLICITUD_COLORS,
} from 'types/solicitud.types';
import { MdSearch, MdVisibility, MdClear, MdInbox, MdContentCopy, MdOpenInNew, MdCheck } from 'react-icons/md';
import Swal from 'sweetalert2';

const ESTADOS = ['pendiente', 'aceptada', 'rechazada', 'asignada', 'en_proceso', 'devuelta', 'completada', 'cerrada'];

export default function BandejaSolicitudesPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const [solicitudes, setSolicitudes] = useState<SolicitudMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<SolicitudesFilters>({ limit: 20, skip: 0 });
  const [inputs, setInputs] = useState({ estado: '', busqueda: '', fechaDesde: '', fechaHasta: '' });
  const [total, setTotal] = useState(0);
  const [linkCopiado, setLinkCopiado] = useState(false);

  // URL publica del formulario de solicitudes (para copiar y compartir)
  const linkPublico = typeof window !== 'undefined'
    ? `${window.location.origin}/solicitud/nueva`
    : '/solicitud/nueva';

  const copiarLinkPublico = async () => {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    } catch (e) {
      // Fallback para navegadores sin clipboard API
      Swal.fire({
        title: 'Copia el link manualmente',
        input: 'text',
        inputValue: linkPublico,
        confirmButtonText: 'Cerrar',
      });
    }
  };

  const enviarPorCorreo = () => {
    const asunto = encodeURIComponent('Formulario de solicitud de mantenimiento');
    const cuerpo = encodeURIComponent(
      `Hola,\n\nPuedes ingresar tu solicitud de mantenimiento a traves del siguiente formulario:\n\n${linkPublico}\n\nSaludos.`
    );
    window.location.href = `mailto:?subject=${asunto}&body=${cuerpo}`;
  };

  useEffect(() => {
    const u = Parse.User.current();
    if (!u) { router.push('/auth/sign-in'); return; }
    if ((u.get('accessLevel') || 1) >= 3) setAuthorized(true);
    else router.push('/admin/default');
    setChecking(false);
  }, [router]);

  const cargar = useCallback(async (f: SolicitudesFilters) => {
    setLoading(true);
    try {
      const r = await SolicitudAdminService.listar(f);
      setSolicitudes(r.results);
      setTotal(r.total);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (authorized) cargar(filtros); }, [authorized, filtros, cargar]);

  const aplicar = () => setFiltros({ ...inputs, limit: 20, skip: 0 });
  const limpiar = () => { setInputs({ estado: '', busqueda: '', fechaDesde: '', fechaHasta: '' }); setFiltros({ limit: 20, skip: 0 }); };

  if (checking || !authorized) return null;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">Bandeja de Solicitudes</h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Solicitudes de mantenimiento recibidas desde el formulario publico y otros canales.</p>
        </div>
      </div>

      {/* Link publico del formulario de solicitudes — para copiar y compartir */}
      <Card extra="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Formulario publico de solicitudes
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Comparte este link con personas externas (sin login) para que puedan crear nuevas solicitudes.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 text-xs font-mono text-navy-700 dark:bg-navy-900 dark:text-gray-200">
                {linkPublico}
              </code>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={copiarLinkPublico}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                linkCopiado
                  ? 'bg-green-500 text-white'
                  : 'bg-brand-500 text-white hover:bg-brand-600'
              }`}
              title="Copiar al portapapeles"
            >
              {linkCopiado ? (
                <>
                  <MdCheck className="h-4 w-4" />
                  Copiado!
                </>
              ) : (
                <>
                  <MdContentCopy className="h-4 w-4" />
                  Copiar link
                </>
              )}
            </button>
            <button
              onClick={() => window.open(linkPublico, '_blank')}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
              title="Abrir formulario en una nueva pestana"
            >
              <MdOpenInNew className="h-4 w-4" />
              Abrir
            </button>
            <button
              onClick={enviarPorCorreo}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
              title="Abrir cliente de correo con el link prellenado"
            >
              Enviar por correo
            </button>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      <Card extra="p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <select value={inputs.estado} onChange={(e) => setInputs({ ...inputs, estado: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800 dark:text-white">
            <option value="">Todos los estados</option>
            {ESTADOS.map((es) => <option key={es} value={es}>{ESTADO_SOLICITUD_LABELS[es]}</option>)}
          </select>
          <input type="date" value={inputs.fechaDesde} onChange={(e) => setInputs({ ...inputs, fechaDesde: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800 dark:text-white" />
          <input type="date" value={inputs.fechaHasta} onChange={(e) => setInputs({ ...inputs, fechaHasta: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800 dark:text-white" />
          <input placeholder="Folio, OT, nombre, servicio..." value={inputs.busqueda} onChange={(e) => setInputs({ ...inputs, busqueda: e.target.value })} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm md:col-span-2 dark:border-navy-600 dark:bg-navy-800 dark:text-white" />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={aplicar} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"><MdSearch /> Buscar</button>
          <button onClick={limpiar} className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300"><MdClear /> Limpiar</button>
        </div>
      </Card>

      <Card extra="w-full overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2"><MdInbox className="h-5 w-5 text-gray-400" /><span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Resultados</span></div>
          <span className="text-xs text-gray-500">{total} solicitudes</span>
        </div>

        {loading ? (
          <div className="py-10 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
        ) : solicitudes.length === 0 ? (
          <div className="py-10 text-center text-gray-500">Sin solicitudes.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-600">
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">Folio</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">Solicitante</th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 md:table-cell">Descripcion</th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500">Estado</th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 lg:table-cell">Encargado</th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50">
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold text-navy-700 dark:text-white">{s.folio}</p>
                    {s.ordenTrabajoNumero && <p className="text-xs text-blue-600">{s.ordenTrabajoNumero}</p>}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm text-navy-700 dark:text-gray-300">{s.solicitanteNombre}</p>
                    <p className="text-xs text-gray-400">{s.solicitanteServicio}</p>
                  </td>
                  <td className="hidden max-w-xs px-3 py-3 md:table-cell">
                    <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{s.descripcion}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_SOLICITUD_COLORS[s.estado] || 'bg-gray-100 text-gray-600'}`}>{ESTADO_SOLICITUD_LABELS[s.estado]}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-sm lg:table-cell">{s.encargadoNombre || <span className="text-gray-400">—</span>}</td>
                  <td className="px-3 py-3 text-center">
                    <button onClick={() => router.push(`/admin/solicitudes/${s.id}`)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"><MdVisibility /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
