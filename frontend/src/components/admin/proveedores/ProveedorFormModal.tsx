'use client';
import { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import {
  Proveedor,
  ProveedorFormData,
  validarRut,
  formatRut,
} from 'types/proveedor.types';
import { ProveedorService } from 'services/proveedor.service';
import Swal from 'sweetalert2';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  proveedor?: Proveedor | null;
}

const emptyForm: ProveedorFormData = {
  rut: '',
  nombre: '',
  correo: '',
  telefono: '',
  direccion: '',
  descripcion: '',
  activo: true,
};

export default function ProveedorFormModal({ isOpen, onClose, onSave, proveedor }: Props) {
  const [form, setForm] = useState<ProveedorFormData>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [rutError, setRutError] = useState('');

  const isEditing = !!proveedor;

  useEffect(() => {
    if (isOpen) {
      if (proveedor) {
        setForm({
          rut: proveedor.rut,
          nombre: proveedor.nombre,
          correo: proveedor.correo,
          telefono: proveedor.telefono,
          direccion: proveedor.direccion,
          descripcion: proveedor.descripcion,
          activo: proveedor.activo,
        });
      } else {
        setForm({ ...emptyForm });
      }
      setRutError('');
    }
  }, [isOpen, proveedor]);

  const handleChange = (field: keyof ProveedorFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'rut') setRutError('');
  };

  const handleRutBlur = () => {
    if (form.rut.trim()) {
      const formatted = formatRut(form.rut.trim());
      setForm((prev) => ({ ...prev, rut: formatted }));
      if (!validarRut(formatted)) {
        setRutError('RUT no valido');
      } else {
        setRutError('');
      }
    }
  };

  const handleSubmit = async () => {
    if (!form.rut.trim()) {
      Swal.fire('Error', 'El RUT es obligatorio', 'error');
      return;
    }
    if (!validarRut(form.rut.trim())) {
      setRutError('RUT no valido');
      return;
    }
    if (!form.nombre.trim()) {
      Swal.fire('Error', 'El nombre es obligatorio', 'error');
      return;
    }

    setSaving(true);
    try {
      if (isEditing && proveedor) {
        await ProveedorService.update(proveedor.id, form);
        Swal.fire('Actualizado', 'Proveedor actualizado correctamente', 'success');
      } else {
        await ProveedorService.create(form);
        Swal.fire('Creado', 'Proveedor creado correctamente', 'success');
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
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
        >
          <MdClose className="h-5 w-5" />
        </button>

        <h3 className="mb-6 text-xl font-bold text-navy-700 dark:text-white">
          {isEditing ? 'Editar Proveedor' : 'Nuevo Proveedor'}
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* RUT */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              RUT *
            </label>
            <input
              type="text"
              value={form.rut}
              onChange={(e) => handleChange('rut', e.target.value)}
              onBlur={handleRutBlur}
              placeholder="12.345.678-9"
              className={`h-10 w-full rounded-lg border px-3 text-sm outline-none dark:bg-navy-700 dark:text-white ${
                rutError
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-200 dark:border-navy-600'
              }`}
            />
            {rutError && (
              <p className="mt-1 text-xs text-red-500">{rutError}</p>
            )}
          </div>

          {/* Nombre */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Nombre / Razon Social *
            </label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Nombre del proveedor"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>

          {/* Correo */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Correo
            </label>
            <input
              type="email"
              value={form.correo}
              onChange={(e) => handleChange('correo', e.target.value)}
              placeholder="contacto@proveedor.cl"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>

          {/* Telefono */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Telefono
            </label>
            <input
              type="text"
              value={form.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              placeholder="+56 9 1234 5678"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>

          {/* Direccion — full width */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Direccion
            </label>
            <input
              type="text"
              value={form.direccion}
              onChange={(e) => handleChange('direccion', e.target.value)}
              placeholder="Direccion del proveedor"
              className="h-10 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>

          {/* Descripcion — full width */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Descripcion / Giro
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              placeholder="Descripcion o giro comercial"
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none dark:border-navy-600 dark:bg-navy-700 dark:text-white"
            />
          </div>

          {/* Activo */}
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => handleChange('activo', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label className="text-sm text-gray-700 dark:text-gray-300">Activo</label>
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
