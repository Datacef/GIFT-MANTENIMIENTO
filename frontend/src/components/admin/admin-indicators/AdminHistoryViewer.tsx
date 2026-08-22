import React, { useState, useEffect } from 'react';
import { IAdminAction } from 'types/admin-indicator.types';
import { AdminIndicatorService } from 'services/admin-indicator.service';
import { MdClose, MdHistory } from 'react-icons/md';

interface AdminHistoryViewerProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorId: string | null;
}

const AdminHistoryViewer: React.FC<AdminHistoryViewerProps> = ({
  isOpen,
  onClose,
  indicatorId
}) => {
  const [history, setHistory] = useState<IAdminAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && indicatorId) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, indicatorId]);

  const loadHistory = async () => {
    if (!indicatorId) return;
    
    setIsLoading(true);
    try {
      const data = await AdminIndicatorService.getActionHistory(indicatorId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('es-ES');
  };

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'RESTORE':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      CREATE: 'Creación',
      UPDATE: 'Actualización',
      DELETE: 'Eliminación',
      RESTORE: 'Restauración',
      EVIDENCE_UPLOAD: 'Evidencia subida',
      EVIDENCE_UPDATE: 'Evidencia actualizada',
      EVIDENCE_DELETE: 'Evidencia eliminada',
      BULK_DELETE: 'Eliminación masiva',
      BULK_UPDATE_STATUS: 'Actualización masiva',
      BULK_ASSIGN: 'Reasignación masiva'
    };
    return labels[actionType] || actionType;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-navy-700">
          <div className="flex items-center gap-2">
            <MdHistory className="w-6 h-6 text-brand-500" />
            <h2 className="text-2xl font-bold text-navy-700 dark:text-white">
              Historial de Cambios
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-navy-700 rounded-full transition-colors"
          >
            <MdClose className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Cargando historial...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay historial de cambios para este indicador
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((action, index) => (
                <div
                  key={action.id}
                  className="relative pl-8 pb-6 border-l-2 border-gray-200 dark:border-navy-600 last:border-l-0 last:pb-0"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-0 top-0 transform -translate-x-1/2 w-4 h-4 rounded-full bg-brand-500 border-2 border-white dark:border-navy-800" />

                  {/* Content */}
                  <div className="bg-gray-50 dark:bg-navy-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(action.actionType)}`}>
                            {getActionLabel(action.actionType)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(action.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-navy-700 dark:text-white">
                          Realizado por: {action.performedByEmail}
                        </p>
                        {action.onBehalfOfEmail && (
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            En nombre de: {action.onBehalfOfEmail}
                          </p>
                        )}
                      </div>
                    </div>

                    {action.reason && (
                      <div className="mt-2 p-2 bg-white dark:bg-navy-800 rounded border border-gray-200 dark:border-navy-600">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Motivo:
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {action.reason}
                        </p>
                      </div>
                    )}

                    {action.affectedIds && action.affectedIds.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Afectó {action.affectedIds.length} indicador(es)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-navy-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 dark:border-navy-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminHistoryViewer;
