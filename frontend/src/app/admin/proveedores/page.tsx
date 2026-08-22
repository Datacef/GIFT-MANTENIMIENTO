'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import ProveedorFormModal from 'components/admin/proveedores/ProveedorFormModal';
import ProveedorDetailModal from 'components/admin/proveedores/ProveedorDetailModal';
import { ProveedorService } from 'services/proveedor.service';
import {
  Proveedor,
  ProveedorFilters,
} from 'types/proveedor.types';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdVisibility,
  MdFilterList,
  MdBusiness,
} from 'react-icons/md';
import Swal from 'sweetalert2';

const ProveedoresPage = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    const level = user.get('accessLevel') || 1;
    if (level >= 1) {
      setAuthorized(true);
    } else {
      router.push('/admin/default');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!authorized) return null;

  return <ProveedoresContent />;
};

const ProveedoresContent = () => {
  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingProveedor, setEditingProveedor] = useState<Proveedor | null>(null);
  const [viewingProveedor, setViewingProveedor] = useState<Proveedor | null>(null);

  const [page, setPage] = useState(0);
  const pageSize = 25;

  const fetchProveedores = useCallback(async () => {
    setLoading(true);
    try {
      const filters: ProveedorFilters = {
        limit: pageSize,
        skip: page * pageSize,
      };
      if (searchQuery.trim()) filters.busqueda = searchQuery.trim();

      const result = await ProveedorService.getProveedores(filters);
      setProveedores(result.results);
      setTotal(result.total);
    } catch (error) {
      console.error('Error cargando proveedores:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page]);

  useEffect(() => {
    fetchProveedores();
  }, [fetchProveedores]);

  const handleView = (proveedor: Proveedor) => {
    setViewingProveedor(proveedor);
    setDetailModalOpen(true);
  };

  const handleEdit = (proveedor: Proveedor) => {
    setEditingProveedor(proveedor);
    setFormModalOpen(true);
  };

  const handleCreate = () => {
    setEditingProveedor(null);
    setFormModalOpen(true);
  };

  const handleDelete = async (proveedor: Proveedor) => {
    const result = await Swal.fire({
      title: 'Eliminar proveedor',
      text: `Se eliminara el proveedor: "${proveedor.nombre}" (${proveedor.rut})`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Eliminar',
    });
    if (result.isConfirmed) {
      try {
        await ProveedorService.delete(proveedor.id);
        Swal.fire('Eliminado', 'El proveedor ha sido eliminado.', 'success');
        fetchProveedores();
      } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al eliminar', 'error');
      }
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            Proveedores
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Gestione los proveedores y sus licitaciones de mantenimiento.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {userAccessLevel >= 3 && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <MdAdd className="h-5 w-5" />
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Proveedores</p>
          <p className="text-2xl font-bold text-navy-700 dark:text-white">{total}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Activos</p>
          <p className="text-2xl font-bold text-green-500">
            {proveedores.filter((p) => p.activo).length}
          </p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Inactivos</p>
          <p className="text-2xl font-bold text-gray-400">
            {proveedores.filter((p) => !p.activo).length}
          </p>
        </Card>
      </div>

      {/* Search */}
      <Card extra="p-4">
        <div className="mb-3 flex items-center gap-2">
          <MdFilterList className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Busqueda</span>
        </div>
        <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-700">
          <MdSearch className="h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por RUT o nombre..."
            className="ml-2 h-full w-full bg-transparent text-sm outline-none dark:text-white"
          />
        </div>
      </Card>

      {/* Table */}
      <Card extra="w-full overflow-x-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : proveedores.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            No se encontraron proveedores.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-600">
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  RUT
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Nombre
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">
                  Correo
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">
                  Telefono
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((prov) => (
                <tr
                  key={prov.id}
                  className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50"
                >
                  <td className="px-3 py-3">
                    <span className="text-sm font-mono text-navy-700 dark:text-white">
                      {prov.rut}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm font-semibold text-navy-700 dark:text-white line-clamp-1">
                      {prov.nombre}
                    </p>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {prov.correo || '—'}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {prov.telefono || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        prov.activo
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {prov.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleView(prov)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
                        title="Ver detalle"
                      >
                        <MdVisibility className="h-4 w-4" />
                      </button>
                      {userAccessLevel >= 3 && (
                        <button
                          onClick={() => handleEdit(prov)}
                          className="rounded-lg p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                          title="Editar"
                        >
                          <MdEdit className="h-4 w-4" />
                        </button>
                      )}
                      {userAccessLevel >= 5 && (
                        <button
                          onClick={() => handleDelete(prov)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Eliminar"
                        >
                          <MdDelete className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-navy-600">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, total)} de {total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
              >
                Anterior
              </button>
              <span className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-300">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <ProveedorFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingProveedor(null);
        }}
        onSave={fetchProveedores}
        proveedor={editingProveedor}
      />

      <ProveedorDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingProveedor(null);
        }}
        onEdit={() => {
          setDetailModalOpen(false);
          if (viewingProveedor) {
            setEditingProveedor(viewingProveedor);
            setFormModalOpen(true);
          }
        }}
        proveedor={viewingProveedor}
      />
    </div>
  );
};

export default ProveedoresPage;
