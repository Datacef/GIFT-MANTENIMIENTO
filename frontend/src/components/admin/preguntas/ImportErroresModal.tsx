'use client';
import { MdClose, MdError, MdWarning } from 'react-icons/md';

export interface ImportError {
  fila: number;
  pregunta?: string;
  errores: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  errores: ImportError[];
  validos: number;
  onContinuarConValidos?: () => void;
}

const ImportErroresModal = ({ isOpen, onClose, errores, validos, onContinuarConValidos }: Props) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-navy-800">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-navy-600">
          <div className="flex items-start gap-3">
            <MdError className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-500" />
            <div>
              <h3 className="text-lg font-bold text-navy-700 dark:text-white">
                Errores en la importacion
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Se encontraron {errores.length} fila(s) con problemas. {validos} fila(s) valida(s).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-navy-700"
          >
            <MdClose className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {errores.map((err, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20"
              >
                <div className="flex items-start gap-2">
                  <MdWarning className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                      Fila {err.fila}
                      {err.pregunta ? `: ${err.pregunta}` : ''}
                    </p>
                    <ul className="mt-1 list-inside list-disc text-xs text-red-600 dark:text-red-400">
                      {err.errores.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-navy-600 dark:bg-navy-900">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white dark:border-navy-600 dark:text-gray-300 dark:hover:bg-navy-700"
          >
            Cancelar importacion
          </button>
          {validos > 0 && onContinuarConValidos && (
            <button
              onClick={onContinuarConValidos}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              Importar solo las {validos} validas
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportErroresModal;
