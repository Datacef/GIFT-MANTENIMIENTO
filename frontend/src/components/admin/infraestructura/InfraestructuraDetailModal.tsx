'use client';
import { useState } from 'react';
import { MdClose, MdEdit, MdHistory, MdAttachFile, MdCheckCircle, MdCancel, MdBuild, MdRemoveCircle, MdRestartAlt } from 'react-icons/md';
import Parse from 'utils/parseClient';
import {
  InventarioInfraestructura,
  ESTADO_INFRA_COLORS,
  ESTADO_INFRA_LABELS,
  CRITICIDAD_INFRA_COLORS,
  CRITICIDAD_INFRA_LABELS,
  SISTEMA_COLORS,
} from 'types/inventario-infraestructura.types';
import InfraestructuraHistorialPanel from 'components/admin/infraestructura/InfraestructuraHistorialPanel';
import InfraestructuraArchivosPanel from 'components/admin/infraestructura/InfraestructuraArchivosPanel';
import ActivoMantenimientosPanel from 'components/admin/mantenimiento/ActivoMantenimientosPanel';
import { CumplimientoBadge, UltimoMttoBadge } from 'components/admin/mantenimiento/CumplimientoBadge';
import BajaActivoModal from 'components/admin/inventario-shared/BajaActivoModal';
import ReconciliarHistorialButton from 'components/admin/inventario-shared/ReconciliarHistorialButton';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  componente: InventarioInfraestructura | null;
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

