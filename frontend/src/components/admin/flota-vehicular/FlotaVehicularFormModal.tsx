'use client';
import { useState, useEffect, useCallback } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';
import Parse from 'utils/parseClient';
import {
  InventarioFlota,
  InventarioFlotaFormData,
  ESTADO_FLOTA_OPTIONS,
  TIPO_VEHICULO_OPTIONS,
  COMBUSTIBLE_FLOTA_OPTIONS,
} from 'types/inventario-flota.types';
import { InventarioFlotaService } from 'services/inventario-flota.service';
import { MantenimientoService } from 'services/mantenimiento.service';
import DuplicadoEliminadoModal from 'components/admin/inventario-shared/DuplicadoEliminadoModal';
import { ActivoEliminado } from 'services/inventario-shared.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  vehiculo?: InventarioFlota | null;
}

const emptyForm: InventarioFlotaFormData = {
  tipoVehiculo: '',
  nombreVehiculo: '',
  marca: '',
  modelo: '',
  anio: 0,
  patente: '',
  numeroInterno: '',
  vin: '',
  color: '',
  combustible: 'Diesel',
  kilometraje: 0,
  capacidadPasajeros: 0,
  asignadoA: '',
  fechaAdquisicion: '',
  vidaUtil: 0,
  estado: 'B',
  frecuencia: 3,
  revisionTecnicaVigente: '',
  permisoCirculacion: '',
  seguroVigente: '',
  garantiaInicio: '',
  garantiaFinal: '',
  fechaBaja: '',
  pautaAsignada: '',
  activo: true,
};

