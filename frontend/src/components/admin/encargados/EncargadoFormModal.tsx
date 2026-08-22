'use client';
import { useEffect, useState } from 'react';
import { MdClose, MdSave } from 'react-icons/md';
import {
  EncargadoMantenimiento,
  EncargadoFormData,
  ESPECIALIDADES_SUGERIDAS,
} from 'types/encargado.types';
import { DOMINIO_MANTENIMIENTO_OPTIONS } from 'types/mantenimiento.types';
import { EncargadoService } from 'services/solicitudes/encargado.service';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  encargado?: EncargadoMantenimiento | null;
}

const inputBase =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none dark:border-navy-600 dark:bg-navy-800 dark:text-white';

export default function EncargadoFormModal({ open, onClose, onSaved, encargado }: Props) {
  const esEdicion = Boolean(encargado?.id);
  const [form, setForm] = useState<EncargadoFormData>({
    nombre: '', cargo: '', especialidades: [], dominios: [], telefono: '', email: '',
    username: '', password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (encargado) {
      setForm({
        nombre: encargado.nombre || '',
        cargo: encargado.cargo || '',
        especialidades: encargado.especialidades || [],
        dominios: encargado.dominios || [],
        telefono: encargado.telefono || '',
        email: encargado.email || '',
      });
    } else {
      setForm({ nombre: '', cargo: '', especialidades: [], dominios: [], telefono: '', email: '', username: '', password: '' });
    }
    setError(null);
  }, [encargado, open]);

  if (!open) return null;

  const toggleArray = (campo: 'especialidades' | 'dominios', val: string) => {
    setForm((prev) => ({
      ...prev,
      [campo]: prev[campo].includes(val) ? prev[campo].filter((v) => v !== val) : [...prev[campo], val],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.nombre || !form.email) { setError('Nombre y email obligatorios'); return; }
    if (!esEdicion && !form.password) { setError('Debes definir una contrasena inicial para la cuenta Parse'); return; }
    setSaving(true);
    try {
      if (esEdicion && encargado) {
        await EncargadoService.actualizar(encargado.id, form);
      } else {
        await EncargadoService.crear(form);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-navy-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-700 dark:text-white">
            {esEdicion ? 'Editar encargado' : 'Nuevo encargado'}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"><MdClose /></button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Nombre completo *</label>
            <input className={inputBase} value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Cargo</label>
            <input className={inputBase} value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Email (= usuario Parse) *</label>
            <input type="email" className={inputBase} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={esEdicion} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Telefono</label>
            <input className={inputBase} value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </div>
          {!esEdicion && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Usuario (login)</label>
                <input className={inputBase} placeholder="(por defecto = email)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Contrasena inicial *</label>
                <input type="password" className={inputBase} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Especialidades</label>
          <div className="flex flex-wrap gap-2">
            {ESPECIALIDADES_SUGERIDAS.map((esp) => (
              <button
                type="button"
                key={esp}
                onClick={() => toggleArray('especialidades', esp)}
                className={`rounded-full border px-3 py-1 text-xs ${form.especialidades.includes(esp) ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-300'}`}
              >
                {esp}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Dominios que atiende</label>
          <div className="flex flex-wrap gap-2">
            {DOMINIO_MANTENIMIENTO_OPTIONS.map((d) => (
              <button
                type="button"
                key={d.value}
                onClick={() => toggleArray('dominios', d.value)}
                className={`rounded-full border px-3 py-1 text-xs ${form.dominios.includes(d.value) ? 'border-brand-500 bg-brand-500 text-white' : 'border-gray-300 bg-white text-gray-700 dark:border-navy-600 dark:bg-navy-900 dark:text-gray-300'}`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700">Cancelar</button>
          <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">
            <MdSave className="h-4 w-4" />{saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </form>
    </div>
  );
}
