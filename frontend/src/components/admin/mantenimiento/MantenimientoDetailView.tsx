'use client';
import { useState } from 'react';
import { MdZoomIn, MdClose, MdWarning, MdOpenInNew } from 'react-icons/md';
import {
  RegistroMantenimiento,
  DOMINIO_MANTENIMIENTO_LABELS,
  DOMINIO_MANTENIMIENTO_COLORS,
  TIPO_MANTENIMIENTO_LABELS,
  TIPO_MANTENIMIENTO_COLORS,
  ESTADO_VALIDACION_LABELS,
  ESTADO_VALIDACION_COLORS,
} from 'types/mantenimiento.types';

interface Props {
  registro: RegistroMantenimiento;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CL');
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-navy-700 dark:text-white">
        {value || '-'}
      </p>
    </div>
  );
}

export default function MantenimientoDetailView({ registro }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const dominioLabel =
    DOMINIO_MANTENIMIENTO_LABELS[registro.dominio] || registro.dominio;
  const dominioColor =
    DOMINIO_MANTENIMIENTO_COLORS[registro.dominio] ||
    'bg-gray-100 text-gray-800';
  const tipoLabel =
    TIPO_MANTENIMIENTO_LABELS[registro.tipoMantenimiento] ||
    registro.tipoMantenimiento;
  const tipoColor =
    TIPO_MANTENIMIENTO_COLORS[registro.tipoMantenimiento] ||
    'bg-gray-100 text-gray-800';
  const estadoLabel =
    ESTADO_VALIDACION_LABELS[registro.estadoValidacion] ||
    registro.estadoValidacion;
  const estadoColor =
    ESTADO_VALIDACION_COLORS[registro.estadoValidacion] ||
    'bg-gray-100 text-gray-800';

  return (
    <div className="space-y-6">
      {/* Seccion 1: Banner de estado */}
      {registro.estadoValidacion === 'rechazado' && registro.motivoRechazo && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <MdWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-300">
              Mantenimiento rechazado
            </p>
            <p className="mt-1 text-sm text-red-700 dark:text-red-400">
              {registro.motivoRechazo}
            </p>
            {registro.validadorNombre && (
              <p className="mt-1 text-xs text-red-500">
                Por {registro.validadorNombre} el{' '}
                {formatDateTime(registro.fechaValidacion || '')}
              </p>
            )}
          </div>
        </div>
      )}

      {registro.estadoValidacion === 'aprobado' && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <div>
            <p className="text-sm font-bold text-green-800 dark:text-green-300">
              Mantenimiento aprobado
            </p>
            {registro.validadorNombre && (
              <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                Validado por {registro.validadorNombre} el{' '}
                {formatDateTime(registro.fechaValidacion || '')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Seccion 2: Informacion del activo */}
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-navy-900">
        <h4 className="mb-3 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
          Informacion del Activo
        </h4>
        <div className="mb-2">
          <p className="text-lg font-bold text-navy-700 dark:text-white">
            {registro.activoResumen?.nombre || '-'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {registro.activoResumen?.identificador || '-'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DetailRow
            label="Estado del activo"
            value={registro.activoResumen?.estado}
          />
          <DetailRow
            label="Ubicacion"
            value={registro.activoResumen?.ubicacion}
          />
          <DetailRow
            label="Clasificacion"
            value={registro.clasificacionEquipo}
          />
          <DetailRow label="Clase Parse" value={registro.activoClase} />
        </div>
      </div>

      {/* Seccion 3: Informacion del mantenimiento */}
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-navy-900">
        <h4 className="mb-3 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
          Informacion del Mantenimiento
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DetailRow label="Fecha" value={formatDate(registro.fecha)} />
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Dominio
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${dominioColor}`}
            >
              {dominioLabel}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Tipo
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${tipoColor}`}
            >
              {tipoLabel}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
              Estado Validacion
            </p>
            <span
              className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${estadoColor}`}
            >
              {estadoLabel}
            </span>
          </div>
          <DetailRow label="Tecnico" value={registro.tecnicoNombre} />
          <DetailRow
            label="Proximo mantenimiento"
            value={formatDate(registro.proximoMantenimiento)}
          />
        </div>
      </div>

      {/* Seccion 4: Observaciones */}
      {registro.observacionesGenerales && (
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-navy-900">
          <h4 className="mb-2 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
            Observaciones Generales
          </h4>
          <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
            {registro.observacionesGenerales}
          </p>
        </div>
      )}

      {/* Seccion 5: Fotos del checklist */}
      {registro.checklist?.items?.some((item: any) => item.fotoUrl) && (
        <div className="rounded-xl bg-gray-50 p-4 dark:bg-navy-900">
          <h4 className="mb-3 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
            Fotos del Checklist
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {registro.checklist.items
              .filter((item: any) => item.fotoUrl)
              .map((item: any, idx: number) => (
                <div key={idx} className="space-y-1">
                  <button
                    onClick={() => setPreviewUrl(item.fotoUrl)}
                    className="group relative aspect-square w-full overflow-hidden rounded-lg border border-gray-200"
                  >
                    <img
                      src={item.fotoUrl}
                      alt={item.pregunta}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                      <MdZoomIn className="h-5 w-5 text-white" />
                    </div>
                  </button>
                  <p className="truncate text-xs text-gray-500">{item.pregunta}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Seccion 6: Fotos adicionales */}
      {registro.fotosAdicionales &&
        Object.keys(registro.fotosAdicionales).length > 0 && (
          <div className="rounded-xl bg-gray-50 p-4 dark:bg-navy-900">
            <h4 className="mb-3 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
              Evidencia Fotografica
            </h4>
            {Object.entries(registro.fotosAdicionales).map(
              ([categoria, fotos]) => {
                if (!Array.isArray(fotos) || fotos.length === 0) return null;
                return (
                  <div key={categoria} className="mb-4">
                    <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                      {categoria}
                    </p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                      {fotos.map((foto, idx) => {
                        const url =
                          typeof foto === 'string' ? foto : foto?.url;
                        if (!url) return null;
                        return (
                          <button
                            key={idx}
                            onClick={() => setPreviewUrl(url)}
                            className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200"
                          >
                            <img
                              src={url}
                              alt={`${categoria} ${idx + 1}`}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                              <MdZoomIn className="h-5 w-5 text-white" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}

      {/* Seccion 6: Firmas */}
      <div className="rounded-xl bg-gray-50 p-4 dark:bg-navy-900">
        <h4 className="mb-3 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
          Firmas
        </h4>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Firma tecnico */}
          <div className="text-center">
            <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Firma del Tecnico
            </p>
            {registro.firmaTecnico ? (
              <div className="inline-block rounded-lg border border-gray-200 bg-white p-2 dark:border-navy-600 dark:bg-navy-800">
                <img
                  src={registro.firmaTecnico}
                  alt="Firma del tecnico"
                  className="max-h-24 object-contain"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400">Sin firma</p>
            )}
            <p className="mt-1 text-sm font-medium text-navy-700 dark:text-white">
              {registro.tecnicoNombre}
            </p>
            <p className="text-xs text-gray-400">
              {formatDate(registro.fecha)}
            </p>
          </div>

          {/* Firma validador */}
          <div className="text-center">
            <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
              Firma del Validador
            </p>
            {registro.firmaValidador ? (
              <div className="inline-block rounded-lg border border-gray-200 bg-white p-2 dark:border-navy-600 dark:bg-navy-800">
                <img
                  src={registro.firmaValidador}
                  alt="Firma del validador"
                  className="max-h-24 object-contain"
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                {registro.estadoValidacion === 'pendiente'
                  ? 'Pendiente de validacion'
                  : registro.estadoValidacion === 'rechazado'
                    ? 'Rechazado (sin firma)'
                    : 'Sin firma'}
              </p>
            )}
            {registro.validadorNombre && (
              <>
                <p className="mt-1 text-sm font-medium text-navy-700 dark:text-white">
                  {registro.validadorNombre}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDateTime(registro.fechaValidacion || '')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de preview de imagen */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div className="relative max-h-[80vh] max-w-2xl">
            <button
              onClick={() => setPreviewUrl(null)}
              className="absolute -right-3 -top-3 rounded-full bg-white p-1.5 shadow-lg"
            >
              <MdClose className="h-5 w-5 text-gray-700" />
            </button>
            <img
              src={previewUrl}
              alt="Imagen ampliada"
              className="max-h-[80vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
