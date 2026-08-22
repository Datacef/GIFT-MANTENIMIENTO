'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import FlotaVehicularFormModal from 'components/admin/flota-vehicular/FlotaVehicularFormModal';
import FlotaVehicularDetailModal from 'components/admin/flota-vehicular/FlotaVehicularDetailModal';
import { InventarioFlotaService } from 'services/inventario-flota.service';
import {
  InventarioFlota,
  InventarioFlotaFilters,
  ESTADO_FLOTA_OPTIONS,
  ESTADO_FLOTA_COLORS,
  ESTADO_FLOTA_LABELS,
  COMBUSTIBLE_FLOTA_OPTIONS,
} from 'types/inventario-flota.types';
import {
  ESTADO_CUMPLIMIENTO_OPTIONS,
  ESTADO_CUMPLIMIENTO_LABELS,
  ULTIMO_ESTADO_MTTO_LABELS,
  formatFechaCumplimiento,
} from 'types/cumplimiento-mantenimiento.types';
import { CumplimientoBadge, UltimoMttoBadge } from 'components/admin/mantenimiento/CumplimientoBadge';
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdSearch,
  MdUpload,
  MdDownload,
  MdVisibility,
  MdFilterList,
  MdDescription,
  MdCheckCircle,
  MdCancel,
  MdSync,
} from 'react-icons/md';
import Swal from 'sweetalert2';

const FlotaVehicularPage = () => {
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

  return <FlotaVehicularContent />;
};

