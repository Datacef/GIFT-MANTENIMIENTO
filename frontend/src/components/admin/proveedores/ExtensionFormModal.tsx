'use client';
import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import { ExtensionContrato } from 'types/licitacion.types';
import { LicitacionService } from 'services/licitacion.service';
import Swal from 'sweetalert2';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  licitacionId: string;
  licitacionNumero: string;
  fechaTerminoOriginal?: string;
  fechaTerminoEfectiva?: string;
}

export default function ExtensionFormModal({
  isOpen,
  onClose,
  onSave,
  licitacionId,
  licitacionNumero,
  fechaTerminoOriginal,
  fechaTerminoEfectiva,
}: Props) {
  const [extension, setExtension] = useState<ExtensionContrato>({
    fechaExtension: new Date().toISOString().split('T')[0],
    nuevaFechaTermino: '',
    descripcion: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExtension({
        fechaExtension: new Date().toISOString().split('T')[0],
        nuevaFechaTermino: '',
        descripcion: '',
      });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!extension.nuevaFechaTermino) {
      Swal.fire('Error', 'La nueva fecha de termino es obligatoria', 'error');
      return;
    }
    // Validar que la nueva fecha sea posterior a la fecha efectiva actual
    const referencia = fechaTerminoEfectiva || fechaTerminoOriginal;
    if (referencia && extension.nuevaFechaTermino <= referencia.split('T')[0]) {
      Swal.fire(
        'Fecha invalida',
        'La nueva fecha de termino debe ser posterior a la fecha de termino efectiva actual.',
        'warning'
      );
      return;
    }

    setSaving(true);
    try {
      await LicitacionService.agregarExtension(licitacionId, extension);
      Swal.fire('Extension agregada', 'La extension de contrato se registro correctamente', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al agregar extension', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
        >
          <MdClose className="h-5 w-5" />
        </button>

        <h3 className="mb-2 text-xl font-bold text-navy-700 dark:text-white">
          Agregar Extension de Contrato
        </h3>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Licitacion: <span className="font-semibold">{licitacionNumero}</span>
        </p>
        {(fechaTerminoOriginal || fechaTerminoEfectiva) && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs dark:border-blue-900 dark:bg-blue-900/20">
            {fechaTerminoOriginal && (
              <p className="text-blue-900 dark:text-blue-200">
                <strong>Fecha termino original:</strong>{' '}
                {new Date(fechaTerminoOriginal).toLocaleDateString('es-CL')} (se conserva, no se modifica)
              </p>
            )}
            {fechaTerminoEfectiva && fechaTerminoEfectiva !== fechaTerminoOriginal && (
              <p className="mt-1 text-blue-900 dark:text-blue-200">
                <strong>Fecha termino efectiva actual:</strong>{' '}
                {new Date(fechaTerminoEfectiva).toLocaleDateString('es-CL')}
              </p>
            )}
            <p className="mt-2 text-[11px] text-blue-700 dark:text-blue-300">
              La nueva fecha se aplicara como extension y actualizara el convenio en los 4 inventarios
              (Equipos Medicos, Industriales, Flota e Infraestructura).
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Fecha de Extension
            </label>
            <input
              type="date"
              value={extension.fechaExtension}
              onChange={(e) =>
                setExtension((prev) => ({ ...prev, fechaExtension: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nueva Fecha de Termino *
            </label>
            <input
              type="date"
              value={extension.nuevaFechaTermino}
              onChange={(e) =>
                setExtension((prev) => ({ ...prev, nuevaFechaTermino: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descripcion / Motivo
            </label>
            <textarea
              value={extension.descripcion}
              onChange={(e) =>
                setExtension((prev) => ({ ...prev, descripcion: e.target.value }))
              }
              placeholder="Motivo de la extension..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Agregar Extension'}
          </button>
        </div>
      </div>
    </div>
  );
}
