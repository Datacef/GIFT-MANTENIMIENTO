'use client';
import { useState } from 'react';
import { MdClose, MdCheck, MdCancel, MdSend, MdAssignment, MdDone, MdReply } from 'react-icons/md';
import { EncargadoMantenimiento } from 'types/encargado.types';
import { ArchivoVerificable, MAX_MB_POR_ARCHIVO } from 'types/solicitud.types';
import { SolicitudAdminService } from 'services/solicitudes/solicitud-admin.service';

type Accion = 'aceptar' | 'rechazar' | 'responder' | 'asignar' | 'devolver' | 'completar';

interface Props {
  open: boolean;
  accion: Accion | null;
  solicitudId: string;
  encargados?: EncargadoMantenimiento[];
  onClose: () => void;
  onDone: () => void;
}

const inputBase = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy-700 focus:border-brand-500 focus:outline-none dark:border-navy-600 dark:bg-navy-800 dark:text-white';

export default function ModalesAccionesSolicitud({ open, accion, solicitudId, encargados = [], onClose, onDone }: Props) {
  const [texto, setTexto] = useState('');
  const [encargadoId, setEncargadoId] = useState('');
  const [archivos, setArchivos] = useState<ArchivoVerificable[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !accion) return null;

  const reset = () => { setTexto(''); setEncargadoId(''); setArchivos([]); setError(null); };
  const cerrar = () => { reset(); onClose(); };

  const handleArchivos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    setUploading(true);
    try {
      const subidos: ArchivoVerificable[] = [];
      for (const f of files) {
        if (f.size > MAX_MB_POR_ARCHIVO * 1024 * 1024) { setError(`${f.name}: supera ${MAX_MB_POR_ARCHIVO}MB`); continue; }
        subidos.push(await SolicitudAdminService.subirArchivo(f));
      }
      setArchivos([...archivos, ...subidos]);
    } finally { setUploading(false); }
  };

  const ejecutar = async () => {
    setLoading(true); setError(null);
    try {
      if (accion === 'aceptar') await SolicitudAdminService.aceptar(solicitudId, texto);
      else if (accion === 'rechazar') {
        if (!texto.trim()) { setError('El motivo es obligatorio'); setLoading(false); return; }
        await SolicitudAdminService.rechazar(solicitudId, texto);
      }
      else if (accion === 'responder') {
        if (!texto.trim()) { setError('El mensaje es obligatorio'); setLoading(false); return; }
        await SolicitudAdminService.responder(solicitudId, texto);
      }
      else if (accion === 'asignar') {
        if (!encargadoId) { setError('Selecciona un encargado'); setLoading(false); return; }
        await SolicitudAdminService.asignar(solicitudId, encargadoId, texto);
      }
      else if (accion === 'devolver') {
        if (!texto.trim()) { setError('Observacion requerida'); setLoading(false); return; }
        await SolicitudAdminService.devolver(solicitudId, texto);
      }
      else if (accion === 'completar') {
        await SolicitudAdminService.completar(solicitudId, texto, archivos);
      }
      onDone(); cerrar();
    } catch (e: any) { setError(e?.message || 'Error'); }
    finally { setLoading(false); }
  };

  const config: Record<Accion, { titulo: string; label: string; placeholder: string; color: string; icono: JSX.Element }> = {
    aceptar: { titulo: 'Aceptar solicitud', label: 'Comentario (opcional)', placeholder: 'Mensaje de aceptacion para el solicitante...', color: 'bg-green-600 hover:bg-green-700', icono: <MdCheck /> },
    rechazar: { titulo: 'Rechazar solicitud', label: 'Motivo del rechazo *', placeholder: 'Explica por que no procede...', color: 'bg-red-600 hover:bg-red-700', icono: <MdCancel /> },
    responder: { titulo: 'Responder al solicitante', label: 'Mensaje *', placeholder: 'Escribe tu mensaje...', color: 'bg-blue-600 hover:bg-blue-700', icono: <MdReply /> },
    asignar: { titulo: 'Asignar encargado', label: 'Instrucciones adicionales (opcional)', placeholder: 'Indicaciones para el encargado...', color: 'bg-amber-600 hover:bg-amber-700', icono: <MdAssignment /> },
    devolver: { titulo: 'Devolver solicitud', label: 'Observacion *', placeholder: 'Motivo por el que devuelves...', color: 'bg-orange-600 hover:bg-orange-700', icono: <MdSend /> },
    completar: { titulo: 'Marcar como completada', label: 'Observaciones finales', placeholder: 'Resumen del trabajo realizado...', color: 'bg-teal-600 hover:bg-teal-700', icono: <MdDone /> },
  };

  const c = config[accion];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl dark:bg-navy-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-navy-700 dark:text-white">{c.titulo}</h3>
          <button onClick={cerrar} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"><MdClose /></button>
        </div>

        {accion === 'asignar' && (
          <div className="mb-3">
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">Encargado *</label>
            <select value={encargadoId} onChange={(e) => setEncargadoId(e.target.value)} className={inputBase}>
              <option value="">Selecciona un encargado...</option>
              {encargados.filter((e) => e.activo).map((e) => (
                <option key={e.id} value={e.id}>{e.nombre} — {e.cargo} {e.especialidades.length > 0 ? `(${e.especialidades.slice(0, 2).join(', ')})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-gray-300">{c.label}</label>
          <textarea rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={c.placeholder} className={inputBase} />
        </div>

        {accion === 'completar' && (
          <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-600">Archivos verificables</p>
              <label className="cursor-pointer rounded-lg border border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100">
                {uploading ? 'Subiendo...' : 'Agregar'}
                <input type="file" multiple onChange={handleArchivos} className="hidden" disabled={uploading} />
              </label>
            </div>
            {archivos.length === 0 ? (
              <p className="text-xs text-gray-500">Sube fotos, informe tecnico o evidencias (max {MAX_MB_POR_ARCHIVO}MB por archivo).</p>
            ) : (
              <ul className="text-xs">
                {archivos.map((a, i) => (
                  <li key={i} className="flex items-center justify-between py-1">
                    <span>{a.nombre}</span>
                    <button onClick={() => setArchivos(archivos.filter((_, j) => j !== i))} className="text-red-500">Quitar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-200">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={cerrar} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-300">Cancelar</button>
          <button onClick={ejecutar} disabled={loading} className={`flex items-center gap-2 rounded-lg ${c.color} px-4 py-2 text-sm font-semibold text-white disabled:opacity-50`}>
            {c.icono} {loading ? 'Procesando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
