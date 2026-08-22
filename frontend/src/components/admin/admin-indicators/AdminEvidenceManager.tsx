import React, { useState, useEffect } from 'react';
import { IAdminIndicatorView } from 'types/admin-indicator.types';
import { IEvidence } from 'types/evidence.types';
import { EvidenceService } from 'services/evidence.service';
import { MdClose, MdAttachment, MdDelete, MdEdit, MdDownload } from 'react-icons/md';

interface AdminEvidenceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  indicator: IAdminIndicatorView | null;
  onUploadEvidence?: () => void;
  onDeleteEvidence?: (evidenceId: string) => void;
}

const AdminEvidenceManager: React.FC<AdminEvidenceManagerProps> = ({
  isOpen,
  onClose,
  indicator,
  onUploadEvidence,
  onDeleteEvidence
}) => {
  const [evidences, setEvidences] = useState<IEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && indicator) {
      loadEvidences();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, indicator]);

  const loadEvidences = async () => {
    if (!indicator) return;
    
    setIsLoading(true);
    try {
      const data = await EvidenceService.getEvidenceByIndicatorId(indicator.id);
      setEvidences(data);
    } catch (error) {
      console.error('Error loading evidences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    const d = date?.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-ES');
  };

  if (!isOpen || !indicator) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-navy-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-navy-700">
          <div>
            <h2 className="text-2xl font-bold text-navy-700 dark:text-white">
              Gestión de Evidencias
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {indicator.achievementIndicator}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Responsable: {indicator.responsibleEmail}
            </p>
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
          {/* Upload Button */}
          {onUploadEvidence && (
            <button
              onClick={onUploadEvidence}
              className="w-full mb-4 px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <MdAttachment className="w-5 h-5" />
              Nueva Evidencia en nombre del usuario
            </button>
          )}

          {/* Evidences List */}
          {isLoading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Cargando evidencias...
            </div>
          ) : evidences.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay evidencias registradas para este indicador
            </div>
          ) : (
            <div className="space-y-4">
              {evidences.map((evidence) => (
                <div
                  key={evidence.id}
                  className="border border-gray-200 dark:border-navy-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          ${evidence.isLate 
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                          {evidence.isLate ? 'Atrasado' : 'A tiempo'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(evidence.periodStartDate)} - {formatDate(evidence.periodEndDate)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {evidence.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Enviado por: {evidence.submittedBy} el {formatDate(evidence.submittedAt)}
                      </p>
                    </div>
                    {onDeleteEvidence && (
                      <button
                        onClick={() => onDeleteEvidence(evidence.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors dark:text-red-400 dark:hover:bg-red-900/50"
                        title="Eliminar evidencia"
                      >
                        <MdDelete className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Attachments */}
                  {evidence.attachments && evidence.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-navy-600">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Archivos adjuntos:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {evidence.attachments.map((attachment, idx) => (
                          <a
                            key={idx}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 dark:bg-navy-600 hover:bg-gray-200 dark:hover:bg-navy-500 rounded-lg text-xs transition-colors"
                          >
                            <MdDownload className="w-4 h-4" />
                            {attachment.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
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

export default AdminEvidenceManager;
