'use client';
import { useState, useEffect, useCallback } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';
import Parse from 'utils/parseClient';
import {
  InventarioInfraestructura,
  InventarioInfraestructuraFormData,
  ESTADO_INFRA_OPTIONS,
  CRITICIDAD_INFRA_OPTIONS,
  SISTEMA_OPTIONS,
} from 'types/inventario-infraestructura.types';
import { InventarioInfraestructuraService } from 'services/inventario-infraestructura.service';
import { MantenimientoService } from 'services/mantenimiento.service';
import DuplicadoEliminadoModal from 'components/admin/inventario-shared/DuplicadoEliminadoModal';
import { ActivoEliminado } from 'services/inventario-shared.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  componente?: InventarioInfraestructura | null;
}

const emptyForm: InventarioInfraestructuraFormData = {
  sistema: '',
  componente: '',
  ubicacion: '',
  descripcion: '',
  marca: '',
  modelo: '',
  serie: '',
  codigoInterno: '',
  capacidad: '',
  fechaInstalacion: '',
  vidaUtil: 0,
  estado: 'B',
  criticidad: 'Media',
  frecuencia: 6,
  normativaAplicable: '',
  fechaUltimaInspeccion: '',
  proximaInspeccion: '',
  responsable: '',
  garantiaInicio: '',
  garantiaFinal: '',
  fechaBaja: '',
  pautaAsignada: '',
  activo: true,
};

