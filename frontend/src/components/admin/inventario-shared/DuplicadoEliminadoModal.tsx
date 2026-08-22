'use client';
import { useState } from 'react';
import { MdClose, MdRestartAlt, MdLink, MdAddCircle } from 'react-icons/md';
import Parse from 'utils/parseClient';
import Swal from 'sweetalert2';
import {
  InventarioSharedService,
  ClaseInventario,
  ActivoEliminado,
} from 'services/inventario-shared.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Llamado cuando el flujo se completa, con el id final del activo. */
  onResolved: (idFinal: string) => void;
  clase: ClaseInventario;
  duplicado: ActivoEliminado;
  /** Datos del formulario que el usuario intentaba guardar. */
  formData: Record<string, any>;
  /** Callback opcional para crear nuevo en bruto (sin adoptar). */
  onCrearNuevoForzado: () => Promise<{ id: string } | null>;
}

const formatFecha = (v: any) => {
  if (!v) return '—';
  try {
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleString('es-CL');
  } catch {
    return String(v);
  }
};

export default function DuplicadoEliminadoModal({
  isOpen,
  onClose,
  onResolved,
  clase,
  duplicado,
  formData,
  onCrearNuevoForzado,
}: Props) {
  const [busy, setBusy] = useState(false);
  const accessLevel = Parse.User.current()?.get('accessLevel') || 1;

  if (!isOpen) return null;

  const handleRestaurar = async () => {
    setBusy(true);
    try {
      await InventarioSharedService.restaurarYActualizar(clase, duplicado.id, formData);
      Swal.fire('Activo restaurado', `${duplicado.nombre} fue restaurado y actualizado.`, 'success');
      onResolved(duplicado.id);
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error?.message || 'No se pudo restaurar', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleAdoptarYCrear = async () => {
    setBusy(true);
    try {
      const created = await onCrearNuevoForzado();
      if (!created || !created.id) throw new Error('No se pudo crear el activo nuevo');
      const r = await InventarioSharedService.adoptarHuerfanos(clase, created.id, duplicado.id);
      Swal.fire(
        'Creado y vinculado',
        `Activo creado. Migrados ${r.migradosRegistros} registros, ${r.migradosHistorial} eventos de historial.`,
        'success'
      );
      onResolved(created.id);
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error?.message || 'No se pudo completar la operacion', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCrearNuevo = async () => {
    setBusy(true);
    try {
      const created = await onCrearNuevoForzado();
      if (!created || !created.id) throw new Error('No se pudo crear el activo nuevo');
      Swal.fire('Creado', 'Activo creado sin vincular al historico.', 'success');
      onResolved(created.id);
      onClose();
    } catch (error: any) {
      Swal.fire('Error', error?.message || 'No se pudo crear', 'error');
    } finally {
      setBusy(false);
    }
  };

  const idsCoincidentes: string[] = [];
  if (duplicado.serie) idsCoincidentes.push(`Serie: ${duplicado.serie}`);
  if (duplicado.inventario) idsCoincidentes.push(`Inventario: ${duplicado.inventario}`);
  if (duplicado.patente) idsCoincidentes.push(`Patente: ${duplicado.patente}`);
  if (duplicado.codigoInterno) idsCoincidentes.push(`Codigo: ${duplicado.codigoInterno}`);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">
            Activo similar en papelera
          </h3>
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Encontramos un activo <strong>eliminado anteriormente</strong> con identificadores que coinciden.
            Puedes restaurarlo (recomendado) o crear uno nuevo.
          </p>
        </div>

        <div className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-navy-900">
          <h4 className="text-base font-bold text-navy-700 dark:text-white">{duplicado.nombre}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Eliminado el {formatFecha(duplicado.eliminadoEn)}
          </p>
          {idsCoincidentes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {idsCoincidentes.map((s) => (
                <span
                  key={s}
                  className="inline-block rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
            {duplicado.servicio && <div><strong>Servicio:</strong> {duplicado.servicio}</div>}
            {duplicado.clase && <div><strong>Clase:</strong> {duplicado.clase}</div>}
            {duplicado.ubicacion && <div><strong>Ubicacion:</strong> {duplicado.ubicacion}</div>}
            {duplicado.tipoEquipo && <div><strong>Tipo:</strong> {duplicado.tipoEquipo}</div>}
            {duplicado.tipoVehiculo && <div><strong>Tipo:</strong> {duplicado.tipoVehiculo}</div>}
            {duplicado.sistema && <div><strong>Sistema:</strong> {duplicado.sistema}</div>}
            {duplicado.marca && <div><strong>Marca:</strong> {duplicado.marca}{duplicado.modelo ? ` / ${duplicado.modelo}` : ''}</div>}
          </div>
        </div>

        <div className="space-y-3">
          {/* Opcion 1: Restaurar */}
          <button
            type="button"
            onClick={handleRestaurar}
            disabled={busy || accessLevel < 3}
            className="flex w-full items-start gap-3 rounded-xl border-2 border-green-200 bg-green-50 p-4 text-left hover:bg-green-100 disabled:opacity-50 dark:border-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50"
          >
            <MdRestartAlt className="mt-0.5 h-6 w-6 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div className="flex-1">
              <p className="font-bold text-green-800 dark:text-green-200">Restaurar (recomendado)</p>
              <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                Recupera el activo con su historial, registros y archivos. Aplica los nuevos datos del formulario.
                {accessLevel < 3 && ' (Requiere COORDINATOR o superior)'}
              </p>
            </div>
          </button>

          {/* Opcion 2: Adoptar y crear nuevo */}
          <button
            type="button"
            onClick={handleAdoptarYCrear}
            disabled={busy || accessLevel < 4}
            className="flex w-full items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-4 text-left hover:bg-blue-100 disabled:opacity-50 dark:border-blue-700 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
          >
            <MdLink className="mt-0.5 h-6 w-6 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <p className="font-bold text-blue-800 dark:text-blue-200">Crear nuevo y migrar histórico</p>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                Crea un activo nuevo y reasigna los registros / historial del eliminado al nuevo objectId.
                {accessLevel < 4 && ' (Requiere ADMIN o superior)'}
              </p>
            </div>
          </button>

          {/* Opcion 3: Crear nuevo descartando histórico */}
          <button
            type="button"
            onClick={handleCrearNuevo}
            disabled={busy}
            className="flex w-full items-start gap-3 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 text-left hover:bg-gray-100 disabled:opacity-50 dark:border-navy-600 dark:bg-navy-700 dark:hover:bg-navy-600"
          >
            <MdAddCircle className="mt-0.5 h-6 w-6 flex-shrink-0 text-gray-600 dark:text-gray-300" />
            <div className="flex-1">
              <p className="font-bold text-gray-800 dark:text-gray-200">Crear nuevo (descartar histórico)</p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Crea un activo nuevo sin vincular el historial del eliminado. El antiguo queda en papelera.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
