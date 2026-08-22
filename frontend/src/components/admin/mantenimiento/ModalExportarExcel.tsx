'use client';
import { useState } from 'react';
import { MdClose, MdFileDownload, MdWarning } from 'react-icons/md';
import {
  MantenimientoExportService,
  ExportProgress,
} from 'services/mantenimiento-export.service';
import { generarExcelMantenimientos } from 'utils/excel-mantenimiento';
import {
  MantenimientoExportFilters,
  DOMINIO_MANTENIMIENTO_LABELS,
} from 'types/mantenimiento.types';

interface Props {
  open: boolean;
  onClose: () => void;
  filters: MantenimientoExportFilters;
}

/**
 * Modal que ejecuta la exportacion a Excel aplicando los MISMOS filtros
 * visibles en la pagina. Hace paginacion automatica en bloques de 1000
 * y muestra progreso en vivo.
 */
export default function ModalExportarExcel({ open, onClose, filters }: Props) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<number | null>(null);

  if (!open) return null;

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);
    setProgress({ loaded: 0, total: 0, hasMore: true });
    try {
      const registros = await MantenimientoExportService.fetchAll(filters, (p) =>
        setProgress(p)
      );
      if (registros.length === 0) {
        setError('No se encontraron registros con los filtros aplicados.');
        return;
      }
      await generarExcelMantenimientos(registros, {
        dominio: filters.dominio,
        fechaDesde: filters.fechaDesde,
        fechaHasta: filters.fechaHasta,
      });
      setSuccess(registros.length);
    } catch (e: any) {
      setError(e?.message || 'Error al generar el archivo Excel.');
    } finally {
      setExporting(false);
    }
  };

  const resumenFiltros: { label: string; value: string }[] = [
    {
      label: 'Inventario',
      value: filters.dominio
        ? DOMINIO_MANTENIMIENTO_LABELS[filters.dominio] || filters.dominio
        : 'Todos',
    },
    { label: 'Fecha desde', value: filters.fechaDesde || '—' },
    { label: 'Fecha hasta', value: filters.fechaHasta || '—' },
    { label: 'Identificador', value: filters.identificador || '—' },
    { label: 'Nombre', value: filters.nombreActivo || '—' },
    { label: 'Tipo', value: filters.tipoMantenimiento || '—' },
    { label: 'Estado', value: filters.estadoValidacion || '—' },
    { label: 'Tecnico', value: filters.tecnicoNombre || '—' },
  ];

  const porcentaje =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.loaded / progress.total) * 100))
      : null;

  const sinRango = !filters.fechaDesde && !filters.fechaHasta;

  return (
    <div
      data-testid="modal-exportar-excel-mantenimiento"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-navy-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-700 dark:text-white">
            Exportar mantenimientos a Excel
          </h3>
          <button
            onClick={onClose}
            disabled={exporting}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700 disabled:opacity-50"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
          Se exportaran los registros que cumplan los filtros aplicados. El archivo
          incluye campos de identificacion del activo, datos del mantenimiento y el
          <strong> ID de la pauta</strong> (para busqueda inversa). No se incluyen las
          preguntas dinamicas del checklist.
        </p>

        {sinRango && !exporting && !success && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
            <MdWarning className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              No has definido un rango de fechas. Se exportaran TODOS los registros que
              cumplan el resto de filtros.
            </span>
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-xs dark:bg-navy-900">
          {resumenFiltros.map((f) => (
            <div key={f.label}>
              <span className="font-semibold text-gray-500 dark:text-gray-400">
                {f.label}:
              </span>{' '}
              <span className="text-navy-700 dark:text-gray-200">{f.value}</span>
            </div>
          ))}
        </div>

        {progress && (
          <div className="mb-4">
            <div className="mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
              <span>
                Descargando{' '}
                <strong>{progress.loaded}</strong>
                {progress.total > 0 && (
                  <>
                    {' '}de <strong>{progress.total}</strong>
                  </>
                )}{' '}
                registros
              </span>
              {porcentaje !== null && <span>{porcentaje}%</span>}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-navy-700">
              <div
                className="h-full bg-brand-500 transition-all"
                style={{
                  width:
                    porcentaje !== null
                      ? `${porcentaje}%`
                      : progress.hasMore
                      ? '60%'
                      : '100%',
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">
            {error}
          </div>
        )}

        {success !== null && (
          <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/40 dark:text-green-200">
            Se exportaron <strong>{success}</strong> registros correctamente.
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={exporting}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700 disabled:opacity-50"
          >
            {success !== null ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            <MdFileDownload className="h-4 w-4" />
            {exporting ? 'Exportando...' : success !== null ? 'Exportar nuevamente' : 'Generar Excel'}
          </button>
        </div>
      </div>
    </div>
  );
}
