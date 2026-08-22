'use client';
import { useState } from 'react';
import { MdClose, MdEdit, MdHistory, MdAttachFile, MdCheckCircle, MdCancel, MdBuild, MdRemoveCircle, MdRestartAlt } from 'react-icons/md';
import Parse from 'utils/parseClient';
import {
  InventarioFlota,
  ESTADO_FLOTA_COLORS,
  ESTADO_FLOTA_LABELS,
} from 'types/inventario-flota.types';
import FlotaVehicularHistorialPanel from 'components/admin/flota-vehicular/FlotaVehicularHistorialPanel';
import FlotaVehicularArchivosPanel from 'components/admin/flota-vehicular/FlotaVehicularArchivosPanel';
import ActivoMantenimientosPanel from 'components/admin/mantenimiento/ActivoMantenimientosPanel';
import { CumplimientoBadge, UltimoMttoBadge } from 'components/admin/mantenimiento/CumplimientoBadge';
import BajaActivoModal from 'components/admin/inventario-shared/BajaActivoModal';
import ReconciliarHistorialButton from 'components/admin/inventario-shared/ReconciliarHistorialButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  vehiculo: InventarioFlota | null;
  onActivoChanged?: () => void;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CL');
  } catch {
    return dateStr;
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-navy-700 dark:text-white">{value || '—'}</p>
    </div>
  );
}