export default function InfraestructuraDetailModal({ isOpen, onClose, onEdit, componente, onActivoChanged }: Props) {
  const [activeTab, setActiveTab] = useState<'detalle' | 'mantenimientos' | 'historial' | 'archivos'>('detalle');
  const [bajaModalOpen, setBajaModalOpen] = useState(false);
  const [bajaModo, setBajaModo] = useState<'baja' | 'reactivar'>('baja');

  if (!isOpen || !componente) return null;

  const periodosFaltantes = componente.periodosFaltantes || 0;
  const userAccessLevel = Parse.User.current()?.get('accessLevel') || 1;
  const estaDeBaja = componente.estado === 'Baja' || (!!componente.fechaBaja && componente.fechaBaja <= new Date().toISOString().slice(0, 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-navy-700 dark:text-white">
            Detalle del Componente de Infraestructura
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
                {componente.componente}
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {componente.marca} {componente.modelo && `— ${componente.modelo}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                    SISTEMA_COLORS[componente.sistema] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {componente.sistema || 'Sin sistema'}
                </span>
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                    ESTADO_INFRA_COLORS[componente.estado] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {ESTADO_INFRA_LABELS[componente.estado] || componente.estado}
                </span>
                <span
                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${
                    CRITICIDAD_INFRA_COLORS[componente.criticidad] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Criticidad: {CRITICIDAD_INFRA_LABELS[componente.criticidad] || componente.criticidad}
                </span>
                {!componente.activo && (
                  <span className="inline-block rounded-full bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600">
                    Inactivo
                  </span>
                )}
              </div>
            </div>

            {/* Normativa e Inspecciones - prominente */}
            {(componente.normativaAplicable || componente.fechaUltimaInspeccion || componente.proximaInspeccion || componente.responsable) && (
              <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-800 dark:bg-teal-900/20">
                <p className="mb-2 text-xs font-bold uppercase text-teal-700 dark:text-teal-300">
                  Informacion Normativa e Inspecciones
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {componente.normativaAplicable && (
                    <DetailRow label="Normativa Aplicable" value={componente.normativaAplicable} />
                  )}
                  {componente.responsable && (
                    <DetailRow label="Responsable" value={componente.responsable} />
                  )}
                  {componente.fechaUltimaInspeccion && (
                    <DetailRow label="Ultima Inspeccion" value={formatDate(componente.fechaUltimaInspeccion)} />
                  )}
                  {componente.proximaInspeccion && (
                    <DetailRow label="Proxima Inspeccion" value={formatDate(componente.proximaInspeccion)} />
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow label="Ubicacion" value={componente.ubicacion} />
              <DetailRow label="Codigo Interno" value={componente.codigoInterno} />
              <DetailRow label="Serie" value={componente.serie} />
              <DetailRow label="Capacidad / Especificacion" value={componente.capacidad} />
              <DetailRow label="Fecha de Instalacion" value={formatDate(componente.fechaInstalacion)} />
              <DetailRow label="Vida Util" value={componente.vidaUtil ? `${componente.vidaUtil} anios` : '—'} />
              <DetailRow
                label="Frecuencia Mantencion"
                value={componente.frecuencia ? `${componente.frecuencia} meses` : '—'}
              />
              <DetailRow label="Garantia Inicio" value={formatDate(componente.garantiaInicio)} />
              <DetailRow label="Garantia Final" value={formatDate(componente.garantiaFinal)} />
              <DetailRow label="Fecha de Baja" value={formatDate(componente.fechaBaja)} />
              {componente.descripcion && (
                <div className="sm:col-span-2">
                  <DetailRow label="Descripcion" value={componente.descripcion} />
                </div>
              )}
              <DetailRow label="Creado" value={formatDate(componente.createdAt || '')} />
              <DetailRow label="Actualizado" value={formatDate(componente.updatedAt || '')} />
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
                      fecha={componente.ultimaFechaMantenimiento}
                      estado={componente.ultimoEstadoMantenimiento}
                      size="sm"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Estado</p>
                  <div className="mt-1">
                    <CumplimientoBadge
                      estado={componente.estadoCumplimientoMantenimiento}
                      porcentaje={componente.cumplimientoPorcentaje}
                      periodosCumplidos={componente.periodosCumplidos}
                      periodosEsperados={componente.periodosEsperados}
                      periodosFaltantes={componente.periodosFaltantes}
                      size="sm"
                    />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Periodos</p>
                  <p className="mt-1 text-sm font-semibold text-navy-700 dark:text-white">
                    {componente.periodosCumplidos || 0} / {componente.periodosEsperados || 0}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">Proximo</p>
                  <p className="mt-1 text-sm font-semibold text-navy-700 dark:text-white">
                    {componente.proximaFechaMantenimientoEsperada
                      ? componente.proximaFechaMantenimientoEsperada.split('-').reverse().join('/')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Seccion Convenio de Mantenimiento */}
            <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-navy-600">
              <div className="mb-3 flex items-center gap-2">
                {componente.convenioActivo ? (
                  <MdCheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <MdCancel className="h-5 w-5 text-red-400" />
                )}
                <h5 className="text-sm font-bold uppercase text-gray-600 dark:text-gray-300">
                  Convenio de Mantenimiento
                </h5>
              </div>
              {componente.convenioActivo ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailRow label="RUT Proveedor" value={componente.proveedorRut} />
                  <DetailRow label="Nombre Proveedor" value={componente.proveedorNombre} />
                  <DetailRow label="N° Licitacion" value={componente.numeroLicitacion} />
                  <DetailRow label="Fecha Termino Convenio" value={formatDate(componente.fechaTerminoConvenio)} />
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Sin convenio vigente
                </p>
              )}
            </div>

            {/* Etapa 6: reconciliacion de huerfanos */}
            <ReconciliarHistorialButton
              clase="InventarioInfraestructura"
              activoId={componente.id}
              nombreActivo={componente.componente}
              onChanged={onActivoChanged}
            />
          </>
        )}

        {/* Tab: Mantenimientos */}
        {activeTab === 'mantenimientos' && (
          <ActivoMantenimientosPanel
            activoId={componente.id}
            activoClase="InventarioInfraestructura"
            dominio="infraestructura"
            fechaBase={componente.fechaInstalacion}
            frecuencia={componente.frecuencia}
            fechaBaja={componente.fechaBaja}
          />
        )}

        {/* Tab: Historial */}
        {activeTab === 'historial' && (
          <InfraestructuraHistorialPanel componenteId={componente.id} />
        )}

        {/* Tab: Archivos */}
        {activeTab === 'archivos' && (
          <InfraestructuraArchivosPanel componenteId={componente.id} />
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

        <BajaActivoModal
          isOpen={bajaModalOpen}
          onClose={() => setBajaModalOpen(false)}
          onSuccess={() => {
            setBajaModalOpen(false);
            onActivoChanged && onActivoChanged();
            onClose();
          }}
          clase="InventarioInfraestructura"
          activoId={componente.id}
          nombreActivo={componente.componente}
          modo={bajaModo}
        />
      </div>
    </div>
  );
}
