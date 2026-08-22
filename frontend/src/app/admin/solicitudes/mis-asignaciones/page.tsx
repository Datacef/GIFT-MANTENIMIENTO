'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import { SolicitudAdminService } from 'services/solicitudes/solicitud-admin.service';
import { SolicitudMantenimiento, ESTADO_SOLICITUD_LABELS, ESTADO_SOLICITUD_COLORS } from 'types/solicitud.types';
import { MdVisibility, MdPlayArrow } from 'react-icons/md';

export default function MisAsignacionesPage() {
  const router = useRouter();
  const [list, setList] = useState<SolicitudMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await SolicitudAdminService.misAsignaciones();
      setList(r.results);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!Parse.User.current()) { router.push('/auth/sign-in'); return; }
    cargar();
  }, [cargar, router]);

  const iniciar = async (id: string) => {
    await SolicitudAdminService.iniciar(id);
    await cargar();
  };

  return (
    <div className="flex w-full flex-col gap-5 pt-5 lg:pt-10">
      <div>
        <h4 className="text-xl font-bold text-navy-700 dark:text-white">Mis Asignaciones</h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Ordenes de trabajo asignadas a ti.</p>
      </div>

      <Card extra="p-4">
        {loading ? (
          <div className="py-10 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
        ) : list.length === 0 ? (
          <div className="py-10 text-center text-gray-500">No tienes ordenes de trabajo activas.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-600">
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">OT</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">Solicitante</th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 md:table-cell">Descripcion</th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500">Estado</th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700">
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold text-blue-600">{s.ordenTrabajoNumero}</p>
                    <p className="text-xs text-gray-400">{s.folio}</p>
                  </td>
                  <td className="px-3 py-3 text-sm">{s.solicitanteNombre}<br /><span className="text-xs text-gray-400">{s.solicitanteServicio}</span></td>
                  <td className="hidden max-w-xs px-3 py-3 md:table-cell"><p className="line-clamp-2 text-sm text-gray-600">{s.descripcion}</p></td>
                  <td className="px-3 py-3 text-center"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${ESTADO_SOLICITUD_COLORS[s.estado]}`}>{ESTADO_SOLICITUD_LABELS[s.estado]}</span></td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      {s.estado === 'asignada' && <button onClick={() => iniciar(s.id)} className="rounded-lg p-2 text-green-600 hover:bg-green-50" title="Iniciar"><MdPlayArrow /></button>}
                      <button onClick={() => router.push(`/admin/solicitudes/${s.id}`)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"><MdVisibility /></button>
                    </div>
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
