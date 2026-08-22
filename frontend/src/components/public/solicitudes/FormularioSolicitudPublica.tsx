'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArchivoSolicitud,
  MAX_ARCHIVOS_SOLICITUD,
  MAX_IMAGENES_SOLICITUD,
  MAX_MB_POR_ARCHIVO,
  MIME_ARCHIVOS_PERMITIDOS,
  MIME_IMAGENES_PERMITIDOS,
} from 'types/solicitud.types';
import { SolicitudPublicaService } from 'services/solicitudes/solicitud-publica.service';
import CaptchaMatematico from './CaptchaMatematico';
import {
  MdAttachFile, MdImage, MdDelete, MdCheckCircle, MdErrorOutline, MdSend,
} from 'react-icons/md';

const inputBase =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

export default function FormularioSolicitudPublica() {
  const router = useRouter();
  const [form, setForm] = useState({
    solicitanteNombre: '',
    solicitanteCargo: '',
    solicitanteAnexo: '',
    solicitanteTelefono: '',
    solicitanteEmail: '',
    solicitanteServicio: '',
    descripcion: '',
  });
  const [imagenes, setImagenes] = useState<ArchivoSolicitud[]>([]);
  const [archivos, setArchivos] = useState<ArchivoSolicitud[]>([]);
  const [captcha, setCaptcha] = useState<{ respuesta: number; esperado: number; valido: boolean }>({
    respuesta: NaN, esperado: 0, valido: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendoImg, setSubiendoImg] = useState(false);
  const [subiendoArch, setSubiendoArch] = useState(false);

  const setCampo = (k: keyof typeof form, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const validarArchivo = (file: File, mimes: string[]): string | null => {
    if (!mimes.includes(file.type)) return `Tipo no permitido: ${file.type || 'desconocido'}`;
    if (file.size > MAX_MB_POR_ARCHIVO * 1024 * 1024) return `${file.name}: supera ${MAX_MB_POR_ARCHIVO} MB`;
    return null;
  };

  const onAgregarImagenes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (imagenes.length + files.length > MAX_IMAGENES_SOLICITUD) {
      setError(`Maximo ${MAX_IMAGENES_SOLICITUD} imagenes.`);
      return;
    }
    setError(null);
    setSubiendoImg(true);
    try {
      const subidos: ArchivoSolicitud[] = [];
      for (const f of files) {
        const err = validarArchivo(f, MIME_IMAGENES_PERMITIDOS);
        if (err) { setError(err); continue; }
        subidos.push(await SolicitudPublicaService.subirArchivo(f));
      }
      setImagenes([...imagenes, ...subidos]);
    } finally {
      setSubiendoImg(false);
    }
  };

  const onAgregarArchivos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (archivos.length + files.length > MAX_ARCHIVOS_SOLICITUD) {
      setError(`Maximo ${MAX_ARCHIVOS_SOLICITUD} archivos.`);
      return;
    }
    setError(null);
    setSubiendoArch(true);
    try {
      const subidos: ArchivoSolicitud[] = [];
      for (const f of files) {
        const err = validarArchivo(f, MIME_ARCHIVOS_PERMITIDOS);
        if (err) { setError(err); continue; }
        subidos.push(await SolicitudPublicaService.subirArchivo(f));
      }
      setArchivos([...archivos, ...subidos]);
    } finally {
      setSubiendoArch(false);
    }
  };

  const onCaptchaChange = useCallback(
    (val: { respuesta: number; esperado: number; valido: boolean }) => setCaptcha(val),
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.solicitanteNombre || !form.solicitanteEmail || !form.descripcion) {
      setError('Nombre, email y descripcion son obligatorios.');
      return;
    }
    if (!captcha.valido) {
      setError('Resuelve correctamente la operacion de verificacion.');
      return;
    }
    setLoading(true);
    try {
      const res = await SolicitudPublicaService.crear({
        ...form,
        imagenes,
        archivos,
        captchaRespuesta: captcha.respuesta,
        captchaEsperado: captcha.esperado,
      });
      router.push(`/solicitud/estado/${encodeURIComponent(res.folio)}?t=${encodeURIComponent(res.tokenConsulta)}&nuevo=1`);
    } catch (err: any) {
      setError(err?.message || 'Error al enviar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:p-8">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h1 className="text-2xl font-bold text-slate-800">Solicitud de Mantenimiento</h1>
        <p className="mt-1 text-sm text-gray-600">
          Completa los datos. Recibiras un correo con el folio para hacer seguimiento a tu solicitud.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Nombre completo *</label>
          <input className={inputBase} value={form.solicitanteNombre} onChange={(e) => setCampo('solicitanteNombre', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Cargo</label>
          <input className={inputBase} value={form.solicitanteCargo} onChange={(e) => setCampo('solicitanteCargo', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Anexo (numero interno)</label>
          <input className={inputBase} value={form.solicitanteAnexo} onChange={(e) => setCampo('solicitanteAnexo', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Telefono</label>
          <input className={inputBase} value={form.solicitanteTelefono} onChange={(e) => setCampo('solicitanteTelefono', e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Email *</label>
          <input type="email" className={inputBase} value={form.solicitanteEmail} onChange={(e) => setCampo('solicitanteEmail', e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-600">Servicio / Unidad</label>
          <input className={inputBase} placeholder="Ej: Neonatologia, Pabellon, etc." value={form.solicitanteServicio} onChange={(e) => setCampo('solicitanteServicio', e.target.value)} />
        </div>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold text-gray-600">Descripcion del problema *</label>
        <textarea rows={5} className={inputBase} value={form.descripcion} onChange={(e) => setCampo('descripcion', e.target.value)} required />
      </div>

      {/* Imagenes */}
      <div className="mt-5 rounded-lg border border-dashed border-gray-300 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MdImage className="h-5 w-5" /> Imagenes (max {MAX_IMAGENES_SOLICITUD})
          </div>
          <label className={`cursor-pointer rounded-lg border border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 ${subiendoImg ? 'opacity-50' : ''}`}>
            {subiendoImg ? 'Subiendo...' : 'Agregar'}
            <input type="file" multiple accept={MIME_IMAGENES_PERMITIDOS.join(',')} onChange={onAgregarImagenes} className="hidden" disabled={subiendoImg} />
          </label>
        </div>
        {imagenes.length === 0 ? (
          <p className="text-xs text-gray-500">JPG, PNG o WEBP hasta {MAX_MB_POR_ARCHIVO} MB cada una.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {imagenes.map((img, idx) => (
              <li key={idx} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5">
                <span className="flex items-center gap-2"><MdCheckCircle className="h-4 w-4 text-green-500" /> {img.nombre}</span>
                <button type="button" onClick={() => setImagenes(imagenes.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><MdDelete /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Archivos */}
      <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <MdAttachFile className="h-5 w-5" /> Archivos adjuntos (max {MAX_ARCHIVOS_SOLICITUD})
          </div>
          <label className={`cursor-pointer rounded-lg border border-blue-500 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 ${subiendoArch ? 'opacity-50' : ''}`}>
            {subiendoArch ? 'Subiendo...' : 'Agregar'}
            <input type="file" multiple accept={MIME_ARCHIVOS_PERMITIDOS.join(',')} onChange={onAgregarArchivos} className="hidden" disabled={subiendoArch} />
          </label>
        </div>
        {archivos.length === 0 ? (
          <p className="text-xs text-gray-500">PDF, Word o Excel hasta {MAX_MB_POR_ARCHIVO} MB cada uno.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {archivos.map((a, idx) => (
              <li key={idx} className="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5">
                <span className="flex items-center gap-2"><MdCheckCircle className="h-4 w-4 text-green-500" /> {a.nombre}</span>
                <button type="button" onClick={() => setArchivos(archivos.filter((_, i) => i !== idx))} className="text-red-500 hover:text-red-700"><MdDelete /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Captcha */}
      <div className="mt-5">
        <CaptchaMatematico onChange={onCaptchaChange} />
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          <MdErrorOutline className="mt-0.5 h-4 w-4" /> {error}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading || subiendoImg || subiendoArch}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <MdSend className="h-4 w-4" />
          {loading ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  );
}