const FlotaVehicularContent = () => {
  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  const [vehiculos, setVehiculos] = useState<InventarioFlota[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // Etapa 2 (revision-inventarios): stats globales independientes de la pagina
  const [statsGlobal, setStatsGlobal] = useState({ total: 0, operativos: 0, enMantencion: 0, dadosBaja: 0 });

  const [tipoVehiculoFilter, setTipoVehiculoFilter] = useState('');
  const [asignadoAFilter, setAsignadoAFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [combustibleFilter, setCombustibleFilter] = useState('');
  const [convenioFilter, setConvenioFilter] = useState('');
  const [cumplimientoFilter, setCumplimientoFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [tiposVehiculo, setTiposVehiculo] = useState<string[]>([]);
  const [asignaciones, setAsignaciones] = useState<string[]>([]);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState<InventarioFlota | null>(null);
  const [viewingVehiculo, setViewingVehiculo] = useState<InventarioFlota | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [page, setPage] = useState(0);
  const pageSize = 25;

  const buildFilters = useCallback((): InventarioFlotaFilters => {
    const filters: InventarioFlotaFilters = {};
    if (tipoVehiculoFilter) filters.tipoVehiculo = tipoVehiculoFilter;
    if (asignadoAFilter) filters.asignadoA = asignadoAFilter;
    if (estadoFilter) filters.estado = estadoFilter;
    if (combustibleFilter) filters.combustible = combustibleFilter;
    if (convenioFilter) filters.convenio = convenioFilter;
    if (cumplimientoFilter) filters.estadoCumplimiento = cumplimientoFilter;
    if (searchQuery.trim()) filters.busqueda = searchQuery.trim();
    return filters;
  }, [tipoVehiculoFilter, asignadoAFilter, estadoFilter, combustibleFilter, convenioFilter, cumplimientoFilter, searchQuery]);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [t, a] = await Promise.all([
        InventarioFlotaService.getTiposVehiculo(),
        InventarioFlotaService.getAsignaciones(),
      ]);
      setTiposVehiculo(t);
      setAsignaciones(a);
    } catch (error) {
      console.error('Error cargando opciones de filtro:', error);
    }
  }, []);

  const fetchVehiculos = useCallback(async () => {
    setLoading(true);
    try {
      const filters = buildFilters();
      filters.limit = pageSize;
      filters.skip = page * pageSize;

      const result = await InventarioFlotaService.getInventario(filters);
      setVehiculos(result.results);
      setTotal(result.total);
    } catch (error) {
      console.error('Error cargando flota vehicular:', error);
    } finally {
      setLoading(false);
    }
  }, [buildFilters, page]);

  // Etapa 2 (revision-inventarios): cargar stats globales por estado fisico
  const fetchStatsGlobal = useCallback(async () => {
    try {
      const s = await InventarioFlotaService.getEstadisticasFisicas();
      setStatsGlobal({ total: s.total, operativos: s.activos, enMantencion: s.enMantencion, dadosBaja: s.dadosBaja });
    } catch (error) {
      console.error('Error cargando estadisticas:', error);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  useEffect(() => {
    fetchVehiculos();
  }, [fetchVehiculos]);

  useEffect(() => {
    fetchStatsGlobal();
  }, [fetchStatsGlobal]);

  const stats = statsGlobal;

  const handleView = (vehiculo: InventarioFlota) => {
    setViewingVehiculo(vehiculo);
    setDetailModalOpen(true);
  };

  const handleEdit = (vehiculo: InventarioFlota) => {
    setEditingVehiculo(vehiculo);
    setFormModalOpen(true);
  };

  const handleCreate = () => {
    setEditingVehiculo(null);
    setFormModalOpen(true);
  };

  const handleDelete = async (vehiculo: InventarioFlota) => {
    const result = await Swal.fire({
      title: 'Eliminar vehiculo',
      text: `Se eliminara el vehiculo: "${vehiculo.nombreVehiculo}" (Patente: ${vehiculo.patente || 'N/A'})`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Eliminar',
    });
    if (result.isConfirmed) {
      try {
        await InventarioFlotaService.delete(vehiculo.id);
        Swal.fire('Eliminado', 'El vehiculo ha sido eliminado.', 'success');
        fetchVehiculos();
        fetchStatsGlobal();
      } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al eliminar', 'error');
      }
    }
  };

  // Etapa 9 — Sincronizacion consolidada: convenios + cumplimiento de mantenimiento
  const handleSync = async () => {
    const confirm = await Swal.fire({
      title: 'Sincronizar inventario',
      html: `
        <div style="text-align:left">
          <p>Se ejecutaran dos operaciones:</p>
          <ul style="margin-top:8px; padding-left:20px">
            <li><strong>Convenios</strong>: verifica licitaciones vigentes y actualiza el estado de convenio.</li>
            <li><strong>Cumplimiento</strong>: recalcula la fecha del ultimo mantenimiento y los periodos cumplidos de cada vehiculo.</li>
          </ul>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Sincronizar',
      confirmButtonColor: '#422AFB',
    });
    if (!confirm.isConfirmed) return;

    setSyncing(true);
    try {
      const [conveniosRes, cumplimientoRes] = await Promise.all([
        Parse.Cloud.run('sincronizarConveniosInventario', { inventarioTipo: 'flota' }).catch((e) => ({ _error: e?.message })),
        Parse.Cloud.run('sincronizarCumplimientoMasivo', { dominio: 'flotaVehicular' }).catch((e) => ({ _error: e?.message })),
      ]);

      const lines: string[] = [];
      if ((conveniosRes as any)?._error) {
        lines.push(`<span style="color:#dc2626">Convenios: ${(conveniosRes as any)._error}</span>`);
      } else {
        const stats = (conveniosRes as any).resultados?.[0] || {};
        lines.push('<strong>Convenios</strong>');
        if (stats.equiposActualizados > 0) lines.push(`&nbsp;&nbsp;Vehiculos actualizados: ${stats.equiposActualizados}`);
        if (stats.equiposConConvenio > 0) lines.push(`&nbsp;&nbsp;Con convenio vigente: ${stats.equiposConConvenio}`);
        if (stats.equiposSinConvenio > 0) lines.push(`&nbsp;&nbsp;Sin convenio: ${stats.equiposSinConvenio}`);
        if (stats.licitacionesVencidas > 0) lines.push(`&nbsp;&nbsp;Licitaciones vencidas: ${stats.licitacionesVencidas}`);
        if (!stats.equiposActualizados && !stats.equiposConConvenio && !stats.equiposSinConvenio) {
          lines.push('&nbsp;&nbsp;Sin cambios');
        }
      }
      lines.push('<br><strong>Cumplimiento de mantenimiento</strong>');
      if ((cumplimientoRes as any)?._error) {
        lines.push(`&nbsp;&nbsp;<span style="color:#dc2626">${(cumplimientoRes as any)._error}</span>`);
        lines.push('&nbsp;&nbsp;<span style="color:#6b7280;font-size:11px">(requiere permisos ADMIN)</span>');
      } else {
        const c = cumplimientoRes as any;
        lines.push(`&nbsp;&nbsp;Procesados: ${c.procesados ?? 0}`);
        lines.push(`&nbsp;&nbsp;OK: <span style="color:#16a34a">${c.ok ?? 0}</span>`);
        if (c.errores > 0) lines.push(`&nbsp;&nbsp;Errores: <span style="color:#dc2626">${c.errores}</span>`);
      }

      await Swal.fire({
        title: 'Sincronizacion completada',
        html: lines.join('<br>'),
        icon: 'success',
      });

      fetchVehiculos();
      fetchStatsGlobal();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al sincronizar', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const filters = buildFilters();
      const data = await InventarioFlotaService.exportar(filters);

      const wsData = data.map((v) => ({
        'Tipo Vehiculo': v.tipoVehiculo,
        'Nombre Vehiculo': v.nombreVehiculo,
        'Marca': v.marca,
        'Modelo': v.modelo,
        'Anio': v.anio,
        'Patente': v.patente,
        'Numero Interno': v.numeroInterno,
        'VIN': v.vin,
        'Color': v.color,
        'Combustible': v.combustible,
        'Kilometraje': v.kilometraje,
        'Capacidad Pasajeros': v.capacidadPasajeros,
        'Asignado A': v.asignadoA,
        'Fecha Adquisicion': v.fechaAdquisicion,
        'Vida Util (anios)': v.vidaUtil,
        'Estado': ESTADO_FLOTA_LABELS[v.estado] || v.estado,
        'Frecuencia (meses)': v.frecuencia,
        'Revision Tecnica Vigente': v.revisionTecnicaVigente,
        'Permiso Circulacion': v.permisoCirculacion,
        'Seguro Vigente': v.seguroVigente,
        'Garantia Inicio': v.garantiaInicio,
        'Garantia Final': v.garantiaFinal,
        'Fecha Baja': v.fechaBaja,
        'Activo': v.activo ? 'Si' : 'No',
        'En Convenio': v.convenioActivo ? 'Si' : 'No',
        'RUT Proveedor': v.proveedorRut || '',
        'Nombre Proveedor': v.proveedorNombre || '',
        'N° Licitacion': v.numeroLicitacion || '',
        'Fecha Termino Convenio': v.fechaTerminoConvenio || '',
        // Etapa 2 — Cumplimiento de mantenimiento
        'Ultimo Mantto (fecha)': formatFechaCumplimiento(v.ultimaFechaMantenimiento),
        'Ultimo Mantto (estado)': ULTIMO_ESTADO_MTTO_LABELS[v.ultimoEstadoMantenimiento] || '',
        'Ultimo Mantto (tipo)': v.ultimoTipoMantenimiento || '',
        'Proximo Mantto esperado': formatFechaCumplimiento(v.proximaFechaMantenimientoEsperada),
        'Periodos cumplidos': v.periodosCumplidos,
        'Periodos esperados': v.periodosEsperados,
        'Periodos faltantes': v.periodosFaltantes,
        'Cumplimiento (%)': v.cumplimientoPorcentaje,
        'Estado Cumplimiento': ESTADO_CUMPLIMIENTO_LABELS[v.estadoCumplimientoMantenimiento] || '',
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Flota Vehicular');
      XLSX.writeFile(wb, 'flota_vehicular.xlsx');
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al exportar', 'error');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = [
        'tipoVehiculo', 'nombreVehiculo', 'marca', 'modelo', 'anio',
        'patente', 'numeroInterno', 'vin', 'color', 'combustible',
        'kilometraje', 'capacidadPasajeros', 'asignadoA', 'fechaAdquisicion', 'vidaUtil',
        'estado', 'frecuencia', 'revisionTecnicaVigente', 'permisoCirculacion', 'seguroVigente',
        'garantiaInicio', 'garantiaFinal', 'fechaBaja',
      ];
      const exampleRows = [
        {
          tipoVehiculo: 'Ambulancia',
          nombreVehiculo: 'AMBULANCIA SAMU BASE',
          marca: 'Toyota',
          modelo: 'Hilux',
          anio: 2022,
          patente: 'ABCD-12',
          numeroInterno: 'FV-001',
          vin: '1HGCM82633A004352',
          color: 'Blanco',
          combustible: 'Diesel',
          kilometraje: 45000,
          capacidadPasajeros: 4,
          asignadoA: 'SAMU',
          fechaAdquisicion: '2022-03-15',
          vidaUtil: 10,
          estado: 'B',
          frecuencia: 3,
          revisionTecnicaVigente: '2025-06-30',
          permisoCirculacion: '2025-03-31',
          seguroVigente: '2025-12-31',
          garantiaInicio: '2022-03-15',
          garantiaFinal: '2025-03-15',
          fechaBaja: '',
        },
        {
          tipoVehiculo: 'Camioneta',
          nombreVehiculo: 'CAMIONETA LOGISTICA',
          marca: 'Nissan',
          modelo: 'NP300',
          anio: 2021,
          patente: 'EFGH-34',
          numeroInterno: 'FV-002',
          vin: '3N1AB7AP5KL123456',
          color: 'Gris',
          combustible: 'Diesel',
          kilometraje: 78000,
          capacidadPasajeros: 5,
          asignadoA: 'Logistica',
          fechaAdquisicion: '2021-06-01',
          vidaUtil: 12,
          estado: 'B',
          frecuencia: 3,
          revisionTecnicaVigente: '2025-08-15',
          permisoCirculacion: '2025-03-31',
          seguroVigente: '2025-12-31',
          garantiaInicio: '2021-06-01',
          garantiaFinal: '2024-06-01',
          fechaBaja: '',
        },
      ];

      const ws = XLSX.utils.json_to_sheet(exampleRows, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Formato');
      XLSX.writeFile(wb, 'formato_flota_vehicular.xlsx');
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al descargar formato', 'error');
    }
  };

  const handleImportExcel = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const XLSX = await import('xlsx');
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws);

        if (rows.length === 0) {
          Swal.fire('Error', 'El archivo no contiene datos.', 'error');
          return;
        }

        const items = rows.map((row) => ({
          tipoVehiculo: String(row.tipoVehiculo || ''),
          nombreVehiculo: String(row.nombreVehiculo || ''),
          marca: String(row.marca || ''),
          modelo: String(row.modelo || ''),
          anio: parseInt(row.anio) || 0,
          patente: String(row.patente || ''),
          numeroInterno: String(row.numeroInterno || ''),
          vin: String(row.vin || ''),
          color: String(row.color || ''),
          combustible: String(row.combustible || 'Diesel'),
          kilometraje: parseInt(row.kilometraje) || 0,
          capacidadPasajeros: parseInt(row.capacidadPasajeros) || 0,
          asignadoA: String(row.asignadoA || ''),
          fechaAdquisicion: String(row.fechaAdquisicion || ''),
          vidaUtil: parseInt(row.vidaUtil) || 0,
          estado: String(row.estado || 'B'),
          frecuencia: parseInt(row.frecuencia) || 3,
          revisionTecnicaVigente: String(row.revisionTecnicaVigente || ''),
          permisoCirculacion: String(row.permisoCirculacion || ''),
          seguroVigente: String(row.seguroVigente || ''),
          garantiaInicio: String(row.garantiaInicio || ''),
          garantiaFinal: String(row.garantiaFinal || ''),
          fechaBaja: String(row.fechaBaja || ''),
          activo: true,
        }));

        const confirm = await Swal.fire({
          title: 'Confirmar importacion',
          text: `Se importaran ${items.length} vehiculos. Desea continuar?`,
          icon: 'question',
          showCancelButton: true,
          cancelButtonText: 'Cancelar',
          confirmButtonText: 'Importar',
        });

        if (!confirm.isConfirmed) return;

        const result = await InventarioFlotaService.importar(items);
        Swal.fire(
          'Importacion completada',
          `Creados: ${result.created}, Errores: ${result.errors}, Total: ${result.total}`,
          result.errors > 0 ? 'warning' : 'success'
        );
        fetchVehiculos();
        fetchStatsGlobal();
        loadFilterOptions();
      } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al importar', 'error');
      }
    };
    input.click();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div>
          <h4 className="text-xl font-bold text-navy-700 dark:text-white">
            Flota Vehicular
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Gestione el parque automotriz del establecimiento: ambulancias, moviles de transporte, maquinaria y otros vehiculos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {userAccessLevel >= 2 && (
            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
            >
              <MdDescription className="h-4 w-4" />
              Descargar Formato
            </button>
          )}
          {userAccessLevel >= 2 && (
            <button
              onClick={handleImportExcel}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
            >
              <MdUpload className="h-4 w-4" />
              Importar Excel
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            <MdDownload className="h-4 w-4" />
            Descargar Excel
          </button>
          {userAccessLevel >= 3 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Sincronizar convenios + cumplimiento de mantenimiento"
              className="flex items-center gap-2 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
            >
              <MdSync className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar'}
            </button>
          )}
          {userAccessLevel >= 2 && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"
            >
              <MdAdd className="h-5 w-5" />
              Nuevo Vehiculo
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Vehiculos</p>
          <p className="text-2xl font-bold text-navy-700 dark:text-white">{stats.total}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Operativos (Bueno)</p>
          <p className="text-2xl font-bold text-green-500">{stats.operativos}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">En Mantencion</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.enMantencion}</p>
        </Card>
        <Card extra="p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Dados de Baja</p>
          <p className="text-2xl font-bold text-gray-400">{stats.dadosBaja}</p>
        </Card>
      </div>

      {/* Filters */}
      <Card extra="p-4">
        <div className="mb-3 flex items-center gap-2">
          <MdFilterList className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Filtros</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <select
            value={tipoVehiculoFilter}
            onChange={(e) => { setTipoVehiculoFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los tipos</option>
            {tiposVehiculo.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={asignadoAFilter}
            onChange={(e) => { setAsignadoAFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todas las asignaciones</option>
            {asignaciones.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={estadoFilter}
            onChange={(e) => { setEstadoFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los estados</option>
            {ESTADO_FLOTA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={combustibleFilter}
            onChange={(e) => { setCombustibleFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Todos los combustibles</option>
            {COMBUSTIBLE_FLOTA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={convenioFilter}
            onChange={(e) => { setConvenioFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          >
            <option value="">Convenio: Todos</option>
            <option value="con_convenio">Con Convenio</option>
            <option value="sin_convenio">Sin Convenio</option>
          </select>

          <select
            value={cumplimientoFilter}
            onChange={(e) => { setCumplimientoFilter(e.target.value); setPage(0); }}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            title="Filtrar por estado de cumplimiento de mantenimiento"
          >
            <option value="">Cumplimiento: Todos</option>
            {ESTADO_CUMPLIMIENTO_OPTIONS.filter((o) => o.value !== 'todos').map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <div className="flex h-10 items-center rounded-lg border border-gray-200 bg-white px-3 dark:border-navy-600 dark:bg-navy-700">
            <MdSearch className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
              placeholder="Buscar por patente, N interno, nombre..."
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
        ) : vehiculos.length === 0 ? (
          <div className="py-10 text-center text-gray-500 dark:text-gray-400">
            No se encontraron vehiculos con los filtros seleccionados.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-navy-600">
                <th className="px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Vehiculo
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">
                  Tipo
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 lg:table-cell">
                  Marca / Modelo / Anio
                </th>
                <th className="hidden px-3 py-3 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">
                  Asignado A
                </th>
                <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 xl:table-cell">
                  Km
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Estado
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Convenio
                </th>
                <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 xl:table-cell">
                  Ultimo Mantto
                </th>
                <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 xl:table-cell">
                  Cumplimiento
                </th>
                <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 sm:table-cell">
                  Combustible
                </th>
                <th className="hidden px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400 2xl:table-cell">
                  Frecuencia
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {vehiculos.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50"
                >
                  <td className="max-w-xs px-3 py-3">
                    <p className="text-sm font-semibold text-navy-700 dark:text-white line-clamp-1">
                      {v.nombreVehiculo}
                    </p>
                    {v.patente && (
                      <span className="mt-0.5 inline-block text-xs text-gray-400">
                        {v.patente}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">{v.tipoVehiculo}</span>
                  </td>
                  <td className="hidden px-3 py-3 lg:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">
                      {v.marca}{v.modelo ? ` / ${v.modelo}` : ''}{v.anio ? ` / ${v.anio}` : ''}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">{v.asignadoA}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-center xl:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">
                      {v.kilometraje ? v.kilometraje.toLocaleString('es-CL') : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                        ESTADO_FLOTA_COLORS[v.estado] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {ESTADO_FLOTA_LABELS[v.estado] || v.estado}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {v.convenioActivo ? (
                      <MdCheckCircle className="mx-auto h-5 w-5 text-green-500" title="Con convenio vigente" />
                    ) : (
                      <MdCancel className="mx-auto h-5 w-5 text-red-400" title="Sin convenio" />
                    )}
                  </td>
                  <td className="hidden px-3 py-3 text-center xl:table-cell">
                    <UltimoMttoBadge
                      fecha={v.ultimaFechaMantenimiento}
                      estado={v.ultimoEstadoMantenimiento}
                    />
                  </td>
                  <td className="hidden px-3 py-3 text-center xl:table-cell">
                    <CumplimientoBadge
                      estado={v.estadoCumplimientoMantenimiento}
                      porcentaje={v.cumplimientoPorcentaje}
                      periodosCumplidos={v.periodosCumplidos}
                      periodosEsperados={v.periodosEsperados}
                      periodosFaltantes={v.periodosFaltantes}
                      estadoFisico={v.estado}
                      fechaBaja={v.fechaBaja}
                    />
                  </td>
                  <td className="hidden px-3 py-3 text-center sm:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">
                      {v.combustible || '—'}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 text-center 2xl:table-cell">
                    <span className="text-sm text-navy-700 dark:text-gray-300">
                      {v.frecuencia ? `${v.frecuencia}m` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleView(v)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
                        title="Ver detalle"
                      >
                        <MdVisibility className="h-4 w-4" />
                      </button>
                      {userAccessLevel >= 3 && (
                        <button
                          onClick={() => handleEdit(v)}
                          className="rounded-lg p-2 text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20"
                          title="Editar"
                        >
                          <MdEdit className="h-4 w-4" />
                        </button>
                      )}
                      {userAccessLevel >= 5 && (
                        <button
                          onClick={() => handleDelete(v)}
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
      <FlotaVehicularFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingVehiculo(null);
        }}
        onSave={() => {
          fetchVehiculos();
          fetchStatsGlobal();
          loadFilterOptions();
        }}
        vehiculo={editingVehiculo}
      />

      <FlotaVehicularDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setViewingVehiculo(null);
        }}
        onEdit={() => {
          setDetailModalOpen(false);
          if (viewingVehiculo) {
            setEditingVehiculo(viewingVehiculo);
            setFormModalOpen(true);
          }
        }}
        vehiculo={viewingVehiculo}
        onActivoChanged={() => {
          fetchVehiculos();
          fetchStatsGlobal();
        }}
      />
    </div>
  );
};

export default FlotaVehicularPage;
