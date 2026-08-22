import React, { useEffect, useState } from 'react';
import { IIndicator } from 'types/indicator.types';
import { MdFileUpload, MdVisibility, MdWarning, MdCheckCircle } from 'react-icons/md';
import { EvidenceService } from 'services/evidence.service';
import { generateExpectedPeriods } from 'utils/period.utils';

interface MyIndicatorsTableProps {
  indicators: IIndicator[];
  onReport: (indicator: IIndicator) => void;
}

const IndicatorStatusCell = ({ indicator }: { indicator: IIndicator }) => {
  const [loading, setLoading] = useState(true);
  const [missingCount, setMissingCount] = useState(0);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        
        // Generate periods
        const allPeriods = generateExpectedPeriods(startOfYear, now, indicator.measurementPeriod);
        
        // Fetch evidence
        const evidences = await EvidenceService.getEvidenceByIndicatorId(indicator.id);
        
        // Calculate missing
        const missing = allPeriods.filter(period => {
          // If period end date is in the future, it is not "Overdue" (Atrasado) yet.
          // The user specifically requested to only show alerts for overdue items.
          if (period.end > now) return false;

          // Check if there is any evidence for this period
          const hasEvidence = evidences.some(evidence => {
            const evidenceStart = evidence.periodStartDate?.toDate ? evidence.periodStartDate.toDate() : new Date(evidence.periodStartDate);
            // Relaxed matching logic as per recent fixes
            return evidenceStart >= period.start && evidenceStart <= period.end;
          });
          return !hasEvidence;
        });

        setMissingCount(missing.length);
      } catch (err) {
        console.error("Error checking status", err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
  }, [indicator]);

  if (loading) {
    return <span className="text-xs text-gray-400">Calculando...</span>;
  }

  if (missingCount > 0) {
    return (
      <span className="flex items-center gap-1 text-red-600 font-bold text-xs uppercase bg-red-50 px-2 py-1 rounded-full w-fit border border-red-100">
        <MdWarning className="text-sm" /> 
        {missingCount} Pendiente{missingCount !== 1 ? 's' : ''}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-green-600 font-bold text-xs uppercase bg-green-50 px-2 py-1 rounded-full w-fit border border-green-100">
      <MdCheckCircle className="text-sm" /> 
      Al día
    </span>
  );
};

const MyIndicatorsTable: React.FC<MyIndicatorsTableProps> = ({ indicators, onReport }) => {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-navy-700 dark:bg-navy-800">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50 text-xs uppercase text-gray-500 dark:border-navy-700 dark:bg-navy-900 dark:text-gray-300">
            <th className="px-6 py-4 font-semibold">Indicador</th>
            <th className="px-6 py-4 font-semibold">Periodicidad</th>
            <th className="px-6 py-4 font-semibold">Evidencia Requerida</th>
            <th className="px-6 py-4 font-semibold">Estado</th>
            <th className="px-6 py-4 font-semibold text-center">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-navy-700">
          {indicators.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No tienes indicadores asignados.
              </td>
            </tr>
          ) : (
            indicators.map((indicator) => {
              return (
                <tr 
                  key={indicator.id} 
                  className="hover:bg-gray-50 dark:hover:bg-navy-700 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-navy-700 dark:text-white max-w-xs" title={indicator.achievementIndicator}>
                    <div className="line-clamp-2">{indicator.achievementIndicator}</div>
                    <div className="text-xs text-gray-400 mt-1">{indicator.process}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${indicator.measurementPeriod === 'Mensual' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 
                        indicator.measurementPeriod === 'Semanal' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                      {indicator.measurementPeriod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={indicator.evidence}>
                    {indicator.evidence}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <IndicatorStatusCell indicator={indicator} />
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <button
                      onClick={() => onReport(indicator)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors text-xs font-bold"
                    >
                      <MdFileUpload className="w-4 h-4" />
                      Reportar
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MyIndicatorsTable;