export default function InfraestructuraFormModal({ isOpen, onClose, onSave, componente }: Props) {
  const [form, setForm] = useState<InventarioInfraestructuraFormData>({ ...emptyForm });
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [sistemas, setSistemas] = useState<string[]>([]);
  const [pautasDisponibles, setPautasDisponibles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showUbicacionInput, setShowUbicacionInput] = useState(false);
  const [showSistemaInput, setShowSistemaInput] = useState(false);

  const isEditing = !!componente;

  useEffect(() => {
    if (isOpen) {
      if (componente) {
        setForm({
          sistema: componente.sistema,
          componente: componente.componente,
          ubicacion: componente.ubicacion,
          descripcion: componente.descripcion,
          marca: componente.marca,
          modelo: componente.modelo,
          serie: componente.serie,
          codigoInterno: componente.codigoInterno,
          capacidad: componente.capacidad,
          fechaInstalacion: componente.fechaInstalacion,
          vidaUtil: componente.vidaUtil,
          estado: componente.estado,
          criticidad: componente.criticidad,
          frecuencia: componente.frecuencia,
          normativaAplicable: componente.normativaAplicable,
          fechaUltimaInspeccion: componente.fechaUltimaInspeccion,
          proximaInspeccion: componente.proximaInspeccion,
          responsable: componente.responsable,
          garantiaInicio: componente.garantiaInicio,
          garantiaFinal: componente.garantiaFinal,
          fechaBaja: componente.fechaBaja,
          pautaAsignada: componente.pautaAsignada || '',
          activo: componente.activo,
        });
      } else {
        setForm({ ...emptyForm });
      }
      setShowUbicacionInput(false);
      setShowSistemaInput(false);
    }
  }, [isOpen, componente]);

  const loadOptions = useCallback(async () => {
    const [u, s, pPrev, pCorr, pPred] = await Promise.all([
      InventarioInfraestructuraService.getUbicaciones(),
      InventarioInfraestructuraService.getSistemas(),
      MantenimientoService.getClasificacionesConPreguntas('infraestructura', 'preventivo'),
      MantenimientoService.getClasificacionesConPreguntas('infraestructura', 'correctivo'),
      MantenimientoService.getClasificacionesConPreguntas('infraestructura', 'predictivo'),
    ]);
    setUbicaciones(u);
    setSistemas(s);
    const allPautas = new Set<string>();
    [...pPrev, ...pCorr, ...pPred].forEach((p) => allPautas.add(p.clasificacion));
    setPautasDisponibles(Array.from(allPautas).sort());
  }, []);

  useEffect(() => {
    if (isOpen) loadOptions();
  }, [isOpen, loadOptions]);

  // Etapa 5: inferir pauta cuando esta vacia
  useEffect(() => {
    if (!form.pautaAsignada && pautasDisponibles.length > 0) {
      const candidatos = [form.sistema].filter(Boolean);
      const match = candidatos.find((c) => pautasDisponibles.includes(c));
      if (match) {
        setForm((prev) => prev.pautaAsignada ? prev : { ...prev, pautaAsignada: match });
      }
    }
  }, [form.sistema, form.pautaAsignada, pautasDisponibles]);

  const updateField = <K extends keyof InventarioInfraestructuraFormData>(
    key: K,
    value: InventarioInfraestructuraFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Etapa 5: manejo de duplicado eliminado
  const [duplicado, setDuplicado] = useState<ActivoEliminado | null>(null);

  const handleSubmit = async () => {
    if (!form.componente.trim()) return;

    setSaving(true);
    try {
      if (isEditing && componente) {
        await InventarioInfraestructuraService.update(componente.id, form);
        onSave();
        onClose();
      } else {
        const result: any = await Parse.Cloud.run('createInventarioInfra', { data: form });
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
      Swal.fire('Error', error.message || 'Error al guardar el componente', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearForzado = useCallback(async () => {
    const result: any = await Parse.Cloud.run('createInventarioInfra', {
      data: form,
      forzarCrear: true,
    });
    return { id: result?.id || '' };
  }, [form]);

  if (!isOpen) return null;

  const inputClass =
    'flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white';

  // Combinar sistemas de la BD con los predefinidos
  const allSistemas = [...new Set([...SISTEMA_OPTIONS.map((o) => o.value), ...sistemas])].sort();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">
            {isEditing ? 'Editar Componente de Infraestructura' : 'Nuevo Componente de Infraestructura'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Sistema - combo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Sistema
            </label>
            {!showSistemaInput && allSistemas.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={form.sistema}
                  onChange={(e) => updateField('sistema', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  {allSistemas.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowSistemaInput(true); updateField('sistema', ''); }}
                  className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
                >
                  <MdAdd className="h-4 w-4" /> Nuevo
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.sistema}
                  onChange={(e) => updateField('sistema', e.target.value)}
                  placeholder="Ej: Electrico, Sanitario, Gases Clinicos..."
                  className={inputClass}
                />
                {allSistemas.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowSistemaInput(false); updateField('sistema', ''); }}
                    className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                  >
                    Seleccionar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Componente */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Componente *
            </label>
            <input
              type="text"
              value={form.componente}
              onChange={(e) => updateField('componente', e.target.value)}
              placeholder="Ej: Tablero electrico principal, Red humeda piso 3..."
              className={inputClass}
            />
          </div>

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
                  placeholder="Ej: Edificio A Piso 1, Sala de Maquinas..."
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

          {/* Descripcion */}
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Descripcion
            </label>
            <textarea
              value={form.descripcion}
              onChange={(e) => updateField('descripcion', e.target.value)}
              placeholder="Descripcion detallada del elemento de infraestructura..."
              rows={3}
              className="flex w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white"
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
              placeholder="Marca del componente"
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
              placeholder="Modelo del componente"
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

          {/* Codigo Interno */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Codigo Interno
            </label>
            <input
              type="text"
              value={form.codigoInterno}
              onChange={(e) => updateField('codigoInterno', e.target.value)}
              placeholder="Codigo interno del establecimiento"
              className={inputClass}
            />
          </div>

          {/* Capacidad */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Capacidad / Especificacion Tecnica
            </label>
            <input
              type="text"
              value={form.capacidad}
              onChange={(e) => updateField('capacidad', e.target.value)}
              placeholder="Ej: 220V/50A, 100 L/min..."
              className={inputClass}
            />
          </div>

          {/* Normativa Aplicable */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Normativa Aplicable
            </label>
            <input
              type="text"
              value={form.normativaAplicable}
              onChange={(e) => updateField('normativaAplicable', e.target.value)}
              placeholder="Ej: INS-1.1, INS-3.1, NCh 2095..."
              className={inputClass}
            />
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
              {ESTADO_INFRA_OPTIONS.map((o) => (
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
              {CRITICIDAD_INFRA_OPTIONS.map((o) => (
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

          {/* Responsable */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Responsable
            </label>
            <input
              type="text"
              value={form.responsable}
              onChange={(e) => updateField('responsable', e.target.value)}
              placeholder="Responsable designado (INS-3.1)"
              className={inputClass}
            />
          </div>

          {/* Fecha Ultima Inspeccion */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Ultima Inspeccion
            </label>
            <input
              type="date"
              value={form.fechaUltimaInspeccion}
              onChange={(e) => updateField('fechaUltimaInspeccion', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Proxima Inspeccion */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Proxima Inspeccion
            </label>
            <input
              type="date"
              value={form.proximaInspeccion}
              onChange={(e) => updateField('proximaInspeccion', e.target.value)}
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

        {/* Checkbox */}
        <div className="mt-4 mb-6 flex flex-col gap-3 sm:flex-row sm:gap-6">
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
            disabled={saving || !form.componente.trim()}
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
          clase="InventarioInfraestructura"
          duplicado={duplicado}
          formData={form}
          onCrearNuevoForzado={handleCrearForzado}
        />
      )}
    </div>
  );
}
