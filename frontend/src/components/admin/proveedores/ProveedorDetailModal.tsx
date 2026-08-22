'use client';
import { useState, useEffect, useCallback } from 'react';
import { MdClose, MdEdit, MdAdd, MdHistory, MdDescription, MdBusiness } from 'react-icons/md';
import { Proveedor, ProveedorHistorialEntry } from 'types/proveedor.types';
import {
  Licitacion,
  INVENTARIO_DESTINO_LABELS,
  INVENTARIO_DESTINO_COLORS,
  ESTADO_LICITACION_COLORS,
  ESTADO_LICITACION_LABELS,
} from 'types/licitacion.types';
import { ProveedorService } from 'services/proveedor.service';
import { LicitacionService } from 'services/licitacion.service';
import LicitacionFormModal from './LicitacionFormModal';
import LicitacionDetailModal from './LicitacionDetailModal';
import Parse from 'utils/parseClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  proveedor: Proveedor | null;
}

type TabType = 'detalle' | 'licitaciones' | 'historial';

export default function ProveedorDetailModal({ isOpen, onClose, onEdit, proveedor }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('detalle');
  const [licitaciones, setLicitaciones] = useState<Licitacion[]>([]);
  const [loadingLicitaciones, setLoadingLicitaciones] = useState(false);
  const [historial, setHistorial] = useState<ProveedorHistorialEntry[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialTotal, setHistorialTotal] = useState(0);

  const [licFormOpen, setLicFormOpen] = useState(false);
  const [editingLicitacion, setEditingLicitacion] = useState<Licitacion | null>(null);
  const [licDetailOpen, setLicDetailOpen] = useState(false);
  const [viewingLicitacion, setViewingLicitacion] = useState<Licitacion | null>(null);

  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  const loadLicitaciones = useCallback(async () => {
    if (!proveedor) return;
    setLoadingLicitaciones(true);
    try {
      const result = await LicitacionService.getLicitacionesByProveedor(proveedor.id);
      setLicitaciones(result);
    } catch (error) {
      console.error('Error cargando licitaciones:', error);
    } finally {
      setLoadingLicitaciones(false);
    }
  }, [proveedor]);

  const loadHistorial = useCallback(async (append = false) => {
    if (!proveedor) return;
    setLoadingHistorial(true);
    try {
      const skip = append ? historial.length : 0;
      const result = await ProveedorService.getHistorial(proveedor.id, 10, skip);
      if (append) {
        setHistorial((prev) => [...prev, ...result.results]);
      } else {
        setHistorial(result.results);
      }
      setHistorialTotal(result.total);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  }, [proveedor, historial.length]);

  useEffect(() => {
    if (isOpen && proveedor) {
      setActiveTab('detalle');
      setHistorial([]);
      loadLicitaciones();
    }
  }, [isOpen, proveedor, loadLicitaciones]);

  useEffect(() => {
    if (activeTab === 'historial' && historial.length === 0 && proveedor) {
      loadHistorial();
    }
  }, [activeTab, proveedor]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-CL');
  };

  if (!isOpen || !proveedor) return null;

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'detalle', label: 'Detalle', icon: MdBusiness },
    { key: 'licitaciones', label: `Licitaciones (${licitaciones.length})`, icon: MdDescription },
    { key: 'historial', label: 'Historial', icon: MdHistory },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-navy-800">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="mb-4 flex items-start justify-between pr-10">
            <div>
              <h3 className="text-xl font-bold text-navy-700 dark:text-white">
                {proveedor.nombre}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                RUT: {proveedor.rut}
              </p>
            </div>
            {userAccessLevel >= 3 && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-500 hover:bg-brand-100 dark:bg-brand-900/20 dark:hover:bg-brand-900/40"
              >
                <MdEdit className="h-4 w-4" />
                Editar
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-1 border-b border-gray-200 dark:border-navy-600">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-brand-500 text-brand-500'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'detalle' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailField label="RUT" value={proveedor.rut} />
              <DetailField label="Nombre" value={proveedor.nombre} />
              <DetailField label="Correo" value={proveedor.correo} />
              <DetailField label="Telefono" value={proveedor.telefono} />
              <DetailField label="Direccion" value={proveedor.direccion} className="sm:col-span-2" />
              <DetailField label="Descripcion" value={proveedor.descripcion} className="sm:col-span-2" />
              <DetailField
                label="Estado"
                value={proveedor.activo ? 'Activo' : 'Inactivo'}
                valueClass={proveedor.activo ? 'text-green-600' : 'text-red-600'}
              />
              <DetailField label="Creado" value={formatDate(proveedor.createdAt || '')} />
            </div>
          )}

          {activeTab === 'licitaciones' && (
            <div>
              {userAccessLevel >= 3 && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={() => {
                      setEditingLicitacion(null);
                      setLicFormOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                  >
                    <MdAdd className="h-4 w-4" />
                    Nueva Licitacion
                  </button>
                </div>
              )}

              {loadingLicitaciones ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : licitaciones.length === 0 ? (
                <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay licitaciones registradas para este proveedor.
                </p>
              ) : (
                <div className="space-y-3">
                  {licitaciones.map((lic) => (
                    <div
                      key={lic.id}
                      className="cursor-pointer rounded-xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-navy-600 dark:hover:bg-navy-700/50"
                      onClick={() => {
                        setViewingLicitacion(lic);
                        setLicDetailOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-navy-700 dark:text-white">
                            {lic.numeroLicitacion}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                INVENTARIO_DESTINO_COLORS[lic.inventarioDestino] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {INVENTARIO_DESTINO_LABELS[lic.inventarioDestino] || lic.inventarioDestino}
                            </span>
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                ESTADO_LICITACION_COLORS[lic.estado] || 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {ESTADO_LICITACION_LABELS[lic.estado] || lic.estado}
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                          <p>{lic.fechaInicio} — {lic.fechaTerminoEfectiva}</p>
                          <p className="mt-1">{lic.totalEquipos} equipo(s)</p>
                          {lic.extensiones.length > 0 && (
                            <p className="mt-1 text-xs text-yellow-600">
                              {lic.extensiones.length} extension(es)
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'historial' && (
            <div>
              {loadingHistorial && historial.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : historial.length === 0 ? (
                <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay registros en el historial.
                </p>
              ) : (
                <div className="relative ml-4 border-l-2 border-gray-200 dark:border-navy-600">
                  {historial.map((entry) => (
                    <div key={entry.id} className="relative mb-4 ml-6">
                      <div
                        className={`absolute -left-[33px] h-4 w-4 rounded-full border-2 border-white dark:border-navy-800 ${
                          entry.accion === 'creacion'
                            ? 'bg-green-500'
                            : entry.accion === 'eliminacion'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                      />
                      <div className="rounded-lg border border-gray-100 p-3 dark:border-navy-600">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-navy-700 dark:text-white capitalize">
                            {entry.accion}
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(entry.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {entry.descripcion}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Por: {entry.usuarioNombre}
                        </p>
                        {entry.cambios && Object.keys(entry.cambios).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {Object.entries(entry.cambios).map(([campo, vals]: [string, any]) => (
                              <div key={campo} className="text-xs">
                                <span className="font-medium text-gray-500">{campo}:</span>{' '}
                                {vals.anterior && (
                                  <span className="text-red-500 line-through">{String(vals.anterior)}</span>
                                )}{' '}
                                <span className="text-green-600">{String(vals.nuevo)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {historial.length < historialTotal && (
                    <button
                      onClick={() => loadHistorial(true)}
                      disabled={loadingHistorial}
                      className="ml-6 mt-2 text-sm font-semibold text-brand-500 hover:text-brand-600"
                    >
                      {loadingHistorial ? 'Cargando...' : 'Cargar mas'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      <LicitacionFormModal
        isOpen={licFormOpen}
        onClose={() => {
          setLicFormOpen(false);
          setEditingLicitacion(null);
        }}
        onSave={loadLicitaciones}
        proveedorId={proveedor.id}
        proveedorNombre={proveedor.nombre}
        licitacion={editingLicitacion}
      />

      <LicitacionDetailModal
        isOpen={licDetailOpen}
        onClose={() => {
          setLicDetailOpen(false);
          setViewingLicitacion(null);
        }}
        onEdit={() => {
          setLicDetailOpen(false);
          if (viewingLicitacion) {
            setEditingLicitacion(viewingLicitacion);
            setLicFormOpen(true);
          }
        }}
        onRefresh={loadLicitaciones}
        licitacion={viewingLicitacion}
        proveedorNombre={proveedor.nombre}
      />
    </>
  );
}

function DetailField({
  label,
  value,
  className = '',
  valueClass = '',
}: {
  label: string;
  value: string;
  className?: string;
  valueClass?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`mt-0.5 text-sm text-navy-700 dark:text-gray-200 ${valueClass}`}>
        {value || '—'}
      </p>
    </div>
  );
}
