'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  SolicitudPublicaEstado,
  ESTADO_SOLICITUD_LABELS,
  ESTADO_SOLICITUD_COLORS,
} from 'types/solicitud.types';
import { SolicitudPublicaService } from 'services/solicitudes/solicitud-publica.service';
import { MdCheckCircle, MdInfoOutline } from 'react-icons/md';

export default function EstadoSolicitudPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const folio = decodeURIComponent((params?.folio as string) || '');
  const token = searchParams?.get('t') || '';
  const esNuevo = searchParams?.get('nuevo') === '1';

  const [data, setData] = useState<SolicitudPublicaEstado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!folio || !token) {
      setError('Folio o token invalidos.');
      setLoading(false);
      return;
    }
    SolicitudPublicaService.consultar(folio, token)
      .then((d) => setData(d))
      .catch((e) => setError(e?.message || 'No se pudo consultar la solicitud'))
      .finally(() => setLoading(false));
  }, [folio, token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-sm">
        <MdInfoOutline className="mx-auto h-10 w-10 text-red-500" />
        <p className="mt-2 text-sm text-red-600">{error || 'Solicitud no encontrada'}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {esNuevo && (
        <div className="flex items-start gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-800">
          <MdCheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <strong>Tu solicitud fue registrada correctamente.</strong><br />
            Guarda este enlace: te enviamos una copia al correo.
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400">Folio</p>
            <p className="text-xl font-bold text-slate-800">{data.folio}</p>
            {data.ordenTrabajoNumero && (
              <p className="mt-1 text-sm text-gray-600">OT: <strong>{data.ordenTrabajoNumero}</strong></p>
            )}
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${ESTADO_SOLICITUD_COLORS[data.estado] || 'bg-gray-100 text-gray-700'}`}>
            {ESTADO_SOLICITUD_LABELS[data.estado] || data.estado}
          </span>
        </div>

        <div className="space-y-3 text-sm text-slate-700">
          <div>
            <p className="text-xs font-semibold text-gray-500">Solicitante</p>
            <p>{data.solicitanteNombre}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500">Descripcion</p>
            <p className="whitespace-pre-wrap">{data.descripcion}</p>
          </div>
          {data.respuestaAdmin && (
            <div className="rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-semibold text-blue-700">Respuesta del equipo</p>
              <p className="whitespace-pre-wrap">{data.respuestaAdmin}</p>
            </div>
          )}
          {data.motivoRechazo && (
            <div className="rounded-lg bg-red-50 p-3">
              <p className="text-xs font-semibold text-red-700">Motivo de rechazo</p>
              <p className="whitespace-pre-wrap">{data.motivoRechazo}</p>
            </div>
          )}
          {data.encargadoNombre && (
            <div>
              <p className="text-xs font-semibold text-gray-500">Tecnico asignado</p>
              <p>{data.encargadoNombre}</p>
            </div>
          )}
          {data.observacionesEncargado && (
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-xs font-semibold text-emerald-700">Observaciones del tecnico</p>
              <p className="whitespace-pre-wrap">{data.observacionesEncargado}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
