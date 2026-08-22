import React, { useEffect, useState } from 'react';
import { EvidenceService } from 'services/evidence.service';
import { IEvidence, EvidenceStatus } from 'types/evidence.types';
import { MdInsertDriveFile, MdCheckCircle, MdWarning, MdInfo } from 'react-icons/md';

interface EvidenceHistoryProps {
  indicatorId: string;
}

const EvidenceHistory: React.FC<EvidenceHistoryProps> = ({ indicatorId }) => {
  const [evidences, setEvidences] = useState<IEvidence[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvidence = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await EvidenceService.getEvidenceByIndicatorId(indicatorId);
      setEvidences(data);
    } catch (error) {
      console.error('Error loading evidence:', error);
    } finally {
      setLoading(false);
    }
  }, [indicatorId]);

  useEffect(() => {
    loadEvidence();
  }, [loadEvidence]);

  if (loading) return <div className="text-center py-4">Cargando historial...</div>;

  return (
    <div className="mt-6">
      <h4 className="text-lg font-bold text-navy-700 dark:text-white mb-4">
        Historial de Reportes
      </h4>
      
      {evidences.length === 0 ? (
        <div className="text-gray-500 text-sm italic bg-gray-50 p-4 rounded-lg dark:bg-navy-700 dark:text-gray-400">
          No se han enviado reportes para este indicador.
        </div>
      ) : (
        <div className="space-y-4">
          {evidences.map((evidence) => {
            const date = evidence.submittedAt?.toDate 
              ? evidence.submittedAt.toDate() 
              : new Date(evidence.submittedAt);
            
            // Calculate if it's actually late based on period end date
            // This overrides the stored isLate flag if the dates prove otherwise
            let isActuallyLate = evidence.isLate;
            if (evidence.periodEndDate && date) {
              const periodEnd = evidence.periodEndDate.toDate 
                ? evidence.periodEndDate.toDate() 
                : new Date(evidence.periodEndDate);
              
              // Ensure we compare with the end of the deadline day
              periodEnd.setHours(23, 59, 59, 999);
              isActuallyLate = date > periodEnd;
            }

            return (
              <div key={evidence.id} className="border border-gray-200 rounded-lg p-4 bg-white dark:bg-navy-800 dark:border-navy-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {evidence.status === EvidenceStatus.NO_RECORDS ? (
                      <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-bold dark:bg-amber-900/20 dark:text-amber-400">
                        <MdInfo /> Sin Movimientos
                      </span>
                    ) : isActuallyLate ? (
                      <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-bold dark:bg-red-900/20 dark:text-red-400">
                        <MdWarning /> Atrasado
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold dark:bg-green-900/20 dark:text-green-400">
                        <MdCheckCircle /> A Tiempo
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {date.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })} {date.toLocaleTimeString('es-CL', { timeZone: 'America/Santiago' })}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                  {evidence.description}
                </p>

                {evidence.attachments && evidence.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {evidence.attachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-blue-600 rounded-md text-xs hover:bg-gray-200 dark:bg-navy-700 dark:text-blue-400 dark:hover:bg-navy-600"
                      >
                        <MdInsertDriveFile />
                        {file.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EvidenceHistory;
