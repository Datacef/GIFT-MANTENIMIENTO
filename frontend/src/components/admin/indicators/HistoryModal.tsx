import React, { useEffect, useState } from 'react';
import { IIndicator, IIndicatorHistory } from 'types/indicator.types';
import { HistoryService } from 'services/history.service';
import { MdClose } from 'react-icons/md';

interface HistoryModalProps {
  indicator: IIndicator | null;
  isOpen: boolean;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ indicator, isOpen, onClose }) => {
  const [history, setHistory] = useState<IIndicatorHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && indicator) {
      loadHistory(indicator.id);
    }
  }, [isOpen, indicator]);

  const loadHistory = async (id: string) => {
    setLoading(true);
    try {
      const data = await HistoryService.getHistoryByIndicatorId(id);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !indicator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl dark:bg-navy-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-navy-700">
          <div>
            <h3 className="text-xl font-bold text-navy-700 dark:text-white">
              Historial de Cambios
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Indicador: {indicator.achievementIndicator}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 dark:hover:bg-navy-700 transition-colors"
          >
            <MdClose className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay historial disponible para este indicador.
            </div>
          ) : (
            <div className="relative border-l border-gray-200 dark:border-navy-700 ml-3">
              {history.map((item, index) => {
                const date = item.changeDate?.toDate 
                  ? item.changeDate.toDate() 
                  : new Date(item.changeDate);

                return (
                  <div key={item.id || index} className="mb-8 ml-6">
                    <span className={`absolute flex items-center justify-center w-6 h-6 rounded-full -left-3 ring-4 ring-white dark:ring-navy-800
                      ${item.changeType === 'CREATE' ? 'bg-green-500' : 
                        item.changeType === 'UPDATE' ? 'bg-blue-500' : 
                        item.changeType === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'}`}
                    >
                    </span>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                      <h4 className="text-base font-semibold text-navy-700 dark:text-white">
                        {item.changeType === 'CREATE' ? 'Creación' :
                         item.changeType === 'UPDATE' ? 'Actualización' :
                         item.changeType === 'DELETE' ? 'Eliminación' : item.changeType}
                      </h4>
                      <time className="text-sm font-normal text-gray-400 sm:order-last sm:mb-0">
                        {date.toLocaleString()}
                      </time>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      Modificado por: <span className="font-medium">{item.changedBy}</span>
                    </p>
                    {item.reason && (
                      <div className="p-3 bg-gray-50 rounded-lg dark:bg-navy-700 text-sm text-gray-600 dark:text-gray-300">
                        <strong>Razón:</strong> {item.reason}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-navy-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 focus:outline-none"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
