'use client';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import BandejaValidacionActions from 'components/admin/mantenimiento/BandejaValidacionActions';
import {
  RegistroMantenimiento,
  MantenimientoFilters,
  DOMINIO_MANTENIMIENTO_OPTIONS,
  DOMINIO_MANTENIMIENTO_LABELS,
  DOMINIO_MANTENIMIENTO_COLORS,
  TIPO_MANTENIMIENTO_OPTIONS,
  TIPO_MANTENIMIENTO_LABELS,
  TIPO_MANTENIMIENTO_COLORS,
  ESTADO_VALIDACION_OPTIONS,
  ESTADO_VALIDACION_LABELS,
  ESTADO_VALIDACION_COLORS,
} from 'types/mantenimiento.types';
import { MantenimientoService } from 'services/mantenimiento.service';
import {
  MdSearch,
  MdFilterList,
  MdVisibility,
  MdAssignment,
  MdPending,
  MdCheckCircle,
  MdCancel,
} from 'react-icons/md';

// ------------------------------------------------
// Auth wrapper
// ------------------------------------------------
const BandejaValidacionPage = () => {
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
    if (level >= 3) {
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
  return <BandejaValidacionContent />;
};

// ------------------------------------------------
// Content
// ------------------------------------------------
const BandejaValidacionContent = () => {
  const router = useRouter();
  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  const [registros, setRegistros] = useState<RegistroMantenimiento[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Counters
  const [pendientes, setPendientes] = useState(0);
  const [aprobados, setAprobados] = useState(0);
  const [rechazados, setRechazados] = useState(0);

  // Filters
  const [estadoFilter, setEstadoFilter] = useState('pendiente');
  const [dominioFilter, setDominioFilter] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const buildFilters = useCallback((): MantenimientoFilters => {
    const filters: MantenimientoFilters = {};
    if (estadoFilter) filters.estadoValidacion = estadoFilter;
    if (dominioFilter) filters.dominio = dominioFilter;
    if (tipoFilter) filters.tipoMantenimiento = tipoFilter;
    if (fechaDesde) filters.fechaDesde = fechaDesde;
    if (fechaHasta) filters.fechaHasta = fechaHasta;
    if (searchQuery.trim()) filters.busqueda = searchQuery.trim();
    filters.limit = pageSize;
    filters.skip = page * pageSize;
    return filters;
  }, [estadoFilter, dominioFilter, tipoFilter, fechaDesde, fechaHasta, searchQuery, page]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = buildFilters();
      const result = await MantenimientoService.getBandeja(filters);
      setRegistros(result.results);
      setTotal(result.total);
      setPendientes(result.pendientes);
      setAprobados(result.aprobados);
      setRechazados(result.rechazados);
    } catch (error) {
      console.error('Error cargando bandeja de validacion:', error);
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.ceil(total / pageSize);

  const handleViewDetail = (id: string) => {
    router.push(`/admin/mantenimiento/${id}`);
  };

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="pt-5 lg:pt-10">
        <h4 className="text-xl font-bold text-navy-700 dark:text-white">
          Bandeja de Validacion
        </h4>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Revise, apruebe o rechace los mantenimientos realizados por los
          tecnicos.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card extra="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
              <MdAssignment className="h-5 w-5 text-brand-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold text-navy-700 dark:text-white">
                {pendientes + aprobados + rechazados}
              </p>
            </div>
          </div>
        </Card>
        <Card extra="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <MdPending className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pendientes
              </p>
              <p className="text-2xl font-bold text-yellow-500">
                {pendientes}
              </p>
            </div>
          </div>
        </Card>
        <Card extra="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <MdCheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Aprobados
              </p>
              <p className="text-2xl font-bold text-green-500">{aprobados}</p>
            </div>
          </div>
        </Card>
        <Card extra="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <MdCancel className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Rechazados
              </p>
              <p className="text-2xl font-bold text-red-500">{rechazados}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card extra="p-4">
        <div className="mb-3 flex items-center gap-2">
          <MdFilterList className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
            Filtros
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <select
            value={estadoFilter}
            onChange={(e) => {
              setEstadoFilter(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los estados</option>
            {ESTADO_VALIDACION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={dominioFilter}
            onChange={(e) => {
              setDominioFilter(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los dominios</option>
            {DOMINIO_MANTENIMIENTO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select
            value={tipoFilter}
            onChange={(e) => {
              setTipoFilter(e.target.value);
              setPage(0);
            }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los tipos</option>
            {TIPO_MANTENIMIENTO_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              setPage(0);
            }}
            placeholder="Desde"
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          />

          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value);
              setPage(0);
            }}
            placeholder="Hasta"
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          />

          <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-700">
            <MdSearch className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar tecnico o activo..."
              className="ml-2 h-full w-full bg-transparent text-sm outline-none dark:text-white"
            />
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card extra="w-full overflow-x-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : registros.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            No se encontraron registros con los filtros seleccionados.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-600">
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Fecha
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Activo
                </th>
                <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 sm:table-cell">
                  Dominio
                </th>
                <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">
                  Tipo
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">
                  Tecnico
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
              {registros.map((reg) => (
                <tr
                  key={reg.id}
                  className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50"
                >
                  <td className="px-3 py-3">
                    <span className="text-sm text-navy-700 dark:text-white">
                      {reg.fecha || '-'}
                    </span>
                  </td>
                  <td className="max-w-xs px-3 py-3">
                    <p className="text-sm font-semibold text-navy-700 dark:text-white line-clamp-1">
                      {reg.activoResumen?.nombre || '-'}
                    </p>
                    <span className="mt-0.5 inline-block text-xs text-gray-400">
                      {reg.activoResumen?.identificador || ''}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-center sm:table-cell">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        DOMINIO_MANTENIMIENTO_COLORS[reg.dominio] ||
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {DOMINIO_MANTENIMIENTO_LABELS[reg.dominio] ||
                        reg.dominio}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-center md:table-cell">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        TIPO_MANTENIMIENTO_COLORS[reg.tipoMantenimiento] ||
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {TIPO_MANTENIMIENTO_LABELS[reg.tipoMantenimiento] ||
                        reg.tipoMantenimiento}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">
                      {reg.tecnicoNombre || '-'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ESTADO_VALIDACION_COLORS[reg.estadoValidacion] ||
                        'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ESTADO_VALIDACION_LABELS[reg.estadoValidacion] ||
                        reg.estadoValidacion}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleViewDetail(reg.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
                        title="Ver detalle"
                      >
                        <MdVisibility className="h-4 w-4" />
                      </button>
                      <BandejaValidacionActions
                        registro={reg}
                        onUpdate={fetchData}
                        compact
                      />
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
              Mostrando {page * pageSize + 1} -{' '}
              {Math.min((page + 1) * pageSize, total)} de {total}
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
    </div>
  );
};

export default BandejaValidacionPage;
