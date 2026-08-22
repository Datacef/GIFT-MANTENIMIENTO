'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  MdClose,
  MdMedicalServices,
  MdPrecisionManufacturing,
  MdBusiness,
  MdDirectionsCar,
  MdAdd,
  MdDelete,
} from 'react-icons/md';
import {
  PreguntaMantenimiento,
  PreguntaFormData,
  Dominio,
  DOMINIO_LABELS,
  TipoMantenimiento,
  TIPO_MANTENIMIENTO_LABELS,
  TipoRespuesta,
  TIPO_RESPUESTA_LABELS,
} from 'types/pregunta-mantenimiento.types';
import { PreguntaMantenimientoService } from 'services/pregunta-mantenimiento.service';

const DOMINIO_ICONS: Record<Dominio, React.ReactNode> = {
  [Dominio.EQUIPO_MEDICO]: <MdMedicalServices className="h-5 w-5" />,
  [Dominio.EQUIPO_INDUSTRIAL]: <MdPrecisionManufacturing className="h-5 w-5" />,
  [Dominio.INFRAESTRUCTURA]: <MdBusiness className="h-5 w-5" />,
  [Dominio.FLOTA_VEHICULAR]: <MdDirectionsCar className="h-5 w-5" />,
};

const DOMINIO_BUTTON_COLORS: Record<Dominio, { active: string; inactive: string }> = {
  [Dominio.EQUIPO_MEDICO]: {
    active: 'bg-blue-500 text-white border-blue-500',
    inactive: 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50 dark:bg-navy-700 dark:text-blue-300 dark:border-blue-600',
  },
  [Dominio.EQUIPO_INDUSTRIAL]: {
    active: 'bg-orange-500 text-white border-orange-500',
    inactive: 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50 dark:bg-navy-700 dark:text-orange-300 dark:border-orange-600',
  },
  [Dominio.INFRAESTRUCTURA]: {
    active: 'bg-green-500 text-white border-green-500',
    inactive: 'bg-white text-green-600 border-green-300 hover:bg-green-50 dark:bg-navy-700 dark:text-green-300 dark:border-green-600',
  },
  [Dominio.FLOTA_VEHICULAR]: {
    active: 'bg-purple-500 text-white border-purple-500',
    inactive: 'bg-white text-purple-600 border-purple-300 hover:bg-purple-50 dark:bg-navy-700 dark:text-purple-300 dark:border-purple-600',
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  pregunta?: PreguntaMantenimiento | null;
}

const emptyForm: PreguntaFormData = {
  dominio: Dominio.EQUIPO_MEDICO,
  tipoMantenimiento: TipoMantenimiento.PREVENTIVO,
  clasificacionEquipo: '',
  categoria: '',
  pregunta: '',
  descripcion: '',
  tipoRespuesta: TipoRespuesta.SI_NO,
  opcionesRespuesta: [],
  requiereFoto: false,
  requiereObservacion: false,
  esCritica: false,
  orden: 0,
  activo: true,
  referenciaAcreditacion: '',
};

export default function PreguntaFormModal({ isOpen, onClose, onSave, pregunta }: Props) {
  const [form, setForm] = useState<PreguntaFormData>({ ...emptyForm });
  const [clasificaciones, setClasificaciones] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [newOpcion, setNewOpcion] = useState('');
  const [showClasInput, setShowClasInput] = useState(false);
  const [showCatInput, setShowCatInput] = useState(false);

  const isEditing = !!pregunta;

  // Cargar datos iniciales al abrir
  useEffect(() => {
    if (isOpen) {
      if (pregunta) {
        setForm({
          dominio: pregunta.dominio,
          tipoMantenimiento: pregunta.tipoMantenimiento,
          clasificacionEquipo: pregunta.clasificacionEquipo,
          categoria: pregunta.categoria,
          pregunta: pregunta.pregunta,
          descripcion: pregunta.descripcion || '',
          tipoRespuesta: pregunta.tipoRespuesta,
          opcionesRespuesta: pregunta.opcionesRespuesta || [],
          requiereFoto: pregunta.requiereFoto,
          requiereObservacion: pregunta.requiereObservacion,
          esCritica: pregunta.esCritica,
          orden: pregunta.orden,
          activo: pregunta.activo,
          referenciaAcreditacion: pregunta.referenciaAcreditacion || '',
        });
      } else {
        setForm({ ...emptyForm });
      }
      setShowClasInput(false);
      setShowCatInput(false);
      setNewOpcion('');
    }
  }, [isOpen, pregunta]);

  // Cargar clasificaciones al cambiar dominio
  const loadClasificaciones = useCallback(async (dominio: string) => {
    const data = await PreguntaMantenimientoService.getClasificaciones(dominio);
    setClasificaciones(data);
  }, []);

  // Cargar categorias al cambiar dominio + clasificacion
  const loadCategorias = useCallback(async (dominio: string, clas: string) => {
    const data = await PreguntaMantenimientoService.getCategorias(dominio, clas || undefined);
    setCategorias(data);
  }, []);

  useEffect(() => {
    if (isOpen && form.dominio) {
      loadClasificaciones(form.dominio);
    }
  }, [isOpen, form.dominio, loadClasificaciones]);

  useEffect(() => {
    if (isOpen && form.dominio) {
      loadCategorias(form.dominio, form.clasificacionEquipo);
    }
  }, [isOpen, form.dominio, form.clasificacionEquipo, loadCategorias]);

  const updateField = <K extends keyof PreguntaFormData>(
    key: K,
    value: PreguntaFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addOpcion = () => {
    if (newOpcion.trim()) {
      updateField('opcionesRespuesta', [...(form.opcionesRespuesta || []), newOpcion.trim()]);
      setNewOpcion('');
    }
  };

  const removeOpcion = (index: number) => {
    const updated = [...(form.opcionesRespuesta || [])];
    updated.splice(index, 1);
    updateField('opcionesRespuesta', updated);
  };

  const handleSubmit = async () => {
    if (!form.pregunta.trim()) return;
    if (!form.clasificacionEquipo.trim()) return;
    if (!form.categoria.trim()) return;

    setSaving(true);
    try {
      if (isEditing && pregunta) {
        await PreguntaMantenimientoService.updatePregunta(pregunta.id, form);
      } else {
        await PreguntaMantenimientoService.createPregunta(form);
      }
      onSave();
      onClose();
    } catch (error: any) {
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('Error', error.message || 'Error al guardar la pregunta', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">
            {isEditing ? 'Editar Pregunta' : 'Nueva Pregunta'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        {/* Dominio selector */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Dominio *
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.values(Dominio).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  updateField('dominio', d);
                  updateField('clasificacionEquipo', '');
                  updateField('categoria', '');
                }}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                  form.dominio === d
                    ? DOMINIO_BUTTON_COLORS[d].active
                    : DOMINIO_BUTTON_COLORS[d].inactive
                }`}
              >
                {DOMINIO_ICONS[d]}
                <span className="truncate">{DOMINIO_LABELS[d]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tipo mantenimiento */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Tipo de Mantenimiento *
          </label>
          <div className="flex gap-2">
            {Object.values(TipoMantenimiento).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => updateField('tipoMantenimiento', t)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                  form.tipoMantenimiento === t
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:bg-navy-700 dark:text-gray-300'
                }`}
              >
                {TIPO_MANTENIMIENTO_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Clasificacion equipo - combo */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Clasificacion de Equipo *
          </label>
          {!showClasInput && clasificaciones.length > 0 ? (
            <div className="flex gap-2">
              <select
                value={form.clasificacionEquipo}
                onChange={(e) => updateField('clasificacionEquipo', e.target.value)}
                className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
              >
                <option value="">Seleccionar...</option>
                {clasificaciones.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setShowClasInput(true);
                  updateField('clasificacionEquipo', '');
                }}
                className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
              >
                <MdAdd className="h-4 w-4" /> Nueva
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={form.clasificacionEquipo}
                onChange={(e) => updateField('clasificacionEquipo', e.target.value)}
                placeholder="Ej: Ventilador Mecanico, Caldera..."
                className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
              />
              {clasificaciones.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowClasInput(false);
                    updateField('clasificacionEquipo', '');
                  }}
                  className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                >
                  Seleccionar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Categoria - combo */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Categoria *
          </label>
          {!showCatInput && categorias.length > 0 ? (
            <div className="flex gap-2">
              <select
                value={form.categoria}
                onChange={(e) => updateField('categoria', e.target.value)}
                className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
              >
                <option value="">Seleccionar...</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setShowCatInput(true);
                  updateField('categoria', '');
                }}
                className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
              >
                <MdAdd className="h-4 w-4" /> Nueva
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={form.categoria}
                onChange={(e) => updateField('categoria', e.target.value)}
                placeholder="Ej: Estado General, Seguridad..."
                className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
              />
              {categorias.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCatInput(false);
                    updateField('categoria', '');
                  }}
                  className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                >
                  Seleccionar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pregunta */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Pregunta *
          </label>
          <input
            type="text"
            value={form.pregunta}
            onChange={(e) => updateField('pregunta', e.target.value)}
            placeholder="Escriba la pregunta de mantenimiento..."
            className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
          />
        </div>

        {/* Descripcion */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Descripcion (opcional)
          </label>
          <textarea
            value={form.descripcion || ''}
            onChange={(e) => updateField('descripcion', e.target.value)}
            placeholder="Texto de ayuda o instrucciones adicionales..."
            rows={3}
            className="flex w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
          />
        </div>

        {/* Tipo respuesta */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Tipo de Respuesta
          </label>
          <select
            value={form.tipoRespuesta}
            onChange={(e) => updateField('tipoRespuesta', e.target.value as TipoRespuesta)}
            className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
          >
            {Object.values(TipoRespuesta).map((t) => (
              <option key={t} value={t}>
                {TIPO_RESPUESTA_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        {/* Opciones respuesta (solo si tipo = seleccion) */}
        {form.tipoRespuesta === TipoRespuesta.SELECCION && (
          <div className="mb-4">
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Opciones de Respuesta
            </label>
            <div className="space-y-2">
              {(form.opcionesRespuesta || []).map((op, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-navy-600 dark:text-white">
                    {op}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOpcion(idx)}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <MdDelete className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOpcion}
                  onChange={(e) => setNewOpcion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addOpcion();
                    }
                  }}
                  placeholder="Agregar opcion..."
                  className="flex h-10 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
                />
                <button
                  type="button"
                  onClick={addOpcion}
                  className="flex h-10 items-center gap-1 rounded-xl bg-brand-500 px-3 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  <MdAdd className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Row: orden + referencia acreditacion */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Orden
            </label>
            <input
              type="number"
              value={form.orden}
              onChange={(e) => updateField('orden', parseInt(e.target.value) || 0)}
              min={0}
              className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Ref. Acreditacion
            </label>
            <input
              type="text"
              value={form.referenciaAcreditacion || ''}
              onChange={(e) => updateField('referenciaAcreditacion', e.target.value)}
              placeholder="Ej: EQ-2.1, INS-3.1"
              className="flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div className="mb-6 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-navy-700 dark:text-white">
            <input
              type="checkbox"
              checked={form.requiereFoto}
              onChange={(e) => updateField('requiereFoto', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500"
            />
            Requiere Foto
          </label>
          <label className="flex items-center gap-2 text-sm text-navy-700 dark:text-white">
            <input
              type="checkbox"
              checked={form.requiereObservacion}
              onChange={(e) => updateField('requiereObservacion', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500"
            />
            Requiere Observacion
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-red-600 dark:text-red-400">
            <input
              type="checkbox"
              checked={form.esCritica}
              onChange={(e) => updateField('esCritica', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-500"
            />
            Pregunta Critica
          </label>
          <label className="flex items-center gap-2 text-sm text-navy-700 dark:text-white">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => updateField('activo', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500"
            />
            Activo
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.pregunta.trim() || !form.clasificacionEquipo.trim() || !form.categoria.trim()}
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  );
}
