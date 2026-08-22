import React from 'react';
import { IIndicator } from 'types/indicator.types';
import { MdEdit, MdHistory, MdDelete } from 'react-icons/md';

interface IndicatorTableProps {
  indicators: IIndicator[];
  onEdit: (indicator: IIndicator) => void;
  onHistory: (indicator: IIndicator) => void;
  onDelete: (indicator: IIndicator) => void;
}

const IndicatorTable: React.FC<IndicatorTableProps> = ({ 
  indicators, 
  onEdit, 
  onHistory, 
  onDelete 
}) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-navy-700 dark:bg-navy-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500 dark:border-navy-700 dark:bg-navy-900 dark:text-gray-300">
            <th className="px-6 py-4 font-semibold">Indicador de Logro</th>
            <th className="px-6 py-4 font-semibold">Proceso</th>
            <th className="px-6 py-4 font-semibold">Periodicidad</th>
            <th className="px-6 py-4 font-semibold">Responsable</th>
            <th className="px-6 py-4 font-semibold text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
          {indicators.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No hay indicadores registrados.
              </td>
            </tr>
          ) : (
            indicators.map((indicator) => (
              <tr 
                key={indicator.id} 
                className="hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
              >
                <td className="px-6 py-4 text-sm font-medium text-navy-700 dark:text-white max-w-xs truncate" title={indicator.achievementIndicator}>
                  {indicator.achievementIndicator}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {indicator.process}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${indicator.measurementPeriod === 'Mensual' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                      indicator.measurementPeriod === 'Semanal' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                    {indicator.measurementPeriod}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                  {indicator.responsibleEmail}
                </td>
                <td className="px-6 py-4 text-sm text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onEdit(indicator)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors dark:text-blue-400 dark:hover:bg-blue-900/50"
                      title="Editar"
                    >
                      <MdEdit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onHistory(indicator)}
                      className="p-2 text-gray-600 hover:bg-gray-50 rounded-full transition-colors dark:text-gray-400 dark:hover:bg-gray-800"
                      title="Historial de Cambios"
                    >
                      <MdHistory className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDelete(indicator)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors dark:text-red-400 dark:hover:bg-red-900/50"
                      title="Eliminar"
                    >
                      <MdDelete className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default IndicatorTable;
