'use client';
import { useRef } from 'react';
import { MdWarning, MdCameraAlt, MdClose, MdInfo } from 'react-icons/md';
import { ESTADO_CHECKLIST_OPTIONS } from 'types/mantenimiento.types';

// Tipo local para el item del checklist en el wizard (incluye file local)
export interface ChecklistItemLocal {
  preguntaId: string;
  pregunta: string;
  categoria: string;
  tipoRespuesta: string;
  opcionesRespuesta?: string[];
  respuesta: any;
  estado: string;
  observaciones: string;
  foto: { file: File; url: string; nombre: string } | null;
  esCritica: boolean;
  requiereFoto: boolean;
  requiereObservacion: boolean;
  referenciaAcreditacion?: string;
}

interface Props {
  item: ChecklistItemLocal;
  onChange: (changes: Partial<ChecklistItemLocal>) => void;
  error?: boolean;
}

const MantenimientoChecklistItem = ({ item, onChange, error }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    const url = URL.createObjectURL(file);
    onChange({ foto: { file, url, nombre: file.name } });
  };

  const removeFoto = () => {
    if (item.foto?.url && item.foto.url.startsWith('blob:')) {
      URL.revokeObjectURL(item.foto.url);
    }
    onChange({ foto: null });
  };

  return (
    <div
      className={`rounded-xl border-2 p-4 transition-colors ${
        error
          ? 'border-red-400 bg-red-50/50 dark:border-red-600 dark:bg-red-900/10'
          : 'border-gray-200 bg-white dark:border-navy-600 dark:bg-navy-800'
      }`}
    >
      {/* Question text */}
      <div className="mb-3 flex items-start gap-2">
        {item.esCritica && (
          <MdWarning className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" title="Pregunta critica" />
        )}
        <p
          className={`text-sm ${
            item.esCritica ? 'font-bold text-navy-700 dark:text-white' : 'font-medium text-navy-700 dark:text-gray-200'
          }`}
        >
          {item.pregunta}
        </p>
      </div>

      {/* Referencia acreditacion */}
      {item.referenciaAcreditacion && (
        <div className="mb-3 flex items-center gap-1">
          <MdInfo className="h-3.5 w-3.5 text-blue-500" />
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
            {item.referenciaAcreditacion}
          </span>
        </div>
      )}

      {/* Estado selector */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Estado
        </label>
        <div className="flex flex-wrap gap-2">
          {ESTADO_CHECKLIST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange({ estado: opt.value })}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                item.estado === opt.value
                  ? opt.color + ' ring-2 ring-offset-1 ring-gray-300'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-navy-600 dark:text-gray-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Response input based on tipoRespuesta */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Respuesta
        </label>
        {item.tipoRespuesta === 'siNo' && (
          <div className="flex gap-2">
            {['Si', 'No'].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ respuesta: opt })}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all ${
                  item.respuesta === opt
                    ? opt === 'Si'
                      ? 'bg-green-100 text-green-800 ring-2 ring-green-300'
                      : 'bg-red-100 text-red-800 ring-2 ring-red-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-navy-600 dark:text-gray-400'
                }`}
              >
                {opt === 'Si' ? 'Si' : 'No'}
              </button>
            ))}
          </div>
        )}
        {item.tipoRespuesta === 'escala' && (
          <input
            type="number"
            min={1}
            max={10}
            value={item.respuesta || ''}
            onChange={(e) => onChange({ respuesta: e.target.value ? Number(e.target.value) : '' })}
            placeholder="1 - 10"
            className="h-9 w-24 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          />
        )}
        {item.tipoRespuesta === 'texto' && (
          <textarea
            rows={2}
            value={item.respuesta || ''}
            onChange={(e) => onChange({ respuesta: e.target.value })}
            placeholder="Ingrese su respuesta..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-navy-600 dark:bg-navy-700 dark:text-white"
          />
        )}
        {item.tipoRespuesta === 'seleccion' && item.opcionesRespuesta && (
          <div className="flex flex-wrap gap-2">
            {item.opcionesRespuesta.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ respuesta: opt })}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  item.respuesta === opt
                    ? 'bg-brand-100 text-brand-800 ring-2 ring-brand-300'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-navy-600 dark:text-gray-400'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Observaciones */}
      <div className="mb-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Observaciones{item.requiereObservacion && <span className="ml-1 text-red-500">*</span>}
        </label>
        <textarea
          rows={2}
          value={item.observaciones || ''}
          onChange={(e) => onChange({ observaciones: e.target.value })}
          placeholder="Observaciones..."
          className={`w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:bg-navy-700 dark:text-white ${
            error && item.requiereObservacion && !item.observaciones?.trim()
              ? 'border-red-400 dark:border-red-600'
              : 'border-gray-200 dark:border-navy-600'
          }`}
        />
      </div>

      {/* Foto */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
          Foto{item.requiereFoto && <span className="ml-1 text-red-500">*</span>}
        </label>
        {item.foto ? (
          <div className="relative inline-block">
            <img
              src={item.foto.url}
              alt={item.foto.nombre}
              className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
            />
            <button
              type="button"
              onClick={removeFoto}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow-md hover:bg-red-600"
            >
              <MdClose className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
              error && item.requiereFoto
                ? 'border-red-400 text-red-600 hover:bg-red-50'
                : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-navy-600 dark:text-gray-400 dark:hover:bg-navy-700'
            }`}
          >
            <MdCameraAlt className="h-4 w-4" />
            Adjuntar foto
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFotoChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default MantenimientoChecklistItem;
