'use client';
import { useState, useEffect } from 'react';
import { MdClose, MdUpload, MdInsertDriveFile } from 'react-icons/md';
import Parse from 'utils/parseClient';
import Swal from 'sweetalert2';

export type ClaseInventario =
  | 'InventarioEquipoMedico'
  | 'InventarioEquipoIndustrial'
  | 'InventarioFlotaVehicular'
  | 'InventarioInfraestructura';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clase: ClaseInventario;
  activoId: string;
  nombreActivo: string;
  // 'baja' = dar de baja; 'reactivar' = reactivar un activo dado de baja
  modo: 'baja' | 'reactivar';
}

const hoyISO = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function BajaActivoModal({
  isOpen,
  onClose,
  onSuccess,
  clase,
  activoId,
  nombreActivo,
  modo,
}: Props) {
  const [fechaBaja, setFechaBaja] = useState(hoyISO());
  const [motivo, setMotivo] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFechaBaja(hoyISO());
      setMotivo('');
      setFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const titulo = modo === 'baja' ? 'Dar de baja activo' : 'Reactivar activo';
  const ctaLabel = modo === 'baja' ? 'Dar de baja' : 'Reactivar';
  const ctaColor = modo === 'baja' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700';

  const handleSubmit = async () => {
    const motivoLimpio = motivo.trim();
    if (!motivoLimpio) {
      Swal.fire('Falta motivo', `Indique el motivo de la ${modo === 'baja' ? 'baja' : 'reactivacion'}.`, 'warning');
      return;
    }

    setSaving(true);
    try {
      let archivoInfo: { archivoNombre?: string; archivoUrl?: string } = {};
      if (modo === 'baja' && file) {
        const parseFile = new Parse.File(file.name, file);
        await parseFile.save();
        archivoInfo = { archivoNombre: file.name, archivoUrl: parseFile.url() };
      }

      if (modo === 'baja') {
        await Parse.Cloud.run('darDeBajaActivo', {
          clase,
          id: activoId,
          fechaBaja,
          motivo: motivoLimpio,
          ...archivoInfo,
        });
        Swal.fire('Activo dado de baja', `${nombreActivo} fue dado de baja correctamente.`, 'success');
      } else {
        await Parse.Cloud.run('reactivarActivo', {
          clase,
          id: activoId,
          motivo: motivoLimpio,
        });
        Swal.fire('Activo reactivado', `${nombreActivo} fue reactivado correctamente.`, 'success');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error?.message || 'No se pudo completar la operacion', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-navy-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">{titulo}</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-navy-700"
            aria-label="Cerrar"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {modo === 'baja' ? (
            <>
              Estas a punto de dar de baja: <strong>{nombreActivo}</strong>. Esta accion marca el
              activo como Baja y lo excluye de los conteos de cumplimiento.
            </>
          ) : (
            <>
              Vas a reactivar: <strong>{nombreActivo}</strong>. El activo volvera a su estado
              previo y se incluira nuevamente en los conteos de cumplimiento.
            </>
          )}
        </p>

        {modo === 'baja' && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Fecha de baja
            </label>
            <input
              type="date"
              value={fechaBaja}
              onChange={(e) => setFechaBaja(e.target.value)}
              max={hoyISO()}
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Motivo <span className="text-red-500">*</span>
          </label>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder={modo === 'baja'
              ? 'Ej: Equipo obsoleto, no reparable, fin de vida util...'
              : 'Ej: Activo recuperado tras reparacion mayor.'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          />
        </div>

        {modo === 'baja' && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Acta de baja (opcional)
            </label>
            <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 text-sm text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700">
              <MdUpload className="h-4 w-4" />
              <span>{file ? 'Reemplazar archivo' : 'Subir archivo (PDF, imagen)'}</span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
            {file && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-navy-700 dark:text-gray-300">
                <MdInsertDriveFile className="h-4 w-4" />
                <span className="line-clamp-1 flex-1">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-red-500 hover:underline"
                >
                  Quitar
                </button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${ctaColor}`}
          >
            {saving ? 'Procesando...' : ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
