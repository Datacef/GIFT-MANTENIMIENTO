'use client';
import { useState, useEffect, useCallback } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';
import Parse from 'utils/parseClient';
import {
  InventarioIndustrial,
  InventarioIndustrialFormData,
  ESTADO_OPTIONS,
  CRITICIDAD_OPTIONS,
  TIPO_EQUIPO_OPTIONS,
  COMBUSTIBLE_OPTIONS,
} from 'types/inventario-industrial.types';
import { InventarioIndustrialService } from 'services/inventario-industrial.service';
import { MantenimientoService } from 'services/mantenimiento.service';
import DuplicadoEliminadoModal from 'components/admin/inventario-shared/DuplicadoEliminadoModal';
import { ActivoEliminado } from 'services/inventario-shared.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  equipo?: InventarioIndustrial | null;
}

const emptyForm: InventarioIndustrialFormData = {
  ubicacion: '',
  tipoEquipo: '',
  nombreEquipo: '',
  marca: '',
  modelo: '',
  serie: '',
  inventario: '',
  capacidad: '',
  combustible: 'N/A',
  fechaInstalacion: '',
  vidaUtil: 0,
  estado: 'B',
  criticidad: 'Media',
  frecuencia: 6,
  garantiaInicio: '',
  garantiaFinal: '',
  fechaBaja: '',
  pautaAsignada: '',
  requiereAutorizacion: false,
  activo: true,
};

