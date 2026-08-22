'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  MdUpload,
  MdDelete,
  MdInsertDriveFile,
  MdOpenInNew,
  MdFilterList,
} from 'react-icons/md';
import Parse from 'utils/parseClient';
import Swal from 'sweetalert2';
import {
  ArchivoAdjuntoMtto,
  ARCHIVO_CATEGORIA_MTTO_OPTIONS,
  ARCHIVO_CATEGORIA_MTTO_LABELS,
  ARCHIVO_CATEGORIA_MTTO_COLORS,
} from 'types/mantenimiento.types';
import { MantenimientoService } from 'services/mantenimiento.service';

interface Props {
  registroId: string;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CL', {
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

function getFileIconColor(tipo: string): string {
  const iconMap: Record<string, string> = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
    xls: 'text-green-500',
    xlsx: 'text-green-500',
    png: 'text-purple-500',
    jpg: 'text-purple-500',
    jpeg: 'text-purple-500',
  };
  return iconMap[tipo.toLowerCase()] || 'text-gray-500';
}

export default function MantenimientoArchivosPanel({ registroId }: Props) {
  const [archivos, setArchivos] = useState<ArchivoAdjuntoMtto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedCategoria, setSelectedCategoria] = useState('otro');
  const [filtroCategoria, setFiltroCategoria] = useState('todas');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentUser = Parse.User.current();
  const userAccessLevel = currentUser?.get('accessLevel') || 1;

  const fetchArchivos = useCallback(async () => {
    setLoading(true);
    try {
      const result = await MantenimientoService.getArchivos(registroId);
      setArchivos(result);
    } catch (error) {
      console.error('Error cargando archivos:', error);
    } finally {
      setLoading(false);
    }
  }, [registroId]);

  useEffect(() => {
    fetchArchivos();
  }, [fetchArchivos]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      setUploadProgress(30);
      await MantenimientoService.adjuntarArchivo(
        registroId,
        file,
        selectedCategoria,
      );
      setUploadProgress(100);

      const catLabel =
        ARCHIVO_CATEGORIA_MTTO_LABELS[selectedCategoria] || selectedCategoria;
      Swal.fire({
        icon: 'success',
        title: 'Archivo subido',
        text: `El archivo "${file.name}" se ha adjuntado como "${catLabel}".`,
        timer: 2000,
        showConfirmButton: false,
      });

      fetchArchivos();
    } catch (error: any) {
      Swal.fire('Error', error.message || 'Error al subir el archivo', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (archivo: ArchivoAdjuntoMtto) => {
    const result = await Swal.fire({
      title: 'Eliminar archivo',
      text: `Se eliminara el archivo "${archivo.nombre}". Esta accion no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      confirmButtonText: 'Eliminar',
    });

    if (!result.isConfirmed) return;

    try {
      await MantenimientoService.eliminarArchivo(
        registroId,
        archivo.nombre,
        archivo.url,
      );
      Swal.fire({
        icon: 'success',
        title: 'Archivo eliminado',
        timer: 1500,
        showConfirmButton: false,
      });
      fetchArchivos();
    } catch (error: any) {
      Swal.fire(
        'Error',
        error.message || 'Error al eliminar el archivo',
        'error',
      );
    }
  };

  const archivosFiltrados =
    filtroCategoria === 'todas'
      ? archivos
      : archivos.filter((a) => (a.categoria || 'otro') === filtroCategoria);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      {/* Barra de acciones */}
      {userAccessLevel >= 2 && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[180px] flex-1">
              <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Tipo de documento
              </label>
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-navy-700 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
              >
                {ARCHIVO_CATEGORIA_MTTO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={handleUploadClick}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                <MdUpload className="h-4 w-4" />
                {uploading ? 'Subiendo...' : 'Subir archivo'}
              </button>
            </div>
          </div>

          {uploading && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-navy-600">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Filtro por categoria */}
      {archivos.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <MdFilterList className="h-4 w-4 text-gray-400" />
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFiltroCategoria('todas')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filtroCategoria === 'todas'
                  ? 'bg-brand-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-navy-600 dark:text-gray-300 dark:hover:bg-navy-500'
              }`}
            >
              Todas ({archivos.length})
            </button>
            {ARCHIVO_CATEGORIA_MTTO_OPTIONS.map((opt) => {
              const count = archivos.filter(
                (a) => (a.categoria || 'otro') === opt.value,
              ).length;
              if (count === 0) return null;
              return (
                <button
                  key={opt.value}
                  onClick={() => setFiltroCategoria(opt.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filtroCategoria === opt.value
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-navy-600 dark:text-gray-300 dark:hover:bg-navy-500'
                  }`}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista de archivos */}
      {archivosFiltrados.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {archivos.length === 0
            ? 'No hay archivos adjuntos para este mantenimiento.'
            : 'No hay archivos en esta categoria.'}
        </div>
      ) : (
        <div className="space-y-2">
          {archivosFiltrados.map((archivo, index) => {
            const cat = archivo.categoria || 'otro';
            const catLabel = ARCHIVO_CATEGORIA_MTTO_LABELS[cat] || cat;
            const catColor =
              ARCHIVO_CATEGORIA_MTTO_COLORS[cat] ||
              ARCHIVO_CATEGORIA_MTTO_COLORS['otro'];

            return (
              <div
                key={`${archivo.nombre}-${index}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 p-3 dark:border-navy-600"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MdInsertDriveFile
                    className={`h-8 w-8 flex-shrink-0 ${getFileIconColor(archivo.tipo)}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={archivo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-semibold text-navy-700 hover:text-brand-500 dark:text-white dark:hover:text-brand-400"
                        title={archivo.nombre}
                      >
                        <span className="truncate">{archivo.nombre}</span>
                        <MdOpenInNew className="h-3.5 w-3.5 flex-shrink-0" />
                      </a>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${catColor}`}
                      >
                        {catLabel}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Subido por {archivo.subidoPor} el{' '}
                      {formatDate(archivo.fecha)}
                    </p>
                  </div>
                </div>

                {userAccessLevel >= 3 && (
                  <button
                    onClick={() => handleDelete(archivo)}
                    className="ml-2 flex-shrink-0 rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Eliminar archivo"
                  >
                    <MdDelete className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
