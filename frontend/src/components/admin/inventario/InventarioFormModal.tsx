'use client';
import { useState, useEffect, useCallback } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';
import Parse from 'utils/parseClient';
import {
  InventarioEquipo,
  InventarioEquipoFormData,
  ESTADO_OPTIONS,
  CRITICO_OPTIONS,
  SUBCLASE_OPTIONS,
} from 'types/inventario-equipo.types';
import { InventarioEquipoService } from 'services/inventario-equipo.service';
import { MantenimientoService } from 'services/mantenimiento.service';
import DuplicadoEliminadoModal from 'components/admin/inventario-shared/DuplicadoEliminadoModal';
import { ActivoEliminado } from 'services/inventario-shared.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  equipo?: InventarioEquipo | null;
}

const emptyForm: InventarioEquipoFormData = {
  servicio: '',
  clase: '',
  subclase: '',
  nombreEquipo: '',
  marca: '',
  modelo: '',
  serie: '',
  inventario: '',
  valor: '',
  fechaAdquisicion: '',
  vidaUtil: 0,
  estado: 'B',
  criticoApoyo: 'A',
  frecuencia: 12,
  garantiaInicio: '',
  garantiaFinal: '',
  fechaBaja: '',
  pautaAsignada: '',
  activo: true,
};

