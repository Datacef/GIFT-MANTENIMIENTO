'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import MantenimientoDetailView from 'components/admin/mantenimiento/MantenimientoDetailView';
import MantenimientoChecklistView from 'components/admin/mantenimiento/MantenimientoChecklistView';
import MantenimientoHistorialPanel from 'components/admin/mantenimiento/MantenimientoHistorialPanel';
import MantenimientoArchivosPanel from 'components/admin/mantenimiento/MantenimientoArchivosPanel';
import BandejaValidacionActions from 'components/admin/mantenimiento/BandejaValidacionActions';
import MantenimientoPDFButton from 'components/admin/mantenimiento/MantenimientoPDF';
import { MantenimientoService } from 'services/mantenimiento.service';
import { RegistroMantenimiento } from 'types/mantenimiento.types';
import {
  TIPO_MANTENIMIENTO_LABELS,
  ESTADO_VALIDACION_LABELS,
  ESTADO_VALIDACION_COLORS,
} from 'types/mantenimiento.types';
import {
  MdArrowBack,
  MdHistory,
  MdAttachFile,
  MdChecklist,
  MdInfo,
} from 'react-icons/md';

// ------------------------------------------------
// Auth wrapper
// ------------------------------------------------
const MantenimientoDetallePage = () => {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = Parse.User.current();
    if (!user) {
      router.push('/auth/sign-in');
      return;
    }
    const level = user.get('accessLevel') || 1;
    if (level >= 1) {
      setAuthorized(true);
    } else {
      router.push('/admin/default');
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!authorized) return null;
  return <MantenimientoDetalleContent />;
};

// ------------------------------------------------
// Content
// ------------------------------------------------
const MantenimientoDetalleContent = () => {
  const router = useRouter();
  const params = useParams();
  const registroId = params?.id as string;

  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  const [registro, setRegistro] = useState<RegistroMantenimiento | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'detalle' | 'checklist' | 'historial' | 'archivos'
  >('detalle');

  const fetchRegistro = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await MantenimientoService.getRegistroById(registroId);
      if (!result) {
        setError('Registro de mantenimiento no encontrado.');
        return;
      }
      setRegistro(result);
    } catch (err: any) {
      setError(err.message || 'Error al cargar el registro.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (registroId) {
      fetchRegistro();
    }
  }, [registroId]);

  const handleUpdate = () => {
    fetchRegistro();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300"
        >
          <MdArrowBack className="h-4 w-4" />
          Volver
        </button>
      </div>
    );
  }

  if (!registro) return null;

  const tipoLabel =
    TIPO_MANTENIMIENTO_LABELS[registro.tipoMantenimiento] ||
    registro.tipoMantenimiento;
  const estadoLabel =
    ESTADO_VALIDACION_LABELS[registro.estadoValidacion] ||
    registro.estadoValidacion;
  const estadoColor =
    ESTADO_VALIDACION_COLORS[registro.estadoValidacion] ||
    'bg-gray-100 text-gray-800';

  const canDownloadPdf =
    registro.estadoValidacion === 'aprobado' || userAccessLevel >= 4;

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:pt-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
            title="Volver"
          >
            <MdArrowBack className="h-5 w-5" />
          </button>
          <div>
            <h4 className="text-xl font-bold text-navy-700 dark:text-white">
              Detalle de Mantenimiento {tipoLabel}
            </h4>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {registro.activoResumen?.nombre || '-'}
              </span>
              <span
                className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${estadoColor}`}
              >
                {estadoLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <BandejaValidacionActions
            registro={registro}
            onUpdate={handleUpdate}
          />
          {canDownloadPdf && <MantenimientoPDFButton registro={registro} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-navy-900">
        <button
          onClick={() => setActiveTab('detalle')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'detalle'
              ? 'bg-white text-navy-700 shadow dark:bg-navy-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <MdInfo className="h-4 w-4" />
          Detalle
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'checklist'
              ? 'bg-white text-navy-700 shadow dark:bg-navy-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <MdChecklist className="h-4 w-4" />
          Checklist
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

      {/* Tab Content */}
      <Card extra="p-6">
        {activeTab === 'detalle' && (
          <MantenimientoDetailView registro={registro} />
        )}
        {activeTab === 'checklist' && (
          <MantenimientoChecklistView checklist={registro.checklist} />
        )}
        {activeTab === 'historial' && (
          <MantenimientoHistorialPanel registroId={registro.id} />
        )}
        {activeTab === 'archivos' && (
          <MantenimientoArchivosPanel registroId={registro.id} />
        )}
      </Card>
    </div>
  );
};

export default MantenimientoDetallePage;
