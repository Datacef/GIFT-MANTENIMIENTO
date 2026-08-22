'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import { EncargadoService } from 'services/solicitudes/encargado.service';
import { EncargadoMantenimiento } from 'types/encargado.types';
import EncargadoFormModal from 'components/admin/encargados/EncargadoFormModal';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdPerson } from 'react-icons/md';

export default function EncargadosPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checking, setChecking] = useState(true);

  const [encargados, setEncargados] = useState<EncargadoMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [seleccionado, setSeleccionado] = useState<EncargadoMantenimiento | null>(null);

  useEffect(() => {
    const u = Parse.User.current();
    if (!u) { router.push('/auth/sign-in'); return; }
    if ((u.get('accessLevel') || 1) >= 4) setAuthorized(true);
    else router.push('/admin/default');
    setChecking(false);
  }, [router]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await EncargadoService.listar({ soloActivos: true, busqueda });
      setEncargados(r.results);
    } finally { setLoading(false); }
  }, [busqueda]);

  useEffect(() => { if (authorized) cargar(); }, [authorized, cargar]);

  const handleEliminar = async (id: string) => {
    if (!confirm('Desactivar este encargado? No podra recibir nuevas asignaciones.')) return;
    await EncargadoService.eliminar(id);
    await cargar();
  };

  if (checking) return null;
  if (!authorized) return null;

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">Encargados de Mantenimiento</h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Gestion del equipo tecnico que recibe las ordenes de trabajo.</p>
        </div>
        <button
          onClick={() => { setSeleccionado(null); setModalOpen(true); }}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <MdAdd className="h-5 w-5" /> Nuevo encargado
        </button>
      </div>

      <Card extra="p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <MdSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Buscar por nombre, cargo o email..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm dark:border-navy-600 dark:bg-navy-800 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-10 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
        ) : encargados.length === 0 ? (
          <div className="py-10 text-center text-gray-500">No hay encargados registrados.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-600">
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">Nombre</th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">Cargo</th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 md:table-cell">Especialidades</th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 lg:table-cell">Contacto</th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {encargados.map((e) => (
                <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2"><MdPerson className="text-gray-400" /><span className="text-sm font-semibold text-navy-700 dark:text-white">{e.nombre}</span></div>
                  </td>
                  <td className="px-3 py-3 text-sm text-navy-700 dark:text-gray-300">{e.cargo}</td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {e.especialidades.slice(0, 3).map((esp) => (
                        <span key={esp} className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700">{esp}</span>
                      ))}
                      {e.especialidades.length > 3 && <span className="text-xs text-gray-400">+{e.especialidades.length - 3}</span>}
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <p className="text-sm text-navy-700 dark:text-gray-300">{e.email}</p>
                    <p className="text-xs text-gray-400">{e.telefono}</p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSeleccionado(e); setModalOpen(true); }} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="Editar"><MdEdit /></button>
                      <button onClick={() => handleEliminar(e.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Desactivar"><MdDelete /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <EncargadoFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={cargar} encargado={seleccionado} />
    </div>
  );
}