export default function InventarioIndustrialFormModal({ isOpen, onClose, onSave, equipo }: Props) {
  const [form, setForm] = useState<InventarioIndustrialFormData>({ ...emptyForm });
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [tiposEquipo, setTiposEquipo] = useState<string[]>([]);
  const [pautasDisponibles, setPautasDisponibles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showUbicacionInput, setShowUbicacionInput] = useState(false);
  const [showTipoEquipoInput, setShowTipoEquipoInput] = useState(false);

  const isEditing = !!equipo;

  useEffect(() => {
    if (isOpen) {
      if (equipo) {
        setForm({
          ubicacion: equipo.ubicacion,
          tipoEquipo: equipo.tipoEquipo,
          nombreEquipo: equipo.nombreEquipo,
          marca: equipo.marca,
          modelo: equipo.modelo,
          serie: equipo.serie,
          inventario: equipo.inventario,
          capacidad: equipo.capacidad,
          combustible: equipo.combustible,
          fechaInstalacion: equipo.fechaInstalacion,
          vidaUtil: equipo.vidaUtil,
          estado: equipo.estado,
          criticidad: equipo.criticidad,
          frecuencia: equipo.frecuencia,
          garantiaInicio: equipo.garantiaInicio,
          garantiaFinal: equipo.garantiaFinal,
          fechaBaja: equipo.fechaBaja,
          pautaAsignada: equipo.pautaAsignada || '',
          requiereAutorizacion: equipo.requiereAutorizacion,
          activo: equipo.activo,
        });
      } else {
        setForm({ ...emptyForm });
      }
      setShowUbicacionInput(false);
      setShowTipoEquipoInput(false);
    }
  }, [isOpen, equipo]);

  const loadOptions = useCallback(async () => {
    const [u, t, pPrev, pCorr, pPred] = await Promise.all([
      InventarioIndustrialService.getUbicaciones(),
      InventarioIndustrialService.getTiposEquipo(),
      MantenimientoService.getClasificacionesConPreguntas('equipoIndustrial', 'preventivo'),
      MantenimientoService.getClasificacionesConPreguntas('equipoIndustrial', 'correctivo'),
      MantenimientoService.getClasificacionesConPreguntas('equipoIndustrial', 'predictivo'),
    ]);
    setUbicaciones(u);
    setTiposEquipo(t);
    const allPautas = new Set<string>();
    [...pPrev, ...pCorr, ...pPred].forEach((p) => allPautas.add(p.clasificacion));
    setPautasDisponibles(Array.from(allPautas).sort());
  }, []);

  useEffect(() => {
    if (isOpen) loadOptions();
  }, [isOpen, loadOptions]);

  // Etapa 5 (revision-inventarios): inferir pauta cuando esta vacia
  useEffect(() => {
    if (!form.pautaAsignada && pautasDisponibles.length > 0) {
      const candidatos = [form.tipoEquipo].filter(Boolean);
      const match = candidatos.find((c) => pautasDisponibles.includes(c));
      if (match) {
        setForm((prev) => prev.pautaAsignada ? prev : { ...prev, pautaAsignada: match });
      }
    }
  }, [form.tipoEquipo, form.pautaAsignada, pautasDisponibles]);

  const updateField = <K extends keyof InventarioIndustrialFormData>(
    key: K,
    value: InventarioIndustrialFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Etapa 5: manejo de duplicado eliminado
  const [duplicado, setDuplicado] = useState<ActivoEliminado | null>(null);

  const handleSubmit = async () => {
    if (!form.nombreEquipo.trim()) return;

    setSaving(true);
    try {
      if (isEditing && equipo) {
        await InventarioIndustrialService.update(equipo.id, form);
        onSave();
        onClose();
      } else {
        const result: any = await Parse.Cloud.run('createInventarioIndustrial', { data: form });
        if (result && result.duplicateEliminado) {
          setDuplicado(result.duplicateEliminado as ActivoEliminado);
          setSaving(false);
          return;
        }
        onSave();
        onClose();
      }
    } catch (error: any) {
      const Swal = (await import('sweetalert2')).default;
      Swal.fire('Error', error.message || 'Error al guardar el equipo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearForzado = useCallback(async () => {
    const result: any = await Parse.Cloud.run('createInventarioIndustrial', {
      data: form,
      forzarCrear: true,
    });
    return { id: result?.id || '' };
  }, [form]);

  if (!isOpen) return null;

  const inputClass =
    'flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">
            {isEditing ? 'Editar Equipo Industrial' : 'Nuevo Equipo Industrial'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Ubicacion - combo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Ubicacion
            </label>
            {!showUbicacionInput && ubicaciones.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={form.ubicacion}
                  onChange={(e) => updateField('ubicacion', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  {ubicaciones.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowUbicacionInput(true); updateField('ubicacion', ''); }}
                  className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
                >
                  <MdAdd className="h-4 w-4" /> Nueva
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.ubicacion}
                  onChange={(e) => updateField('ubicacion', e.target.value)}
                  placeholder="Ej: Sala de Calderas, Casa de Fuerza..."
                  className={inputClass}
                />
                {ubicaciones.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowUbicacionInput(false); updateField('ubicacion', ''); }}
                    className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                  >
                    Seleccionar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tipo Equipo - combo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Tipo de Equipo
            </label>
            {!showTipoEquipoInput && tiposEquipo.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={form.tipoEquipo}
                  onChange={(e) => updateField('tipoEquipo', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  {tiposEquipo.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowTipoEquipoInput(true); updateField('tipoEquipo', ''); }}
                  className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
                >
                  <MdAdd className="h-4 w-4" /> Nuevo
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.tipoEquipo}
                  onChange={(e) => updateField('tipoEquipo', e.target.value)}
                  placeholder="Ej: Caldera, Generador, HVAC..."
                  className={inputClass}
                />
                {tiposEquipo.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowTipoEquipoInput(false); updateField('tipoEquipo', ''); }}
                    className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                  >
                    Seleccionar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Nombre Equipo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Nombre Equipo *
            </label>
            <input
              type="text"
              value={form.nombreEquipo}
              onChange={(e) => updateField('nombreEquipo', e.target.value)}
              placeholder="Ej: CALDERA VAPOR, GENERADOR EMERGENCIA..."
              className={inputClass}
            />
          </div>

          {/* Marca */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Marca
            </label>
            <input
              type="text"
              value={form.marca}
              onChange={(e) => updateField('marca', e.target.value)}
              placeholder="Marca del equipo"
              className={inputClass}
            />
          </div>

          {/* Modelo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Modelo
            </label>
            <input
              type="text"
              value={form.modelo}
              onChange={(e) => updateField('modelo', e.target.value)}
              placeholder="Modelo del equipo"
              className={inputClass}
            />
          </div>

          {/* Serie */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Numero de Serie
            </label>
            <input
              type="text"
              value={form.serie}
              onChange={(e) => updateField('serie', e.target.value)}
              placeholder="Numero de serie"
              className={inputClass}
            />
          </div>

          {/* Inventario */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Codigo de Inventario
            </label>
            <input
              type="text"
              value={form.inventario}
              onChange={(e) => updateField('inventario', e.target.value)}
              placeholder="Codigo de inventario"
              className={inputClass}
            />
          </div>

          {/* Capacidad */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Capacidad / Potencia
            </label>
            <input
              type="text"
              value={form.capacidad}
              onChange={(e) => updateField('capacidad', e.target.value)}
              placeholder="Ej: 500 kW, 2000 kg/h vapor..."
              className={inputClass}
            />
          </div>

          {/* Combustible */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Combustible / Energia
            </label>
            <select
              value={form.combustible}
              onChange={(e) => updateField('combustible', e.target.value)}
              className={inputClass}
            >
              {COMBUSTIBLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Fecha Instalacion */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Fecha de Instalacion
            </label>
            <input
              type="date"
              value={form.fechaInstalacion}
              onChange={(e) => updateField('fechaInstalacion', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Vida Util */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Vida Util (anios)
            </label>
            <input
              type="number"
              value={form.vidaUtil}
              onChange={(e) => updateField('vidaUtil', parseInt(e.target.value) || 0)}
              min={0}
              className={inputClass}
            />
          </div>

          {/* Estado */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Estado
            </label>
            <select
              value={form.estado}
              onChange={(e) => updateField('estado', e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar...</option>
              {ESTADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Criticidad */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Criticidad
            </label>
            <select
              value={form.criticidad}
              onChange={(e) => updateField('criticidad', e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar...</option>
              {CRITICIDAD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Frecuencia */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Frecuencia mantencion (meses)
            </label>
            <input
              type="number"
              value={form.frecuencia}
              onChange={(e) => updateField('frecuencia', parseInt(e.target.value) || 0)}
              min={0}
              className={inputClass}
            />
          </div>

          {/* Garantia Inicio */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Garantia Inicio
            </label>
            <input
              type="date"
              value={form.garantiaInicio}
              onChange={(e) => updateField('garantiaInicio', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Garantia Final */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Garantia Final
            </label>
            <input
              type="date"
              value={form.garantiaFinal}
              onChange={(e) => updateField('garantiaFinal', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Fecha Baja */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Fecha de Baja (opcional)
            </label>
            <input
              type="date"
              value={form.fechaBaja}
              onChange={(e) => updateField('fechaBaja', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Pauta de Mantenimiento Asignada */}
        <div className="mt-4">
          <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
            Pauta de mantenimiento asignada
          </label>
          <select
            value={form.pautaAsignada}
            onChange={(e) => updateField('pautaAsignada', e.target.value)}
            className={inputClass}
          >
            <option value="">Sin pauta asignada</option>
            {pautasDisponibles.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Al asignar una pauta, el tecnico pasara directamente al checklist de preguntas al crear un mantenimiento.
          </p>
        </div>

        {/* Checkboxes */}
        <div className="mt-4 mb-6 flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm text-navy-700 dark:text-white">
            <input
              type="checkbox"
              checked={form.requiereAutorizacion}
              onChange={(e) => updateField('requiereAutorizacion', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-500"
            />
            Requiere autorizacion especial (INS-3.1)
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
            disabled={saving || !form.nombreEquipo.trim()}
            className="rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>

      {duplicado && (
        <DuplicadoEliminadoModal
          isOpen={!!duplicado}
          onClose={() => setDuplicado(null)}
          onResolved={() => {
            setDuplicado(null);
            onSave();
            onClose();
          }}
          clase="InventarioEquipoIndustrial"
          duplicado={duplicado}
          formData={form}
          onCrearNuevoForzado={handleCrearForzado}
        />
      )}
    </div>
  );
}
