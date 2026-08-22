'use client';
import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import {
  Licitacion,
  LicitacionFormData,
  INVENTARIO_DESTINO_OPTIONS,
} from 'types/licitacion.types';
import { LicitacionService } from 'services/licitacion.service';
import Swal from 'sweetalert2';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  proveedorId: string;
  proveedorNombre: string;
  licitacion?: Licitacion | null;
}

const emptyForm: LicitacionFormData = {
  proveedorId: '',
  numeroLicitacion: '',
  inventarioDestino: '',
  fechaInicio: '',
  fechaTermino: '',
};

export default function LicitacionFormModal({
  isOpen,
  onClose,
  onSave,
  proveedorId,
  proveedorNombre,
  licitacion,
}: Props) {
  const [form, setForm] = useState<LicitacionFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const isEditing = !!licitacion;

  useEffect(() => {
    if (isOpen) {
      if (licitacion) {
        setForm({
          proveedorId: licitacion.proveedorId,
          numeroLicitacion: licitacion.numeroLicitacion,
          inventarioDestino: licitacion.inventarioDestino,
          fechaInicio: licitacion.fechaInicio,
          fechaTermino: licitacion.fechaTermino,
        });
      } else {
        setForm({ ...emptyForm, proveedorId });
      }
    }
  }, [isOpen, licitacion, proveedorId]);

  const handleChange = (field: keyof LicitacionFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.numeroLicitacion.trim()) {
      Swal.fire('Error', 'El numero de licitacion es obligatorio', 'error');
      return;
    }
    if (!form.inventarioDestino) {
      Swal.fire('Error', 'Debe seleccionar un inventario destino', 'error');
      return;
    }
    if (!form.fechaInicio) {
      Swal.fire('Error', 'La fecha de inicio es obligatoria', 'error');
      return;
    }
    if (!form.fechaTermino) {
      Swal.fire('Error', 'La fecha de termino es obligatoria', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && licitacion) {
        await LicitacionService.update(licitacion.id, form);
        Swal.fire('Actualizada', 'Licitacion actualizada correctamente', 'success');
      } else {
        await LicitacionService.create(form);
        Swal.fire('Creada', 'Licitacion creada correctamente', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
        >
          <MdClose className="h-5 w-5" />
        </button>

        <h3 className="mb-2 text-xl font-bold text-navy-700 dark:text-white">
          {isEditing ? 'Editar Licitacion' : 'Nueva Licitacion'}
        </h3>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Proveedor: <span className="font-semibold">{proveedorNombre}</span>
        </p>

        <div className="flex flex-col gap-4">
          {/* Numero Licitacion */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Numero de Licitacion *
            </label>
            <input
              type="text"
              value={form.numeroLicitacion}
              onChange={(e) => handleChange('numeroLicitacion', e.target.value)}
              placeholder="Ej: 1057401-22-LE24"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>

          {/* Inventario Destino */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Inventario Destino *
            </label>
            <select
              value={form.inventarioDestino}
              onChange={(e) => handleChange('inventarioDestino', e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            >
              <option value="">Seleccionar inventario...</option>
              {INVENTARIO_DESTINO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha Inicio *
              </label>
              <input
                type="date"
                value={form.fechaInicio}
                onChange={(e) => handleChange('fechaInicio', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Fecha Termino *
              </label>
              <input
                type="date"
                value={form.fechaTermino}
                onChange={(e) => handleChange('fechaTermino', e.target.value)}
                className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
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
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
