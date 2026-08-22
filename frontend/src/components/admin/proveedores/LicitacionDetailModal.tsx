'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  MdClose,
  MdEdit,
  MdAdd,
  MdUpload,
  MdDownload,
  MdDelete,
  MdHistory,
  MdDescription,
  MdDevices,
  MdTimeline,
} from 'react-icons/md';
import {
  Licitacion,
  LicitacionEquipo,
  LicitacionHistorialEntry,
  INVENTARIO_DESTINO_LABELS,
  INVENTARIO_DESTINO_COLORS,
  ESTADO_LICITACION_COLORS,
  ESTADO_LICITACION_LABELS,
  CargaMasivaResult,
} from 'types/licitacion.types';
import { LicitacionService } from 'services/licitacion.service';
import ExtensionFormModal from './ExtensionFormModal';
import Parse from 'utils/parseClient';
import Swal from 'sweetalert2';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  licitacion: Licitacion | null;
  proveedorNombre: string;
}

type TabType = 'detalle' | 'equipos' | 'historial';

export default function LicitacionDetailModal({
  isOpen,
  onClose,
  onEdit,
  onRefresh,
  licitacion,
  proveedorNombre,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('detalle');
  const [equipos, setEquipos] = useState<LicitacionEquipo[]>([]);
  const [loadingEquipos, setLoadingEquipos] = useState(false);
  const [historial, setHistorial] = useState<LicitacionHistorialEntry[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialTotal, setHistorialTotal] = useState(0);

  const [extFormOpen, setExtFormOpen] = useState(false);
  const [cargaResult, setCargaResult] = useState<CargaMasivaResult | null>(null);

  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  const loadEquipos = useCallback(async () => {
    if (!licitacion) return;
    setLoadingEquipos(true);
    try {
      const result = await LicitacionService.getEquipos(licitacion.id);
      setEquipos(result);
    } catch (error) {
      console.error('Error cargando equipos:', error);
    } finally {
      setLoadingEquipos(false);
    }
  }, [licitacion]);

  const loadHistorial = useCallback(async (append = false) => {
    if (!licitacion) return;
    setLoadingHistorial(true);
    try {
      const skip = append ? historial.length : 0;
      const result = await LicitacionService.getHistorial(licitacion.id, 10, skip);
      if (append) {
        setHistorial((prev) => [...prev, ...result.results]);
      } else {
        setHistorial(result.results);
      }
      setHistorialTotal(result.total);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  }, [licitacion, historial.length]);

  useEffect(() => {
    if (isOpen && licitacion) {
      setActiveTab('detalle');
      setHistorial([]);
      setCargaResult(null);
      loadEquipos();
    }
  }, [isOpen, licitacion, loadEquipos]);

  useEffect(() => {
    if (activeTab === 'historial' && historial.length === 0 && licitacion) {
      loadHistorial();
    }
  }, [activeTab, licitacion]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL');
  };

  const handleDownloadTemplate = async () => {
    if (!licitacion) return;
    try {
      const XLSX = await import('xlsx');
      let headers: string[] = [];
      let example: any[] = [];

      if (licitacion.inventarioDestino === 'medico' || licitacion.inventarioDestino === 'industrial') {
        headers = ['nombreEquipo', 'marca', 'modelo', 'inventario', 'serie'];
        example = [
          { nombreEquipo: 'ECOGRAFO', marca: 'GE', modelo: 'LOGIQ E10', inventario: 'INV-001', serie: 'SN-12345' },
        ];
      } else if (licitacion.inventarioDestino === 'infraestructura') {
        headers = ['componente', 'marca', 'modelo', 'codigoInterno', 'serie'];
        example = [
          { componente: 'Tablero electrico', marca: 'Schneider', modelo: 'NSX100', codigoInterno: 'EL-001', serie: 'SN-001' },
        ];
      } else if (licitacion.inventarioDestino === 'flota') {
        headers = ['tipoVehiculo', 'marca', 'modelo', 'patente', 'VIN'];
        example = [
          { tipoVehiculo: 'Ambulancia', marca: 'Mercedes', modelo: 'Sprinter', patente: 'ABCD-12', VIN: 'WDB9066331S123456' },
        ];
      }

      const ws = XLSX.utils.json_to_sheet(example, { header: headers });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Formato');
      XLSX.writeFile(wb, `formato_carga_${licitacion.inventarioDestino}.xlsx`);
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al descargar formato', 'error');
    }
  };

  const handleCargarExcel = async () => {
    if (!licitacion) return;
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

        const confirm = await Swal.fire({
          title: 'Confirmar carga',
          text: `Se asociaran ${rows.length} equipos a esta licitacion. Desea continuar?`,
          icon: 'question',
          showCancelButton: true,
          cancelButtonText: 'Cancelar',
          confirmButtonText: 'Cargar',
        });

        if (!confirm.isConfirmed) return;

        const result = await LicitacionService.cargarEquipos(licitacion.id, rows);
        setCargaResult(result);
        loadEquipos();
        onRefresh();

        if (result.noEncontrados.length > 0) {
          Swal.fire(
            'Carga completada con observaciones',
            `Asociados: ${result.asociados}, No encontrados: ${result.noEncontrados.length}, Errores: ${result.errores}`,
            'warning'
          );
        } else {
          Swal.fire(
            'Carga completada',
            `Asociados: ${result.asociados}, Errores: ${result.errores}, Total: ${result.total}`,
            'success'
          );
        }
      } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al cargar', 'error');
      }
    };
    input.click();
  };

  const handleDescargarNoEncontrados = async () => {
    if (!cargaResult || cargaResult.noEncontrados.length === 0) return;
    try {
      const XLSX = await import('xlsx');
      const wsData = cargaResult.noEncontrados.map((item) => ({
        ...item,
      }));
      const ws = XLSX.utils.json_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'No Encontrados');
      XLSX.writeFile(wb, 'equipos_no_encontrados.xlsx');
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al descargar', 'error');
    }
  };

  const handleDesasociar = async (equipo: LicitacionEquipo) => {
    const result = await Swal.fire({
      title: 'Desasociar equipo',
      text: `Se desasociara "${equipo.nombreEquipo}" de esta licitacion`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Desasociar',
    });
    if (result.isConfirmed) {
      try {
        await LicitacionService.desasociarEquipo(equipo.id);
        loadEquipos();
        onRefresh();
      } catch (error: any) {
        Swal.fire('Error', error.message || 'Error al desasociar', 'error');
      }
    }
  };

  if (!isOpen || !licitacion) return null;

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'detalle', label: 'Detalle', icon: MdDescription },
    { key: 'equipos', label: `Equipos (${equipos.length})`, icon: MdDevices },
    { key: 'historial', label: 'Historial', icon: MdHistory },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
        <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-4 pr-10">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-navy-700 dark:text-white">
                Licitacion {licitacion.numeroLicitacion}
              </h3>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  ESTADO_LICITACION_COLORS[licitacion.estado] || 'bg-gray-100 text-gray-600'
                }`}
              >
                {ESTADO_LICITACION_LABELS[licitacion.estado] || licitacion.estado}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Proveedor: {proveedorNombre} | {INVENTARIO_DESTINO_LABELS[licitacion.inventarioDestino]}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-navy-600">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-brand-500 text-brand-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Detalle */}
          {activeTab === 'detalle' && (
            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField label="Numero Licitacion" value={licitacion.numeroLicitacion} />
                <DetailField
                  label="Inventario Destino"
                  value={INVENTARIO_DESTINO_LABELS[licitacion.inventarioDestino] || licitacion.inventarioDestino}
                />
                <DetailField label="Fecha Inicio" value={formatDate(licitacion.fechaInicio)} />
                <DetailField label="Fecha Termino Original" value={formatDate(licitacion.fechaTermino)} />
                <DetailField label="Fecha Termino Efectiva" value={formatDate(licitacion.fechaTerminoEfectiva)} />
                <DetailField label="Equipos Asociados" value={String(licitacion.totalEquipos)} />
              </div>

              {/* Extensiones */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-navy-700 dark:text-white">
                    Extensiones de Contrato ({licitacion.extensiones.length})
                  </h4>
                  {userAccessLevel >= 3 && (
                    <button
                      onClick={() => setExtFormOpen(true)}
                      className="flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-500 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40"
                    >
                      <MdAdd className="h-3 w-3" />
                      Agregar Extension
                    </button>
                  )}
                </div>
                {licitacion.extensiones.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Sin extensiones registradas.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {licitacion.extensiones.map((ext, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-900/20"
                      >
                        <div>
                          <p className="text-sm font-medium text-navy-700 dark:text-white">
                            Nueva fecha: {formatDate(ext.nuevaFechaTermino)}
                          </p>
                          {ext.descripcion && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{ext.descripcion}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {formatDate(ext.fechaExtension)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit button */}
              {userAccessLevel >= 3 && (
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    <MdEdit className="h-4 w-4" />
                    Editar Licitacion
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Tab: Equipos */}
          {activeTab === 'equipos' && (
            <div>
              {userAccessLevel >= 3 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
                  >
                    <MdDownload className="h-4 w-4" />
                    Descargar Formato
                  </button>
                  <button
                    onClick={handleCargarExcel}
                    className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    <MdUpload className="h-4 w-4" />
                    Cargar Equipos (Excel)
                  </button>
                </div>
              )}

              {/* Resultado de carga masiva */}
              {cargaResult && cargaResult.noEncontrados.length > 0 && (
                <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                        {cargaResult.noEncontrados.length} equipo(s) no encontrados en el inventario
                      </p>
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Puede descargar el listado para revisarlo
                      </p>
                    </div>
                    <button
                      onClick={handleDescargarNoEncontrados}
                      className="flex items-center gap-1 rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700"
                    >
                      <MdDownload className="h-3 w-3" />
                      Descargar Excel
                    </button>
                  </div>
                </div>
              )}

              {loadingEquipos ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : equipos.length === 0 ? (
                <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay equipos asociados a esta licitacion.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-navy-600">
                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                          Equipo
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                          Marca / Modelo
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                          Serie
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500">
                          Inventario
                        </th>
                        {userAccessLevel >= 3 && (
                          <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500">
                            Acciones
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {equipos.map((eq) => (
                        <tr
                          key={eq.id}
                          className="border-b border-gray-100 hover:bg-gray-50 dark:border-navy-700 dark:hover:bg-navy-700/50"
                        >
                          <td className="px-3 py-2 text-sm font-medium text-navy-700 dark:text-white">
                            {eq.nombreEquipo}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                            {eq.marca}{eq.modelo ? ` / ${eq.modelo}` : ''}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                            {eq.serie}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                            {eq.inventario}
                          </td>
                          {userAccessLevel >= 3 && (
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() => handleDesasociar(eq)}
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                title="Desasociar"
                              >
                                <MdDelete className="h-4 w-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Tab: Historial */}
          {activeTab === 'historial' && (
            <div>
              {loadingHistorial && historial.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : historial.length === 0 ? (
                <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay registros en el historial.
                </p>
              ) : (
                <div className="relative ml-4 border-l-2 border-gray-200 dark:border-navy-600">
                  {historial.map((entry) => (
                    <div key={entry.id} className="relative mb-4 ml-6">
                      <div
                        className={`absolute -left-[33px] h-4 w-4 rounded-full border-2 border-white dark:border-navy-800 ${
                          entry.accion === 'creacion'
                            ? 'bg-green-500'
                            : entry.accion === 'eliminacion'
                            ? 'bg-red-500'
                            : entry.accion === 'extension'
                            ? 'bg-yellow-500'
                            : entry.accion === 'carga_equipos'
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div className="rounded-lg border border-gray-100 p-3 dark:border-navy-600">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-navy-700 dark:text-white capitalize">
                            {entry.accion.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(entry.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {entry.descripcion}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Por: {entry.usuarioNombre}
                        </p>
                      </div>
                    </div>
                  ))}
                  {historial.length < historialTotal && (
                    <button
                      onClick={() => loadHistorial(true)}
                      disabled={loadingHistorial}
                      className="ml-6 mt-2 text-sm font-semibold text-brand-500 hover:text-brand-600"
                    >
                      {loadingHistorial ? 'Cargando...' : 'Cargar mas'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ExtensionFormModal
        isOpen={extFormOpen}
        onClose={() => setExtFormOpen(false)}
        onSave={() => {
          onRefresh();
          if (licitacion) {
            LicitacionService.getById(licitacion.id).then(() => { /* parent refresca */ });
          }
        }}
        licitacionId={licitacion.id}
        licitacionNumero={licitacion.numeroLicitacion}
        fechaTerminoOriginal={licitacion.fechaTermino}
        fechaTerminoEfectiva={licitacion.fechaTerminoEfectiva}
      />
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm text-navy-700 dark:text-gray-200">{value || '—'}</p>
    </div>
  );
}