export default function InventarioFormModal({ isOpen, onClose, onSave, equipo }: Props) {
  const [form, setForm] = useState<InventarioEquipoFormData>({ ...emptyForm });
  const [servicios, setServicios] = useState<string[]>([]);
  const [clases, setClases] = useState<string[]>([]);
  const [pautasDisponibles, setPautasDisponibles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showServicioInput, setShowServicioInput] = useState(false);
  const [showClaseInput, setShowClaseInput] = useState(false);

  const isEditing = !!equipo;

  useEffect(() => {
    if (isOpen) {
      if (equipo) {
        setForm({
          servicio: equipo.servicio,
          clase: equipo.clase,
          subclase: equipo.subclase,
          nombreEquipo: equipo.nombreEquipo,
          marca: equipo.marca,
          modelo: equipo.modelo,
          serie: equipo.serie,
          inventario: equipo.inventario,
          valor: equipo.valor,
          fechaAdquisicion: equipo.fechaAdquisicion,
          vidaUtil: equipo.vidaUtil,
          estado: equipo.estado,
          criticoApoyo: equipo.criticoApoyo,
          frecuencia: equipo.frecuencia,
          garantiaInicio: equipo.garantiaInicio,
          garantiaFinal: equipo.garantiaFinal,
          fechaBaja: equipo.fechaBaja,
          pautaAsignada: equipo.pautaAsignada || '',
          activo: equipo.activo,
        });
      } else {
        setForm({ ...emptyForm });
      }
      setShowServicioInput(false);
      setShowClaseInput(false);
    }
  }, [isOpen, equipo]);

  const loadOptions = useCallback(async () => {
    const [s, c, pPrev, pCorr, pPred] = await Promise.all([
      InventarioEquipoService.getServicios(),
      InventarioEquipoService.getClases(),
      MantenimientoService.getClasificacionesConPreguntas('equipoMedico', 'preventivo'),
      MantenimientoService.getClasificacionesConPreguntas('equipoMedico', 'correctivo'),
      MantenimientoService.getClasificacionesConPreguntas('equipoMedico', 'predictivo'),
    ]);
    setServicios(s);
    setClases(c);
    // Combinar clasificaciones unicas de todos los tipos de mantenimiento
    const allPautas = new Set<string>();
    [...pPrev, ...pCorr, ...pPred].forEach((p) => allPautas.add(p.clasificacion));
    setPautasDisponibles(Array.from(allPautas).sort());
  }, []);

  useEffect(() => {
    if (isOpen) loadOptions();
  }, [isOpen, loadOptions]);

  // Etapa 5 (revision-inventarios): inferir pauta cuando esta vacia y la
  // clase del equipo coincide con una clasificacionEquipo disponible.
  useEffect(() => {
    if (!form.pautaAsignada && pautasDisponibles.length > 0) {
      const candidatos = [form.subclase, form.clase].filter(Boolean);
      const match = candidatos.find((c) => pautasDisponibles.includes(c));
      if (match) {
        setForm((prev) => prev.pautaAsignada ? prev : { ...prev, pautaAsignada: match });
      }
    }
  }, [form.clase, form.subclase, form.pautaAsignada, pautasDisponibles]);

  const updateField = <K extends keyof InventarioEquipoFormData>(
    key: K,
    value: InventarioEquipoFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Etapa 5 (revision-inventarios): manejo de duplicado eliminado
  const [duplicado, setDuplicado] = useState<ActivoEliminado | null>(null);

  const handleSubmit = async () => {
    if (!form.nombreEquipo.trim()) return;

    setSaving(true);
    try {
      if (isEditing && equipo) {
        await InventarioEquipoService.update(equipo.id, form);
        onSave();
        onClose();
      } else {
        // Crear con deteccion de duplicado eliminado
        const result: any = await Parse.Cloud.run('createInventarioEquipo', { data: form });
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
    const result: any = await Parse.Cloud.run('createInventarioEquipo', {
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
            {isEditing ? 'Editar Equipo' : 'Nuevo Equipo'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Servicio - combo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Servicio
            </label>
            {!showServicioInput && servicios.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={form.servicio}
                  onChange={(e) => updateField('servicio', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  {servicios.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowServicioInput(true); updateField('servicio', ''); }}
                  className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
                >
                  <MdAdd className="h-4 w-4" /> Nueva
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.servicio}
                  onChange={(e) => updateField('servicio', e.target.value)}
                  placeholder="Ej: Neonatologia, Urgencia..."
                  className={inputClass}
                />
                {servicios.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowServicioInput(false); updateField('servicio', ''); }}
                    className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                  >
                    Seleccionar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Clase - combo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Clase
            </label>
            {!showClaseInput && clases.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={form.clase}
                  onChange={(e) => updateField('clase', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  {clases.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowClaseInput(true); updateField('clase', ''); }}
                  className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
                >
                  <MdAdd className="h-4 w-4" /> Nueva
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.clase}
                  onChange={(e) => updateField('clase', e.target.value)}
                  placeholder="Ej: Apoyo Diagnostico, Monitoreo..."
                  className={inputClass}
                />
                {clases.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowClaseInput(false); updateField('clase', ''); }}
                    className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                  >
                    Seleccionar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Subclase */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Subclase
            </label>
            <select
              value={form.subclase}
              onChange={(e) => updateField('subclase', e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar...</option>
              {SUBCLASE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
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
              placeholder="Ej: ECOGRAFO, VENTILADOR MECANICO..."
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
              Serie
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
              Inventario
            </label>
            <input
              type="text"
              value={form.inventario}
              onChange={(e) => updateField('inventario', e.target.value)}
              placeholder="Codigo de inventario"
              className={inputClass}
            />
          </div>

          {/* Valor */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Valor
            </label>
            <input
              type="text"
              value={form.valor}
              onChange={(e) => updateField('valor', e.target.value)}
              placeholder="Ej: 15000000 o S/I"
              className={inputClass}
            />
          </div>

          {/* Fecha Adquisicion */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Fecha Adquisicion
            </label>
            <input
              type="date"
              value={form.fechaAdquisicion}
              onChange={(e) => updateField('fechaAdquisicion', e.target.value)}
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

          {/* Critico / Apoyo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Critico / Apoyo
            </label>
            <select
              value={form.criticoApoyo}
              onChange={(e) => updateField('criticoApoyo', e.target.value)}
              className={inputClass}
            >
              <option value="">Seleccionar...</option>
              {CRITICO_OPTIONS.map((o) => (
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

        {/* Activo checkbox */}
        <div className="mt-4 mb-6">
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
          clase="InventarioEquipoMedico"
          duplicado={duplicado}
          formData={form}
          onCrearNuevoForzado={handleCrearForzado}
        />
      )}
    </div>
  );
}
