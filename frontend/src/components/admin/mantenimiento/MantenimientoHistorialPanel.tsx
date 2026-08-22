'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  MdAdd,
  MdCheckCircle,
  MdCancel,
  MdAttachFile,
  MdDelete,
  MdSend,
  MdExpandMore,
  MdExpandLess,
} from 'react-icons/md';
import { HistorialMttoEntry } from 'types/mantenimiento.types';
import { MantenimientoService } from 'services/mantenimiento.service';

interface Props {
  registroId: string;
}

const ACCION_CONFIG: Record<
  string,
  { icon: typeof MdAdd; color: string; label: string }
> = {
  creacion: {
    icon: MdAdd,
    color: 'text-green-500 bg-green-100 dark:bg-green-900/30',
    label: 'Creacion',
  },
  envio_validacion: {
    icon: MdSend,
    color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    label: 'Enviado a validacion',
  },
  aprobado: {
    icon: MdCheckCircle,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
    label: 'Aprobado',
  },
  rechazado: {
    icon: MdCancel,
    color: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    label: 'Rechazado',
  },
  archivo_adjunto: {
    icon: MdAttachFile,
    color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
    label: 'Archivo adjuntado',
  },
  archivo_eliminado: {
    icon: MdDelete,
    color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30',
    label: 'Archivo eliminado',
  },
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function DetallesInfo({ detalles }: { detalles?: Record<string, any> }) {
  const [expanded, setExpanded] = useState(false);

  if (!detalles || Object.keys(detalles).length === 0) return null;

  const entries = Object.entries(detalles);

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        {expanded ? (
          <MdExpandLess className="h-4 w-4" />
        ) : (
          <MdExpandMore className="h-4 w-4" />
        )}
        Ver detalles
      </button>
      {expanded && (
        <div className="mt-1 space-y-1 rounded-lg bg-gray-50 p-2 dark:bg-navy-900">
          {entries.map(([campo, valor]) => (
            <div key={campo} className="text-xs">
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                {campo}:
              </span>{' '}
              <span className="text-gray-700 dark:text-gray-400">
                {String(valor || '(vacio)')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MantenimientoHistorialPanel({ registroId }: Props) {
  const [historial, setHistorial] = useState<HistorialMttoEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const pageSize = 10;

  const fetchHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const result = await MantenimientoService.getHistorial(
        registroId,
        pageSize,
        skip,
      );
      if (skip === 0) {
        setHistorial(result.results);
      } else {
        setHistorial((prev) => [...prev, ...result.results]);
      }
      setTotal(result.total);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoading(false);
    }
  }, [registroId, skip]);

  useEffect(() => {
    fetchHistorial();
  }, [fetchHistorial]);

  const handleLoadMore = () => {
    setSkip((prev) => prev + pageSize);
  };

  if (loading && historial.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (historial.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No hay registros de historial para este mantenimiento.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="relative">
        <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200 dark:bg-navy-600" />

        {historial.map((entry) => {
          const config =
            ACCION_CONFIG[entry.accion] || ACCION_CONFIG.creacion;
          const IconComponent = config.icon;

          return (
            <div key={entry.id} className="relative flex gap-4 pb-4">
              <div
                className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.color}`}
              >
                <IconComponent className="h-5 w-5" />
              </div>

              <div className="flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-navy-700 dark:text-white">
                    {config.label}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(entry.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  por {entry.usuarioNombre}
                </p>
                <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {entry.descripcion}
                </p>

                {entry.archivoNombre && entry.archivoUrl && (
                  <a
                    href={entry.archivoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600"
                  >
                    <MdAttachFile className="h-3.5 w-3.5" />
                    {entry.archivoNombre}
                  </a>
                )}

                <DetallesInfo detalles={entry.detalles} />
              </div>
            </div>
          );
        })}
      </div>

      {historial.length < total && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="rounded-lg border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            {loading
              ? 'Cargando...'
              : `Cargar mas (${historial.length} de ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
