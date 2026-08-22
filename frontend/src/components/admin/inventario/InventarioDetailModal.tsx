'use client';
import { useState } from 'react';
import { MdClose, MdEdit, MdHistory, MdAttachFile, MdCheckCircle, MdCancel, MdBuild, MdRemoveCircle, MdRestartAlt } from 'react-icons/md';
import Parse from 'utils/parseClient';
import {
  InventarioEquipo,
  ESTADO_COLORS,
  ESTADO_LABELS,
  CRITICO_COLORS,
  CRITICO_LABELS,
} from 'types/inventario-equipo.types';
import InventarioHistorialPanel from 'components/admin/inventario/InventarioHistorialPanel';
import InventarioArchivosPanel from 'components/admin/inventario/InventarioArchivosPanel';
import ActivoMantenimientosPanel from 'components/admin/mantenimiento/ActivoMantenimientosPanel';
import { CumplimientoBadge, UltimoMttoBadge } from 'components/admin/mantenimiento/CumplimientoBadge';
import BajaActivoModal from 'components/admin/inventario-shared/BajaActivoModal';
import ReconciliarHistorialButton from 'components/admin/inventario-shared/ReconciliarHistorialButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  equipo: InventarioEquipo | null;
  // Etapa 3 (revision-inventarios): callback tras baja/reactivacion
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

export default function InventarioDetailModal({ isOpen, onClose, onEdit, equipo, onActivoChanged }: Props) {
  const [activeTab, setActiveTab] = useState<'detalle' | 'mantenimientos' | 'historial' | 'archivos'>('detalle');
  const [bajaModalOpen, setBajaModalOpen] = useState(false);
  const [bajaModo, setBajaModo] = useState<'baja' | 'reactivar'>('baja');

  if (!isOpen || !equipo) return null;

  const periodosFaltantes = equipo.periodosFaltantes || 0;
  const userAccessLevel = Parse.User.current()?.get('accessLevel') || 1;
  const estaDeBaja = equipo.estado === 'Baja' || (!!equipo.fechaBaja && equipo.fechaBaja <= new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">
            Detalle del Equipo
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
                {equipo.nombreEquipo}
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {equipo.marca} {equipo.modelo && `— ${equipo.modelo}`}
              </p>
              <div className="mt-2 flex gap-2">
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                    ESTADO_COLORS[equipo.estado] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ESTADO_LABELS[equipo.estado] || equipo.estado}
                </span>
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                    CRITICO_COLORS[equipo.criticoApoyo] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {CRITICO_LABELS[equipo.criticoApoyo] || equipo.criticoApoyo}
                </span>
                {!equipo.activo && (
                  <span className="inline-block rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    Inactivo
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow label="Servicio" value={equipo.servicio} />
              <DetailRow label="Clase" value={equipo.clase} />
              <DetailRow label="Subclase" value={equipo.subclase} />
              <DetailRow label="Serie" value={equipo.serie} />
              <DetailRow label="Inventario" value={equipo.inventario} />
              <DetailRow label="Valor" value={equipo.valor} />
              <DetailRow label="Fecha Adquisicion" value={formatDate(equipo.fechaAdquisicion)} />
              <DetailRow label="Vida Util" value={equipo.vidaUtil ? `${equipo.vidaUtil} anios` : '—'} />
              <DetailRow
                label="Frecuencia Mantencion"
                value={equipo.frecuencia ? `${equipo.frecuencia} meses` : '—'}
              />
              <DetailRow label="Garantia Inicio" value={formatDate(equipo.garantiaInicio)} />
              <DetailRow label="Garantia Final" value={formatDate(equipo.garantiaFinal)} />
              <DetailRow label="Fecha de Baja" value={formatDate(equipo.fechaBaja)} />
              <DetailRow label="Creado" value={formatDate(equipo.createdAt || '')} />
              <DetailRow label="Actualizado" value={formatDate(equipo.updatedAt || '')} />
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
                      fecha={equipo.ultimaFechaMantenimiento}
                      estado={equipo.ultimoEstadoMantenimiento}
                      size="sm"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Estado</p>
                  <div className="mt-1">
                    <CumplimientoBadge
                      estado={equipo.estadoCumplimientoMantenimiento}
                      porcentaje={equipo.cumplimientoPorcentaje}
                      periodosCumplidos={equipo.periodosCumplidos}
                      periodosEsperados={equipo.periodosEsperados}
                      periodosFaltantes={equipo.periodosFaltantes}
                      size="sm"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Periodos</p>
                  <p className="mt-1 text-sm font-semibold text-navy-700 dark:text-white">
                    {equipo.periodosCumplidos || 0} / {equipo.periodosEsperados || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Proximo</p>
                  <p className="mt-1 text-sm font-semibold text-navy-700 dark:text-white">
                    {equipo.proximaFechaMantenimientoEsperada
                      ? equipo.proximaFechaMantenimientoEsperada.split('-').reverse().join('/')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Seccion Convenio de Mantenimiento */}
            <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-navy-600">
              <div className="mb-3 flex items-center gap-2">
                {equipo.convenioActivo ? (
                  <MdCheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <MdCancel className="h-5 w-5 text-red-400" />
                )}
                <h5 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">
                  Convenio de Mantenimiento
                </h5>
              </div>
              {equipo.convenioActivo ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailRow label="RUT Proveedor" value={equipo.proveedorRut} />
                  <DetailRow label="Nombre Proveedor" value={equipo.proveedorNombre} />
                  <DetailRow label="N° Licitacion" value={equipo.numeroLicitacion} />
                  <DetailRow label="Fecha Termino Convenio" value={formatDate(equipo.fechaTerminoConvenio)} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sin convenio vigente
                </p>
              )}
            </div>

            {/* Etapa 6 (revision-inventarios): reconciliacion de huerfanos */}
            <ReconciliarHistorialButton
              clase="InventarioEquipoMedico"
              activoId={equipo.id}
              nombreActivo={equipo.nombreEquipo}
              onChanged={onActivoChanged}
            />
          </>
        )}

        {/* Tab: Mantenimientos */}
        {activeTab === 'mantenimientos' && (
          <ActivoMantenimientosPanel
            activoId={equipo.id}
            activoClase="InventarioEquipoMedico"
            dominio="equipoMedico"
            fechaBase={equipo.fechaAdquisicion}
            frecuencia={equipo.frecuencia}
            fechaBaja={equipo.fechaBaja}
          />
        )}

        {/* Tab: Historial */}
        {activeTab === 'historial' && (
          <InventarioHistorialPanel equipoId={equipo.id} />
        )}

        {/* Tab: Archivos */}
        {activeTab === 'archivos' && (
          <InventarioArchivosPanel equipoId={equipo.id} />
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
        clase="InventarioEquipoMedico"
        activoId={equipo.id}
        nombreActivo={equipo.nombreEquipo}
        modo={bajaModo}
      />
    </div>
  );
}
