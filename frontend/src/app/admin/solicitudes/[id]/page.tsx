'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Parse from 'utils/parseClient';
import Card from 'components/card';
import { SolicitudAdminService } from 'services/solicitudes/solicitud-admin.service';
import { EncargadoService } from 'services/solicitudes/encargado.service';
import {
  SolicitudMantenimiento,
  SolicitudHistorialEntry,
  ESTADO_SOLICITUD_COLORS,
  ESTADO_SOLICITUD_LABELS,
} from 'types/solicitud.types';
import { EncargadoMantenimiento } from 'types/encargado.types';
import ModalesAccionesSolicitud from 'components/admin/solicitudes/ModalesAccionesSolicitud';
import {
  MdArrowBack, MdCheck, MdCancel, MdReply, MdAssignment, MdSend, MdDone, MdLock, MdHistory, MdAttachFile,
} from 'react-icons/md';

type Accion = 'aceptar' | 'rechazar' | 'responder' | 'asignar' | 'devolver' | 'completar' | null;

export default function SolicitudDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [user, setUser] = useState<Parse.User | null>(null);
  const [solicitud, setSolicitud] = useState<SolicitudMantenimiento | null>(null);
  const [historial, setHistorial] = useState<SolicitudHistorialEntry[]>([]);
  const [encargados, setEncargados] = useState<EncargadoMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [accion, setAccion] = useState<Accion>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([
        SolicitudAdminService.getById(id),
        SolicitudAdminService.historial(id),
      ]);
      setSolicitud(s); setHistorial(h.results);
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    const u = Parse.User.current();
    if (!u) { router.push('/auth/sign-in'); return; }
    setUser(u);
    cargar();
    EncargadoService.listar({ soloActivos: true }).then((r) => setEncargados(r.results));
  }, [cargar, router]);

  if (loading || !solicitud) {
    return <div className="flex h-full w-full items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>;
  }

  const level = (user?.get('accessLevel') as number) || 1;
  const esAdmin = level >= 4;
  const esEncargadoAsignado = solicitud.encargadoUsuarioParseId === user?.id;
  const estado = solicitud.estado;

  const puede = {
    aceptar: esAdmin && ['pendiente', 'rechazada'].includes(estado),
    rechazar: esAdmin && ['pendiente', 'aceptada'].includes(estado),
    responder: esAdmin,
    asignar: esAdmin && ['aceptada', 'asignada', 'devuelta', 'en_proceso'].includes(estado),
    devolver: (esAdmin || esEncargadoAsignado) && ['asignada', 'en_proceso'].includes(estado),
    completar: (esAdmin || esEncargadoAsignado) && ['asignada', 'en_proceso'].includes(estado),
    cerrar: esAdmin && estado === 'completada',
  };

  const cerrarSolicitud = async () => {
    if (!confirm('Cerrar definitivamente esta solicitud?')) return;
    await SolicitudAdminService.cerrar(id);
    await cargar();
  };

  return (
    <div className="flex w-full flex-col gap-5 pt-5 lg:pt-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/solicitudes')} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-navy-700"><MdArrowBack /></button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="text-xl font-bold text-navy-700 dark:text-white">{solicitud.folio}</h4>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_SOLICITUD_COLORS[estado]}`}>{ESTADO_SOLICITUD_LABELS[estado]}</span>
          </div>
          {solicitud.ordenTrabajoNumero && <p className="text-sm text-blue-600">Orden de Trabajo: <strong>{solicitud.ordenTrabajoNumero}</strong></p>}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2">
        {puede.aceptar && <BotonAccion onClick={() => setAccion('aceptar')} color="bg-green-600" icon={<MdCheck />} label={estado === 'rechazada' ? 'Reabrir y aceptar' : 'Aceptar'} />}
        {puede.rechazar && <BotonAccion onClick={() => setAccion('rechazar')} color="bg-red-600" icon={<MdCancel />} label="Rechazar" />}
        {puede.responder && <BotonAccion onClick={() => setAccion('responder')} color="bg-blue-600" icon={<MdReply />} label="Responder" />}
        {puede.asignar && <BotonAccion onClick={() => setAccion('asignar')} color="bg-amber-600" icon={<MdAssignment />} label={solicitud.encargadoId ? 'Reasignar' : 'Asignar encargado'} />}
        {puede.devolver && <BotonAccion onClick={() => setAccion('devolver')} color="bg-orange-600" icon={<MdSend />} label="Devolver" />}
        {puede.completar && <BotonAccion onClick={() => setAccion('completar')} color="bg-teal-600" icon={<MdDone />} label="Marcar completada" />}
        {puede.cerrar && <BotonAccion onClick={cerrarSolicitud} color="bg-gray-700" icon={<MdLock />} label="Cerrar" />}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Columna principal */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card extra="p-5">
            <h5 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">Datos del solicitante</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Dato label="Nombre" value={solicitud.solicitanteNombre} />
              <Dato label="Cargo" value={solicitud.solicitanteCargo} />
              <Dato label="Anexo" value={solicitud.solicitanteAnexo} />
              <Dato label="Telefono" value={solicitud.solicitanteTelefono} />
              <Dato label="Email" value={solicitud.solicitanteEmail} />
              <Dato label="Servicio" value={solicitud.solicitanteServicio} />
            </div>
          </Card>

          <Card extra="p-5">
            <h5 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">Descripcion</h5>
            <p className="whitespace-pre-wrap text-sm text-navy-700 dark:text-gray-300">{solicitud.descripcion}</p>
          </Card>

          {(solicitud.imagenes?.length > 0 || solicitud.archivos?.length > 0) && (
            <Card extra="p-5">
              <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200"><MdAttachFile /> Adjuntos del solicitante</h5>
              {solicitud.imagenes.length > 0 && (
                <div className="mb-3 grid grid-cols-2 gap-2">
                  {solicitud.imagenes.map((i, idx) => (
                    <a key={idx} href={i.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg border border-gray-200">
                      <img src={i.url} alt={i.nombre} className="h-32 w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {solicitud.archivos.length > 0 && (
                <ul className="space-y-1 text-sm">
                  {solicitud.archivos.map((a, idx) => (
                    <li key={idx}><a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">📎 {a.nombre}</a></li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {solicitud.archivosVerificables?.length > 0 && (
            <Card extra="p-5 border-l-4 border-green-500">
              <h5 className="mb-3 text-sm font-bold text-green-700">Archivos verificables (cierre)</h5>
              <ul className="space-y-1 text-sm">
                {solicitud.archivosVerificables.map((a, idx) => (
                  <li key={idx}><a href={a.url} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">✅ {a.nombre}</a></li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* Sidebar con gestion */}
        <div className="flex flex-col gap-4">
          {solicitud.encargadoNombre && (
            <Card extra="p-5 border-l-4 border-amber-500">
              <p className="text-xs font-semibold uppercase text-gray-400">Encargado asignado</p>
              <p className="mt-1 text-sm font-bold text-navy-700 dark:text-white">{solicitud.encargadoNombre}</p>
              <p className="text-xs text-gray-500">{solicitud.encargadoEmail}</p>
              {solicitud.instruccionesAdmin && (
                <div className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  <strong>Instrucciones:</strong><br />{solicitud.instruccionesAdmin}
                </div>
              )}
            </Card>
          )}

          {solicitud.respuestaAdmin && <Card extra="p-4 border-l-4 border-blue-500"><p className="text-xs font-semibold text-blue-700">Respuesta admin</p><p className="mt-1 whitespace-pre-wrap text-sm">{solicitud.respuestaAdmin}</p></Card>}
          {solicitud.motivoRechazo && <Card extra="p-4 border-l-4 border-red-500"><p className="text-xs font-semibold text-red-700">Motivo rechazo</p><p className="mt-1 whitespace-pre-wrap text-sm">{solicitud.motivoRechazo}</p></Card>}
          {solicitud.observacionesEncargado && <Card extra="p-4 border-l-4 border-emerald-500"><p className="text-xs font-semibold text-emerald-700">Observaciones encargado</p><p className="mt-1 whitespace-pre-wrap text-sm">{solicitud.observacionesEncargado}</p></Card>}

          <Card extra="p-5">
            <h5 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200"><MdHistory /> Historial</h5>
            <ul className="space-y-3">
              {historial.map((h) => (
                <li key={h.id} className="border-l-2 border-gray-200 pl-3 text-xs">
                  <p className="font-semibold text-navy-700 dark:text-gray-200">{h.accion}</p>
                  <p className="text-gray-500">{h.usuarioNombre} · {h.createdAt ? new Date(h.createdAt).toLocaleString('es-CL') : ''}</p>
                  {h.descripcion && <p className="mt-1 whitespace-pre-wrap text-gray-600 dark:text-gray-400">{h.descripcion}</p>}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <ModalesAccionesSolicitud
        open={!!accion}
        accion={accion}
        solicitudId={id}
        encargados={encargados}
        onClose={() => setAccion(null)}
        onDone={cargar}
      />
    </div>
  );
}

function Dato({ label, value }: { label: string; value?: string }) {
  return (
    <div><p className="text-xs font-semibold text-gray-400">{label}</p><p className="text-sm text-navy-700 dark:text-gray-300">{value || '—'}</p></div>
  );
}

function BotonAccion({ onClick, color, icon, label }: { onClick: () => void; color: string; icon: JSX.Element; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 rounded-xl ${color} px-4 py-2 text-sm font-semibold text-white hover:opacity-90`}>
      {icon} {label}
    </button>
  );
}
