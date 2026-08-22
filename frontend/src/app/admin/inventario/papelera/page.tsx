'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import Swal from 'sweetalert2';
import {
  MdSearch,
  MdRestartAlt,
  MdDeleteForever,
  MdArrowBack,
  MdInventory2,
} from 'react-icons/md';
import {
  InventarioSharedService,
  ClaseInventario,
  DOMINIO_LABELS,
  DOMINIO_HREF,
  ActivoEliminado,
} from 'services/inventario-shared.service';

const CLASES: ClaseInventario[] = [
  'InventarioEquipoMedico',
  'InventarioEquipoIndustrial',
  'InventarioFlotaVehicular',
  'InventarioInfraestructura',
];

const PapeleraPage = () => {
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
    if (level < 4) {
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

  return <PapeleraContent />;
};

const PapeleraContent = () => {
  const userAccessLevel = Parse.User.current()?.get('accessLevel') || 1;
  const [clase, setClase] = useState<ClaseInventario>('InventarioEquipoMedico');
  const [busqueda, setBusqueda] = useState('');
  const [items, setItems] = useState<ActivoEliminado[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const r = await InventarioSharedService.getEliminados(clase, busqueda, 100, 0);
      setItems(r.results);
      setTotal(r.total);
    } catch (error) {
      console.error('Error cargando papelera:', error);
    } finally {
      setLoading(false);
    }
  }, [clase, busqueda]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRestaurar = async (item: ActivoEliminado) => {
    const confirm = await Swal.fire({
      title: 'Restaurar activo',
      text: `Volver a poner "${item.nombre}" en el inventario activo?`,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Restaurar',
      confirmButtonColor: '#16a34a',
    });
    if (!confirm.isConfirmed) return;

    try {
      await InventarioSharedService.restaurar(clase, item.id);
      Swal.fire('Restaurado', `${item.nombre} regreso al inventario.`, 'success');
      fetchItems();
    } catch (error: any) {
      Swal.fire('Error', error?.message || 'No se pudo restaurar', 'error');
    }
  };

  const handlePurgar = async (item: ActivoEliminado) => {
    const confirm = await Swal.fire({
      title: 'Purgar definitivamente',
      html: `<p><strong>Esta accion no se puede deshacer.</strong></p>
             <p>Se eliminara permanentemente: ${item.nombre}</p>
             <p style="color:#dc2626; font-size:12px">Los registros vinculados (mantenimientos, historial, logs) NO se eliminan, pero quedaran huerfanos.</p>`,
      icon: 'warning',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Purgar definitivamente',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    try {
      await InventarioSharedService.purgar(clase, item.id);
      Swal.fire('Purgado', `${item.nombre} fue eliminado definitivamente.`, 'success');
      fetchItems();
    } catch (error: any) {
      Swal.fire('Error', error?.message || 'No se pudo purgar', 'error');
    }
  };

  const formatFecha = (v: any) => {
    if (!v) return '—';
    try {
      const d = v instanceof Date ? v : new Date(v);
      if (isNaN(d.getTime())) return String(v);
      return d.toLocaleString('es-CL');
    } catch {
      return String(v);
    }
  };

  const identificadorPrincipal = (item: ActivoEliminado): string => {
    if (item.serie) return `Serie: ${item.serie}`;
    if (item.inventario) return `Inv: ${item.inventario}`;
    if (item.patente) return `Patente: ${item.patente}`;
    if (item.codigoInterno) return `Cod: ${item.codigoInterno}`;
    return '';
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white flex items-center gap-2">
            <MdDeleteForever className="h-6 w-6 text-red-500" />
            Papelera de inventario
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Activos eliminados de los 4 inventarios. Aqui puedes restaurarlos para que vuelvan a aparecer en su listado original.
          </p>
        </div>
        <Link
          href={DOMINIO_HREF[clase]}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
        >
          <MdArrowBack className="h-4 w-4" />
          Volver a {DOMINIO_LABELS[clase]}
        </Link>
      </div>

      {/* Selector de clase + busqueda */}
      <Card extra="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={clase}
            onChange={(e) => setClase(e.target.value as ClaseInventario)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            {CLASES.map((c) => (
              <option key={c} value={c}>{DOMINIO_LABELS[c]}</option>
            ))}
          </select>

          <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-700">
            <MdSearch className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, serie, patente, codigo..."
              className="ml-2 h-full w-full bg-transparent text-sm outline-none dark:text-white"
            />
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <Card extra="w-full overflow-x-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            <MdInventory2 className="mx-auto mb-2 h-10 w-10 opacity-30" />
            La papelera esta vacia para este dominio.
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {total} activo{total === 1 ? '' : 's'} en papelera
            </p>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-navy-600">
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500">Nombre</th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 md:table-cell">Identificador</th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 lg:table-cell">Marca / Modelo</th>
                  <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 lg:table-cell">Eliminado</th>
                  <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50">
                    <td className="max-w-xs px-3 py-3">
                      <p className="text-sm font-semibold text-navy-700 dark:text-white line-clamp-1">{it.nombre}</p>
                      <span className="mt-0.5 inline-block text-xs text-gray-400">{identificadorPrincipal(it)}</span>
                    </td>
                    <td className="hidden px-3 py-3 md:table-cell">
                      <span className="text-sm text-navy-700 dark:text-gray-300">
                        {it.servicio || it.ubicacion || it.asignadoA || it.sistema || '—'}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span className="text-sm text-navy-700 dark:text-gray-300">
                        {it.marca}{it.modelo ? ` / ${it.modelo}` : ''}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatFecha(it.eliminadoEn)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleRestaurar(it)}
                          className="flex items-center gap-1 rounded-lg bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
                          title="Restaurar al inventario"
                        >
                          <MdRestartAlt className="h-4 w-4" />
                          Restaurar
                        </button>
                        {userAccessLevel >= 5 && (
                          <button
                            onClick={() => handlePurgar(it)}
                            className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                            title="Eliminar definitivamente"
                          >
                            <MdDeleteForever className="h-4 w-4" />
                            Purgar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Card>
    </div>
  );
};

export default PapeleraPage;
