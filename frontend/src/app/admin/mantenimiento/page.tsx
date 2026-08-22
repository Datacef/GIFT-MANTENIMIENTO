'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import { MantenimientoService } from 'services/mantenimiento.service';
import {
  RegistroMantenimiento,
  EstadisticasMantenimiento,
  MantenimientoExportFilters,
  DOMINIO_MANTENIMIENTO_LABELS,
  DOMINIO_MANTENIMIENTO_COLORS,
  TIPO_MANTENIMIENTO_LABELS,
  TIPO_MANTENIMIENTO_COLORS,
  ESTADO_VALIDACION_LABELS,
  ESTADO_VALIDACION_COLORS,
} from 'types/mantenimiento.types';
import FiltrosMantenimiento, {
  FiltrosMantenimientoValue,
  FILTROS_MTTO_INICIAL,
} from 'components/admin/mantenimiento/FiltrosMantenimiento';
import ModalExportarExcel from 'components/admin/mantenimiento/ModalExportarExcel';
import {
  MdAdd,
  MdAssignment,
  MdVisibility,
  MdBuild,
  MdFileDownload,
  MdChevronLeft,
  MdChevronRight,
} from 'react-icons/md';

const PAGE_SIZE = 20;

const MantenimientoPage = () => {
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
    if (level >= 2) {
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

  return <MantenimientoContent />;
};

const MantenimientoContent = () => {
  const router = useRouter();
  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  const [stats, setStats] = useState<EstadisticasMantenimiento>({
    porEstado: {},
    porDominio: {},
    porTipo: {},
    total: 0,
  });
  const [registros, setRegistros] = useState<RegistroMantenimiento[]>([]);
  const [totalFiltrados, setTotalFiltrados] = useState(0);
  const [loading, setLoading] = useState(true);

  const [filtros, setFiltros] = useState<FiltrosMantenimientoValue>(FILTROS_MTTO_INICIAL);
  // Filtros efectivamente aplicados (snapshot al presionar "Buscar")
  const [appliedFiltros, setAppliedFiltros] = useState<FiltrosMantenimientoValue>(FILTROS_MTTO_INICIAL);
  const [page, setPage] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const estadisticas = await MantenimientoService.getEstadisticas();
      setStats(estadisticas);
    } catch (error) {
      console.error('Error cargando estadisticas:', error);
    }
  }, []);

  const fetchRegistros = useCallback(
    async (f: FiltrosMantenimientoValue, pageIdx: number) => {
      setLoading(true);
      try {
        // registroId tiene prioridad absoluta
        const filters: any = f.registroId
          ? { registroId: f.registroId.trim(), limit: 1, skip: 0 }
          : {
              dominio: f.dominio || undefined,
              tipoMantenimiento: f.tipoMantenimiento || undefined,
              estadoValidacion: f.estadoValidacion || undefined,
              fechaDesde: f.fechaDesde || undefined,
              fechaHasta: f.fechaHasta || undefined,
              tecnicoNombre: f.tecnicoNombre || undefined,
              // Si hay identificador o nombre, usamos busqueda unificada
              busqueda: f.identificador || f.nombreActivo || undefined,
              limit: PAGE_SIZE,
              skip: pageIdx * PAGE_SIZE,
            };
        const lista = await MantenimientoService.getRegistros(filters);
        setRegistros(lista.results);
        setTotalFiltrados(lista.total);
      } catch (error) {
        console.error('Error cargando registros:', error);
        setRegistros([]);
        setTotalFiltrados(0);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStats();
    fetchRegistros(FILTROS_MTTO_INICIAL, 0);
  }, [fetchStats, fetchRegistros]);

  const handleBuscar = () => {
    setAppliedFiltros(filtros);
    setPage(0);
    fetchRegistros(filtros, 0);
  };

  const handleLimpiar = () => {
    setFiltros(FILTROS_MTTO_INICIAL);
    setAppliedFiltros(FILTROS_MTTO_INICIAL);
    setPage(0);
    fetchRegistros(FILTROS_MTTO_INICIAL, 0);
  };

  const handlePage = (dir: -1 | 1) => {
    const next = page + dir;
    if (next < 0) return;
    if (next * PAGE_SIZE >= totalFiltrados) return;
    setPage(next);
    fetchRegistros(appliedFiltros, next);
  };

  // Filtros a enviar a la exportacion (usa los APPLIED, no los tipeados pendientes)
  const exportFilters: MantenimientoExportFilters = {
    dominio: appliedFiltros.dominio || undefined,
    tipoMantenimiento: appliedFiltros.tipoMantenimiento || undefined,
    estadoValidacion: appliedFiltros.estadoValidacion || undefined,
    fechaDesde: appliedFiltros.fechaDesde || undefined,
    fechaHasta: appliedFiltros.fechaHasta || undefined,
    tecnicoNombre: appliedFiltros.tecnicoNombre || undefined,
    identificador: appliedFiltros.identificador || undefined,
    nombreActivo: appliedFiltros.nombreActivo || undefined,
  };

  const paginaInicio = totalFiltrados === 0 ? 0 : page * PAGE_SIZE + 1;
  const paginaFin = Math.min((page + 1) * PAGE_SIZE, totalFiltrados);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">Mantenimiento</h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Registro, ejecucion y validacion de mantenimientos preventivos, correctivos y predictivos.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Registros</p>
          <p className="text-2xl font-bold text-navy-700 dark:text-white">{stats.total || 0}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Pendientes</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.porEstado?.pendiente || 0}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Aprobados</p>
          <p className="text-2xl font-bold text-green-500">{stats.porEstado?.aprobado || 0}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Rechazados</p>
          <p className="text-2xl font-bold text-red-500">{stats.porEstado?.rechazado || 0}</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => router.push('/admin/mantenimiento/nuevo')}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
        >
          <MdAdd className="h-5 w-5" />
          Nuevo Mantenimiento
        </button>
        {userAccessLevel >= 3 && (
          <button
            onClick={() => router.push('/admin/mantenimiento/bandeja')}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            <MdAssignment className="h-5 w-5" />
            Bandeja de Validacion
          </button>
        )}
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-2 rounded-xl border border-green-500 bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 dark:border-green-600 dark:bg-green-900/30 dark:text-green-200 dark:hover:bg-green-900/50"
        >
          <MdFileDownload className="h-5 w-5" />
          Exportar a Excel
        </button>
      </div>

      {/* Filtros */}
      <FiltrosMantenimiento
        value={filtros}
        onChange={setFiltros}
        onBuscar={handleBuscar}
        onLimpiar={handleLimpiar}
        loading={loading}
      />

      {/* Records Table */}
      <Card extra="w-full overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MdBuild className="h-5 w-5 text-gray-400" />
            <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
              Registros de mantenimiento
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {totalFiltrados > 0
              ? `Mostrando ${paginaInicio}–${paginaFin} de ${totalFiltrados}`
              : '0 resultados'}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
          </div>
        ) : registros.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            No hay registros que coincidan con los filtros.
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-navy-600">
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    ID Pauta
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Fecha
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Activo
                  </th>
                  <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">
                    Dominio
                  </th>
                  <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 sm:table-cell">
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
                {registros.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50"
                  >
                    <td className="px-3 py-3">
                      <code className="text-xs text-gray-500 dark:text-gray-400">{r.id}</code>
                    </td>
                    <td className="px-3 py-3 text-sm text-navy-700 dark:text-gray-300">{r.fecha}</td>
                    <td className="max-w-xs px-3 py-3">
                      <p className="line-clamp-1 text-sm font-semibold text-navy-700 dark:text-white">
                        {r.activoResumen?.nombre || '—'}
                      </p>
                      <span className="text-xs text-gray-400">
                        {r.activoResumen?.identificador || ''}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-center md:table-cell">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                          DOMINIO_MANTENIMIENTO_COLORS[r.dominio] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {DOMINIO_MANTENIMIENTO_LABELS[r.dominio] || r.dominio}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-center sm:table-cell">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                          TIPO_MANTENIMIENTO_COLORS[r.tipoMantenimiento] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {TIPO_MANTENIMIENTO_LABELS[r.tipoMantenimiento] || r.tipoMantenimiento}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 lg:table-cell">
                      <span className="text-sm text-navy-700 dark:text-gray-300">
                        {r.tecnicoNombre}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                          ESTADO_VALIDACION_COLORS[r.estadoValidacion] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ESTADO_VALIDACION_LABELS[r.estadoValidacion] || r.estadoValidacion}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => router.push(`/admin/mantenimiento/${r.id}`)}
                          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
                          title="Ver detalle"
                        >
                          <MdVisibility className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginador */}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                onClick={() => handlePage(-1)}
                disabled={page === 0 || loading}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
              >
                <MdChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Pagina {page + 1}
              </span>
              <button
                onClick={() => handlePage(1)}
                disabled={(page + 1) * PAGE_SIZE >= totalFiltrados || loading}
                className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
              >
                <MdChevronRight className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </Card>

      <ModalExportarExcel
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        filters={exportFilters}
      />
    </div>
  );
};

export default MantenimientoPage;