export default function FlotaVehicularDetailModal({ isOpen, onClose, onEdit, vehiculo, onActivoChanged }: Props) {
  const [activeTab, setActiveTab] = useState<'detalle' | 'mantenimientos' | 'historial' | 'archivos'>('detalle');
  const [bajaModalOpen, setBajaModalOpen] = useState(false);
  const [bajaModo, setBajaModo] = useState<'baja' | 'reactivar'>('baja');

  if (!isOpen || !vehiculo) return null;

  const periodosFaltantes = vehiculo.periodosFaltantes || 0;
  const userAccessLevel = Parse.User.current()?.get('accessLevel') || 1;
  const estaDeBaja = vehiculo.estado === 'Baja' || (!!vehiculo.fechaBaja && vehiculo.fechaBaja <= new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">
            Detalle del Vehiculo
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-navy-900">
          <button
            onClick={() => setActiveTab('detalle')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'detalle'
                ? 'bg-white text-navy-700 shadow dark:bg-navy-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Detalle
          </button>
          <button
            onClick={() => setActiveTab('mantenimientos')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'mantenimientos'
                ? 'bg-white text-navy-700 shadow dark:bg-navy-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <MdBuild className="h-4 w-4" />
            Mantenimientos
            {periodosFaltantes > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {periodosFaltantes}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'historial'
                ? 'bg-white text-navy-700 shadow dark:bg-navy-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <MdHistory className="h-4 w-4" />
            Historial
          </button>
          <button
            onClick={() => setActiveTab('archivos')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === 'archivos'
                ? 'bg-white text-navy-700 shadow dark:bg-navy-700 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <MdAttachFile className="h-4 w-4" />
            Archivos
          </button>
        </div>

        {/* Tab: Detalle */}
        {activeTab === 'detalle' && (
          <>
            <div className="mb-4 rounded-xl bg-gray-50 p-4 dark:bg-navy-900">
              <h4 className="text-lg font-bold text-navy-700 dark:text-white">
                {vehiculo.nombreVehiculo}
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {vehiculo.marca} {vehiculo.modelo && `— ${vehiculo.modelo}`} {vehiculo.anio ? `(${vehiculo.anio})` : ''}
              </p>
              {vehiculo.patente && (
                <p className="mt-1 text-base font-bold text-brand-500 dark:text-brand-400">
                  Patente: {vehiculo.patente}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                    ESTADO_FLOTA_COLORS[vehiculo.estado] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ESTADO_FLOTA_LABELS[vehiculo.estado] || vehiculo.estado}
                </span>
                {vehiculo.combustible && (
                  <span className="inline-block rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {vehiculo.combustible}
                  </span>
                )}
                {vehiculo.asignadoA && (
                  <span className="inline-block rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    {vehiculo.asignadoA}
                  </span>
                )}
                {!vehiculo.activo && (
                  <span className="inline-block rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    Inactivo
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow label="Tipo de Vehiculo" value={vehiculo.tipoVehiculo} />
              <DetailRow label="Numero Interno" value={vehiculo.numeroInterno} />
              <DetailRow label="VIN (Chasis)" value={vehiculo.vin} />
              <DetailRow label="Color" value={vehiculo.color} />
              <DetailRow
                label="Kilometraje"
                value={vehiculo.kilometraje ? `${vehiculo.kilometraje.toLocaleString('es-CL')} km` : '—'}
              />
              <DetailRow
                label="Capacidad Pasajeros"
                value={vehiculo.capacidadPasajeros ? `${vehiculo.capacidadPasajeros}` : '—'}
              />
              <DetailRow label="Fecha de Adquisicion" value={formatDate(vehiculo.fechaAdquisicion)} />
              <DetailRow label="Vida Util" value={vehiculo.vidaUtil ? `${vehiculo.vidaUtil} anios` : '—'} />
              <DetailRow
                label="Frecuencia Mantencion"
                value={vehiculo.frecuencia ? `${vehiculo.frecuencia} meses` : '—'}
              />
              <DetailRow label="Revision Tecnica Vigente" value={formatDate(vehiculo.revisionTecnicaVigente)} />
              <DetailRow label="Permiso de Circulacion" value={formatDate(vehiculo.permisoCirculacion)} />
              <DetailRow label="Seguro Vigente" value={formatDate(vehiculo.seguroVigente)} />
              <DetailRow label="Garantia Inicio" value={formatDate(vehiculo.garantiaInicio)} />
              <DetailRow label="Garantia Final" value={formatDate(vehiculo.garantiaFinal)} />
              <DetailRow label="Fecha de Baja" value={formatDate(vehiculo.fechaBaja)} />
              <DetailRow label="Creado" value={formatDate(vehiculo.createdAt || '')} />
              <DetailRow label="Actualizado" value={formatDate(vehiculo.updatedAt || '')} />
            </div>

            {/* Seccion Cumplimiento de Mantenimiento (mini) */}
            <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-navy-600">
              <div className="mb-3 flex items-center justify-between">
                <h5 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">
                  Cumplimiento de Mantenimiento
                </h5>
                <button
                  onClick={() => setActiveTab('mantenimientos')}
                  className="text-xs font-semibold text-brand-500 hover:underline"
                >
                  Ver timeline completo →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Ultimo Mantto</p>
                  <div className="mt-1">
                    <UltimoMttoBadge
                      fecha={vehiculo.ultimaFechaMantenimiento}
                      estado={vehiculo.ultimoEstadoMantenimiento}
                      size="sm"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Estado</p>
                  <div className="mt-1">
                    <CumplimientoBadge
                      estado={vehiculo.estadoCumplimientoMantenimiento}
                      porcentaje={vehiculo.cumplimientoPorcentaje}
                      periodosCumplidos={vehiculo.periodosCumplidos}
                      periodosEsperados={vehiculo.periodosEsperados}
                      periodosFaltantes={vehiculo.periodosFaltantes}
                      size="sm"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Periodos</p>
                  <p className="mt-1 text-sm font-semibold text-navy-700 dark:text-white">
                    {vehiculo.periodosCumplidos || 0} / {vehiculo.periodosEsperados || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Proximo</p>
                  <p className="mt-1 text-sm font-semibold text-navy-700 dark:text-white">
                    {vehiculo.proximaFechaMantenimientoEsperada
                      ? vehiculo.proximaFechaMantenimientoEsperada.split('-').reverse().join('/')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Seccion Convenio de Mantenimiento */}
            <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-navy-600">
              <div className="mb-3 flex items-center gap-2">
                {vehiculo.convenioActivo ? (
                  <MdCheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <MdCancel className="h-5 w-5 text-red-400" />
                )}
                <h5 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">
                  Convenio de Mantenimiento
                </h5>
              </div>
              {vehiculo.convenioActivo ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailRow label="RUT Proveedor" value={vehiculo.proveedorRut} />
                  <DetailRow label="Nombre Proveedor" value={vehiculo.proveedorNombre} />
                  <DetailRow label="N° Licitacion" value={vehiculo.numeroLicitacion} />
                  <DetailRow label="Fecha Termino Convenio" value={formatDate(vehiculo.fechaTerminoConvenio)} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sin convenio vigente
                </p>
              )}
            </div>

            {/* Etapa 6: reconciliacion de huerfanos */}
            <ReconciliarHistorialButton
              clase="InventarioFlotaVehicular"
              activoId={vehiculo.id}
              nombreActivo={vehiculo.nombreVehiculo}
              onChanged={onActivoChanged}
            />
          </>
        )}

        {/* Tab: Mantenimientos */}
        {activeTab === 'mantenimientos' && (
          <ActivoMantenimientosPanel
            activoId={vehiculo.id}
            activoClase="InventarioFlotaVehicular"
            dominio="flotaVehicular"
            fechaBase={vehiculo.fechaAdquisicion}
            frecuencia={vehiculo.frecuencia}
            fechaBaja={vehiculo.fechaBaja}
          />
        )}

        {/* Tab: Historial */}
        {activeTab === 'historial' && (
          <FlotaVehicularHistorialPanel vehiculoId={vehiculo.id} />
        )}

        {/* Tab: Archivos */}
        {activeTab === 'archivos' && (
          <FlotaVehicularArchivosPanel vehiculoId={vehiculo.id} />
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            Cerrar
          </button>
          {userAccessLevel >= 3 && !estaDeBaja && (
            <button
              onClick={() => { setBajaModo('baja'); setBajaModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <MdRemoveCircle className="h-4 w-4" />
              Dar de baja
            </button>
          )}
          {userAccessLevel >= 4 && estaDeBaja && (
            <button
              onClick={() => { setBajaModo('reactivar'); setBajaModalOpen(true); }}
              className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-6 py-3 text-sm font-semibold text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
            >
              <MdRestartAlt className="h-4 w-4" />
              Reactivar
            </button>
          )}
          <button
            onClick={onEdit}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600"
          >
            <MdEdit className="h-4 w-4" />
            Editar
          </button>
        </div>
      </div>

      <BajaActivoModal
        isOpen={bajaModalOpen}
        onClose={() => setBajaModalOpen(false)}
        onSuccess={() => {
          setBajaModalOpen(false);
          onActivoChanged && onActivoChanged();
          onClose();
        }}
        clase="InventarioFlotaVehicular"
        activoId={vehiculo.id}
        nombreActivo={vehiculo.nombreVehiculo}
        modo={bajaModo}
      />
    </div>
  );
}