export default function FlotaVehicularFormModal({ isOpen, onClose, onSave, vehiculo }: Props) {
  const [form, setForm] = useState<InventarioFlotaFormData>({ ...emptyForm });
  const [tiposVehiculo, setTiposVehiculo] = useState<string[]>([]);
  const [asignaciones, setAsignaciones] = useState<string[]>([]);
  const [pautasDisponibles, setPautasDisponibles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showTipoVehiculoInput, setShowTipoVehiculoInput] = useState(false);
  const [showAsignadoAInput, setShowAsignadoAInput] = useState(false);

  const isEditing = !!vehiculo;

  useEffect(() => {
    if (isOpen) {
      if (vehiculo) {
        setForm({
          tipoVehiculo: vehiculo.tipoVehiculo,
          nombreVehiculo: vehiculo.nombreVehiculo,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          anio: vehiculo.anio,
          patente: vehiculo.patente,
          numeroInterno: vehiculo.numeroInterno,
          vin: vehiculo.vin,
          color: vehiculo.color,
          combustible: vehiculo.combustible,
          kilometraje: vehiculo.kilometraje,
          capacidadPasajeros: vehiculo.capacidadPasajeros,
          asignadoA: vehiculo.asignadoA,
          fechaAdquisicion: vehiculo.fechaAdquisicion,
          vidaUtil: vehiculo.vidaUtil,
          estado: vehiculo.estado,
          frecuencia: vehiculo.frecuencia,
          revisionTecnicaVigente: vehiculo.revisionTecnicaVigente,
          permisoCirculacion: vehiculo.permisoCirculacion,
          seguroVigente: vehiculo.seguroVigente,
          garantiaInicio: vehiculo.garantiaInicio,
          garantiaFinal: vehiculo.garantiaFinal,
          fechaBaja: vehiculo.fechaBaja,
          pautaAsignada: vehiculo.pautaAsignada || '',
          activo: vehiculo.activo,
        });
      } else {
        setForm({ ...emptyForm });
      }
      setShowTipoVehiculoInput(false);
      setShowAsignadoAInput(false);
    }
  }, [isOpen, vehiculo]);

  const loadOptions = useCallback(async () => {
    const [t, a, pPrev, pCorr, pPred] = await Promise.all([
      InventarioFlotaService.getTiposVehiculo(),
      InventarioFlotaService.getAsignaciones(),
      MantenimientoService.getClasificacionesConPreguntas('flotaVehicular', 'preventivo'),
      MantenimientoService.getClasificacionesConPreguntas('flotaVehicular', 'correctivo'),
      MantenimientoService.getClasificacionesConPreguntas('flotaVehicular', 'predictivo'),
    ]);
    setTiposVehiculo(t);
    setAsignaciones(a);
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
      const candidatos = [form.tipoVehiculo].filter(Boolean);
      const match = candidatos.find((c) => pautasDisponibles.includes(c));
      if (match) {
        setForm((prev) => prev.pautaAsignada ? prev : { ...prev, pautaAsignada: match });
      }
    }
  }, [form.tipoVehiculo, form.pautaAsignada, pautasDisponibles]);

  const updateField = <K extends keyof InventarioFlotaFormData>(
    key: K,
    value: InventarioFlotaFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Etapa 5: manejo de duplicado eliminado
  const [duplicado, setDuplicado] = useState<ActivoEliminado | null>(null);

  const handleSubmit = async () => {
    if (!form.nombreVehiculo.trim()) return;

    setSaving(true);
    try {
      if (isEditing && vehiculo) {
        await InventarioFlotaService.update(vehiculo.id, form);
        onSave();
        onClose();
      } else {
        const result: any = await Parse.Cloud.run('createInventarioFlota', { data: form });
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
      Swal.fire('Error', error.message || 'Error al guardar el vehiculo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCrearForzado = useCallback(async () => {
    const result: any = await Parse.Cloud.run('createInventarioFlota', {
      data: form,
      forzarCrear: true,
    });
    return { id: result?.id || '' };
  }, [form]);

  if (!isOpen) return null;

  const inputClass =
    'flex h-12 w-full items-center rounded-xl border border-gray-200 bg-white/0 p-3 text-sm outline-none dark:border-white/10 dark:text-white';

  // Mezclar opciones predefinidas con las existentes en la BD
  const allTipos = [...new Set([...TIPO_VEHICULO_OPTIONS.map(o => o.value), ...tiposVehiculo])].sort();
  const allAsignaciones = asignaciones;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">
            {isEditing ? 'Editar Vehiculo' : 'Nuevo Vehiculo'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Tipo Vehiculo - combo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Tipo de Vehiculo
            </label>
            {!showTipoVehiculoInput && allTipos.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={form.tipoVehiculo}
                  onChange={(e) => updateField('tipoVehiculo', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  {allTipos.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowTipoVehiculoInput(true); updateField('tipoVehiculo', ''); }}
                  className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
                >
                  <MdAdd className="h-4 w-4" /> Nuevo
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.tipoVehiculo}
                  onChange={(e) => updateField('tipoVehiculo', e.target.value)}
                  placeholder="Ej: Ambulancia, Camioneta, Bus..."
                  className={inputClass}
                />
                {allTipos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowTipoVehiculoInput(false); updateField('tipoVehiculo', ''); }}
                    className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                  >
                    Seleccionar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Asignado A - combo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Asignado A
            </label>
            {!showAsignadoAInput && allAsignaciones.length > 0 ? (
              <div className="flex gap-2">
                <select
                  value={form.asignadoA}
                  onChange={(e) => updateField('asignadoA', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Seleccionar...</option>
                  {allAsignaciones.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => { setShowAsignadoAInput(true); updateField('asignadoA', ''); }}
                  className="flex h-12 items-center gap-1 whitespace-nowrap rounded-xl border border-brand-500 px-3 text-sm font-semibold text-brand-500 hover:bg-brand-50 dark:hover:bg-navy-700"
                >
                  <MdAdd className="h-4 w-4" /> Nueva
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.asignadoA}
                  onChange={(e) => updateField('asignadoA', e.target.value)}
                  placeholder="Ej: SAMU, Traslados, Logistica..."
                  className={inputClass}
                />
                {allAsignaciones.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setShowAsignadoAInput(false); updateField('asignadoA', ''); }}
                    className="flex h-12 items-center whitespace-nowrap rounded-xl border border-gray-300 px-3 text-sm text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700"
                  >
                    Seleccionar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Nombre Vehiculo */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Nombre / Descripcion *
            </label>
            <input
              type="text"
              value={form.nombreVehiculo}
              onChange={(e) => updateField('nombreVehiculo', e.target.value)}
              placeholder="Ej: AMBULANCIA SAMU BASE, CAMIONETA LOGISTICA..."
              className={inputClass}
            />
          </div>

          {/* Patente */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Patente
            </label>
            <input
              type="text"
              value={form.patente}
              onChange={(e) => updateField('patente', e.target.value)}
              placeholder="Ej: ABCD-12"
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
              placeholder="Marca del vehiculo"
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
              placeholder="Modelo del vehiculo"
              className={inputClass}
            />
          </div>

          {/* Anio */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Anio de Fabricacion
            </label>
            <input
              type="number"
              value={form.anio || ''}
              onChange={(e) => updateField('anio', parseInt(e.target.value) || 0)}
              min={1900}
              max={2100}
              placeholder="Ej: 2022"
              className={inputClass}
            />
          </div>

          {/* Numero Interno */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Numero Interno
            </label>
            <input
              type="text"
              value={form.numeroInterno}
              onChange={(e) => updateField('numeroInterno', e.target.value)}
              placeholder="Codigo interno del vehiculo"
              className={inputClass}
            />
          </div>

          {/* VIN */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              VIN (Numero de Chasis)
            </label>
            <input
              type="text"
              value={form.vin}
              onChange={(e) => updateField('vin', e.target.value)}
              placeholder="Numero de identificacion vehicular"
              className={inputClass}
            />
          </div>

          {/* Color */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Color
            </label>
            <input
              type="text"
              value={form.color}
              onChange={(e) => updateField('color', e.target.value)}
              placeholder="Ej: Blanco, Rojo, Gris..."
              className={inputClass}
            />
          </div>

          {/* Combustible */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Combustible
            </label>
            <select
              value={form.combustible}
              onChange={(e) => updateField('combustible', e.target.value)}
              className={inputClass}
            >
              {COMBUSTIBLE_FLOTA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Kilometraje */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Kilometraje
            </label>
            <input
              type="number"
              value={form.kilometraje || ''}
              onChange={(e) => updateField('kilometraje', parseInt(e.target.value) || 0)}
              min={0}
              placeholder="Km actuales"
              className={inputClass}
            />
          </div>

          {/* Capacidad Pasajeros */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Capacidad Pasajeros
            </label>
            <input
              type="number"
              value={form.capacidadPasajeros || ''}
              onChange={(e) => updateField('capacidadPasajeros', parseInt(e.target.value) || 0)}
              min={0}
              className={inputClass}
            />
          </div>

          {/* Fecha Adquisicion */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Fecha de Adquisicion
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
              value={form.vidaUtil || ''}
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
              {ESTADO_FLOTA_OPTIONS.map((o) => (
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

          {/* Revision Tecnica Vigente */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Revision Tecnica Vigente
            </label>
            <input
              type="date"
              value={form.revisionTecnicaVigente}
              onChange={(e) => updateField('revisionTecnicaVigente', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Permiso Circulacion */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Permiso de Circulacion
            </label>
            <input
              type="date"
              value={form.permisoCirculacion}
              onChange={(e) => updateField('permisoCirculacion', e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Seguro Vigente */}
          <div>
            <label className="mb-2 block text-sm font-bold text-navy-700 dark:text-white">
              Seguro Vigente
            </label>
            <input
              type="date"
              value={form.seguroVigente}
              onChange={(e) => updateField('seguroVigente', e.target.value)}
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
            disabled={saving || !form.nombreVehiculo.trim()}
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
          clase="InventarioFlotaVehicular"
          duplicado={duplicado}
          formData={form}
          onCrearNuevoForzado={handleCrearForzado}
        />
      )}
    </div>
  );
}
