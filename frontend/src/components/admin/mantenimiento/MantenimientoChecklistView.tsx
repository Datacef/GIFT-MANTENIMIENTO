'use client';
import { useState, useMemo } from 'react';
import { MdWarning, MdZoomIn, MdClose } from 'react-icons/md';
import {
  ChecklistItem,
  ESTADO_CHECKLIST_COLORS,
  ESTADO_CHECKLIST_LABELS,
} from 'types/mantenimiento.types';

interface Props {
  checklist: { items: ChecklistItem[] };
}

export default function MantenimientoChecklistView({ checklist }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const items = checklist?.items || [];

  const stats = useMemo(() => {
    return {
      total: items.length,
      bueno: items.filter((i) => i.estado === 'Bueno').length,
      regular: items.filter((i) => i.estado === 'Regular').length,
      malo: items.filter((i) => i.estado === 'Malo').length,
      na: items.filter((i) => i.estado === 'N/A').length,
    };
  }, [items]);

  const grouped = useMemo(() => {
    const groups: Record<string, ChecklistItem[]> = {};
    items.forEach((item) => {
      const cat = item.categoria || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        No hay items en el checklist.
      </div>
    );
  }

  return (
    <div>
      {/* Estadisticas */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-navy-900">
          <p className="text-2xl font-bold text-navy-700 dark:text-white">
            {stats.total}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
        </div>
        <div className="rounded-xl bg-green-50 p-3 text-center dark:bg-green-900/20">
          <p className="text-2xl font-bold text-green-600">{stats.bueno}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Buenos</p>
        </div>
        <div className="rounded-xl bg-yellow-50 p-3 text-center dark:bg-yellow-900/20">
          <p className="text-2xl font-bold text-yellow-600">{stats.regular}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Regulares</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3 text-center dark:bg-red-900/20">
          <p className="text-2xl font-bold text-red-600">{stats.malo}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Malos</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3 text-center dark:bg-navy-900">
          <p className="text-2xl font-bold text-gray-500">{stats.na}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">N/A</p>
        </div>
      </div>

      {/* Barra de progreso visual */}
      {stats.total > 0 && (
        <div className="mb-6 flex h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-navy-700">
          {stats.bueno > 0 && (
            <div
              className="bg-green-500"
              style={{ width: `${(stats.bueno / stats.total) * 100}%` }}
              title={`Buenos: ${stats.bueno}`}
            />
          )}
          {stats.regular > 0 && (
            <div
              className="bg-yellow-500"
              style={{ width: `${(stats.regular / stats.total) * 100}%` }}
              title={`Regulares: ${stats.regular}`}
            />
          )}
          {stats.malo > 0 && (
            <div
              className="bg-red-500"
              style={{ width: `${(stats.malo / stats.total) * 100}%` }}
              title={`Malos: ${stats.malo}`}
            />
          )}
          {stats.na > 0 && (
            <div
              className="bg-gray-400"
              style={{ width: `${(stats.na / stats.total) * 100}%` }}
              title={`N/A: ${stats.na}`}
            />
          )}
        </div>
      )}

      {/* Items agrupados por categoria */}
      {Object.entries(grouped).map(([categoria, catItems]) => (
        <div key={categoria} className="mb-6">
          <h4 className="mb-3 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
            {categoria}
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-navy-600">
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Pregunta
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Estado
                  </th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 sm:table-cell">
                    Respuesta
                  </th>
                  <th className="hidden px-3 py-2 text-left text-xs font-bold uppercase text-gray-500 dark:text-gray-400 md:table-cell">
                    Observaciones
                  </th>
                  <th className="px-3 py-2 text-center text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Foto
                  </th>
                </tr>
              </thead>
              <tbody>
                {catItems.map((item) => {
                  const estadoColor =
                    ESTADO_CHECKLIST_COLORS[item.estado] ||
                    'bg-gray-100 text-gray-600';
                  const isCritica = item.esCritica;
                  const isMalo = item.estado === 'Malo';

                  return (
                    <tr
                      key={item.preguntaId}
                      className={`border-b border-gray-100 dark:border-navy-700 ${
                        isCritica || isMalo
                          ? 'bg-red-50/50 dark:bg-red-900/10'
                          : ''
                      }`}
                    >
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-1.5">
                          {isCritica && (
                            <MdWarning
                              className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
                              title="Pregunta critica"
                            />
                          )}
                          <span className="text-sm text-navy-700 dark:text-white">
                            {item.pregunta}
                          </span>
                        </div>
                        {item.referenciaAcreditacion && (
                          <span className="mt-0.5 inline-block rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                            {item.referenciaAcreditacion}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${estadoColor}`}
                        >
                          {ESTADO_CHECKLIST_LABELS[item.estado] || item.estado}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {item.respuesta != null
                            ? String(item.respuesta)
                            : '-'}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.observaciones || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.fotoUrl ? (
                          <button
                            onClick={() => setPreviewUrl(item.fotoUrl!)}
                            className="group relative inline-block"
                          >
                            <img
                              src={item.fotoUrl}
                              alt="Evidencia"
                              className="h-12 w-12 rounded border border-gray-200 object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                              <MdZoomIn className="h-4 w-4 text-white" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

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
              alt="Evidencia ampliada"
              className="max-h-[80vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
