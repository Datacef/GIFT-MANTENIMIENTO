'use client';
import React, { useState, useEffect } from 'react';
import { IndicatorService } from 'services/indicator.service';
import { EvidenceService } from 'services/evidence.service';
import { ExportService } from 'services/export.service';
import { UserService } from 'services/user.service';
import { auth } from 'enviroment/config.firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { IIndicator } from 'types/indicator.types';
import { IEvidence, EvidenceStatus } from 'types/evidence.types';
import { UserRole } from 'types/user.types';
import { MdFileDownload, MdSearch, MdCheckCircle, MdWarning, MdError } from 'react-icons/md';
import { generateExpectedPeriods, isSameDate } from 'utils/period.utils';

const AuditDashboard = () => {
  const [indicators, setIndicators] = useState<IIndicator[]>([]);
  const [selectedIndicator, setSelectedIndicator] = useState<IIndicator | null>(null);
  const [evidences, setEvidences] = useState<IEvidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await UserService.getUserProfile(user.uid);
          if (profile?.role === UserRole.ADMIN) {
            setIsAuthorized(true);
            loadIndicators();
          } else {
            setIsAuthorized(false);
          }
        } catch (error) {
          console.error('Error verifying permissions:', error);
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const [auditRows, setAuditRows] = useState<any[]>([]);

  const loadIndicators = async () => {
    try {
      const data = await IndicatorService.getAllIndicators();
      setIndicators(data);
    } catch (error) {
      console.error('Error loading indicators:', error);
    }
  };

  const loadEvidences = React.useCallback(async (indicatorId: string) => {
    setLoading(true);
    try {
      const data = await EvidenceService.getEvidenceByIndicatorId(indicatorId);
      setEvidences(data);
    } catch (error) {
      console.error('Error loading evidences:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedIndicator) {
      loadEvidences(selectedIndicator.id);
    } else {
      setEvidences([]);
      setAuditRows([]);
    }
  }, [selectedIndicator, loadEvidences]);

  const generateAuditRows = React.useCallback(() => {
    if (!selectedIndicator) return;

    // Determine start date (e.g., creation date or start of current year)
    // For this audit, we'll start from Jan 1st of current year OR creation date if later
    const now = new Date();
    const currentYear = now.getFullYear();
    const startDate = new Date(currentYear, 0, 1); 
    // const startDate = selectedIndicator.createdAt ? new Date(selectedIndicator.createdAt) : new Date(currentYear, 0, 1);

    const rows: any[] = [];
    const periods = generateExpectedPeriods(startDate, now, selectedIndicator.measurementPeriod);

    // Merge expected periods with actual evidences
    periods.forEach(period => {
      // Find evidence that falls within this period
      // Logic: Evidence periodEndDate is within the generated period range (inclusive)
      const evidence = evidences.find(e => {
        if (!e.periodEndDate) return false;
        // Convert Firestore Timestamp to Date if necessary
        const endDate = e.periodEndDate.toDate ? e.periodEndDate.toDate() : new Date(e.periodEndDate);
        
        // Check if endDate is roughly same as period.end
        return isSameDate(endDate, period.end);
      });

      let status = 'pending';
      let submissionDate = null;
      let isLate = false;
      let evidenceId = null;
      let description = null;
      let attachments: any[] = [];
      let isMissing = false;

      if (evidence) {
        status = evidence.status === EvidenceStatus.NO_RECORDS ? 'no_records' : 'submitted';
        submissionDate = evidence.submittedAt?.toDate ? evidence.submittedAt.toDate() : new Date(evidence.submittedAt);
        isLate = evidence.isLate;
        evidenceId = evidence.id;
        description = evidence.description;
        attachments = evidence.attachments || [];
      } else {
        // If no evidence, check if period is past
        if (period.end < now) {
          status = 'missing';
          isMissing = true;
          isLate = true;
        }
      }

      rows.push({
        periodStartDate: period.start,
        periodEndDate: period.end,
        status,
        submittedAt: submissionDate,
        isLate,
        id: evidenceId,
        description,
        attachments,
        isMissing
      });
    });

    setAuditRows(rows);
  }, [selectedIndicator, evidences]);

  useEffect(() => {
    if (selectedIndicator && !loading) {
      generateAuditRows();
    }
  }, [evidences, selectedIndicator, loading, generateAuditRows]);



  const handleExport = () => {
    if (selectedIndicator && evidences.length > 0) {
      ExportService.exportAuditReport(selectedIndicator, evidences);
    }
  };

  const filteredIndicators = indicators.filter(ind =>
    ind.achievementIndicator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: EvidenceStatus) => {
    switch (status) {
      case EvidenceStatus.SUBMITTED:
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium flex items-center gap-1 w-fit"><MdCheckCircle /> A tiempo</span>;
      case EvidenceStatus.LATE:
        return <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium flex items-center gap-1 w-fit"><MdWarning /> Atrasado</span>;
      case EvidenceStatus.NO_RECORDS:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium flex items-center gap-1 w-fit">Sin registros</span>;
      case EvidenceStatus.MISSING:
        return <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium flex items-center gap-1 w-fit"><MdError /> Pendiente/Faltante</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium w-fit">{status}</span>;
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    // Handle Firestore Timestamp
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString('es-CL', { timeZone: 'America/Santiago' });
  };

  // Removed formatAnnualPeriod to use dynamic formatting


  if (isAuthorized === null) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-500">Verificando permisos...</span>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center p-6 bg-red-50 rounded-xl border border-red-100 max-w-md">
          <MdError className="mx-auto h-12 w-12 text-red-500 mb-3" />
          <h3 className="text-lg font-bold text-red-800 mb-2">Acceso Denegado</h3>
          <p className="text-red-600">Este módulo es exclusivo para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel de Auditoría</h2>
          <p className="text-gray-500 text-sm">Visualice y descargue reportes de evidencias por indicador</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar / Selector */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-fit">
          <h3 className="font-semibold text-gray-700 mb-4">Seleccionar Indicador</h3>
          
          <div className="relative mb-4">
            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar indicador..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredIndicators.map((ind) => (
              <button
                key={ind.id}
                onClick={() => setSelectedIndicator(ind)}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                  selectedIndicator?.id === ind.id
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                    : 'hover:bg-gray-50 text-gray-600 border-l-4 border-transparent'
                }`}
              >
                <div className="font-medium truncate" title={ind.achievementIndicator}>
                  {ind.achievementIndicator}
                </div>
                <div className="text-xs text-gray-400 mt-1 truncate">
                  Resp: {ind.responsibleEmail}
                </div>
              </button>
            ))}
            {filteredIndicators.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-sm">
                No se encontraron indicadores
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {selectedIndicator ? (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedIndicator.achievementIndicator}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>Responsable: <span className="font-medium text-gray-700">{selectedIndicator.responsibleEmail}</span></span>
                    <span>|</span>
                    <span>Periodo: <span className="font-medium text-gray-700">{selectedIndicator.measurementPeriod}</span></span>
                  </div>
                </div>
                
                <button
                  onClick={handleExport}
                  disabled={evidences.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    evidences.length > 0
                      ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <MdFileDownload className="text-xl" />
                  Exportar Excel
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : auditRows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Periodo</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha Entrega</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descripción</th>
                        <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Archivos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {auditRows.map((ev, index) => (
                        <tr key={ev.id || `row-${index}`} className="hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {formatDate(ev.periodStartDate)} - {formatDate(ev.periodEndDate)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-700">
                            {ev.isMissing ? '-' : formatDate(ev.submittedAt)}
                          </td>
                          <td className="py-3 px-4">
                            {getStatusBadge(ev.status)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600 max-w-xs truncate" title={ev.description}>
                            {ev.isMissing ? <span className="text-red-400 italic">No se registró evidencia</span> : (ev.description || '-')}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {ev.attachments && ev.attachments.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {ev.attachments.map((att: any, idx: number) => (
                                  <a 
                                    key={idx} 
                                    href={att.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-xs flex items-center gap-1"
                                  >
                                    <MdFileDownload size={12} />
                                    {att.name}
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic">Sin adjuntos</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-gray-500">No hay evidencias registradas para este indicador.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <div className="text-center text-gray-500">
                <MdSearch className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                <p className="text-lg font-medium">Seleccione un indicador</p>
                <p className="text-sm">Seleccione un indicador del menú lateral para ver su auditoría</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditDashboard;
